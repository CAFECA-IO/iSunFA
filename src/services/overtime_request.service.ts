import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { DEMO_TIME_ZONE, WorkDayType } from "@/constants/attendance";
import {
  OvertimeCompensationMode,
  OvertimeEvidenceBasis,
  OvertimeRequestStatus,
} from "@/constants/overtime";
import {
  IOvertimeApprovalContext,
  IOvertimeApprovalResult,
  IOvertimeRequestSummary,
  IOvertimeSegment,
  OvertimeDecisionOutcome,
  OvertimeLimitKind,
} from "@/interfaces/overtime";
import {
  deriveOvertimeSegments,
  evaluateOvertimeLimits,
  OVERTIME_ENGINE_VERSION,
  OvertimeRuleError,
  OvertimeRuleErrorReason,
  reconcileOvertimeMinutes,
  sumWindowOverlapMinutes,
} from "@/lib/overtime_rules";
import {
  addIsoMonths,
  instantOfWorkDateMinute,
} from "@/lib/utils/attendance_time";
import { employeeRepo } from "@/repositories/employee.repo";
import {
  IOvertimeRequestContext,
  overtimeRequestContextRepo,
} from "@/repositories/overtime_request_context.repo";
import {
  IOvertimeRequestRepository,
  overtimeRequestRepo,
} from "@/repositories/overtime_request.repo";
import {
  IOvertimeRequestCreatePayload,
  IOvertimeRequestListQuery,
} from "@/validators/overtime";
import { assertMayViewOvertimeOf } from "@/services/overtime_visibility";

/**
 * Info: (20260818 - Julian) 加班單的送出與決行（L25 / L26 / L27）。
 *
 * ## 認列不是申請人說了算
 *
 * `recognizedMinutes = min(核准分鐘, 實際停留於加班區間的打卡分鐘)`（ADR 024 §2）。
 * 申請 3 小時只待 1 小時就認列 1 小時 —— 系統不發明沒有發生過的加班；
 * 待了 3 小時只核准 1 小時，超出的部分由 `unapprovedMinutes` 交出去，
 * **不靜默丟棄** —— 未核准的加班是勞資爭議最常見的起點，事實仍存在於
 * `AttendancePunch` 裡，只是沒有人看見（ADR 024 §2.1）。
 *
 * ## 單關決行
 *
 * 加班單不走假單那套簽核鏈快照 —— `LeaveApprovalStep` 的外鍵只指向假單，
 * 而 `OvertimeRequestStatus` 的註解明寫「兩者的簽核鏈不共用」。
 * 目前由**管得到這個人的主管**一次決行，職責分離只保留最硬的兩條：
 * 不得自我核准、非管轄範圍不得代簽。
 * ToDo: (20260818 - Julian) 長時數加班的多級把關留給後續（計畫書 §7 只規範假單）。
 * 決行者的解析集中在 `assertMayDecide`，換成簽核鏈時 route 不必動。
 *
 * ## 這裡不算錢
 *
 * 選 `PAYMENT` 產出 `LeaveCashOutEvent`（無金額欄位），選 `COMPENSATORY_LEAVE`
 * 產出 1:1 的補休批次。基準時薪屬薪資模組（ADR 024 §7，同 ADR 020 對資遣費的處置）。
 */

/** Info: (20260818 - Julian) 加班費的法源標記。交棒給薪資模組時跟著事件走 */
const OVERTIME_PAYMENT_LEGAL_BASIS = "勞動基準法 §24";

export class OvertimeRequestService {
  constructor(
    private readonly context: IOvertimeRequestContext,
    private readonly requests: IOvertimeRequestRepository,
  ) {}

  /**
   * Info: (20260818 - Julian) L25：送出加班單。
   *
   * 日別的把關在這裡先做一次，而不是留到核准 —— 讓一張必定會被擋下的單子
   * 進到待簽清單，等於用主管的時間去回答一個系統當場答得出來的問題。
   */
  public async submit(params: {
    accountBookId: string;
    employeeId: string;
    input: IOvertimeRequestCreatePayload;
    observedAt: Date;
  }): Promise<IOvertimeRequestSummary> {
    const { input } = params;

    const scheduled = await this.context.findScheduledDay({
      accountBookId: params.accountBookId,
      employeeId: params.employeeId,
      workDate: input.workDate,
    });
    if (scheduled === null) {
      throw new AppError(API_ERRORS.VA_OVERTIME_DAY_NOT_SCHEDULED);
    }
    this.assertDayTypeAllowed(scheduled.dayType, input.isEmergency);

    /**
     * Info: (20260818 - Julian) 事前／事後的比較基準。
     *
     * 有班別時是班別窗起（ADR 024 §3）；休息日與國定假日沒有班別，
     * 此時取**這次加班自己的起始時刻** —— 「事前」的意思是「在它開始之前送出」，
     * 而那一天沒有一個班可以當基準。用 0 分（當地午夜）會讓所有休息日加班
     * 都被判成事後補單，那個比例會被拿去回答勞動檢查。
     */
    const referenceMinute =
      scheduled.windowStartMinute ?? input.requestedStartMinute;

    const requestId = await this.requests.create({
      accountBookId: params.accountBookId,
      employeeId: params.employeeId,
      workDate: input.workDate,
      filingType: input.filingType,
      compensationMode: input.compensationMode,
      // Info: (20260818 - Julian) 佐證來源在核准當下才定得了（那時才知道有沒有打卡）
      evidenceBasis: OvertimeEvidenceBasis.PUNCH_RECORD,
      requestedStartMinute: input.requestedStartMinute,
      requestedEndMinute: input.requestedEndMinute,
      reason: input.reason,
      isEmergency: input.isEmergency,
      invariant: {
        filingType: input.filingType,
        status: OvertimeRequestStatus.PENDING,
        submittedAtMs: params.observedAt.getTime(),
        shiftWindowStartMs: instantOfWorkDateMinute(
          input.workDate,
          referenceMinute,
          DEMO_TIME_ZONE,
        ).getTime(),
        requestedStartMinute: input.requestedStartMinute,
        requestedEndMinute: input.requestedEndMinute,
        approvedMinutes: null,
        recognizedMinutes: null,
      },
    });

    return this.mustFindSummary(params.accountBookId, requestId);
  }

  /**
   * Info: (20260818 - Julian) L24：加班單清單。
   *
   * 未指定 `employeeId` 即為自己。指定他人時可見範圍由
   * `assertMayViewOvertimeOf` 判斷，擋下時回 403 而不是空陣列 ——
   * 空陣列是對資料的陳述（「他沒有加過班」），被擋是對請求的陳述。
   */
  public async list(params: {
    accountBookId: string;
    actorEmployeeId: string;
    query: IOvertimeRequestListQuery;
  }): Promise<IOvertimeRequestSummary[]> {
    const employeeId = params.query.employeeId ?? params.actorEmployeeId;
    await assertMayViewOvertimeOf({
      accountBookId: params.accountBookId,
      actorEmployeeId: params.actorEmployeeId,
      targetEmployeeId: employeeId,
    });

    return this.context.listByEmployee({
      accountBookId: params.accountBookId,
      employeeId,
      from: params.query.from,
      to: params.query.to,
    });
  }

  /**
   * Info: (20260818 - Julian) 待我簽核的加班單。
   *
   * 計畫書 §10 沒有為它編號 —— 但 L26／L27 沒有它就沒有入口：主管無法
   * 得知有誰送了單，而一張沒有人知道它存在的加班單，等於沒有送出。
   * （假單那邊是 L16 `request/pending`，加班漏了對應的一支。）
   *
   * 範圍是「我管得到的人」，與 `assertMayDecide` 的授權判斷同源 ——
   * 看得到的與簽得動的必須是同一群人，否則清單上會出現按下去被擋的單子。
   */
  public async listPending(params: {
    accountBookId: string;
    actorEmployeeId: string;
  }): Promise<IOvertimeRequestSummary[]> {
    const employeeIds = await employeeRepo.listManagedEmployeeIds({
      accountBookId: params.accountBookId,
      managerEmployeeId: params.actorEmployeeId,
    });

    return this.context.listPendingForApprover({
      accountBookId: params.accountBookId,
      employeeIds,
    });
  }

  /**
   * Info: (20260818 - Julian) L26：核准。**同時決定認列分鐘與分段**（計畫書 §10）。
   *
   * 上限護欄排在最前面：越過 §32 II／III 的輸入不是「需要人判斷的例外」，
   * 是違法，依 CLAUDE.md §6 在 Service 開頭凍結（ADR 024 §6.2）。
   */
  public async approve(params: {
    accountBookId: string;
    requestId: string;
    actorEmployeeId: string;
    /** Info: (20260818 - Julian) 未指定即照申請的整段核准 */
    approvedMinutes?: number;
    observedAt: Date;
  }): Promise<IOvertimeApprovalResult> {
    const request = await this.mustFindSummary(
      params.accountBookId,
      params.requestId,
    );
    this.assertPending(request);
    await this.assertMayDecide(
      params.accountBookId,
      params.actorEmployeeId,
      request,
    );

    const requestedMinutes =
      request.requestedEndMinute - request.requestedStartMinute;
    const approvedMinutes = params.approvedMinutes ?? requestedMinutes;
    if (approvedMinutes < 0 || approvedMinutes > requestedMinutes) {
      throw new AppError(API_ERRORS.VA_INVALID_INPUT_DATA);
    }

    const context = await this.context.buildApprovalContext({
      accountBookId: params.accountBookId,
      employeeId: request.employeeId,
      workDate: request.workDate,
      excludeRequestId: request.id,
    });
    if (context.workDayType === null) {
      throw new AppError(API_ERRORS.VA_OVERTIME_DAY_NOT_SCHEDULED);
    }
    this.assertDayTypeAllowed(context.workDayType, request.isEmergency);

    /**
     * Info: (20260818 - Julian) 沒有任何成對打卡就是自陳（ADR 024 §2.2）。
     *
     * 適用外勤、系統故障、假日到工未打卡。仍然認列，但佐證來源標成
     * `MANUAL_DECLARATION`，讓 L28 能與有打卡佐證的加班分開統計 ——
     * 勞動檢查會問「你們有多少加班沒有出勤紀錄佐證」，而一個答不出這題的
     * 系統等於默認全部都是。
     */
    const declared = context.punchIntervals.length === 0;
    const actualMinutes = declared
      ? approvedMinutes
      : sumWindowOverlapMinutes(
          context.punchIntervals,
          request.requestedStartMinute,
          request.requestedEndMinute,
        );

    const { recognizedMinutes, unapprovedMinutes } = reconcileOvertimeMinutes({
      approvedMinutes,
      actualMinutes,
    });

    this.assertWithinStatutoryLimits(context, recognizedMinutes);

    const segments =
      recognizedMinutes === 0
        ? []
        : this.deriveSegments(context, request.isEmergency, recognizedMinutes);

    const written = await this.requests.approve({
      accountBookId: params.accountBookId,
      requestId: request.id,
      employeeId: request.employeeId,
      workDate: request.workDate,
      actorEmployeeId: params.actorEmployeeId,
      approvedMinutes,
      recognizedMinutes,
      /**
       * Info: (20260818 - Julian) 送出時填的是 `PUNCH_RECORD`（那時還不知道有沒有打卡），
       * 到這裡才定得下來。不回寫的話 L28 的「自陳」欄永遠是 0，
       * 而勞動檢查問的正是那一欄。
       */
      evidenceBasis: declared
        ? OvertimeEvidenceBasis.MANUAL_DECLARATION
        : OvertimeEvidenceBasis.PUNCH_RECORD,
      segments,
      engineVersion: OVERTIME_ENGINE_VERSION,
      invariant: {
        filingType: request.filingType,
        status: OvertimeRequestStatus.APPROVED,
        /**
         * Info: (20260818 - Julian) 時序不變式比的是**送出**時刻，不是核准時刻。
         * 這張單早就送出去了，所以沿用它的 `createdAt`。
         */
        submittedAtMs: new Date(request.createdAt).getTime(),
        shiftWindowStartMs: instantOfWorkDateMinute(
          request.workDate,
          request.requestedStartMinute,
          DEMO_TIME_ZONE,
        ).getTime(),
        requestedStartMinute: request.requestedStartMinute,
        requestedEndMinute: request.requestedEndMinute,
        approvedMinutes,
        recognizedMinutes,
      },
      compensatory: this.resolveCompensatory(request, context, segments.length),
      cashOut: this.resolveCashOut(request, context, segments.length),
    });

    if (written.outcome === OvertimeDecisionOutcome.ALREADY_REVIEWED) {
      throw new AppError(API_ERRORS.VA_OVERTIME_ALREADY_REVIEWED);
    }

    return {
      request: await this.mustFindSummary(params.accountBookId, request.id),
      recognizedMinutes,
      unapprovedMinutes,
      compensatoryGrantCount: written.grantCount,
      cashOutEventIds: written.cashOutEventIds,
    };
  }

  // Info: (20260818 - Julian) L27：駁回。與核准套用同一組決行者判斷
  public async reject(params: {
    accountBookId: string;
    requestId: string;
    actorEmployeeId: string;
  }): Promise<IOvertimeRequestSummary> {
    const request = await this.mustFindSummary(
      params.accountBookId,
      params.requestId,
    );
    this.assertPending(request);
    await this.assertMayDecide(
      params.accountBookId,
      params.actorEmployeeId,
      request,
    );

    const outcome = await this.requests.reject({
      accountBookId: params.accountBookId,
      requestId: request.id,
    });
    if (outcome === OvertimeDecisionOutcome.ALREADY_REVIEWED) {
      throw new AppError(API_ERRORS.VA_OVERTIME_ALREADY_REVIEWED);
    }
    return this.mustFindSummary(params.accountBookId, request.id);
  }

  private async mustFindSummary(
    accountBookId: string,
    requestId: string,
  ): Promise<IOvertimeRequestSummary> {
    const found = await this.context.findSummaryById({
      accountBookId,
      requestId,
    });
    if (found === null) throw new AppError(API_ERRORS.NF_OVERTIME_REQUEST);
    return found;
  }

  private assertPending(request: IOvertimeRequestSummary): void {
    if (request.status !== OvertimeRequestStatus.PENDING) {
      throw new AppError(API_ERRORS.VA_OVERTIME_ALREADY_REVIEWED);
    }
  }

  /**
   * Info: (20260818 - Julian) 誰可以決行這張單。
   *
   * 兩條不可降級的職責分離（ADR 023 §5 的前兩條）：不得自我核准；
   * 授權一律走 `managesEmployee()` 而不是 `isDepartmentManager()` ——
   * 後者只答「你是不是某個部門的主管」，用它當授權，第一工務段的主管
   * 就簽得動第五工務段的人（接線守則 §3.5.3）。
   */
  private async assertMayDecide(
    accountBookId: string,
    actorEmployeeId: string,
    request: IOvertimeRequestSummary,
  ): Promise<void> {
    if (actorEmployeeId === request.employeeId) {
      throw new AppError(API_ERRORS.FO_SELF_APPROVAL_FORBIDDEN);
    }
    const manages = await employeeRepo.managesEmployee({
      accountBookId,
      managerEmployeeId: actorEmployeeId,
      targetEmployeeId: request.employeeId,
    });
    if (!manages) {
      throw new AppError(API_ERRORS.FO_NOT_AUTHORIZED_REVIEWER);
    }
  }

  /**
   * Info: (20260818 - Julian) 日別的把關，順序與引擎的判定表一致。
   *
   * `isEmergency` 優先於一切日別（§32 IV），所以它必須排在例假之前 ——
   * 順序反過來會讓天災事變的緊急出勤被 §40 擋掉，而 §40 允許的正是這種情形。
   */
  private assertDayTypeAllowed(
    dayType: WorkDayType,
    isEmergency: boolean,
  ): void {
    if (isEmergency) return;

    if (dayType === WorkDayType.REGULAR_OFF) {
      throw new AppError(API_ERRORS.FO_OVERTIME_ON_REGULAR_OFF);
    }
    if (dayType === WorkDayType.LEAVE || dayType === WorkDayType.SUSPENDED) {
      throw new AppError(API_ERRORS.VA_OVERTIME_PREMIUM_UNDEFINED);
    }
  }

  private assertWithinStatutoryLimits(
    context: IOvertimeApprovalContext,
    recognizedMinutes: number,
  ): void {
    const { violations } = evaluateOvertimeLimits({
      regularWorkMinutes: context.regularWorkMinutes,
      dailyOvertimeMinutes: context.priorRecognizedMinutes + recognizedMinutes,
      monthlyOvertimeMinutes: context.priorMonthlyMinutes + recognizedMinutes,
      quarterlyOvertimeMinutes:
        context.priorQuarterlyMinutes + recognizedMinutes,
      extendedLimitAgreed: context.extendedLimitAgreed,
    });
    if (violations.length === 0) return;

    /**
     * Info: (20260818 - Julian) 一次可能同時破三條，取最嚴的那一條回報。
     * 日 → 月 → 季的順序不是隨意的：使用者能立刻理解的是「今天太長了」，
     * 而「這一季超過 138 小時」需要看統計才懂 —— 先說前者。
     */
    const order = [
      OvertimeLimitKind.DAILY_TOTAL,
      OvertimeLimitKind.MONTHLY,
      OvertimeLimitKind.QUARTERLY,
    ];
    const worst = order.find((kind) =>
      violations.some((violation) => violation.kind === kind),
    );
    if (worst === OvertimeLimitKind.DAILY_TOTAL) {
      throw new AppError(API_ERRORS.VA_OVERTIME_EXCEEDS_DAILY_LIMIT);
    }
    if (worst === OvertimeLimitKind.MONTHLY) {
      throw new AppError(API_ERRORS.VA_OVERTIME_EXCEEDS_MONTHLY_LIMIT);
    }
    throw new AppError(API_ERRORS.VA_OVERTIME_EXCEEDS_QUARTERLY_LIMIT);
  }

  // Info: (20260818 - Julian) 引擎的結構性錯誤轉成使用者看得懂的碼；純函數不該知道 HTTP
  private deriveSegments(
    context: IOvertimeApprovalContext,
    isEmergency: boolean,
    recognizedMinutes: number,
  ): IOvertimeSegment[] {
    try {
      return deriveOvertimeSegments({
        workDayType: context.workDayType as WorkDayType,
        isEmergency,
        minutes: recognizedMinutes,
        priorRecognizedMinutes: context.priorRecognizedMinutes,
      });
    } catch (error) {
      if (!(error instanceof OvertimeRuleError)) throw error;
      if (
        error.reason === OvertimeRuleErrorReason.REGULAR_OFF_REQUIRES_ARTICLE_40
      ) {
        throw new AppError(API_ERRORS.FO_OVERTIME_ON_REGULAR_OFF);
      }
      if (
        error.reason === OvertimeRuleErrorReason.UNDEFINED_PREMIUM_FOR_DAY_TYPE
      ) {
        throw new AppError(API_ERRORS.VA_OVERTIME_PREMIUM_UNDEFINED);
      }
      throw new AppError(API_ERRORS.VA_INVALID_INPUT_DATA);
    }
  }

  /**
   * Info: (20260818 - Julian) 換補休的三個前提，缺一不可。
   *
   * 缺假別是帳本沒有種到內建的補休假別；缺期限是尚未依 §32-1 協商 ——
   * 兩者都不退而求其次填一個數字，因為填錯的方向是讓補休在一個沒有人
   * 同意過的日期失效，而失效的補休要折現成錢。
   */
  private resolveCompensatory(
    request: IOvertimeRequestSummary,
    context: IOvertimeApprovalContext,
    segmentCount: number,
  ): {
    leavePolicyId: string;
    dayEquivalentMinutes: number;
    expiresOn: string;
  } | null {
    if (
      request.compensationMode !== OvertimeCompensationMode.COMPENSATORY_LEAVE
    ) {
      return null;
    }
    if (segmentCount === 0) return null;

    if (context.compensatoryPolicyId === null) {
      throw new AppError(API_ERRORS.NF_LEAVE_POLICY);
    }
    if (context.compensatoryExpiryMonths === null) {
      throw new AppError(API_ERRORS.VA_OVERTIME_COMP_EXPIRY_UNSET);
    }

    return {
      leavePolicyId: context.compensatoryPolicyId,
      dayEquivalentMinutes: context.compensatoryDayEquivalentMinutes ?? 0,
      expiresOn: addIsoMonths(
        request.workDate,
        context.compensatoryExpiryMonths,
      ),
    };
  }

  private resolveCashOut(
    request: IOvertimeRequestSummary,
    context: IOvertimeApprovalContext,
    segmentCount: number,
  ): { dayEquivalentMinutes: number; legalBasis: string } | null {
    if (request.compensationMode !== OvertimeCompensationMode.PAYMENT) {
      return null;
    }
    if (segmentCount === 0) return null;

    return {
      dayEquivalentMinutes:
        context.compensatoryDayEquivalentMinutes ?? context.regularWorkMinutes,
      legalBasis: OVERTIME_PAYMENT_LEGAL_BASIS,
    };
  }
}

export const overtimeRequestService = new OvertimeRequestService(
  overtimeRequestContextRepo,
  overtimeRequestRepo,
);
