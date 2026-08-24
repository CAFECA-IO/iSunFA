import { describe, it, expect, beforeEach, afterAll, jest } from "@jest/globals";
import { OvertimeRequestService } from "@/services/overtime_request.service";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { WorkDayType } from "@/constants/attendance";
import { EmployeeHrFunction } from "@/constants/hr_management";
import {
  OVERTIME_DAILY_TOTAL_LIMIT_MINUTES,
  OVERTIME_MONTHLY_EXTENDED_LIMIT_MINUTES,
  OVERTIME_MONTHLY_LIMIT_MINUTES,
  OVERTIME_QUARTERLY_EXTENDED_LIMIT_MINUTES,
  OvertimeCompensationMode,
  OvertimeEvidenceBasis,
  OvertimeFilingType,
  OvertimePremiumTier,
  OvertimeRequestStatus,
} from "@/constants/overtime";
import {
  IOvertimeApprovalContext,
  IOvertimeRequestSummary,
  OvertimeDecisionOutcome,
} from "@/interfaces/overtime";
import { employeeRepo } from "@/repositories/employee.repo";
import { employeeHrFunctionRepo } from "@/repositories/employee_hr_function.repo";
import {
  IOvertimeApprovalWrite,
  IOvertimeApprovalWriteResult,
  IOvertimeRequestRepository,
} from "@/repositories/overtime_request.repo";
import { IOvertimeRequestContext } from "@/repositories/overtime_request_context.repo";
import {
  assertEmergencyDeclaration,
  assertOvertimeEmergencyRecord,
  assertOvertimeFilingType,
  assertOvertimeSegmentPremium,
} from "@/repositories/overtime_request_invariant";

/**
 * Info: (20260819 - Julian) 加班單編排（L25 / L26 / L27）——**這支先前不存在**（review B9）。
 *
 * ## 沒有它的時候，什麼東西沒有證據
 *
 * `overtime_request.service.ts` 有 633 行，而它守著四道**法定**護欄
 * （§32 II／III 的單日 12 小時、單月 46／54 小時、三個月 138 小時）
 * 與兩條職責分離（不得自我核准、非管轄範圍不得代簽）。假單那一側有測，
 * 加班這一側一條都沒有。
 *
 * review B9 點名的 mutation：把 `assertWithinStatutoryLimits` 裡的
 * `if (violations.length === 0) return;` 改成無條件 `return;` ——
 * 四道全失效，而全套測試不變。下面每一條上限都各有一組
 * 「剛好在線上放行 / 多一分鐘擋下」，那個 mutation 過不了任何一組。
 *
 * ## 形狀
 *
 * 比照 `leave_approval_rule_service.test.ts`：建構子注入兩個假 repository，
 * 而**不變式用真的**（`assertOvertimeFilingType` 直接呼叫真的那一支）——
 * 假的不變式只會證明假的不變式有被呼叫。
 *
 * 授權那兩條走 `employeeRepo.managesEmployee`，它是模組層單例，
 * 因此以 `jest.spyOn` 換掉（理由同 `leave_balance_service.test.ts`：
 * `next/jest`(SWC) 下具名 import 的 `jest.mock` 工廠不會被提升）。
 */

const BOOK = "book-1";
const APPLICANT = "emp-006";
const MANAGER = "emp-005";
const OUTSIDER = "emp-009";
// Info: (20260820 - Julian) 具 HR_ADMIN 職能者。demo 帳本是 EMP002 林淑芬
const HR_ADMIN = "emp-002";
const WORK_DATE = "2026-08-14";

const HOUR = 60;

const summaryOf = (
  overrides: Partial<IOvertimeRequestSummary> = {},
): IOvertimeRequestSummary => ({
  id: "ot-1",
  employeeId: APPLICANT,
  employeeNo: "EMP006",
  employeeName: "李冠廷",
  workDate: WORK_DATE,
  filingType: OvertimeFilingType.POST_HOC,
  compensationMode: OvertimeCompensationMode.PAYMENT,
  evidenceBasis: OvertimeEvidenceBasis.PUNCH_RECORD,
  requestedStartMinute: 1020,
  requestedEndMinute: 1140,
  approvedMinutes: null,
  recognizedMinutes: null,
  reason: "趕工期",
  status: OvertimeRequestStatus.PENDING,
  isEmergency: false,
  emergencyReportUrl: null,
  emergencyReportedAt: null,
  segments: [],
  createdAt: "2026-08-14T12:00:00.000Z",
  ...overrides,
});

const contextOf = (
  overrides: Partial<IOvertimeApprovalContext> = {},
): IOvertimeApprovalContext => ({
  workDayType: WorkDayType.WORK,
  regularWorkMinutes: 8 * HOUR,
  compensatoryDayEquivalentMinutes: 8 * HOUR,
  // Info: (20260819 - Julian) 空陣列 = 當日無成對打卡 → 自陳，認列等於核准
  punchIntervals: [],
  priorRecognizedMinutes: 0,
  /**
   * Info: (20260820 - Julian) 當日開始得比本次早的那些（級距用，review 第 5 輪 M4）。
   * 預設 0 ＝ 本次是當天的第一段加班。
   */
  earlierRecognizedMinutes: 0,
  priorMonthlyMinutes: 0,
  priorQuarterlyMinutes: 0,
  extendedLimitAgreed: false,
  compensatoryPolicyId: "policy-comp",
  compensatoryExpiryMonths: 6,
  ...overrides,
});

class FakeContext implements Partial<IOvertimeRequestContext> {
  public summary: IOvertimeRequestSummary | null = summaryOf();

  public approval: IOvertimeApprovalContext = contextOf();

  /** Info: (20260820 - Julian) `listPending` 實際送下去的那一份 id 清單 */
  public pendingQueriedIds: readonly string[] | null = null;

  async findSummaryById(): Promise<IOvertimeRequestSummary | null> {
    return this.summary;
  }

  async buildApprovalContext(): Promise<IOvertimeApprovalContext> {
    return this.approval;
  }

  async listPendingForApprover(params: {
    accountBookId: string;
    employeeIds: readonly string[];
  }): Promise<IOvertimeRequestSummary[]> {
    this.pendingQueriedIds = params.employeeIds;
    return [];
  }

  /** Info: (20260821 - Julian) 送出端：平日、8 小時、窗起 08:00 */
  public scheduledDay: {
    dayType: WorkDayType;
    windowStartMinute: number | null;
    requiredWorkMinutes: number;
    plannedWorkMinutes: number | null;
  } | null = {
    dayType: WorkDayType.WORK,
    windowStartMinute: 480,
    requiredWorkMinutes: 8 * HOUR,
    plannedWorkMinutes: null,
  };

  async findScheduledDay(): Promise<typeof this.scheduledDay> {
    return this.scheduledDay;
  }

  /** Info: (20260821 - Julian) 撞到的那一張重疊單；null = 沒撞到 */
  public overlappingId: string | null = null;

  async findOverlappingRequestId(): Promise<string | null> {
    return this.overlappingId;
  }

  /**
   * Info: (20260821 - Julian) 同日已核准、且起點更晚的那一張（review 第 15 輪）。
   * 這裡只回答「有沒有」；那一支查詢本身的 where 由
   * `overtime_tier_order_independence.test.ts` 以真的 repository 釘住。
   */
  public laterStartApprovedId: string | null = null;

  public laterStartAskedFor: number | null = null;

  async findLaterStartApprovedRequestId(params: {
    requestedStartMinute: number;
  }): Promise<string | null> {
    this.laterStartAskedFor = params.requestedStartMinute;
    return this.laterStartApprovedId;
  }
}

class FakeRepo implements Partial<IOvertimeRequestRepository> {
  public written: IOvertimeApprovalWrite | null = null;

  async approve(
    params: IOvertimeApprovalWrite,
  ): Promise<IOvertimeApprovalWriteResult> {
    /**
     * Info: (20260819 - Julian) 假 repository 也要跑**真的**不變式。
     *
     * 它是 service 與資料庫之間的最後一道，而 service 的責任之一就是
     * 交出一組過得了它的參數。假物件替 service 跳過那一步，
     * 等於把「送進去的東西合法嗎」這個問題從測試裡刪掉。
     */
    assertOvertimeFilingType(params.invariant);
    /**
     * Info: (20260820 - Julian) 級距與旗標的一致性也是真的那一支（review 第 3 條）。
     * service 交出去的那組分段必須過得了它 —— 否則「旗標與級距講同一個故事」
     * 在測試裡就只是 repository 自己的事，而 service 算錯不會有任何測試變紅。
     */
    assertOvertimeSegmentPremium({
      isEmergency: params.isEmergencyAtDerivation,
      segments: params.segments,
    });
    this.written = params;
    return {
      outcome: this.approveOutcome,
      grantCount: 0,
      cashOutEventIds: [],
    };
  }

  /** Info: (20260821 - Julian) `submit()` 真的寫下去的那一份；null = 從未走到寫入 */
  public created: { invariant: unknown } | null = null;

  async create(params: { invariant: unknown }): Promise<string> {
    // Info: (20260821 - Julian) 同 approve：假 repository 也要跑真的不變式
    assertOvertimeFilingType(
      params.invariant as Parameters<typeof assertOvertimeFilingType>[0],
    );
    this.created = params;
    return "ot-1";
  }

  /** Info: (20260820 - Julian) 讓測試模擬 repository 的附條件更新落空（review 第 3 條） */
  public approveOutcome: OvertimeDecisionOutcome =
    OvertimeDecisionOutcome.DECIDED;

  public declared: unknown = null;

  public declareOutcome: OvertimeDecisionOutcome =
    OvertimeDecisionOutcome.DECIDED;

  async declareEmergency(params: {
    emergencyReportUrl: string;
    emergencyReportedAt: Date;
    emergencyDeclaredByEmployeeId: string;
  }): Promise<OvertimeDecisionOutcome> {
    // Info: (20260820 - Julian) 同 approve：假 repository 也要跑真的不變式
    assertOvertimeEmergencyRecord({ isEmergency: true, ...params });
    assertEmergencyDeclaration({
      reportUrl: params.emergencyReportUrl,
      reportedAt: params.emergencyReportedAt,
      declaredByEmployeeId: params.emergencyDeclaredByEmployeeId,
      revokedAt: null,
      revokedByEmployeeId: null,
      revokeReason: null,
    });
    this.declared = params;
    return this.declareOutcome;
  }

  public revoked: unknown = null;

  public revokeOutcome: OvertimeDecisionOutcome =
    OvertimeDecisionOutcome.DECIDED;

  async revokeEmergency(params: {
    revokedByEmployeeId: string;
    revokedAt: Date;
    revokeReason: string;
  }): Promise<OvertimeDecisionOutcome> {
    /**
     * Info: (20260820 - Julian) 撤回三欄同生共死也由真的不變式擋
     * （review 第 3 輪第 2 條）—— service 交出去的那組必須過得了它。
     */
    assertEmergencyDeclaration({
      reportUrl: "https://example.test/filings/probe",
      reportedAt: new Date("2026-08-15T11:00:00+08:00"),
      declaredByEmployeeId: "emp-hr",
      revokedAt: params.revokedAt,
      revokedByEmployeeId: params.revokedByEmployeeId,
      revokeReason: params.revokeReason,
    });
    this.revoked = params;
    return this.revokeOutcome;
  }
}

let context: FakeContext;
let repo: FakeRepo;
let service: OvertimeRequestService;

const managesSpy = jest.spyOn(employeeRepo, "managesEmployee");
const hasHrFunctionSpy = jest.spyOn(employeeHrFunctionRepo, "hasAnyFunction");

afterAll(() => {
  jest.restoreAllMocks();
});

beforeEach(() => {
  context = new FakeContext();
  repo = new FakeRepo();
  service = new OvertimeRequestService(
    context as unknown as IOvertimeRequestContext,
    repo as unknown as IOvertimeRequestRepository,
  );
  managesSpy.mockReset();
  managesSpy.mockResolvedValue(true);
  hasHrFunctionSpy.mockReset();
  hasHrFunctionSpy.mockResolvedValue(true);
});

const approve = (overrides: { actorEmployeeId?: string; approvedMinutes?: number } = {}) =>
  service.approve({
    accountBookId: BOOK,
    requestId: "ot-1",
    actorEmployeeId: overrides.actorEmployeeId ?? MANAGER,
    approvedMinutes: overrides.approvedMinutes,
    observedAt: new Date("2026-08-15T02:00:00.000Z"),
  });

const codeOf = async (run: () => Promise<unknown>): Promise<string> => {
  try {
    await run();
  } catch (error) {
    if (error instanceof AppError) return error.apiCode;
    throw error;
  }
  throw new Error("預期會丟 AppError，但它成功了");
};

/**
 * Info: (20260819 - Julian) 把申請區間設成剛好 `minutes` 分鐘。
 * 上限測的是「認列多少」，不是「申請的時段長什麼樣」。
 */
const requestOf = (minutes: number): IOvertimeRequestSummary =>
  summaryOf({ requestedStartMinute: 1020, requestedEndMinute: 1020 + minutes });

describe("四道法定上限：剛好在線上放行，多一分鐘擋下（§32 II／III）", () => {
  /**
   * Info: (20260819 - Julian) 每一條都成對。
   *
   * 只測「超過會擋」的話，一個無條件 `throw` 的實作會通過；
   * 只測「不超過會過」的話，review B9 點名的那個 mutation
   * （`if (violations.length === 0) return;` → 無條件 `return;`）會通過。
   * 成對才把那條線釘在正確的位置上。
   */
  it("單日：正常工時 + 延長 = 12 小時放行，多一分鐘擋下", async () => {
    const room = OVERTIME_DAILY_TOTAL_LIMIT_MINUTES - 8 * HOUR;

    context.summary = requestOf(room);
    await expect(approve()).resolves.toBeDefined();

    context.summary = requestOf(room + 1);
    repo.written = null;
    expect(await codeOf(approve)).toBe(
      API_ERRORS.VA_OVERTIME_EXCEEDS_DAILY_LIMIT.code,
    );
    expect(repo.written).toBeNull();
  });

  it("單日：當日先前已認列的分鐘也算進來", async () => {
    context.approval = contextOf({ priorRecognizedMinutes: 3 * HOUR });
    const room = OVERTIME_DAILY_TOTAL_LIMIT_MINUTES - 8 * HOUR - 3 * HOUR;

    context.summary = requestOf(room);
    await expect(approve()).resolves.toBeDefined();

    context.summary = requestOf(room + 1);
    expect(await codeOf(approve)).toBe(
      API_ERRORS.VA_OVERTIME_EXCEEDS_DAILY_LIMIT.code,
    );
  });

  it("單月 46 小時（未經同意放寬）", async () => {
    const prior = OVERTIME_MONTHLY_LIMIT_MINUTES - 60;
    context.approval = contextOf({ priorMonthlyMinutes: prior });

    context.summary = requestOf(60);
    await expect(approve()).resolves.toBeDefined();

    context.summary = requestOf(61);
    expect(await codeOf(approve)).toBe(
      API_ERRORS.VA_OVERTIME_EXCEEDS_MONTHLY_LIMIT.code,
    );
  });

  /**
   * Info: (20260819 - Julian) 放寬到 54 小時的前提是**經工會或勞資會議同意**
   * 且有記載（`assertOvertimePolicy`）。這一條驗的是那個旗標真的改變上限 ——
   * 不改的話「同意」這件事在系統裡沒有任何效果，而 HR 會以為它有。
   */
  it("單月 54 小時（extendedLimitAgreed 為真）", async () => {
    const prior = OVERTIME_MONTHLY_EXTENDED_LIMIT_MINUTES - 60;
    context.approval = contextOf({
      extendedLimitAgreed: true,
      priorMonthlyMinutes: prior,
    });

    context.summary = requestOf(60);
    await expect(approve()).resolves.toBeDefined();

    context.summary = requestOf(61);
    expect(await codeOf(approve)).toBe(
      API_ERRORS.VA_OVERTIME_EXCEEDS_MONTHLY_LIMIT.code,
    );
  });

  it("未同意放寬時，46 小時之後就擋（不會偷偷用 54）", async () => {
    context.approval = contextOf({
      extendedLimitAgreed: false,
      priorMonthlyMinutes: OVERTIME_MONTHLY_LIMIT_MINUTES,
    });
    context.summary = requestOf(1);
    expect(await codeOf(approve)).toBe(
      API_ERRORS.VA_OVERTIME_EXCEEDS_MONTHLY_LIMIT.code,
    );
  });

  it("三個月 138 小時（僅在同意放寬時適用）", async () => {
    const prior = OVERTIME_QUARTERLY_EXTENDED_LIMIT_MINUTES - 60;
    context.approval = contextOf({
      extendedLimitAgreed: true,
      priorQuarterlyMinutes: prior,
    });

    context.summary = requestOf(60);
    await expect(approve()).resolves.toBeDefined();

    context.summary = requestOf(61);
    expect(await codeOf(approve)).toBe(
      API_ERRORS.VA_OVERTIME_EXCEEDS_QUARTERLY_LIMIT.code,
    );
  });

  /**
   * Info: (20260819 - Julian) 一次破三條時回**最嚴**的那一條。
   *
   * 順序是日 → 月 → 季，理由在 service 的註解裡：使用者能立刻理解的是
   * 「今天太長了」，而「這一季超過 138 小時」要看統計才懂。
   */
  it("同時破三條時回單日那一條", async () => {
    context.approval = contextOf({
      extendedLimitAgreed: true,
      priorMonthlyMinutes: OVERTIME_MONTHLY_EXTENDED_LIMIT_MINUTES,
      priorQuarterlyMinutes: OVERTIME_QUARTERLY_EXTENDED_LIMIT_MINUTES,
    });
    context.summary = requestOf(8 * HOUR);
    expect(await codeOf(approve)).toBe(
      API_ERRORS.VA_OVERTIME_EXCEEDS_DAILY_LIMIT.code,
    );
  });
});

describe("兩條職責分離（加班側）", () => {
  /**
   * Info: (20260819 - Julian) 自我核准。
   *
   * 主管自己送的加班單由他自己按核准，是最容易發生也最難事後追究的那一種 ——
   * 而它在畫面上看起來與任何一張正常核准的單子完全相同。
   */
  it("不得自我核准", async () => {
    context.summary = summaryOf({ employeeId: MANAGER });
    expect(await codeOf(() => approve({ actorEmployeeId: MANAGER }))).toBe(
      API_ERRORS.FO_SELF_APPROVAL_FORBIDDEN.code,
    );
  });

  /**
   * Info: (20260819 - Julian) 非管轄範圍不得代簽。
   *
   * 判準是 `managesEmployee()`（部門子樹）而不是「你是不是某個部門的主管」——
   * 後者會讓第一工務段的主管簽得動第五工務段的人。
   */
  it("管不到這個人時不得代簽", async () => {
    managesSpy.mockResolvedValue(false);
    expect(await codeOf(() => approve({ actorEmployeeId: OUTSIDER }))).toBe(
      API_ERRORS.FO_NOT_AUTHORIZED_REVIEWER.code,
    );
  });

  it("兩條都通過時才進得到業務邏輯", async () => {
    managesSpy.mockResolvedValue(true);
    await expect(approve()).resolves.toBeDefined();
    expect(managesSpy).toHaveBeenCalledWith({
      accountBookId: BOOK,
      managerEmployeeId: MANAGER,
      targetEmployeeId: APPLICANT,
    });
  });

  /**
   * Info: (20260819 - Julian) 自我核准擋在管轄判斷**之前**。
   *
   * 順序反過來的話，一個管得到自己的人（小部門裡主管的 `managerId`
   * 指向自己）會通過 —— 而那正是自我核准最常見的組態。
   */
  it("自我核准的判斷不依賴管轄查詢", async () => {
    context.summary = summaryOf({ employeeId: MANAGER });
    managesSpy.mockResolvedValue(true);
    expect(await codeOf(() => approve({ actorEmployeeId: MANAGER }))).toBe(
      API_ERRORS.FO_SELF_APPROVAL_FORBIDDEN.code,
    );
  });
});

describe("認列 = min(核准, 事實)，且超出的部分要交出去", () => {
  /**
   * Info: (20260819 - Julian) `unapprovedMinutes` 是**事實超出核准**的那一段，
   * 不是「核准超出事實」的那一段。
   *
   * 兩者的方向完全相反，而只有前者需要被交出去：他人在工地待了 3 小時、
   * 主管只核 1 小時，那 2 小時的**事實**仍然存在於 `AttendancePunch` 裡，
   * 勞動檢查看得見（ADR 024 §2.1）。反過來（核准 2 小時但只待了 1 小時）
   * 沒有任何多出來的事實要交代 —— 少的那一段本來就不該被認列。
   *
   * 這一條是寫錯過的：第一版拿「核准 120、打卡 60」去期待
   * `unapprovedMinutes === 60`，而正確答案是 0。留著兩個方向各一條，
   * 免得下一個人把它讀成「核准與事實的差」。
   */
  it("打卡少於核准：認列打卡，未核准為 0（沒有多出來的事實）", async () => {
    context.summary = requestOf(120);
    context.approval = contextOf({
      // Info: (20260819 - Julian) 17:00–18:00，與申請的 17:00–19:00 交集 60 分
      punchIntervals: [{ startMinute: 1020, endMinute: 1080 }],
    });

    const result = await approve();
    expect(result.recognizedMinutes).toBe(60);
    expect(result.unapprovedMinutes).toBe(0);
    expect(repo.written?.evidenceBasis).toBe(
      OvertimeEvidenceBasis.PUNCH_RECORD,
    );

    /**
     * Info: (20260820 - Julian) 落地的兩個分鐘數也要各自驗（review 第 4 輪第 5 條）。
     *
     * 回傳值驗過了，但**寫下去的 payload** 先前一筆都沒驗。這是這條測試裡
     * 唯一兩者不相等的案例（核准 120、事實 60），因此也是唯一分得出
     * `recognizedMinutes,` 與 `recognizedMinutes: approvedMinutes,` 的地方 ——
     * 後者會讓資料庫收到 120 分的認列，而回傳值仍然是 60，
     * 畫面與帳本從此各說各話。
     */
    expect(repo.written?.approvedMinutes).toBe(120);
    expect(repo.written?.recognizedMinutes).toBe(60);
    // Info: (20260820 - Julian) 不變式那一份是另一個物件，也會被同一個手誤打到
    expect(repo.written?.invariant.approvedMinutes).toBe(120);
    expect(repo.written?.invariant.recognizedMinutes).toBe(60);
    expect(repo.written?.recognizedMinutes).not.toBe(
      repo.written?.approvedMinutes,
    );
  });

  /**
   * Info: (20260819 - Julian) 核准少於打卡 → 超出的那一段被交出去。
   *
   * 申請並待滿 120 分、主管只核 60 分：認列 60，而另外 60 分是
   * **有打卡事實、沒有人核准**的加班。它不會被靜默丟棄，
   * 也會出現在 L29 的「未核准時段」。這是 seed 的 OT-3 演的那條路。
   */
  it("核准少於打卡：超出的事實被交出去，不是靜默丟棄", async () => {
    context.summary = requestOf(120);
    context.approval = contextOf({
      // Info: (20260819 - Julian) 17:00–19:00，與申請完全重合 → 事實 120 分
      punchIntervals: [{ startMinute: 1020, endMinute: 1140 }],
    });

    const result = await approve({ approvedMinutes: 60 });
    expect(result.recognizedMinutes).toBe(60);
    expect(result.unapprovedMinutes).toBe(60);
  });

  /**
   * Info: (20260819 - Julian) 全日無打卡 → 自陳。
   *
   * 仍然認列，但佐證來源標成 `MANUAL_DECLARATION` —— 勞動檢查會問
   * 「你們有多少加班沒有出勤紀錄佐證」，而一個答不出這題的系統
   * 等於默認全部都是。
   */
  it("全日無打卡時走自陳，且認列等於核准", async () => {
    context.summary = requestOf(120);
    context.approval = contextOf({ punchIntervals: [] });

    const result = await approve();
    expect(result.recognizedMinutes).toBe(120);
    // Info: (20260819 - Julian) 沒有打卡就沒有「超出核准的事實」可言
    expect(result.unapprovedMinutes).toBe(0);
    expect(repo.written?.evidenceBasis).toBe(
      OvertimeEvidenceBasis.MANUAL_DECLARATION,
    );
  });

  it("核准多於申請時擋下（沒有人申請過那個時段）", async () => {
    context.summary = requestOf(120);
    expect(await codeOf(() => approve({ approvedMinutes: 121 }))).toBe(
      API_ERRORS.VA_INVALID_INPUT_DATA.code,
    );
  });
});

describe("日別把關（review B7 的迴歸）", () => {
  /**
   * Info: (20260819 - Julian) 例假日一律擋下，`isEmergency` **不是通行證**。
   *
   * §32 IV 是「報主管機關**備查**」，§40 是「報主管機關**核備**」，
   * 法律效果不同。這一條把 B7 的修正接到編排層 ——
   * 引擎那一側由 `overtime_rules.test.ts` 守著。
   */
  it.each([false, true])(
    "例假日核准擋下（isEmergency=%p）",
    async (isEmergency) => {
      context.summary = summaryOf({ isEmergency });
      context.approval = contextOf({ workDayType: WorkDayType.REGULAR_OFF });
      expect(await codeOf(approve)).toBe(
        API_ERRORS.FO_OVERTIME_ON_REGULAR_OFF.code,
      );
    },
  );

  it("沒有排班時回「該日未排班」而不是加成未定義", async () => {
    context.approval = contextOf({ workDayType: null });
    expect(await codeOf(approve)).toBe(
      API_ERRORS.VA_OVERTIME_DAY_NOT_SCHEDULED.code,
    );
  });

  it("停工與請假日回加成未定義（法源待核對）", async () => {
    context.approval = contextOf({ workDayType: WorkDayType.SUSPENDED });
    expect(await codeOf(approve)).toBe(
      API_ERRORS.VA_OVERTIME_PREMIUM_UNDEFINED.code,
    );
  });

  /**
   * Info: (20260819 - Julian) 已認定的天災事變在**非**例假日仍然生效：
   * 整段跳到 `EMERGENCY_DOUBLE`，不切級距。
   */
  it("平日的天災事變整段加倍發給", async () => {
    context.summary = summaryOf({
      isEmergency: true,
      requestedStartMinute: 1020,
      requestedEndMinute: 1020 + 3 * HOUR,
    });
    await approve();
    expect(repo.written?.segments).toEqual([
      {
        order: 0,
        tier: OvertimePremiumTier.EMERGENCY_DOUBLE,
        minutes: 3 * HOUR,
      },
    ]);
  });
});

describe("已決行的單子不得再決行", () => {
  it.each([
    OvertimeRequestStatus.APPROVED,
    OvertimeRequestStatus.REJECTED,
    OvertimeRequestStatus.WITHDRAWN,
  ])("狀態為 %s 時擋下", async (status) => {
    context.summary = summaryOf({ status });
    expect(await codeOf(approve)).toBe(
      API_ERRORS.VA_OVERTIME_ALREADY_REVIEWED.code,
    );
  });
});

/**
 * Info: (20260820 - Julian) §32 IV 的認定（`declareEmergency`）——
 * **這一段先前完全沒有測試**（review 第 2 條，`grep declareEmergency src/__tests__` = 0）。
 *
 * ## 沒有它的時候，刪三行就全綠
 *
 * 拿掉 `if (!isHr) throw` 那三行 → 同帳本的**任何**員工都能對自己的待簽單
 * 認定天災事變，整段跳 `EMERGENCY_DOUBLE`，而全套測試不變。
 * B7 花了一整輪把「申請人自填的布林值」改成「HR 認定 + 強制報備紀錄」，
 * 那個保證卻沒有任何行為證據。
 *
 * ## 而閘本身還漏了一條
 *
 * 第一版只問「你是不是 HR_ADMIN」，沒問「這張單是不是你自己的」。
 * 於是旁路沒有消失，只是從「任何申請人自證」收窄成
 * 「**具 HR_ADMIN 職能的申請人自證**」—— 而中小企業與工地帳本裡，
 * 人資常常也是會加班的那個人（demo 帳本只有 EMP002 一位 HR_ADMIN）。
 *
 * 更糟的是**這條規則當時就已經寫在不變式的錯誤訊息裡**：
 * 「the applicant may not certify their own premium」。
 * 規格說了、程式沒擋、也沒有測試 —— 三者分岔而沒有人會發現。
 *
 * ## 斷言一律成對
 *
 * 「回 403」與「repository 沒有被呼叫」要一起驗：少了後者，
 * 一個「先寫進去再回 403」的實作會通過（同 review B9 對限流的處置）。
 */
describe("declareEmergency —— §32 IV 的認定閘", () => {
  /**
   * Info: (20260820 - Julian) 牆上時鐘（review 第 4 輪第 2 條）——
   * 政策時區的換算在 service，不在送單的裝置上。
   */
  const REPORT = {
    reportUrl: "https://example.test/filings/2026-0815-001",
    reportedAt: "2026-08-15T11:00",
  };
  // Info: (20260820 - Julian) 報備當天稍晚，用來釘住「不得在未來」那一側
  const OBSERVED_AT = new Date("2026-08-15T20:00:00+08:00");

  /**
   * Info: (20260820 - Julian) `REPORT.reportedAt` 換算之後**應該**是哪個時點。
   *
   * 寫成帶時區的字面值，**不可以**寫成 `new Date(REPORT.reportedAt)` ——
   * 後者對一個不帶時區的字串（`"2026-08-15T11:00"`）會用**執行 jest 的那台
   * 機器的時區**去解析。在 UTC 的 CI 上是 `11:00Z`，在開發者的台北筆電上是
   * `03:00Z`，而被測程式一律用政策時區算出 `03:00Z`。
   *
   * 也就是說那種寫法會讓這條測試在台北綠、在 CI 紅 —— 而它要驗的東西
   * （service 有沒有用政策時區換算）在兩邊都沒有被驗到。
   * 這正是本輪修掉的那個缺陷本身，只是搬進了斷言裡。
   */
  const REPORTED_AT_INSTANT = new Date("2026-08-15T11:00:00+08:00");

  const declare = (overrides: { actorEmployeeId?: string } = {}) =>
    service.declareEmergency({
      accountBookId: BOOK,
      requestId: "ot-1",
      actorEmployeeId: overrides.actorEmployeeId ?? HR_ADMIN,
      observedAt: OBSERVED_AT,
      ...REPORT,
    });

  it("HR_ADMIN 對別人的單子認定：成立，三個欄位都落地", async () => {
    await expect(declare()).resolves.toBeDefined();
    expect(repo.declared).toEqual({
      accountBookId: BOOK,
      requestId: "ot-1",
      emergencyReportUrl: REPORT.reportUrl,
      emergencyReportedAt: REPORTED_AT_INSTANT,
      emergencyDeclaredByEmployeeId: HR_ADMIN,
    });
  });

  /**
   * Info: (20260820 - Julian) 認定者是**決行者以外的第三個角色**。
   *
   * 這一條順帶釘住 B7 的結構：認定不需要「管得到他」——
   * HR 通常不是那個人的主管。若哪天有人把 `managesEmployee` 也加進來，
   * §32 IV 會在大部分組織裡再次變成走不通的路。
   */
  it("HR_ADMIN 不必管得到那個人", async () => {
    managesSpy.mockResolvedValue(false);
    await expect(declare()).resolves.toBeDefined();
    expect(managesSpy).not.toHaveBeenCalled();
  });

  it("沒有 HR_ADMIN 職能：403，且 repository 沒有被呼叫", async () => {
    hasHrFunctionSpy.mockResolvedValue(false);
    expect(await codeOf(() => declare({ actorEmployeeId: MANAGER }))).toBe(
      API_ERRORS.FO_HR_FUNCTION_REQUIRED.code,
    );
    expect(repo.declared).toBeNull();
  });

  it("只問 HR_ADMIN，不含 TIMEKEEPER", async () => {
    await declare();
    expect(hasHrFunctionSpy).toHaveBeenCalledWith({
      accountBookId: BOOK,
      employeeId: HR_ADMIN,
      hrFunctions: [EmployeeHrFunction.HR_ADMIN],
    });
  });

  /**
   * Info: (20260820 - Julian) **具 HR_ADMIN 職能的申請人也不得自證。**
   *
   * 這是 review 第 2 條點名的那個組合，而它不是理論上的：
   * demo 帳本只有一位 HR_ADMIN，而她也會加班。
   */
  it("HR_ADMIN 對自己的單子認定：403，且 repository 沒有被呼叫", async () => {
    context.summary = summaryOf({ employeeId: HR_ADMIN });
    hasHrFunctionSpy.mockResolvedValue(true);

    expect(await codeOf(() => declare({ actorEmployeeId: HR_ADMIN }))).toBe(
      API_ERRORS.FO_SELF_APPROVAL_FORBIDDEN.code,
    );
    expect(repo.declared).toBeNull();
  });

  /**
   * Info: (20260820 - Julian) 自我認定的判斷排在**職能查詢之前**。
   *
   * 順序反過來的話，「剛好是 HR_ADMIN 的申請人」會先通過職能查詢 ——
   * 而那正是這條要擋的組合。理由同 `assertMayDecide` 的自我核准判斷。
   */
  it("自我認定不依賴職能查詢的結果", async () => {
    context.summary = summaryOf({ employeeId: HR_ADMIN });
    await codeOf(() => declare({ actorEmployeeId: HR_ADMIN }));
    expect(hasHrFunctionSpy).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260820 - Julian) 只在 `PENDING` 時可用。
   *
   * 核准當下就依旗標切好了分段、算好了補休或折現。事後才蓋上旗標，
   * 會讓一張已經按普通級距算完的單子突然變成加倍發給。
   */
  it.each([
    OvertimeRequestStatus.APPROVED,
    OvertimeRequestStatus.REJECTED,
    OvertimeRequestStatus.WITHDRAWN,
  ])("狀態為 %s 時擋下，且 repository 沒有被呼叫", async (status) => {
    context.summary = summaryOf({ status });
    expect(await codeOf(declare)).toBe(
      API_ERRORS.VA_OVERTIME_ALREADY_REVIEWED.code,
    );
    expect(repo.declared).toBeNull();
  });

  /**
   * Info: (20260820 - Julian) 附條件更新輸掉（主管在同一秒核准掉了）。
   *
   * repository 回 `ALREADY_REVIEWED`，service 必須轉成使用者看得懂的碼 ——
   * 而不是回一張「認定成功」的單子。
   */
  it("認定與核准撞在一起時回已決行", async () => {
    repo.declareOutcome = OvertimeDecisionOutcome.ALREADY_REVIEWED;
    expect(await codeOf(declare)).toBe(
      API_ERRORS.VA_OVERTIME_ALREADY_REVIEWED.code,
    );
  });

  it("報備時點格式錯時回 400", async () => {
    expect(
      await codeOf(() =>
        service.declareEmergency({
          accountBookId: BOOK,
          requestId: "ot-1",
          actorEmployeeId: HR_ADMIN,
          reportUrl: REPORT.reportUrl,
          reportedAt: "not-a-date",
          observedAt: OBSERVED_AT,
        }),
      ),
    ).toBe(API_ERRORS.VA_INVALID_INPUT_DATA.code);
    expect(repo.declared).toBeNull();
  });

  /**
   * Info: (20260820 - Julian) 報備時點的上下界（review 第 4 輪第 2 條）。
   *
   * 這一欄先前**完全沒有界線**：可未來、可早於加班日好幾個月。
   * 而 §32 IV 的「二十四小時內」正是拿它算的 —— 把時點填到三個月後，
   * L28 的逾期統計永遠算不出逾期。
   *
   * 兩條界線的性質不同，因此都要有：上界（不得在未來）不需要任何解釋，
   * 下界（不得早於加班那一天的開始）來自條文本身（「延長開始**後**」）。
   * **不擋逾期**是刻意的：逾期是另一個違章，擋下只會逼出往前填的動作。
   */
  it.each([
    ["在未來", "2026-08-16T09:00"],
    ["早於加班日", "2026-08-13T23:59"],
  ])("報備時點 %s 時擋下，且 repository 沒有被呼叫", async (_label, reportedAt) => {
    expect(
      await codeOf(() =>
        service.declareEmergency({
          accountBookId: BOOK,
          requestId: "ot-1",
          actorEmployeeId: HR_ADMIN,
          reportUrl: REPORT.reportUrl,
          reportedAt,
          observedAt: OBSERVED_AT,
        }),
      ),
    ).toBe(API_ERRORS.VA_OVERTIME_REPORTED_AT_OUT_OF_RANGE.code);
    expect(repo.declared).toBeNull();
  });

  /**
   * Info: (20260820 - Julian) 反面：邊界之內照常放行 —— 含「加班那天的 00:00」
   * 與「逾 24 小時才報備」。只驗上面兩條的話，「一律擋」也會通過，
   * 而逾期那一條會讓一個真實的違章變成一張送不出去的單。
   */
  it.each([
    ["加班日的 00:00（同日稍早先通知工會）", "2026-08-14T00:00", new Date("2026-08-15T20:00:00+08:00")],
    ["逾 24 小時才報備（是違章，但不擋）", "2026-08-17T09:00", new Date("2026-08-18T09:00:00+08:00")],
  ])("報備時點 %s 時放行", async (_label, reportedAt, observedAt) => {
    await expect(
      service.declareEmergency({
        accountBookId: BOOK,
        requestId: "ot-1",
        actorEmployeeId: HR_ADMIN,
        reportUrl: REPORT.reportUrl,
        reportedAt,
        observedAt,
      }),
    ).resolves.toBeDefined();
  });

  /**
   * Info: (20260820 - Julian) 換算用的是**政策時區**，不是行程時區。
   *
   * `"2026-08-15T11:00"` 在 Asia/Taipei 是 `03:00Z` —— 交給 repository 的
   * 必須是這個時點。前端原本自己 `new Date(值).toISOString()`，
   * 那會變成執行環境的時區，而這一條就是那個缺陷的紅燈。
   */
  it("牆上時鐘依政策時區換算成時點", async () => {
    await declare();
    expect(repo.declared).toMatchObject({
      emergencyReportedAt: REPORTED_AT_INSTANT,
    });
    // Info: (20260820 - Julian) 明寫出 UTC 的樣子，讓「差八小時」一眼看得出來
    expect(REPORTED_AT_INSTANT.toISOString()).toBe("2026-08-15T03:00:00.000Z");
  });
});

/**
 * Info: (20260820 - Julian) 核准把「我算的時候旗標是這個值」交給 repository（review 第 3 條）。
 *
 * repository 拿它當附條件更新的一部分（`overtime_approve_emergency_claim.test.ts`
 * 驗那一段）。這裡驗的是接線的另一半：service 有沒有真的把讀到的值傳下去 ——
 * 傳一個寫死的 `false`、或乾脆不傳，claim 就形同虛設而那支測試照樣綠。
 */
describe("核准帶下去的 isEmergencyAtDerivation", () => {
  it.each([
    ["非天災事變", false, OvertimePremiumTier.WEEKDAY_FIRST_2H],
    ["天災事變", true, OvertimePremiumTier.EMERGENCY_DOUBLE],
  ])(
    "%s：傳下去的值等於讀到的旗標，且分段依它決定",
    async (_label, isEmergency, tier) => {
      context.summary = summaryOf({ isEmergency });

      await approve({ approvedMinutes: 60 });

      expect(repo.written?.isEmergencyAtDerivation).toBe(isEmergency);
      expect(repo.written?.segments.map((segment) => segment.tier)).toEqual([
        tier,
      ]);
    },
  );

  /**
   * Info: (20260820 - Julian) 重新分類與已決行是**兩句不同的話**。
   *
   * 兩個斷言成對：各自的碼要對，且**兩者不得相同** —— 共用同一個碼的話，
   * 主管會看到「此加班單已決行」而不再處理，但那張單其實還在等他。
   */
  it("重新分類的兩個方向與已決行是三句不同的話", async () => {
    repo.approveOutcome = OvertimeDecisionOutcome.RECLASSIFIED_TO_EMERGENCY;
    const declared = await codeOf(() => approve({ approvedMinutes: 60 }));

    repo.approveOutcome = OvertimeDecisionOutcome.RECLASSIFIED_TO_ORDINARY;
    const revoked = await codeOf(() => approve({ approvedMinutes: 60 }));

    repo.approveOutcome = OvertimeDecisionOutcome.ALREADY_REVIEWED;
    const alreadyReviewed = await codeOf(() => approve({ approvedMinutes: 60 }));

    expect(declared).toBe(API_ERRORS.VA_OVERTIME_RECLASSIFIED_MIDWAY.code);
    expect(revoked).toBe(
      API_ERRORS.VA_OVERTIME_EMERGENCY_REVOKED_MIDWAY.code,
    );
    expect(alreadyReviewed).toBe(API_ERRORS.VA_OVERTIME_ALREADY_REVIEWED.code);
    /**
     * Info: (20260820 - Julian) 三個兩兩不同 —— 這是這條測試唯一的紅線。
     * 撤回那一側若退回共用 `VA_OVERTIME_RECLASSIFIED_MIDWAY`，主管會讀到
     * 「工資改為加倍發給」而按下去，實際落地的金額卻比他確認過的少。
     */
    expect(new Set([declared, revoked, alreadyReviewed]).size).toBe(3);
  });
});

/**
 * Info: (20260820 - Julian) §32 IV 認定的**重複與撤回**（review 第 3 輪第 2 條）。
 *
 * 認定原本是單向且可無痕覆寫的：
 *
 * - 第二次認定靜默取代前一份的連結、時點與認定者，且回 `DECIDED`
 *   —— 呼叫端看到的與成功的第一次一模一樣。
 * - 撤回沒有任何路徑，而 `assertOvertimeEmergencyRecord` 的反方向
 *   逼得唯一走法是把三欄一起清空 ＝ 硬刪一份對外發生過的紀錄。
 *   那條不變式的註解自己寫下了正解卻沒有實作：「應該留下撤回的痕跡」。
 */
describe("revokeEmergency —— §32 IV 認定的撤回", () => {
  const REVOKE_REASON = "主管機關退回，須重新報備";

  const revoke = (overrides: { actorEmployeeId?: string; reason?: string } = {}) =>
    service.revokeEmergency({
      accountBookId: BOOK,
      requestId: "ot-1",
      actorEmployeeId: overrides.actorEmployeeId ?? HR_ADMIN,
      reason: overrides.reason ?? REVOKE_REASON,
      observedAt: new Date("2026-08-16T02:00:00.000Z"),
    });

  beforeEach(() => {
    context.summary = summaryOf({ isEmergency: true });
  });

  it("HR_ADMIN 撤回別人單子上的認定：成立，撤回三欄都落地", async () => {
    await expect(revoke()).resolves.toBeDefined();
    expect(repo.revoked).toEqual({
      accountBookId: BOOK,
      requestId: "ot-1",
      revokedByEmployeeId: HR_ADMIN,
      revokedAt: new Date("2026-08-16T02:00:00.000Z"),
      revokeReason: REVOKE_REASON,
    });
  });

  /**
   * Info: (20260820 - Julian) 閘門與認定**完全相同**，逐條驗。
   *
   * 撤回會把整段工資從加倍發給降回普通級距 —— 那個方向對雇主有利、
   * 對勞工不利，比認定本身更需要職責分離。少了任一道，
   * 「先認定再自己撤回」就是一條繞過 §32 IV 的路。
   */
  it("沒有 HR_ADMIN 職能：403，且 repository 沒有被呼叫", async () => {
    hasHrFunctionSpy.mockResolvedValue(false);
    expect(await codeOf(() => revoke({ actorEmployeeId: MANAGER }))).toBe(
      API_ERRORS.FO_HR_FUNCTION_REQUIRED.code,
    );
    expect(repo.revoked).toBeNull();
  });

  it("HR_ADMIN 撤回自己單子上的認定：403，且 repository 沒有被呼叫", async () => {
    context.summary = summaryOf({ isEmergency: true, employeeId: HR_ADMIN });
    expect(await codeOf(() => revoke({ actorEmployeeId: HR_ADMIN }))).toBe(
      API_ERRORS.FO_SELF_APPROVAL_FORBIDDEN.code,
    );
    expect(repo.revoked).toBeNull();
  });

  it("自我撤回的判斷排在職能查詢之前", async () => {
    context.summary = summaryOf({ isEmergency: true, employeeId: HR_ADMIN });
    await codeOf(() => revoke({ actorEmployeeId: HR_ADMIN }));
    expect(hasHrFunctionSpy).not.toHaveBeenCalled();
  });

  it.each([
    OvertimeRequestStatus.APPROVED,
    OvertimeRequestStatus.REJECTED,
    OvertimeRequestStatus.WITHDRAWN,
  ])("狀態為 %s 時擋下，且 repository 沒有被呼叫", async (status) => {
    context.summary = summaryOf({ isEmergency: true, status });
    expect(await codeOf(revoke)).toBe(
      API_ERRORS.VA_OVERTIME_ALREADY_REVIEWED.code,
    );
    expect(repo.revoked).toBeNull();
  });

  /**
   * Info: (20260820 - Julian) 三種落空要有三個碼。
   *
   * 合成同一句話的話，人資分不出「主管先決行了」（不用管）與
   * 「本來就沒有認定」（他點錯單子了）—— 而後者若回「已撤回」，
   * 畫面會顯示一個沒有發生過的動作。
   */
  it("沒有可撤回的認定時回專屬的碼，不是「已決行」", async () => {
    repo.revokeOutcome = OvertimeDecisionOutcome.NOT_DECLARED;
    const notDeclared = await codeOf(revoke);

    repo.revokeOutcome = OvertimeDecisionOutcome.ALREADY_REVIEWED;
    const alreadyReviewed = await codeOf(revoke);

    expect(notDeclared).toBe(API_ERRORS.VA_OVERTIME_EMERGENCY_NOT_DECLARED.code);
    expect(alreadyReviewed).toBe(API_ERRORS.VA_OVERTIME_ALREADY_REVIEWED.code);
    expect(notDeclared).not.toBe(alreadyReviewed);
  });

  it("重複認定回專屬的碼，不是「已決行」", async () => {
    repo.declareOutcome = OvertimeDecisionOutcome.ALREADY_DECLARED;
    const code = await codeOf(() =>
      service.declareEmergency({
        accountBookId: BOOK,
        requestId: "ot-1",
        actorEmployeeId: HR_ADMIN,
        reportUrl: "https://example.test/filings/2026-0815-002",
        reportedAt: "2026-08-15T11:00",
        observedAt: new Date("2026-08-15T20:00:00+08:00"),
      }),
    );
    expect(code).toBe(API_ERRORS.VA_OVERTIME_EMERGENCY_ALREADY_DECLARED.code);
    expect(code).not.toBe(API_ERRORS.VA_OVERTIME_ALREADY_REVIEWED.code);
  });
});

/**
 * Info: (20260820 - Julian) 補休折換這條路徑**整個 PR 沒有任何測試走過**
 * （review 第 4 輪第 5 條）。
 *
 * 本檔所有 fixture 的 `compensationMode` 都是 `PAYMENT`，於是
 * `resolveCompensatory` 每一次都在第一個 `if` 就回 null，而它後面那三道閘
 * （沒有補休假別、沒有到期月數、`dayEquivalentMinutes` 從哪來）
 * 一次都沒有被執行過。repository 那一側的
 * `deriveCompensatoryGrantDays` → `assertGrantSource` → `leaveGrant.create`
 * 同樣沒有 —— 那條路徑由 `overtime_compensatory_conversion.test.ts` 接手，
 * 這裡負責的是 service 交出去的那份 `compensatory` payload 對不對。
 */
describe("補休折換：service 交出去的 payload", () => {
  const compensatoryOf = (minutes: number): IOvertimeRequestSummary =>
    summaryOf({
      compensationMode: OvertimeCompensationMode.COMPENSATORY_LEAVE,
      requestedStartMinute: 1020,
      requestedEndMinute: 1020 + minutes,
    });

  /**
   * Info: (20260820 - Julian) 兩件事成對：補休那一份要齊全，且折現那一份**必須是 null**。
   *
   * 只驗前者的話，一份兩者都非 null 的 payload 也會通過，
   * 而 repository 的迴圈是 `if (compensatory) ... continue;` ——
   * 折現會被靜默吃掉，沒有任何人看得出少了一筆。
   */
  it("補休模式交出補休 payload，且不交折現 payload", async () => {
    context.summary = compensatoryOf(120);

    await approve();

    expect(repo.written?.compensatory).toEqual({
      leavePolicyId: "policy-comp",
      dayEquivalentMinutes: 8 * HOUR,
      // Info: (20260820 - Julian) 2026-08-14 往後推 6 個月
      expiresOn: "2027-02-14",
    });
    expect(repo.written?.cashOut).toBeNull();
  });

  // Info: (20260820 - Julian) 對照組：發錢模式的方向剛好相反
  it("發錢模式交出折現 payload，且不交補休 payload", async () => {
    context.summary = summaryOf({
      compensationMode: OvertimeCompensationMode.PAYMENT,
    });

    await approve();

    expect(repo.written?.compensatory).toBeNull();
    expect(repo.written?.cashOut).not.toBeNull();
  });

  /**
   * Info: (20260820 - Julian) 沒有補休假別時擋下，而不是折換到一個不存在的假別。
   * 這一道閘先前沒有任何測試走得到（fixture 全是 `PAYMENT`）。
   */
  it("帳本沒有設補休假別時擋下", async () => {
    context.summary = compensatoryOf(120);
    context.approval = contextOf({ compensatoryPolicyId: null });

    expect(await codeOf(approve)).toBe(API_ERRORS.NF_LEAVE_POLICY.code);
    expect(repo.written).toBeNull();
  });

  /**
   * Info: (20260820 - Julian) §32-1 的補休有到期日，沒協商出期限就不能發。
   * 發出去一筆沒有到期日的補休，等於把它變成永久額度。
   */
  it("帳本沒有設補休到期月數時擋下", async () => {
    context.summary = compensatoryOf(120);
    context.approval = contextOf({ compensatoryExpiryMonths: null });

    expect(await codeOf(approve)).toBe(
      API_ERRORS.VA_OVERTIME_COMP_EXPIRY_UNSET.code,
    );
    expect(repo.written).toBeNull();
  });

  /**
   * Info: (20260820 - Julian) 認列 0 分鐘時不折換，也不因缺設定而擋下。
   *
   * 沒有分段就沒有補休可發 —— 此時去查補休假別是多問一個與結果無關的問題，
   * 而那個問題答不出來會讓一張「核准 0 分鐘」的單子丟出
   * 「帳本沒設補休假別」，主管完全看不懂。
   */
  it("認列 0 分鐘時兩份 payload 都是 null，且不查補休設定", async () => {
    context.summary = compensatoryOf(120);
    context.approval = contextOf({
      compensatoryPolicyId: null,
      compensatoryExpiryMonths: null,
    });

    await approve({ approvedMinutes: 0 });

    expect(repo.written?.segments).toEqual([]);
    expect(repo.written?.compensatory).toBeNull();
    expect(repo.written?.cashOut).toBeNull();
  });
});

/**
 * Info: (20260820 - Julian) 級距依**時間**先後，不是核准先後（review 第 5 輪 M4）。
 *
 * `priorRecognizedMinutes` 的聚合條件只有「同一天、已核准」，沒有任何時間成分。
 * 級距吃它的話，同日兩張單誰拿到前兩小時的 1/3 取決於主管按核准的順序：
 *
 * ```
 * 先核 19:00–21:00 → 它 prior=0 → 1/3；再核 17:00–19:00 → prior=120 → 2/3
 * 反過來按          → 兩者對調
 * ```
 *
 * 同一組事實、不同的工資，而兩次都通過了所有檢查。
 */
describe("同日多張加班單的級距（M4）", () => {
  /**
   * Info: (20260820 - Julian) 兩條成對，且**兩欄的值刻意相反**——
   * 這是唯一能證明「吃的是哪一欄」的形狀。任一欄被誤用，就有一條會紅。
   */
  it("當天已有兩小時、但那兩小時開始得比本次晚 → 本次仍是前兩小時的 1/3", async () => {
    context.approval = contextOf({
      // Info: (20260820 - Julian) 當日總量有 120 分（單日上限看得到）
      priorRecognizedMinutes: 120,
      // Info: (20260820 - Julian) 但沒有一段開始得比本次早（級距看得到的是這個）
      earlierRecognizedMinutes: 0,
    });

    await approve({ approvedMinutes: 60 });

    expect(repo.written?.segments).toEqual([
      { order: 0, tier: OvertimePremiumTier.WEEKDAY_FIRST_2H, minutes: 60 },
    ]);
  });

  it("那兩小時開始得比本次早 → 本次落在第三小時起的 2/3", async () => {
    context.approval = contextOf({
      priorRecognizedMinutes: 120,
      earlierRecognizedMinutes: 120,
    });

    await approve({ approvedMinutes: 60 });

    expect(repo.written?.segments).toEqual([
      { order: 0, tier: OvertimePremiumTier.WEEKDAY_BEYOND_2H, minutes: 60 },
    ]);
  });

  /**
   * Info: (20260820 - Julian) 單日 12 小時的上限**仍然**吃當日總量。
   *
   * 少了這一條，把兩處都改成 `earlierRecognizedMinutes` 也會讓上面兩條通過，
   * 而那會讓一個人靠「先申請晚一點的時段」繞過單日上限。
   */
  it("單日上限吃的是當日總量，不是只有先前那些", async () => {
    context.summary = requestOf(120);
    context.approval = contextOf({
      // Info: (20260820 - Julian) 已有 11 小時，再 2 小時就超過 12 小時
      priorRecognizedMinutes: 11 * HOUR,
      earlierRecognizedMinutes: 0,
      priorMonthlyMinutes: 0,
      priorQuarterlyMinutes: 0,
    });

    expect(await codeOf(() => approve({ approvedMinutes: 120 }))).toBe(
      API_ERRORS.VA_OVERTIME_EXCEEDS_DAILY_LIMIT.code,
    );
  });
});

/**
 * Info: (20260820 - Julian) 「算不出這個人的一天有多長」要有自己的 4xx
 * （review 第 5 輪 M7／M8）。
 *
 * 兩條路徑先前各自用 `?? 0` 與 `?? regularWorkMinutes` 頂替：
 * 前者往下撞成 `OvertimeRuleError`（非 `AppError`）→ route 收斂成 **500**；
 * 後者在非上班日會把 **0** 寫進折現事件，而薪資模組拿它當除數。
 */
describe("一日工時算不出來時的兩條路徑（M7／M8）", () => {
  it("補休折換：回專屬的 4xx，不是 500，且什麼都不寫", async () => {
    context.summary = summaryOf({
      compensationMode: OvertimeCompensationMode.COMPENSATORY_LEAVE,
    });
    context.approval = contextOf({ compensatoryDayEquivalentMinutes: null });

    expect(await codeOf(() => approve({ approvedMinutes: 60 }))).toBe(
      API_ERRORS.VA_OVERTIME_DAY_LENGTH_UNKNOWN.code,
    );
    expect(repo.written).toBeNull();
  });

  /**
   * Info: (20260820 - Julian) 發錢模式在**非上班日**——加班費折現最常發生的日子。
   * `regularWorkMinutes` 那天是 0，而舊式子會拿它當面額寫下去。
   */
  it("加班費折現：非上班日不得把 0 當作一日面額寫進事件", async () => {
    context.approval = contextOf({
      compensatoryDayEquivalentMinutes: null,
      regularWorkMinutes: 0,
    });

    expect(await codeOf(() => approve({ approvedMinutes: 60 }))).toBe(
      API_ERRORS.VA_OVERTIME_DAY_LENGTH_UNKNOWN.code,
    );
    expect(repo.written).toBeNull();
  });

  /**
   * Info: (20260820 - Julian) 對照組：面額算得出來時照常寫入。
   * 少了它，「一律擋」也會讓上面兩條通過。
   */
  it("面額算得出來時照常落地", async () => {
    context.approval = contextOf({ compensatoryDayEquivalentMinutes: 8 * HOUR });

    await approve({ approvedMinutes: 60 });

    expect(repo.written?.cashOut).toEqual({
      dayEquivalentMinutes: 8 * HOUR,
      legalBasis: expect.any(String),
    });
  });
});

/**
 * Info: (20260820 - Julian) 自己的單子不出現在自己的待簽清單裡
 * （review 第 6 輪 M11）。
 *
 * 這一步先前寫在 `employeeRepo.listManagedEmployeeIds` 的查詢條件裡
 * （`id: { not: managerEmployeeId }`）—— 一條職責分離的政策躲在 Repository。
 * 政策搬到 service 之後，這一組是它唯一的執行者：`listManagedEmployeeIds`
 * 現在會回傳含自己的子樹，若 service 忘了過濾，主管的待簽清單上就會出現
 * 自己的單子，而按下去會被 `assertMayDecide` 的
 * `FO_SELF_APPROVAL_FORBIDDEN` 擋掉 —— 正是那段註解說要避免的
 * 「看得到卻簽不動」。
 */
describe("待簽清單排除自己（M11 的政策落點）", () => {
  const listManagedSpy = jest.spyOn(employeeRepo, "listManagedEmployeeIds");

  afterAll(() => {
    listManagedSpy.mockRestore();
  });

  it("repository 回的子樹含自己時，送下去的清單不含自己", async () => {
    // Info: (20260820 - Julian) 這正是搬走 `id: { not: ... }` 之後的回傳形狀
    listManagedSpy.mockResolvedValue(["emp-a", MANAGER, "emp-b"]);

    await service.listPending({
      accountBookId: BOOK,
      actorEmployeeId: MANAGER,
    });

    expect(context.pendingQueriedIds).toEqual(["emp-a", "emp-b"]);
    expect(context.pendingQueriedIds).not.toContain(MANAGER);
  });

  /**
   * Info: (20260820 - Julian) 對照組：其他人一個都不能被順手濾掉。
   * 只斷言「不含自己」的話，一個回空陣列的實作也會通過。
   */
  it("其他人原樣送下去", async () => {
    listManagedSpy.mockResolvedValue(["emp-a", "emp-b"]);

    await service.listPending({
      accountBookId: BOOK,
      actorEmployeeId: MANAGER,
    });

    expect(context.pendingQueriedIds).toEqual(["emp-a", "emp-b"]);
  });
});

/**
 * Info: (20260821 - Julian) 送出端的兩道同日閘（review 第 13 輪第 2 條、第 15 輪）。
 *
 * ## 為什麼擋在送出
 *
 * §24 I 的級距在**核准當下**算一次就落地，而它只數那一刻已經存在、且開始得
 * 更早的分鐘數；分段落地後不會被重算（更正流程未實作）。因此
 * 「先核准較晚那張、較早的事後補」會讓兩張都從 0 起算、都拿 1/3：
 * 17:00–19:00 與 19:00–21:00 各 120 分，合計 80 個工資單位，
 * 而 §24 I 的下限是 120 —— **少付 40**。
 *
 * 那個算術由 `overtime_tier_order_independence.test.ts` 用真的引擎釘住；
 * 這裡釘的是「送出端擋不擋得住」。
 */
describe("送出：同日既有加班單的兩道閘", () => {
  const DAY = "2026-08-20";

  /** Info: (20260821 - Julian) A = 17:00–19:00（較早），B = 19:00–21:00（較晚） */
  const submitEarlier = () =>
    service.submit({
      accountBookId: BOOK,
      employeeId: APPLICANT,
      input: {
        workDate: DAY,
        filingType: OvertimeFilingType.POST_HOC,
        compensationMode: OvertimeCompensationMode.PAYMENT,
        requestedStartMinute: 17 * HOUR,
        requestedEndMinute: 19 * HOUR,
        reason: "工地趕澆置",
      },
      // Info: (20260821 - Julian) 22:00 才補單 —— 晚於班別窗起，POST_HOC 合法
      observedAt: new Date("2026-08-20T14:00:00.000Z"),
    });

  it("同日已有起點更晚的**已核准**單時，擋下並回專屬碼", async () => {
    context.laterStartApprovedId = "ot-b";

    expect(await codeOf(submitEarlier)).toBe(
      API_ERRORS.VA_OVERTIME_EARLIER_THAN_APPROVED.code,
    );
    // Info: (20260821 - Julian) 沒有寫進去 —— 少付的形狀不得落地
    expect(repo.created).toBeNull();
    expect(context.laterStartAskedFor).toBe(17 * HOUR);
  });

  /**
   * Info: (20260821 - Julian) 對照組：那一張還在**待簽**時放行。
   *
   * 少了這一條，一個無條件 `throw` 的實作也會讓上面那條通過 ——
   * 而它會把合法的並行送單全部擋掉。待簽的手足單在自己被核准的當下
   * 會重新讀一次同日較早的分鐘數，屆時就看得到這一張。
   */
  it("同日較晚那張還在待簽時（查詢回 null），照常送出", async () => {
    context.laterStartApprovedId = null;

    await expect(submitEarlier()).resolves.toBeDefined();
    expect(repo.created).not.toBeNull();
  });

  /**
   * Info: (20260821 - Julian) 另一道閘：時段重疊。它先前也沒有任何行為測試。
   * 兩者的分工是硬的 —— 起點相同由這一道擋（相同起點 + 正長度必定相交），
   * 起點不同但更晚且已核准由上一道擋。
   */
  it("同日已有時段重疊的單時，回重疊碼而不是級距碼", async () => {
    context.overlappingId = "ot-c";

    expect(await codeOf(submitEarlier)).toBe(
      API_ERRORS.VA_OVERTIME_OVERLAPS_EXISTING.code,
    );
    expect(repo.created).toBeNull();
  });

  it("那天沒有排班時，回未排班碼", async () => {
    context.scheduledDay = null;

    expect(await codeOf(submitEarlier)).toBe(
      API_ERRORS.VA_OVERTIME_DAY_NOT_SCHEDULED.code,
    );
    expect(repo.created).toBeNull();
  });
});
