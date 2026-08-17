import { randomBytes } from "crypto";
import { HR_PII_KEY_BYTES } from "@/constants/hr_pii";
import { describe, it, expect, beforeEach, beforeAll } from "@jest/globals";
import { LeaveRequestService } from "@/services/leave_request.service";
import { AppError } from "@/lib/utils/error";
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
};

const PERSONAL: ILeavePolicySnapshot = {
  ...ANNUAL,
  id: "policy-personal",
  code: "PERSONAL",
  employerMayReject: true,
};

const WORK_DAY: ILeaveDaySchedule = {
  dayType: WorkDayType.WORK,
  shift: { requiredWorkMinutes: 480, breakMinutes: 60 },
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
      totalDays: params.totalDays,
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
}

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
  service = new LeaveRequestService(repo, context);
});

const submitInput = (days: string[], segment = LeaveDaySegment.FULL) => ({
  leavePolicyId: "policy-annual",
  reason: "家中有事",
  days: days.map((workDate) => ({ workDate, segment })),
});

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
      input: submitInput(["2026-08-18"], LeaveDaySegment.MORNING),
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
    expect(repo.created).toMatchObject({
      totalMinutes: 960,
      totalDays: 2,
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
    ).rejects.toMatchObject({ apiCode: "VA000047" });
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
      "2026-08-18": { dayType: WorkDayType.REST_DAY, shift: null },
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

  it("假別不存在或已停用時回 404", async () => {
    context.policy = null;
    await expect(
      service.submit({
        accountBookId: "book-1",
        employeeId: "emp-staff",
        input: submitInput(["2026-08-18"]),
        observedAt: AT,
      }),
    ).rejects.toMatchObject({ apiCode: "NF000024" });
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
    ).rejects.toMatchObject({ apiCode: "VA000047" });
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

  it("明細：申請人本人看得到", async () => {
    repo.record = recordFor("emp-staff", "emp-lead");
    repo.summaries = [summary("req-1", "emp-staff")];
    const result = await service.get({
      accountBookId: "book-1",
      requestId: "req-1",
      actorEmployeeId: "emp-staff",
    });
    expect(result.record.id).toBe("req-1");
  });

  it("明細：簽過的人仍看得到（不限當前待簽）", async () => {
    const record = recordFor("emp-staff", "emp-lead");
    record.steps[0].isPending = false;
    record.steps[0].status = LeaveApprovalStepStatus.APPROVED;
    repo.record = record;
    repo.summaries = [summary("req-1", "emp-staff")];
    await expect(
      service.get({
        accountBookId: "book-1",
        requestId: "req-1",
        actorEmployeeId: "emp-lead",
      }),
    ).resolves.toBeDefined();
  });

  it("明細：不是本人也不在鏈上就擋下", async () => {
    repo.record = recordFor("emp-staff", "emp-lead");
    repo.summaries = [summary("req-1", "emp-staff")];
    await expect(
      service.get({
        accountBookId: "book-1",
        requestId: "req-1",
        actorEmployeeId: "emp-hr",
      }),
    ).rejects.toMatchObject({ apiCode: "FO000016" });
  });
});
