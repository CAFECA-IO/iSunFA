import { encryptPii } from "@/lib/hr_pii_crypto";
import { HrPiiTable } from "@/constants/hr_pii";
import { AuditLogAction, AuditLogDataType } from "@/constants/audit_log";
import { randomBytes } from "crypto";
import { HR_PII_KEY_BYTES } from "@/constants/hr_pii";
import { describe, it, expect, beforeEach, beforeAll } from "@jest/globals";
import { LeaveRequestService } from "@/services/leave_request.service";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { WorkDayType } from "@/constants/attendance";
import { LeaveRequestStatus } from "@/constants/leave";
import {
  LeaveApprovalNodeKind,
  LeaveApprovalStepStatus,
  LeaveConcurrencyAction,
  LeaveDaySegment,
  LeaveQuotaMode,
  LeaveRoundingMode,
  LeaveUnitBasis,
} from "@/constants/leave_policy";
import {
  IApprovalOrgSnapshot,
  IApprovalRuleWithSteps,
  ILeaveConcurrencyStatus,
  ILeaveDaySchedule,
  ILeavePolicySnapshot,
  ILeaveRequestContext,
  ILeaveRequestRecord,
  ILeaveRequestRepository,
  ILeaveRequestSummary,
  LeaveApprovalOutcome,
} from "@/interfaces/leave_request";
import { IConsumableGrant } from "@/interfaces/leave_entitlement";

/**
 * Info: (20260817 - Julian) 送出 → 簽核 → 扣額度的編排測試。
 *
 * 用假的 repository 而不是真資料庫：這裡驗的是**編排**——
 * 誰能簽、什麼時候扣、扣多少、失敗時是哪一種失敗。
 * 「有沒有寫進去」是 repository 的事，那需要整合測試（本專案的既有慣例是
 * `src/tests/integration/`，不在單元測試裡 mock Prisma）。
 */

const ANNUAL: ILeavePolicySnapshot = {
  id: "policy-annual",
  code: "ANNUAL",
  quotaMode: LeaveQuotaMode.QUOTA,
  unitBasis: LeaveUnitBasis.FIXED_MINUTES,
  minimumUnitMinutes: 60,
  roundingMode: LeaveRoundingMode.UP,
  // Info: (20260817 - Julian) §38 II：期日由勞工排定，雇主只能協商調整
  employerMayReject: false,
  // Info: (20260821 - Julian) 特休不併入任何假別（review 第 10 輪 B2）
  mergesIntoPolicyId: null,
};

const PERSONAL: ILeavePolicySnapshot = {
  ...ANNUAL,
  id: "policy-personal",
  code: "PERSONAL",
  employerMayReject: true,
};

/**
 * Info: (20260821 - Julian) 併入事假的假別（家庭照顧假，性平法 §20）。
 *
 * 併計扣減尚未實作，送出端必須擋下 —— 放行的話請滿 7 日家庭照顧假之後
 * 事假仍是完整 14 日，法定上限被繞過（review 第 10 輪 B2、計畫書 §17 缺口 17）。
 */
const FAMILY_CARE: ILeavePolicySnapshot = {
  ...ANNUAL,
  id: "policy-family-care",
  code: "FAMILY_CARE",
  employerMayReject: true,
  mergesIntoPolicyId: PERSONAL.id,
};

const WORK_DAY: ILeaveDaySchedule = {
  dayType: WorkDayType.WORK,
  shift: { requiredWorkMinutes: 480, breakMinutes: 60 },
  // Info: (20260819 - Julian) 08:00–17:00。連續時段的首末日靠它切區間
  core: { startMinute: 8 * 60, endMinute: 17 * 60 },
};

const identity = (id: string, no: string, name: string) => ({
  employeeId: id,
  employeeNo: no,
  name,
  jobTitle: null,
});

const ORG: IApprovalOrgSnapshot = {
  applicantEmployeeId: "emp-staff",
  directManagerId: "emp-lead",
  departmentManagerId: "emp-dept",
  hrEmployeeIds: ["emp-hr"],
  directory: {
    "emp-staff": identity("emp-staff", "EMP001", "王小明"),
    "emp-lead": identity("emp-lead", "EMP002", "李組長"),
    "emp-dept": identity("emp-dept", "EMP003", "陳經理"),
    "emp-hr": identity("emp-hr", "EMP004", "林人資"),
  },
};

const RULES: IApprovalRuleWithSteps[] = [
  {
    leavePolicyId: null,
    minDays: 0,
    maxDays: 3,
    steps: [
      {
        order: 0,
        nodeKind: LeaveApprovalNodeKind.DIRECT_MANAGER,
        specificEmployeeId: null,
      },
    ],
  },
  {
    leavePolicyId: null,
    minDays: 3,
    maxDays: null,
    steps: [
      {
        order: 0,
        nodeKind: LeaveApprovalNodeKind.DIRECT_MANAGER,
        specificEmployeeId: null,
      },
      {
        order: 1,
        nodeKind: LeaveApprovalNodeKind.DEPARTMENT_MANAGER,
        specificEmployeeId: null,
      },
    ],
  },
];

class FakeContext implements ILeaveRequestContext {
  public policy: ILeavePolicySnapshot | null = ANNUAL;
  public rules: IApprovalRuleWithSteps[] = RULES;
  public org: IApprovalOrgSnapshot = ORG;
  public schedules: Record<string, ILeaveDaySchedule | undefined> = {};
  public grants: IConsumableGrant[] = [];
  public concurrency: ILeaveConcurrencyStatus[] = [];

  async findActivePolicy() {
    return this.policy;
  }
  async findApprovalRules() {
    return this.rules;
  }
  async buildOrgSnapshot() {
    return this.org;
  }
  async findSchedules() {
    return this.schedules;
  }
  async findConsumableGrants() {
    return this.grants;
  }
  async findConcurrencyStatus() {
    return this.concurrency;
  }
}

class FakeRepository implements ILeaveRequestRepository {
  public record: ILeaveRequestRecord | null = null;
  public created: unknown = null;
  public completed: unknown = null;
  public advanced: unknown = null;
  public rejected: unknown = null;
  public nextOutcome: LeaveApprovalOutcome | null = null;

  async findById() {
    return this.record;
  }
  async createWithChain(
    params: Parameters<ILeaveRequestRepository["createWithChain"]>[0],
  ) {
    this.created = params;
    return {
      id: "req-1",
      accountBookId: params.accountBookId,
      employeeId: params.employeeId,
      leavePolicyId: params.leavePolicyId,
      status: LeaveRequestStatus.PENDING,
      totalMinutes: params.totalMinutes,
      /**
       * Info: (20260819 - Julian) 落地參數是精確十進位**字串**，讀回來的
       * record 仍是 number（review B5）。這裡照真的 repository 一樣做一次
       * `Number()` —— 假物件若自己省掉這一步，就會替 service 掩蓋掉
       * 「寫進去的型別和讀出來的型別不同」這件事。
       */
      totalDays: Number(params.totalDays),
      days: params.days.map((day, index) => ({
        id: `day-${index}`,
        workDate: day.workDate,
        minutes: day.minutes,
      })),
      steps: params.steps.map((step, index) => ({
        id: `step-${index}`,
        order: step.order,
        nodeKind: step.nodeKind,
        approverEmployeeId: step.approver.employeeId,
        approverEmployeeNo: step.approver.employeeNo,
        approverName: step.approver.name,
        status: LeaveApprovalStepStatus.PENDING,
        isPending: index === 0,
      })),
    };
  }
  async advanceStep(params: unknown) {
    this.advanced = params;
    return this.nextOutcome ?? LeaveApprovalOutcome.ADVANCED;
  }
  async completeApproval(params: unknown) {
    this.completed = params;
    return this.nextOutcome ?? LeaveApprovalOutcome.COMPLETED;
  }
  async rejectStep(params: unknown) {
    this.rejected = params;
    return this.nextOutcome ?? LeaveApprovalOutcome.COMPLETED;
  }
  async withdraw() {
    return this.nextOutcome ?? LeaveApprovalOutcome.COMPLETED;
  }

  // Info: (20260817 - Julian) 清單與明細
  public summaries: ILeaveRequestSummary[] = [];
  public pending: ILeaveRequestSummary[] = [];

  async findSummaryById() {
    return this.summaries[0] ?? null;
  }
  async listByEmployee() {
    return this.summaries;
  }
  async listPendingForApprover() {
    return this.pending;
  }

  public detail: unknown = null;

  async findDetailById() {
    return this.detail as never;
  }
}

/**
 * Info: (20260817 - Julian) 個資讀取軌跡的假物件。
 *
 * 第一版是靠一個容器專用的替身檔攔截 `auditLogRepo` 單例 ——
 * 而那個檔案不進 repo，於是這支測試在別人的機器上直接跑不起來。
 * service 改為注入之後，測試帶自己的就好。
 */
class FakeAuditTrail {
  public writes: Record<string, unknown>[] = [];

  async createAuditLog(data: Record<string, unknown>) {
    this.writes.push(data);
    return data;
  }
}

let audit: FakeAuditTrail;

const grant = (
  grantId: string,
  expiresOn: string,
  remainingMinutes: number,
): IConsumableGrant => ({
  grantId,
  expiresOn,
  remainingMinutes,
  createdAt: "2026-01-01T00:00:00.000Z",
});

const AT = new Date("2026-08-17T02:00:00.000Z");

let context: FakeContext;
let repo: FakeRepository;
let service: LeaveRequestService;

beforeEach(() => {
  context = new FakeContext();
  repo = new FakeRepository();
  context.schedules = {
    "2026-08-18": WORK_DAY,
    "2026-08-19": WORK_DAY,
    "2026-08-20": WORK_DAY,
  };
  context.grants = [grant("g1", "2027-12-31", 4800)];
  audit = new FakeAuditTrail();
  service = new LeaveRequestService(repo, context, audit);
});

/**
 * Info: (20260819 - Julian) payload 改成「日期＋時刻」的連續時段。
 *
 * 逐日展開移到 service（`expandLeaveSpan`）——「起 8/18 08:00、迄 8/19 17:00」
 * 展開成兩個 `CUSTOM`，各自被夾到當日應工作分鐘（480），總計仍是 960。
 * 也就是說下面那些期望值**沒有變**，變的只是使用者怎麼表達同一件事。
 *
 * 半天用 `08:00–12:00`：240 分鐘，與原本的 `MORNING` 等值。工地人員本來
 * 就是這樣說的 —— 他們不說「上半天」，他們說「我中午前不在」。
 */
const spanInput = (startAt: string, endAt: string) => ({
  leavePolicyId: "policy-annual",
  reason: "家中有事",
  startAt,
  endAt,
});

/** Info: (20260819 - Julian) 整天：以班別核心區間 08:00–17:00 表達 */
const submitInput = (days: string[]) =>
  spanInput(`${days[0]}T08:00`, `${days[days.length - 1]}T17:00`);

/**
 * Info: (20260817 - Julian) 送出假單會加密事由（ADR 018 Tier 2），因此測試需要一把金鑰。
 * 沿用 `attendance_punch.service.test.ts` 的作法：每次跑產生一把隨機金鑰，
 * 不共用固定值 —— 一個寫死在測試裡的金鑰遲早會被複製到別的地方。
 */
beforeAll(() => {
  process.env.HR_PII_KEY_V1 = randomBytes(HR_PII_KEY_BYTES).toString("base64");
});

describe("preview — 試算不寫入、不預扣", () => {
  it("算出逐日分鐘、總日數、餘額與簽核關數", async () => {
    const preview = await service.preview({
      accountBookId: "book-1",
      employeeId: "emp-staff",
      input: submitInput(["2026-08-18", "2026-08-19"]),
      observedAt: AT,
    });

    expect(preview.totalMinutes).toBe(960);
    expect(preview.totalDays).toBe(2);
    expect(preview.remainingMinutesBefore).toBe(4800);
    expect(preview.remainingMinutesAfter).toBe(3840);
    expect(preview.shortfallMinutes).toBe(0);
    expect(preview.approvalSteps).toHaveLength(1);
    expect(repo.created).toBeNull();
  });

  it("半天請假只算半天", async () => {
    const preview = await service.preview({
      accountBookId: "book-1",
      employeeId: "emp-staff",
      input: spanInput("2026-08-18T08:00", "2026-08-18T12:00"),
      observedAt: AT,
    });
    expect(preview.totalMinutes).toBe(240);
    expect(preview.totalDays).toBe(0.5);
  });

  /**
   * Info: (20260817 - Julian) 三天走長假規則（左閉右開，恰好 3 天即長假）。
   * 試算就要看得到會簽幾關 —— 這是員工決定要不要拆單的依據。
   */
  it("三天顯示兩關簽核", async () => {
    const preview = await service.preview({
      accountBookId: "book-1",
      employeeId: "emp-staff",
      input: submitInput(["2026-08-18", "2026-08-19", "2026-08-20"]),
      observedAt: AT,
    });
    expect(preview.totalDays).toBe(3);
    expect(preview.approvalSteps).toHaveLength(2);
  });

  it("額度不足時回報缺口而不是丟例外（試算不該失敗）", async () => {
    context.grants = [grant("g1", "2027-12-31", 240)];
    const preview = await service.preview({
      accountBookId: "book-1",
      employeeId: "emp-staff",
      input: submitInput(["2026-08-18", "2026-08-19"]),
      observedAt: AT,
    });
    expect(preview.shortfallMinutes).toBe(720);
  });

  it("簽核鏈展不開時回報成因，仍然回傳試算結果", async () => {
    context.org = { ...ORG, directManagerId: null };
    const preview = await service.preview({
      accountBookId: "book-1",
      employeeId: "emp-staff",
      input: submitInput(["2026-08-18"]),
      observedAt: AT,
    });
    expect(preview.approvalSteps).toEqual([]);
    expect(preview.unresolvedReason).toBe("NO_DIRECT_MANAGER");
  });

  /**
   * Info: (20260817 - Julian) 特休（employerMayReject = false）的併休超限
   * 永遠不是 blocking —— §38 II 期日由勞工排定，硬擋等於行使一個
   * 法律上沒有的否決權（計畫書 §D14）。
   */
  it("特休的併休超限只警示不阻擋", async () => {
    context.concurrency = [
      {
        workDate: "2026-08-18",
        observedCount: 5,
        limitValue: 3,
        action: LeaveConcurrencyAction.BLOCK,
      },
    ];
    const preview = await service.preview({
      accountBookId: "book-1",
      employeeId: "emp-staff",
      input: submitInput(["2026-08-18"]),
      observedAt: AT,
    });
    expect(preview.concurrencyWarnings[0].blocking).toBe(false);
  });
});

describe("submit — 送出", () => {
  it("把試算結果原封不動交給 repository", async () => {
    await service.submit({
      accountBookId: "book-1",
      employeeId: "emp-staff",
      input: submitInput(["2026-08-18", "2026-08-19"]),
      observedAt: AT,
    });
    // Info: (20260819 - Julian) `"2"` 而不是 `2`：落地的是精確十進位字串（review B5）
    expect(repo.created).toMatchObject({
      totalMinutes: 960,
      totalDays: "2",
      leavePolicyId: "policy-annual",
    });
  });

  /**
   * Info: (20260817 - Julian) 送出時**不預扣**：預扣要處理駁回、撤回、
   * 主管離職三條補償路徑，每一條都是一個可能漏掉的分支（ADR 023 §6.2）。
   */
  it("不預扣額度（送出不呼叫任何扣減）", async () => {
    await service.submit({
      accountBookId: "book-1",
      employeeId: "emp-staff",
      input: submitInput(["2026-08-18"]),
      observedAt: AT,
    });
    expect(repo.completed).toBeNull();
  });

  it("額度不足時擋下", async () => {
    context.grants = [grant("g1", "2027-12-31", 60)];
    await expect(
      service.submit({
        accountBookId: "book-1",
        employeeId: "emp-staff",
        input: submitInput(["2026-08-18"]),
        observedAt: AT,
      }),
    ).rejects.toMatchObject({ apiCode: "VA000069" });
  });

  /**
   * Info: (20260817 - Julian) 展不開 → 拒絕送出，**不是自動核准**。
   * 自動核准會讓一個設定缺口靜默地變成一張看起來正常的生效假單。
   */
  it("簽核鏈展不開時拒絕送出（而不是自動核准）", async () => {
    context.org = { ...ORG, directManagerId: null };
    await expect(
      service.submit({
        accountBookId: "book-1",
        employeeId: "emp-staff",
        input: submitInput(["2026-08-18"]),
        observedAt: AT,
      }),
    ).rejects.toMatchObject({ apiCode: "CF000009" });
    expect(repo.created).toBeNull();
  });

  it("非上班日請假擋下（會扣額度卻不產生任何效果）", async () => {
    context.schedules = {
      "2026-08-18": { dayType: WorkDayType.REST_DAY, shift: null, core: null },
    };
    await expect(
      service.submit({
        accountBookId: "book-1",
        employeeId: "emp-staff",
        input: submitInput(["2026-08-18"]),
        observedAt: AT,
      }),
    ).rejects.toMatchObject({ apiCode: "VA000055" });
  });

  it("沒有排班紀錄的日子也擋下", async () => {
    context.schedules = {};
    await expect(
      service.submit({
        accountBookId: "book-1",
        employeeId: "emp-staff",
        input: submitInput(["2026-08-18"]),
        observedAt: AT,
      }),
    ).rejects.toMatchObject({ apiCode: "VA000055" });
  });

  /**
   * Info: (20260821 - Julian) **設了併計的假別一律擋下**（review 第 10 輪 B2）。
   *
   * `mergesIntoPolicyId` 在整個扣減路徑上零讀取端 —— 放行等於讓法定額度被繞過：
   * 請滿 7 日家庭照顧假之後事假仍是完整 14 日（性平法 §20 的上限是 14 日）。
   *
   * 結構面（「扣減路徑真的還沒有讀取端」）由 `leave_merge_gate.test.ts` 掃，
   * 這一條驗的是**行為**：那道閘真的丟得出那個碼。
   */
  it("設了 mergesIntoPolicyId 的假別擋在送出端", async () => {
    context.policy = FAMILY_CARE;

    await expect(
      service.submit({
        accountBookId: "book-1",
        employeeId: "emp-staff",
        input: submitInput(["2026-08-18"]),
        observedAt: AT,
      }),
    ).rejects.toMatchObject({
      apiCode: API_ERRORS.VA_LEAVE_MERGE_NOT_IMPLEMENTED.code,
    });
    // Info: (20260821 - Julian) 而且一個字都沒寫進去
    expect(repo.created).toBeNull();
  });

  /**
   * Info: (20260821 - Julian) 對照組：沒設併計的假別照常送得出去。
   * 少了它，一個無條件 `throw` 的實作也會讓上面那條通過 —— 而它會把
   * 整個請假功能擋死。
   */
  it("沒設 mergesIntoPolicyId 的假別不受影響", async () => {
    context.policy = PERSONAL;

    await expect(
      service.submit({
        accountBookId: "book-1",
        employeeId: "emp-staff",
        input: submitInput(["2026-08-18"]),
        observedAt: AT,
      }),
    ).resolves.toBeDefined();
  });

  it("假別不存在或已停用時回 404", async () => {
    context.policy = null;
    await expect(
      service.submit({
        accountBookId: "book-1",
        employeeId: "emp-staff",
        input: submitInput(["2026-08-18"]),
        observedAt: AT,
      }),
    ).rejects.toMatchObject({ apiCode: "NF000028" });
  });

  it("雇主有准駁權的假別，併休超限時擋下", async () => {
    context.policy = PERSONAL;
    context.concurrency = [
      {
        workDate: "2026-08-18",
        observedCount: 5,
        limitValue: 3,
        action: LeaveConcurrencyAction.BLOCK,
      },
    ];
    await expect(
      service.submit({
        accountBookId: "book-1",
        employeeId: "emp-staff",
        input: submitInput(["2026-08-18"]),
        observedAt: AT,
      }),
    ).rejects.toMatchObject({ apiCode: "CF000011" });
  });

  it("特休的併休超限不擋，但在單據上留下警示紀錄", async () => {
    context.concurrency = [
      {
        workDate: "2026-08-18",
        observedCount: 5,
        limitValue: 3,
        action: LeaveConcurrencyAction.BLOCK,
      },
    ];
    await service.submit({
      accountBookId: "book-1",
      employeeId: "emp-staff",
      input: submitInput(["2026-08-18"]),
      observedAt: AT,
    });
    expect(repo.created).toMatchObject({ concurrencyWarned: true });
  });
});

describe("approve — 職責分離", () => {
  const pendingRequest = (
    overrides: Partial<ILeaveRequestRecord> = {},
  ): ILeaveRequestRecord => ({
    id: "req-1",
    accountBookId: "book-1",
    employeeId: "emp-staff",
    leavePolicyId: "policy-annual",
    status: LeaveRequestStatus.PENDING,
    totalMinutes: 480,
    totalDays: 1,
    days: [{ id: "day-0", workDate: "2026-08-18", minutes: 480 }],
    steps: [
      {
        id: "step-0",
        order: 0,
        nodeKind: LeaveApprovalNodeKind.DIRECT_MANAGER,
        approverEmployeeId: "emp-lead",
        approverEmployeeNo: "EMP002",
        approverName: "李組長",
        status: LeaveApprovalStepStatus.PENDING,
        isPending: true,
      },
    ],
    ...overrides,
  });

  it("鏈上的簽核者可以簽", async () => {
    repo.record = pendingRequest();
    const outcome = await service.approve({
      accountBookId: "book-1",
      requestId: "req-1",
      actorEmployeeId: "emp-lead",
      observedAt: AT,
    });
    expect(outcome).toBe(LeaveApprovalOutcome.COMPLETED);
  });

  it("不得自我核准", async () => {
    repo.record = pendingRequest({
      steps: [
        {
          id: "step-0",
          order: 0,
          nodeKind: LeaveApprovalNodeKind.DIRECT_MANAGER,
          approverEmployeeId: "emp-staff",
          approverEmployeeNo: "EMP001",
          approverName: "王小明",
          status: LeaveApprovalStepStatus.PENDING,
          isPending: true,
        },
      ],
    });
    await expect(
      service.approve({
        accountBookId: "book-1",
        requestId: "req-1",
        actorEmployeeId: "emp-staff",
        observedAt: AT,
      }),
    ).rejects.toMatchObject({ apiCode: "FO000014" });
  });

  /**
   * Info: (20260817 - Julian) 順序不是隨意的：先擋自我核准再擋非授權簽核者。
   * 反過來的話，把自己設成自己主管的人會收到「你不是簽核者」，
   * 而他明明就在鏈上 —— 那個訊息會讓他去找 HR 改權限，改不好。
   */
  it("非鏈上節點不得代簽", async () => {
    repo.record = pendingRequest();
    await expect(
      service.approve({
        accountBookId: "book-1",
        requestId: "req-1",
        actorEmployeeId: "emp-hr",
        observedAt: AT,
      }),
    ).rejects.toMatchObject({ apiCode: "FO000015" });
  });

  it("已決之單不得再簽", async () => {
    repo.record = pendingRequest({ status: LeaveRequestStatus.APPROVED });
    await expect(
      service.approve({
        accountBookId: "book-1",
        requestId: "req-1",
        actorEmployeeId: "emp-lead",
        observedAt: AT,
      }),
    ).rejects.toMatchObject({ apiCode: "VA000049" });
  });

  it("單據不存在時回 404", async () => {
    repo.record = null;
    await expect(
      service.approve({
        accountBookId: "book-1",
        requestId: "req-1",
        actorEmployeeId: "emp-lead",
        observedAt: AT,
      }),
    ).rejects.toMatchObject({ apiCode: "NF000027" });
  });
});

describe("approve — 扣額度只發生在最後一關", () => {
  const twoStepRequest = (pendingIndex: number): ILeaveRequestRecord => ({
    id: "req-2",
    accountBookId: "book-1",
    employeeId: "emp-staff",
    leavePolicyId: "policy-annual",
    status: LeaveRequestStatus.PENDING,
    totalMinutes: 1440,
    totalDays: 3,
    days: [{ id: "day-0", workDate: "2026-08-18", minutes: 480 }],
    steps: [
      {
        id: "step-0",
        order: 0,
        nodeKind: LeaveApprovalNodeKind.DIRECT_MANAGER,
        approverEmployeeId: "emp-lead",
        approverEmployeeNo: "EMP002",
        approverName: "李組長",
        status: LeaveApprovalStepStatus.PENDING,
        isPending: pendingIndex === 0,
      },
      {
        id: "step-1",
        order: 1,
        nodeKind: LeaveApprovalNodeKind.DEPARTMENT_MANAGER,
        approverEmployeeId: "emp-dept",
        approverEmployeeNo: "EMP003",
        approverName: "陳經理",
        status: LeaveApprovalStepStatus.PENDING,
        isPending: pendingIndex === 1,
      },
    ],
  });

  it("中間節點只推進，不扣額度", async () => {
    repo.record = twoStepRequest(0);
    const outcome = await service.approve({
      accountBookId: "book-1",
      requestId: "req-2",
      actorEmployeeId: "emp-lead",
      observedAt: AT,
    });
    expect(outcome).toBe(LeaveApprovalOutcome.ADVANCED);
    expect(repo.advanced).toMatchObject({ stepId: "step-0" });
    expect(repo.completed).toBeNull();
  });

  /**
   * Info: (20260817 - Julian) service **不把分配結果傳給 repository**：
   * 分配要在交易內依交易內讀到的餘額重算，這裡算好的那一份在另一張單
   * 先扣走之後就是舊的。它在這裡的用途只有一個 —— 在開交易之前
   * 給出「額度不足」這個較友善的失敗（FIFO 本身由 leave_allocation_fifo.test.ts 驗）。
   */
  it("最後一關只把總量交給 repository，分配留在交易內重算", async () => {
    repo.record = twoStepRequest(1);
    context.grants = [
      grant("g-late", "2027-12-31", 960),
      grant("g-soon", "2026-12-31", 960),
    ];
    await service.approve({
      accountBookId: "book-1",
      requestId: "req-2",
      actorEmployeeId: "emp-dept",
      observedAt: AT,
    });
    expect(repo.completed).toMatchObject({
      stepId: "step-1",
      totalMinutes: 1440,
      leavePolicyId: "policy-annual",
    });
    expect(repo.completed).not.toHaveProperty("allocations");
  });

  it("最後一關時額度已不足則擋下（不寫入任何東西）", async () => {
    repo.record = twoStepRequest(1);
    context.grants = [grant("g1", "2027-12-31", 60)];
    await expect(
      service.approve({
        accountBookId: "book-1",
        requestId: "req-2",
        actorEmployeeId: "emp-dept",
        observedAt: AT,
      }),
    ).rejects.toMatchObject({ apiCode: "VA000069" });
    expect(repo.completed).toBeNull();
  });

  /**
   * Info: (20260817 - Julian) 兩張單同時送出、都通過送出時的檢查、先後核准 ——
   * 第二張在核准時才失敗（ADR 023 §6.3）。這不是故障，是併發下的正常結局，
   * 但呼叫端需要一個與「額度不足」不同的錯誤碼才能給出正確訊息。
   */
  it("扣減時輸給另一張單，回報 CF_LEAVE_BALANCE_RACE 而非額度不足", async () => {
    repo.record = twoStepRequest(1);
    repo.nextOutcome = LeaveApprovalOutcome.BALANCE_RACE;
    await expect(
      service.approve({
        accountBookId: "book-1",
        requestId: "req-2",
        actorEmployeeId: "emp-dept",
        observedAt: AT,
      }),
    ).rejects.toMatchObject({ apiCode: "CF000012" });
  });

  /**
   * Info: (20260821 - Julian) 那一天已經有另一張生效中的假單（review 第 11 輪 B3）。
   *
   * **不需要併發**：同一人對同一天送出事假與病假（兩張待簽可以涵蓋同一天），
   * 核准第一張、再核准第二張就撞上 `LeaveDay.activeKey` 的唯一鍵。
   *
   * 這一條之前不存在，而 `CF_LEAVE_DAY_ALREADY_ACTIVE` 也從未被丟過 ——
   * 錯誤碼、五個語系文案、兩支字典形狀測試都備好了，中間少一段接線，
   * 症狀是 500。
   */
  it("那一天已有生效假單，回報 CF_LEAVE_DAY_ALREADY_ACTIVE 而非 500", async () => {
    repo.record = twoStepRequest(1);
    repo.nextOutcome = LeaveApprovalOutcome.DAY_ALREADY_ACTIVE;
    await expect(
      service.approve({
        accountBookId: "book-1",
        requestId: "req-2",
        actorEmployeeId: "emp-dept",
        observedAt: AT,
      }),
    ).rejects.toMatchObject({
      apiCode: API_ERRORS.CF_LEAVE_DAY_ALREADY_ACTIVE.code,
    });
  });

  it("同一關被另一個分頁先簽掉，回報已決", async () => {
    repo.record = twoStepRequest(0);
    repo.nextOutcome = LeaveApprovalOutcome.ALREADY_REVIEWED;
    await expect(
      service.approve({
        accountBookId: "book-1",
        requestId: "req-2",
        actorEmployeeId: "emp-lead",
        observedAt: AT,
      }),
    ).rejects.toMatchObject({ apiCode: "VA000049" });
  });

  it("不受額度限制的假別不查也不扣額度", async () => {
    context.policy = {
      ...ANNUAL,
      quotaMode: LeaveQuotaMode.UNLIMITED,
    };
    repo.record = twoStepRequest(1);
    context.grants = [];
    await service.approve({
      accountBookId: "book-1",
      requestId: "req-2",
      actorEmployeeId: "emp-dept",
      observedAt: AT,
    });
    expect(repo.completed).toMatchObject({ totalMinutes: 1440 });
  });
});

describe("reject / withdraw", () => {
  const request = (): ILeaveRequestRecord => ({
    id: "req-3",
    accountBookId: "book-1",
    employeeId: "emp-staff",
    leavePolicyId: "policy-annual",
    status: LeaveRequestStatus.PENDING,
    totalMinutes: 480,
    totalDays: 1,
    days: [{ id: "day-0", workDate: "2026-08-18", minutes: 480 }],
    steps: [
      {
        id: "step-0",
        order: 0,
        nodeKind: LeaveApprovalNodeKind.DIRECT_MANAGER,
        approverEmployeeId: "emp-lead",
        approverEmployeeNo: "EMP002",
        approverName: "李組長",
        status: LeaveApprovalStepStatus.PENDING,
        isPending: true,
      },
    ],
  });

  it("駁回不動額度", async () => {
    repo.record = request();
    await service.reject({
      accountBookId: "book-1",
      requestId: "req-3",
      actorEmployeeId: "emp-lead",
      observedAt: AT,
    });
    expect(repo.rejected).toMatchObject({ stepId: "step-0" });
    expect(repo.completed).toBeNull();
  });

  it("只有申請人自己能撤回", async () => {
    repo.record = request();
    await expect(
      service.withdraw({
        accountBookId: "book-1",
        requestId: "req-3",
        actorEmployeeId: "emp-lead",
        observedAt: AT,
      }),
    ).rejects.toBeInstanceOf(AppError);

    await expect(
      service.withdraw({
        accountBookId: "book-1",
        requestId: "req-3",
        actorEmployeeId: "emp-staff",
        observedAt: AT,
      }),
    ).resolves.toBe(LeaveApprovalOutcome.COMPLETED);
  });

  it("已核准的單不能撤回", async () => {
    repo.record = { ...request(), status: LeaveRequestStatus.APPROVED };
    await expect(
      service.withdraw({
        accountBookId: "book-1",
        requestId: "req-3",
        actorEmployeeId: "emp-staff",
        observedAt: AT,
      }),
    ).rejects.toMatchObject({ apiCode: "VA000049" });
  });
});

describe("list / listPending / get — 可見範圍", () => {
  const summary = (id: string, employeeId: string): ILeaveRequestSummary => ({
    id,
    employeeId,
    employeeNo: "EMP001",
    employeeName: "王小明",
    leavePolicyId: "policy-annual",
    leavePolicyCode: "ANNUAL",
    leavePolicyName: "特別休假",
    status: LeaveRequestStatus.PENDING,
    totalMinutes: 480,
    totalDays: 1,
    firstWorkDate: "2026-08-18",
    lastWorkDate: "2026-08-18",
    pendingStepOrder: 0,
    pendingApproverName: "李組長",
    totalSteps: 1,
    createdAt: "2026-08-17T00:00:00.000Z",
  });

  const recordFor = (
    employeeId: string,
    approverId: string,
  ): ILeaveRequestRecord => ({
    id: "req-1",
    accountBookId: "book-1",
    employeeId,
    leavePolicyId: "policy-annual",
    status: LeaveRequestStatus.PENDING,
    totalMinutes: 480,
    totalDays: 1,
    days: [{ id: "day-0", workDate: "2026-08-18", minutes: 480 }],
    steps: [
      {
        id: "step-0",
        order: 0,
        nodeKind: LeaveApprovalNodeKind.DIRECT_MANAGER,
        approverEmployeeId: approverId,
        approverEmployeeNo: "EMP002",
        approverName: "李組長",
        status: LeaveApprovalStepStatus.PENDING,
        isPending: true,
      },
    ],
  });

  it("未指定員工即為自己，直接回傳", async () => {
    repo.summaries = [summary("req-1", "emp-staff")];
    const rows = await service.list({
      accountBookId: "book-1",
      actorEmployeeId: "emp-staff",
      query: {},
    });
    expect(rows).toHaveLength(1);
  });

  it("看他人的假單：自己在鏈上才看得到", async () => {
    repo.summaries = [summary("req-1", "emp-staff")];
    repo.record = recordFor("emp-staff", "emp-lead");
    const rows = await service.list({
      accountBookId: "book-1",
      actorEmployeeId: "emp-lead",
      query: { employeeId: "emp-staff" },
    });
    expect(rows).toHaveLength(1);
  });

  /**
   * Info: (20260817 - Julian) 一張都看不到時擋下，而不是回空陣列 ——
   * 空陣列是對資料的陳述（「他沒請過假」），被擋是對請求的陳述
   * （「你不能看他的假單」）。混在一起會讓人以為同事從不請假。
   */
  it("看他人的假單且完全不在鏈上：擋下而不是回空陣列", async () => {
    repo.summaries = [summary("req-1", "emp-staff")];
    repo.record = recordFor("emp-staff", "emp-lead");
    await expect(
      service.list({
        accountBookId: "book-1",
        actorEmployeeId: "emp-hr",
        query: { employeeId: "emp-staff" },
      }),
    ).rejects.toMatchObject({ apiCode: "FO000016" });
  });

  it("待我簽核直接由 repository 依 pendingKey 篩選", async () => {
    repo.pending = [summary("req-9", "emp-staff")];
    const rows = await service.listPending({
      accountBookId: "book-1",
      actorEmployeeId: "emp-lead",
    });
    expect(rows.map((row) => row.id)).toEqual(["req-9"]);
  });

  /**
   * Info: (20260817 - Julian) 明細列的假資料。
   *
   * 事由用**真的** `encryptPii` 加密，AAD 綁著同一個 `recordId` ——
   * 塞一個假字串進去，`decryptReason` 的 catch 分支會吞掉它然後回 null，
   * 而測試會「通過」。那樣就等於沒有測到解密。
   */
  const detailRow = (
    requestId = "req-1",
    applicantId = "emp-staff",
    reason = "回診複檢",
  ) => {
    const cipher = encryptPii(reason, {
      table: HrPiiTable.LEAVE_REQUEST,
      field: "reasonCipher",
      recordId: requestId,
    });
    return {
      id: requestId,
      employeeId: applicantId,
      reasonCipher: cipher.cipher,
      piiKeyVersion: cipher.keyVersion,
      concurrencyWarned: false,
      days: [
        {
          workDate: "2026-08-20",
          segment: LeaveDaySegment.FULL,
          startMinute: null,
          endMinute: null,
          minutes: 480,
          dayEquivalentMinutes: 480,
          recalledAt: null,
        },
      ],
      approvalSteps: [
        {
          order: 1,
          nodeKind: LeaveApprovalNodeKind.DIRECT_MANAGER,
          approverEmployeeId: "emp-lead",
          approverEmployeeNo: "EMP005",
          approverName: "張文彬",
          approverJobTitle: "工地主任",
          status: LeaveApprovalStepStatus.PENDING,
          mergedFromKinds: [],
          escalatedReason: null,
          decidedAt: null,
          comment: null,
          pendingKey: "emp-lead:req-1",
        },
      ],
    };
  };

  it("明細：申請人本人看得到，事由解得開", async () => {
    repo.detail = detailRow();
    repo.summaries = [summary("req-1", "emp-staff")];

    const result = await service.get({
      accountBookId: "book-1",
      requestId: "req-1",
      actorEmployeeId: "emp-staff",
      actorUserId: "user-staff",
    });

    expect(result.reason).toBe("回診複檢");
    expect(result.summary.id).toBe("req-1");
    expect(result.viewerIsCurrentApprover).toBe(false);
  });

  /**
   * Info: (20260817 - Julian) 「個資被看過本身就是事件」的前提是**被看的與看的
   * 不是同一個人**。本人看自己的也記，軌跡會被自己的瀏覽紀錄淹沒，
   * 而「誰看過我的病假事由」這個唯一重要的問題反而查不出來。
   */
  it("明細：本人看自己的不留個資軌跡", async () => {
    repo.detail = detailRow();
    repo.summaries = [summary("req-1", "emp-staff")];

    await service.get({
      accountBookId: "book-1",
      requestId: "req-1",
      actorEmployeeId: "emp-staff",
      actorUserId: "user-staff",
    });

    expect(audit.writes).toEqual([]);
  });

  it("明細：簽核者看得到，且留下個資軌跡", async () => {
    repo.detail = detailRow();
    repo.summaries = [summary("req-1", "emp-staff")];

    const result = await service.get({
      accountBookId: "book-1",
      requestId: "req-1",
      actorEmployeeId: "emp-lead",
      actorUserId: "user-lead",
    });

    expect(result.reason).toBe("回診複檢");
    // Info: (20260817 - Julian) 待簽者要看得到簽核鈕
    expect(result.viewerIsCurrentApprover).toBe(true);
    // Info: (20260817 - Julian) dataId 是**申請人**，不是假單 —— 調查軸線是「哪些人受影響」
    expect(audit.writes).toEqual([
      {
        userId: "user-lead",
        accountBookId: "book-1",
        dataType: AuditLogDataType.EMPLOYEE_PII,
        dataId: "emp-staff",
        action: AuditLogAction.READ,
      },
    ]);
  });

  it("明細：不是本人也不在鏈上就擋下", async () => {
    repo.detail = detailRow();
    repo.summaries = [summary("req-1", "emp-staff")];
    await expect(
      service.get({
        accountBookId: "book-1",
        requestId: "req-1",
        actorEmployeeId: "emp-hr",
        actorUserId: "user-hr",
      }),
    ).rejects.toMatchObject({ apiCode: "FO000016" });
  });

  /**
   * Info: (20260817 - Julian) 解不開時整頁不該 500。
   *
   * 金鑰輪替出問題時，這張單的其他資訊（誰、什麼假、幾天、簽到哪）仍然有用；
   * 把一個欄位的故障放大成整頁失敗，只會讓維運同時失去問題與線索。
   */
  it("明細：事由解不開時回 null，其餘欄位照常", async () => {
    const row = detailRow();
    repo.detail = { ...row, reasonCipher: "bm90LWEtcmVhbC1jaXBoZXI=" };
    repo.summaries = [summary("req-1", "emp-staff")];

    const result = await service.get({
      accountBookId: "book-1",
      requestId: "req-1",
      actorEmployeeId: "emp-staff",
      actorUserId: "user-staff",
    });

    expect(result.reason).toBeNull();
    expect(result.days).toHaveLength(1);
    expect(result.steps).toHaveLength(1);
  });
});
