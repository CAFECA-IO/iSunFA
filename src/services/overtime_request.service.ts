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
import { parseLocalDateTime } from "@/lib/leave_span";
import { employeeRepo } from "@/repositories/employee.repo";
import { employeeHrFunctionRepo } from "@/repositories/employee_hr_function.repo";
import {
  IOvertimeRequestContext,
  overtimeRequestContextRepo,
} from "@/repositories/overtime_request_context.repo";
import {
  IOvertimeRequestRepository,
  OvertimeApprovalNotReversibleError,
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
    /**
     * Info: (20260820 - Julian) 同一天不得送出時段重疊的兩張單
     * （review 第 13 輪第 2 條）。
     *
     * 重疊意味著同一段時間被算兩次工資。它先前完全沒有人擋 ——
     * 而 `sumEarlierSameDayMinutes` 的註解卻寫著「重疊本身該擋」，
     * 一句沒有執行者的話。
     *
     * 擋在送出而不是核准：兩張重疊的單一旦都進了待簽清單，主管沒有辦法
     * 從畫面上看出它們重疊，而先按哪一張會決定誰被擋 —— 那又是一個
     * 取決於操作順序的結果。
     */
    const overlapping = await this.context.findOverlappingRequestId({
      accountBookId: params.accountBookId,
      employeeId: params.employeeId,
      workDate: input.workDate,
      requestedStartMinute: input.requestedStartMinute,
      requestedEndMinute: input.requestedEndMinute,
    });
    if (overlapping !== null) {
      throw new AppError(API_ERRORS.VA_OVERTIME_OVERLAPS_EXISTING);
    }

    /**
     * Info: (20260821 - Julian) 同日已有起點更晚的**已核准**單時，不得再補一張更早的
     * （review 第 15 輪）。
     *
     * §24 I 的級距在核准當下算一次就落地，而它只數「那一刻已經存在、且開始得更早」
     * 的分鐘數。先核准 19:00–21:00 再補 17:00–19:00，後者對前者而言來得太遲：
     * 兩張都從 0 起算、都拿 1/3，合計 80 個工資單位，而法定下限是 120 ——
     * **少付 40**，且沒有任何路徑會回頭更正（分段落地即不重算）。
     *
     * 重疊檢查擋不到它：17–19 與 19–21 是相鄰不是重疊，那是本模組最常見的合法形狀。
     *
     * 只看 `APPROVED`。`PENDING` 的手足單還沒定級距，它在自己被核准的當下會重新
     * 讀一次同日較早的分鐘數，屆時就看得到這一張 —— 擋它只會擋掉合法的並行送單。
     *
     * 擋在送出而不是核准：那張已核准的單早就落地了，到核准才擋等於讓使用者
     * 面對一個他無事可做的錯誤。在這裡，下一步是明確的 —— 撤回較晚那張，
     * 兩張一起重送，級距就會正確地切成 1/3 + 2/3。
     *
     * ToDo: (20260821 - Julian) 更正流程落地後改成重算並覆寫分段，這道閘即可移除
     * （計畫書 §17 缺口 16）。
     */
    const laterApproved = await this.context.findLaterStartApprovedRequestId({
      accountBookId: params.accountBookId,
      employeeId: params.employeeId,
      workDate: input.workDate,
      requestedStartMinute: input.requestedStartMinute,
    });
    if (laterApproved !== null) {
      throw new AppError(API_ERRORS.VA_OVERTIME_EARLIER_THAN_APPROVED);
    }

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
  /**
   * ToDo: (20260821 - Julian) **U13：區間上限與分頁都還沒有。**
   *
   * `validators/overtime.ts` 的 `overtimeRequestListQuerySchema` 寫著
   * 「區間上限不在這裡擋：它需要專屬錯誤碼與日期運算，**屬 service 的判斷**」
   * —— 而 service 這一支沒有做任何區間檢查，`from` / `to` 都可以省略，
   * repository 也沒有 `take`。於是 `GET .../overtime/request` 會回整段歷史。
   *
   * 假勤那一側是同一句話、同樣缺執行者（`leaveRequestListQuerySchema`）。
   * UI 也不帶區間（`my_overtime_page_body.tsx`），所以現況就是每次進頁面
   * 都拉全部。
   *
   * 兩件事要一起做：service 端的區間上限（含專屬錯誤碼），與 repository 的
   * `take` / cursor —— 只做前者的話，一個帶了合法區間但資料很多的帳本仍會炸。
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
      /**
       * Info: (20260820 - Julian) 自己的單子不出現在自己的待簽清單裡
       * （review 第 6 輪 M11）。
       *
       * 這一步先前在 `listManagedEmployeeIds` 的 `where` 裡（`id: { not: ... }`），
       * 而那是一條職責分離的政策躲在 Repository 的查詢條件裡。搬到這裡之後，
       * 它與 `assertMayDecide` 的第一行（`FO_SELF_APPROVAL_FORBIDDEN`）
       * 講的是同一件事，且**看得到的與簽得動的仍是同一群人** ——
       * 那正是這一支上面那段註解要求的。
       */
      employeeIds: employeeIds.filter((id) => id !== params.actorEmployeeId),
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
      /**
       * Info: (20260820 - Julian) 級距要依**時間**先後，不是核准先後
       * （review 第 5 輪 M4）。傳起始分鐘下去切出「當日開始得比它早」的那一份。
       */
      requestedStartMinute: request.requestedStartMinute,
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
      /**
       * Info: (20260820 - Julian) 分段是照**這一刻讀到的**旗標算的（review 第 3 條）。
       *
       * `request` 是 `:258` 那次查詢的結果，到這裡中間隔了 `assertMayDecide`、
       * `buildApprovalContext` 與上限查詢。HR 的 §32 IV 認定只要求
       * `status = PENDING`，那段窗口它進得來 —— 傳這個值下去，讓 repository
       * 拿它當附條件更新的一部分，這張單在我算完之後被改過就不會寫進去。
       */
      isEmergencyAtDerivation: request.isEmergency,
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

    /**
     * Info: (20260820 - Julian) 重新分類要與已決行分開回報，且**兩個方向分開**
     * （review 第 3 條 / 第 4 輪第 3 條）。
     *
     * 兩個方向的共同點：這張單還在 PENDING，重新載入再按一次就會走新的級距，
     * 不需要任何補救動作。回「已決行」會讓主管以為不用再管，而它會一直
     * 停在待簽清單上。
     *
     * 兩個方向的差別在**金額往哪邊走**，而那是主管唯一要重新確認的事：
     * 認定 → 加倍發給；撤回 → 降回普通級距。用同一句話講的話，撤回那一側
     * 的主管會讀到「工資改為加倍發給」，於是照著按下去 —— 而實際落地的
     * 金額比他確認過的少。
     */
    if (written.outcome === OvertimeDecisionOutcome.RECLASSIFIED_TO_EMERGENCY) {
      throw new AppError(API_ERRORS.VA_OVERTIME_RECLASSIFIED_MIDWAY);
    }
    if (written.outcome === OvertimeDecisionOutcome.RECLASSIFIED_TO_ORDINARY) {
      throw new AppError(API_ERRORS.VA_OVERTIME_EMERGENCY_REVOKED_MIDWAY);
    }
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
   *
   * ToDo: (20260821 - Julian) ⚠️ **U11：L28 沒有在算那個統計。**
   *
   * `emergencyReportedAt` 有寫入端，但**沒有任何地方算它與加班起始的差值**
   * （ADR 024 §4.6）。而上面那個取捨（「不擋逾期報備」）**只有在統計存在時
   * 才站得住** —— 少了它，逾期報備既不擋也不記，等於沒有發生過。
   *
   * 這一條與 U10 是同一個形狀：一個決定把責任推給某個統計，而那個統計
   * 不存在。同一支端點一起補。
   */
  public async declareEmergency(params: {
    accountBookId: string;
    requestId: string;
    actorEmployeeId: string;
    reportUrl: string;
    /** Info: (20260820 - Julian) 牆上時鐘 `"YYYY-MM-DDTHH:mm"`，政策時區在此換算 */
    reportedAt: string;
    /** Info: (20260820 - Julian) 「現在」由呼叫端注入，service 不自取 `Date.now()` */
    observedAt: Date;
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

    /**
     * Info: (20260820 - Julian) 牆上時鐘 → 時點，**在伺服器用政策時區換算**
     * （review 第 4 輪第 2 條）。
     *
     * 前端原本自己 `new Date(值).toISOString()`，而那是**裝置**的時區。
     * §32 IV 的「二十四小時內」拿這一欄算，差一個時區就差好幾個小時，
     * 而畫面上看起來完全正常。`instantOfWorkDateMinute` 是本模組唯一
     * 知道偏移的地方（含日光節約），與加班的事前／事後判定共用同一支。
     */
    const local = parseLocalDateTime(params.reportedAt);
    if (local === null) {
      throw new AppError(API_ERRORS.VA_INVALID_INPUT_DATA);
    }
    const reportedAt = instantOfWorkDateMinute(
      local.workDate,
      local.minuteOfDay,
      DEMO_TIME_ZONE,
    );

    this.assertReportedAtInRange(request, reportedAt, params.observedAt);

    const outcome = await this.requests.declareEmergency({
      accountBookId: params.accountBookId,
      requestId: request.id,
      emergencyReportUrl: params.reportUrl,
      emergencyReportedAt: reportedAt,
      emergencyDeclaredByEmployeeId: params.actorEmployeeId,
    });
    /**
     * Info: (20260820 - Julian) 已經認定過**不是**已決行（review 第 3 輪第 2 條）。
     * 下一步不同：一句是不用再管，這一句是要先撤回既有的那份。
     */
    if (outcome === OvertimeDecisionOutcome.ALREADY_DECLARED) {
      throw new AppError(API_ERRORS.VA_OVERTIME_EMERGENCY_ALREADY_DECLARED);
    }
    if (outcome === OvertimeDecisionOutcome.ALREADY_REVIEWED) {
      throw new AppError(API_ERRORS.VA_OVERTIME_ALREADY_REVIEWED);
    }

    logger.info(
      `[overtime] emergency declared: request=${request.id} by=${params.actorEmployeeId}`,
    );
    return this.mustFindSummary(params.accountBookId, request.id);
  }

  /**
   * Info: (20260820 - Julian) 報備時點的上下界（review 第 4 輪第 2 條）。
   *
   * ## 上界：不得在未來
   *
   * 「我已經在某個還沒到的時刻報備過了」在任何解讀下都不成立。這是這一欄
   * 唯一一條**不需要猜**的界線，而少了它，把時點填到三個月後可以讓
   * L28 的「逾 24 小時才報備」統計永遠算不出逾期。
   *
   * ## 下界：不得早於該加班日的開始
   *
   * §32 IV 講的是「延長開始**後**二十四小時內」通知 —— 一份時點落在
   * 那一天開始之前的紀錄，不可能是關於這次加班的報備。
   * 取整個工作日的 00:00 而不是班別窗起：同一天稍早就先通知工會是合理的
   * （颱風警報上午發布、下午的加班晚上才開始），沒有理由擋。
   *
   * ## 為什麼**不**擋逾期
   *
   * 逾 24 小時通報是另一個違章，擋下不會讓天災事變這個事實消失 ——
   * 只會逼出一個把時點往前填的動作，而那比逾期本身更難查
   * （`declareEmergency` 檔頭的既有論證，這裡沿用）。
   */
  private assertReportedAtInRange(
    request: IOvertimeRequestSummary,
    reportedAt: Date,
    observedAt: Date,
  ): void {
    if (reportedAt.getTime() > observedAt.getTime()) {
      throw new AppError(API_ERRORS.VA_OVERTIME_REPORTED_AT_OUT_OF_RANGE);
    }
    const workDateStart = instantOfWorkDateMinute(
      request.workDate,
      0,
      DEMO_TIME_ZONE,
    );
    if (reportedAt.getTime() < workDateStart.getTime()) {
      throw new AppError(API_ERRORS.VA_OVERTIME_REPORTED_AT_OUT_OF_RANGE);
    }
  }

  /**
   * Info: (20260820 - Julian) 撤回 §32 IV 的認定（review 第 3 輪第 2 條）。
   *
   * ## 為什麼非有不可
   *
   * 認定原本是**單向**的：填錯連結、報備被主管機關退回、認錯了單子 ——
   * 三種情形都沒有出口。`assertOvertimeEmergencyRecord` 的反方向
   * （沒有 `isEmergency` 就不得帶記載）逼得唯一的走法是把三欄一起清空，
   * 而那等於硬刪一份對外發生過的紀錄。那條不變式的註解自己寫下了正解
   * 卻沒有實作：「前者**應該留下撤回的痕跡**」。
   *
   * 現在痕跡在 `OvertimeEmergencyDeclaration`：認定寫一列，撤回在同一列
   * 補上時點、撤回者與理由，兩者都不刪。
   *
   * ## 閘門與認定完全相同
   *
   * 限 PENDING（決行後分段已經按當時的旗標切好）、限 HR_ADMIN、
   * 不得對自己的單子操作。三道用同一組理由 —— 撤回一份認定會把整段工資
   * 從加倍發給降回普通級距，而那個方向對雇主有利、對勞工不利，
   * 比認定本身更需要職責分離。
   *
   * ToDo: (20260820 - Julian) 已決行的單子要改認定，仍然只能走更正流程
   * （撤銷核准並重算），而那尚未實作 —— 與 `declareEmergency` 同一個缺口。
   */
  public async revokeEmergency(params: {
    accountBookId: string;
    requestId: string;
    actorEmployeeId: string;
    reason: string;
    /** Info: (20260820 - Julian) 撤回的時點由呼叫端給，service 不自取 `Date.now()`（同 approve） */
    observedAt: Date;
  }): Promise<IOvertimeRequestSummary> {
    const request = await this.mustFindSummary(
      params.accountBookId,
      params.requestId,
    );
    this.assertPending(request);

    // Info: (20260820 - Julian) 順序同 declareEmergency：自我檢查排在職能查詢之前
    if (params.actorEmployeeId === request.employeeId) {
      throw new AppError(API_ERRORS.FO_SELF_APPROVAL_FORBIDDEN);
    }

    const isHr = await employeeHrFunctionRepo.hasAnyFunction({
      accountBookId: params.accountBookId,
      employeeId: params.actorEmployeeId,
      hrFunctions: [EmployeeHrFunction.HR_ADMIN],
    });
    if (!isHr) {
      throw new AppError(API_ERRORS.FO_HR_FUNCTION_REQUIRED);
    }

    const outcome = await this.requests.revokeEmergency({
      accountBookId: params.accountBookId,
      requestId: request.id,
      revokedByEmployeeId: params.actorEmployeeId,
      revokedAt: params.observedAt,
      revokeReason: params.reason,
    });
    if (outcome === OvertimeDecisionOutcome.NOT_DECLARED) {
      throw new AppError(API_ERRORS.VA_OVERTIME_EMERGENCY_NOT_DECLARED);
    }
    if (outcome === OvertimeDecisionOutcome.ALREADY_REVIEWED) {
      throw new AppError(API_ERRORS.VA_OVERTIME_ALREADY_REVIEWED);
    }

    logger.info(
      `[overtime] emergency revoked: request=${request.id} by=${params.actorEmployeeId}`,
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
   * Info: (20260821 - Julian) L27-b：撤銷核准，讓單子回到待簽（review 第 7 輪 B1）。
   *
   * ## 這一支存在的理由是一句話必須成真
   *
   * `VA_OVERTIME_EARLIER_THAN_APPROVED` 的五個語系文案都寫著「先撤回較晚
   * 那一張，兩張一起重送」。在這一支之前那個動作**做不到** —— `APPROVED`
   * 是終端狀態，`withdraw` 對它丟 `VA_OVERTIME_ALREADY_REVIEWED`。於是那道閘
   * 不是保護，是把一段真實工時永久擋在系統外：實測從少付 40 變成少付 80。
   *
   * ## 誰可以撤銷：與核准同一組人
   *
   * 撤銷是核准的反面，判準必須一樣 —— 不得自我核准、非管轄範圍不得代簽
   * （`assertMayDecide`）。給比核准更寬的權限，等於開一條繞過核准權的路徑。
   *
   * **不要求理由。** 撤銷之後單子回到待簽、仍在清單上、仍要再被決行一次，
   * 它不像 `withdraw` 那樣終結一張單 —— 那才是需要留下「為什麼」的動作。
   *
   * ## 但**誰**在**什麼時候**撤銷的一定要留（review 第 8 輪第 1 條）
   *
   * 撤銷 → 申請人 `withdraw`，最後這張單長得與「從來沒有人送過」一模一樣，
   * 而它曾經被核准 240 分鐘、曾經進到員工的 `LeaveBalance` 裡。
   * 操作者與時點因此寫進 `OvertimeRequest.approvalRevokedAt` /
   * `approvalRevokedByEmployeeId`，並與狀態轉移在同一次附條件更新裡落地。
   * ToDo: (20260821 - Julian) 完整的決行歷史（含被撤銷的那組分段）
   * 待 `OvertimeDecisionLog` 落地。
   */
  public async revokeApproval(params: {
    accountBookId: string;
    requestId: string;
    actorEmployeeId: string;
    /** Info: (20260821 - Julian) 撤銷時點由呼叫端給，service 不自取 `Date.now()`（同 approve） */
    observedAt: Date;
  }): Promise<IOvertimeRequestSummary> {
    const request = await this.mustFindSummary(
      params.accountBookId,
      params.requestId,
    );
    /**
     * Info: (20260821 - Julian) 這裡**不呼叫** `assertPending` —— 它要的正是
     * 相反的狀態。真正的判斷由 repository 的附條件更新做（`status: APPROVED`），
     * 先讀再判會讓兩個人同時撤銷都通過。
     */
    await this.assertMayDecide(
      params.accountBookId,
      params.actorEmployeeId,
      request,
    );

    const outcome = await this.revokeOrTranslate({
      accountBookId: params.accountBookId,
      requestId: request.id,
      revokedByEmployeeId: params.actorEmployeeId,
      revokedAt: params.observedAt,
    });
    if (outcome === OvertimeDecisionOutcome.NOT_APPROVED) {
      throw new AppError(API_ERRORS.VA_OVERTIME_NOT_APPROVED);
    }
    return this.mustFindSummary(params.accountBookId, request.id);
  }

  /**
   * Info: (20260821 - Julian) 把 repository 的「已經不可逆」轉成 4xx。
   *
   * `OvertimeApprovalNotReversibleError` 不是 `AppError`，route 的 catch 會
   * 把它收斂成 `IS_DB_FAILED` —— 於是「這批補休已經被請掉了」這件使用者
   * 看得懂、也知道下一步（找人資做人工調整）的事，在畫面上長得像伺服器壞了。
   * 同 `createOrTranslate` 對 `OvertimeRequestInvariantError` 的處置。
   */
  private async revokeOrTranslate(params: {
    accountBookId: string;
    requestId: string;
    revokedByEmployeeId: string;
    revokedAt: Date;
  }): Promise<OvertimeDecisionOutcome> {
    try {
      return await this.requests.revokeApproval(params);
    } catch (error) {
      if (error instanceof OvertimeApprovalNotReversibleError) {
        throw new AppError(API_ERRORS.VA_OVERTIME_APPROVAL_NOT_REVERSIBLE);
      }
      throw error;
    }
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
        /**
         * Info: (20260820 - Julian) **`earlierRecognizedMinutes`，不是
         * `priorRecognizedMinutes`**（review 第 5 輪 M4）。
         *
         * §24 I 的級距依當日延長工時的先後定。吃「當日全部」的話，同日兩張單
         * 誰拿到前兩小時的 1/3 取決於主管按核准的順序 —— 同一組事實、
         * 不同的工資。單日 12 小時的上限仍吃 `priorRecognizedMinutes`
         * （見 `assertWithinStatutoryLimits`），那道閘與先後無關。
         */
        priorRecognizedMinutes: context.earlierRecognizedMinutes,
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

    /**
     * Info: (20260820 - Julian) 第三個前提也要有自己的 4xx（review 第 5 輪 M7）。
     *
     * 原本這裡是 `?? 0`。上面兩個前提（沒有補休假別、沒有協商期限）各有一句
     * 說得出原因的 4xx，第三個卻靜默填 0 往下送 ——
     * `deriveCompensatoryGrantDays` 會以 `OvertimeRuleError` 擋下它，
     * 而那不是 `AppError`，route 收斂成 **500**。
     *
     * 真正的原因是「這個人沒有可推導的一日工時」：他沒有排班，且
     * `findRecentWorkdayLength` 也找不到最近一個有班別的上班日。
     * 那是人資排一格班就能解決的事，而 500 說不出這件事。
     */
    if (
      context.compensatoryDayEquivalentMinutes === null ||
      context.compensatoryDayEquivalentMinutes <= 0
    ) {
      throw new AppError(API_ERRORS.VA_OVERTIME_DAY_LENGTH_UNKNOWN);
    }

    return {
      leavePolicyId: context.compensatoryPolicyId,
      dayEquivalentMinutes: context.compensatoryDayEquivalentMinutes,
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

    /**
     * Info: (20260820 - Julian) 折現事件的一日面額不得是 0（review 第 5 輪 M8）。
     *
     * 原本是 `compensatoryDayEquivalentMinutes ?? regularWorkMinutes`，而
     * `regularWorkMinutes` 在**非上班日**（休息日、國定假日）是 **0** ——
     * 那正是加班費折現最常發生的日子。落地一個 `dayEquivalentMinutes = 0`
     * 的折現事件，薪資模組拿它當除數換算日薪時會得到 Infinity 或當場除以零，
     * 而它是在薪資結算日才會現形的那種錯（ADR 022 §3.3、ADR 024 §7）。
     *
     * 這裡不再退到 `regularWorkMinutes`，而且那個備援**只可能給出 0**：
     * `buildApprovalContext` 裡
     *
     * ```ts
     * compensatoryDayEquivalentMinutes:
     *   scheduled !== null && scheduled.requiredWorkMinutes > 0
     *     ? scheduled.requiredWorkMinutes            // 此時它等於 regularWorkMinutes
     *     : await this.findRecentWorkdayLength(...)  // 此時 regularWorkMinutes 必為 0
     * regularWorkMinutes: scheduled?.requiredWorkMinutes ?? 0
     * ```
     *
     * 前一支非 null 時備援根本不會觸發；備援觸發時（前一支為 null）
     * `scheduled` 要嘛是 null、要嘛 `requiredWorkMinutes === 0`，
     * 兩種情形下 `regularWorkMinutes` 都是 0。所以那行 `??` 從落地起
     * 就只有一個效果：把「答不出來」寫成一個 0。
     */
    if (
      context.compensatoryDayEquivalentMinutes === null ||
      context.compensatoryDayEquivalentMinutes <= 0
    ) {
      throw new AppError(API_ERRORS.VA_OVERTIME_DAY_LENGTH_UNKNOWN);
    }

    return {
      dayEquivalentMinutes: context.compensatoryDayEquivalentMinutes,
      legalBasis: OVERTIME_PAYMENT_LEGAL_BASIS,
    };
  }
}

export const overtimeRequestService = new OvertimeRequestService(
  overtimeRequestContextRepo,
  overtimeRequestRepo,
);
