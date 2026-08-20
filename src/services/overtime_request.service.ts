import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";
import { DEMO_TIME_ZONE, WorkDayType } from "@/constants/attendance";
import { EmployeeHrFunction } from "@/constants/hr_management";
import {
  OvertimeCompensationMode,
  OvertimeEvidenceBasis,
  OvertimeFilingType,
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
import { employeeHrFunctionRepo } from "@/repositories/employee_hr_function.repo";
import {
  IOvertimeRequestContext,
  overtimeRequestContextRepo,
} from "@/repositories/overtime_request_context.repo";
import {
  IOvertimeRequestRepository,
  overtimeRequestRepo,
} from "@/repositories/overtime_request.repo";
import { OvertimeRequestInvariantError } from "@/repositories/overtime_request_invariant";
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
    this.assertDayTypeAllowed(scheduled.dayType);

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

    const requestId = await this.createOrTranslate({
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
      /**
       * Info: (20260819 - Julian) 送出時一律 false（review B7）。
       * §32 IV 的認定與報備紀錄在核准當下由 `HR_ADMIN` 給出 ——
       * 申請人自己勾一個布林值就跳到加倍發給，那個旗標是一句
       * 沒有證據的宣稱（計畫書 §8.3）。
       */
      isEmergency: false,
      emergencyReportUrl: null,
      emergencyReportedAt: null,
      emergencyDeclaredByEmployeeId: null,
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
   * Info: (20260818 - Julian) 把 `assertOvertimeFilingType` 的拒絕轉成 4xx。
   *
   * ## 為什麼一定要轉
   *
   * `OvertimeRequestInvariantError` 不是 `AppError`，route 的 catch 會把它
   * 收斂成 `IS_DB_FAILED` —— 於是「事前申請不能在班別開始後才送出」這件
   * 使用者看得懂、也改得動的事，在畫面上長得像伺服器壞了。
   *
   * `VA_OVERTIME_FILING_TYPE_MISMATCH` 與它的 i18n 字串本來就存在
   * （`OVERTIME_ERROR_I18N_KEY` 已經登記），只是**沒有任何地方丟出它** ——
   * 兩端都備好了，中間少一段接線。
   *
   * ## 為什麼只包送出、不包核准
   *
   * 送出時這條不變式擋的是**使用者填的東西**（時序對不上）。核准時它擋的是
   * 認列與核准分鐘的內部一致性 —— 那是程式的錯，不是使用者的錯，
   * 轉成 4xx 會讓一個該被修的 bug 看起來像一次正常的拒絕。
   */
  private async createOrTranslate(
    params: Parameters<IOvertimeRequestRepository["create"]>[0],
  ): Promise<string> {
    try {
      return await this.requests.create(params);
    } catch (error) {
      if (error instanceof OvertimeRequestInvariantError) {
        throw new AppError(API_ERRORS.VA_OVERTIME_FILING_TYPE_MISMATCH);
      }
      throw error;
    }
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
    /**
     * Info: (20260819 - Julian) 日別把關**不**看 `isEmergency`（review B7）。
     * §32 IV 的備查不是 §40 的核備，例假日一律擋下（ADR 024 §4.5）。
     */
    this.assertDayTypeAllowed(context.workDayType);

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

  /**
   * Info: (20260819 - Julian) §32 IV 天災事變的認定（review B7）。
   *
   * ## 為什麼是獨立的一步，不是核准的一個參數
   *
   * 第一版把它做成核准 payload 的一個欄位，結果撞上一個結構性的空集合：
   * 核准要求「管得到他的主管」，認定要求 `HR_ADMIN`，而**一般組織裡
   * 沒有人同時是兩者** —— 於是 §32 IV 變成一條走不通的路。
   *
   * 拆開之後順序也對了：實務上是 HR 先去報備（通知工會，或報當地主管機關
   * 備查），拿到紀錄之後這張單才帶著加倍發給的性質進到主管手上。
   * 主管在待簽清單上會先看到「天災事變」的標記再按核准，而不是自己去認定
   * 一件他沒有辦法查證的事。
   *
   * ## 為什麼限 PENDING
   *
   * 核准當下就依旗標切好了分段、算好了補休或折現。事後才蓋上旗標，
   * 會讓一張已經按普通級距算完的單子突然變成加倍發給，而分段早就寫好了 ——
   * 那是一個兩邊對不起來的狀態。已決行的單子要改，只能走更正流程。
   * ToDo: (20260819 - Julian) 更正流程（撤銷核准並重算）尚未實作。
   *
   * ## 為什麼不驗 24 小時
   *
   * §32 IV 要求延長開始後 24 小時內報備。逾期是另一個違章，**不會**讓
   * 天災事變這個事實消失 —— 擋下只會逼出一個把 `reportedAt` 往前填的動作，
   * 而那比逾期本身更難查。時點照實記下，逾期的統計留給 L28。
   */
  public async declareEmergency(params: {
    accountBookId: string;
    requestId: string;
    actorEmployeeId: string;
    reportUrl: string;
    reportedAt: string;
  }): Promise<IOvertimeRequestSummary> {
    const request = await this.mustFindSummary(
      params.accountBookId,
      params.requestId,
    );
    this.assertPending(request);

    /**
     * Info: (20260820 - Julian) **不得對自己的單子認定**（review 第 2 條）。
     *
     * 第一版只問了「你是不是 HR_ADMIN」，沒有問「這張單是不是你自己的」。
     * 於是 B7 修掉的旁路沒有消失，只是從「任何申請人自證」**收窄成
     * 「具 HR_ADMIN 職能的申請人自證」** —— 而中小企業與工地帳本裡，
     * 人資常常也是會加班的那個人（demo 帳本的 HR_ADMIN 只有 EMP002 一位）。
     *
     * 這條規則當時就已經寫進不變式的錯誤訊息裡：
     * 「the applicant may not certify their own premium」。
     * **訊息宣稱的事必須真的有人擋** —— 一句沒有執行者的規則，
     * 讀到它的人會以為那件事不可能發生（同 review B8 的教訓）。
     *
     * 排在 HR 職能查詢**之前**，理由同 `assertMayDecide` 的自我核准判斷：
     * 順序反過來的話，一個「剛好是 HR_ADMIN 的申請人」會先通過職能查詢，
     * 而那正是這條要擋的組合。
     */
    if (params.actorEmployeeId === request.employeeId) {
      throw new AppError(API_ERRORS.FO_SELF_APPROVAL_FORBIDDEN);
    }

    /**
     * Info: (20260819 - Julian) **限 HR_ADMIN。** 認定的後果是整段工資的
     * 計算標準跳到加倍發給，而報備是一件對外發生的事。讓一個沒有辦法查證
     * 那份紀錄的人認定，等於讓他替公司作證。標準與 §32 III 54 小時放寬
     * 一致（`assertOvertimePolicy`）。
     */
    const isHr = await employeeHrFunctionRepo.hasAnyFunction({
      accountBookId: params.accountBookId,
      employeeId: params.actorEmployeeId,
      hrFunctions: [EmployeeHrFunction.HR_ADMIN],
    });
    if (!isHr) {
      throw new AppError(API_ERRORS.FO_HR_FUNCTION_REQUIRED);
    }

    const reportedAt = new Date(params.reportedAt);
    if (Number.isNaN(reportedAt.getTime())) {
      throw new AppError(API_ERRORS.VA_INVALID_INPUT_DATA);
    }

    const outcome = await this.requests.declareEmergency({
      accountBookId: params.accountBookId,
      requestId: request.id,
      emergencyReportUrl: params.reportUrl,
      emergencyReportedAt: reportedAt,
      emergencyDeclaredByEmployeeId: params.actorEmployeeId,
    });
    if (outcome === OvertimeDecisionOutcome.ALREADY_REVIEWED) {
      throw new AppError(API_ERRORS.VA_OVERTIME_ALREADY_REVIEWED);
    }

    logger.info(
      `[overtime] emergency declared: request=${request.id} by=${params.actorEmployeeId}`,
    );
    return this.mustFindSummary(params.accountBookId, request.id);
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

  /**
   * Info: (20260818 - Julian) 申請人撤回自己尚未決行的加班單。
   *
   * ## 為什麼不沿用假單的撤回
   *
   * 假單撤回是取消一個**還沒發生**的計畫，方向對勞工有利。加班單要分兩種：
   * 事前申請同假單；**事後補單則是收回一句對已發生事實的陳述**，而那個方向
   * 對雇主有利、對勞工不利 —— 與 `assertOvertimeFilingType` 擋下的
   * 「事後補的單被標成事前申請」是同一種動機。因此事後補單的撤回必須說明理由。
   *
   * ## 撤回不會湮滅事實
   *
   * 打卡仍在 `AttendancePunch` 裡。這張單一消失，那段時間會立刻回到 L29 的
   * 「未核准時段」（ADR 024 §2.1）—— 撤回改變的是「有沒有人主張過這段加班」，
   * 不是「這段時間存不存在」。
   *
   * ## 為什麼只有申請人
   *
   * 主管想讓一張單消失，正確的動作是**駁回** —— 那會留下他的名字與時點。
   * 開放主管撤回等於給一條不留痕的路徑，而那正是這個模組處處在防的事。
   */
  public async withdraw(params: {
    accountBookId: string;
    requestId: string;
    actorEmployeeId: string;
    reason?: string;
    observedAt: Date;
  }): Promise<IOvertimeRequestSummary> {
    const request = await this.mustFindSummary(
      params.accountBookId,
      params.requestId,
    );

    if (request.employeeId !== params.actorEmployeeId) {
      throw new AppError(API_ERRORS.FO_OVERTIME_NOT_APPLICANT);
    }
    this.assertPending(request);

    const reason = params.reason?.trim() ?? "";
    if (
      request.filingType === OvertimeFilingType.POST_HOC &&
      reason.length === 0
    ) {
      throw new AppError(API_ERRORS.VA_OVERTIME_WITHDRAW_REASON_REQUIRED);
    }

    const outcome = await this.requests.withdraw({
      accountBookId: params.accountBookId,
      requestId: request.id,
      withdrawnAt: params.observedAt,
      // Info: (20260818 - Julian) 事前申請沒填就是 null，不塞一個空字串冒充「有填」
      withdrawReason: reason.length === 0 ? null : reason,
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
   * Info: (20260819 - Julian) 日別的把關，順序與引擎的判定表一致。
   *
   * ## 為什麼不再收 `isEmergency`（review B7）
   *
   * 這裡原本第一行是 `if (isEmergency) return;` —— 申請人在送出的 payload 裡
   * 勾一個布林值，就繞過了整個日別把關。§32 IV 與 §40 都以天災事變為前提，
   * 但**程序不同**：前者是「通知工會／報主管機關**備查**」，後者是
   * 「報主管機關**核備**」，法律效果不同。拿 §32 IV 的認定去放行例假日出勤，
   * 是用一份不對的文件當通行證。
   *
   * §40 核備的記載模型尚未建立，因此例假日沒有可以放行的路徑 ——
   * ADR 024 §4.5 明訂「在補齊之前，例假日的加班申請**一律**擋下」。
   * ToDo: (20260819 - Julian) 補上 §40 核備紀錄（文號、核備日、事後補假的日期）
   * 之後，這裡才會有第二條路徑，且必須與 `assertOvertimeEmergencyRecord`
   * 同型：沒有記載就沒有核備。
   */
  private assertDayTypeAllowed(dayType: WorkDayType): void {
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
