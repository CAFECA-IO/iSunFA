import { describe, it, expect, beforeEach } from "@jest/globals";
import { ShiftPattern } from "@/generated";
import {
  LeaveRecallDecision,
  LeaveRecallResolutionOutcome,
  LeaveRecallStatus,
  LeaveType,
} from "@/constants/leave";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { LeaveService } from "@/services/leave.service";
import {
  ILeaveDayRecord,
  ILeaveRecallProjection,
  ILeaveRecallRecord,
  ILeaveRecallResolution,
  ILeaveRecallResolveParams,
  ILeaveRepository,
} from "@/repositories/leave.repo";
import {
  IAttendanceRosterRow,
  IEmployeeRepository,
} from "@/repositories/employee.repo";
import { IShiftPatternRepository } from "@/repositories/shift_pattern.repo";
import { Employee } from "@/generated";

/**
 * Info: (20260813 - Julian) 銷假徵詢。
 *
 * 這裡守的不是「徵詢存得進去」，而是三條**只要破掉就會出事而且不會有人發現**的規則：
 *
 * 1. **徵詢期間假仍然生效** —— 發起的當下不得碰排班。破掉的症狀是員工還沒回應
 *    就被算進未到工，而那在畫面上看起來完全正常（勞基法 §38 III）
 * 2. **只能往前** —— 過去的假日改回上班日會讓歷史判定多出一筆曠職
 * 3. **只有本人能回應**，且答案是終局
 */

const ACCOUNT_BOOK_ID = "demo-book-public-works";
const TZ = "Asia/Taipei";

// Info: (20260813 - Julian) 2026-08-13 06:00 UTC = 台北 14:00，與演示時點一致
const NOW = new Date("2026-08-13T06:00:00.000Z");

const SITE_DAY = {
  id: "shift-day",
  code: "SITE-DAY",
  name: "工地日班",
  accountBookId: ACCOUNT_BOOK_ID,
  windowStartMinute: 450,
  windowEndMinute: 1020,
  coreStartMinute: 450,
  coreEndMinute: 1020,
  requiredWorkMinutes: 480,
  breakMinutes: 60,
} as ShiftPattern;

const leaveDay = (
  overrides: Partial<{ id: string; workDate: string; pending: boolean }> = {},
) =>
  ({
    id: overrides.id ?? "leave-day-1",
    leaveRequestId: "req-1",
    workDate: overrides.workDate ?? "2026-08-14",
    activeKey: `emp-006:${overrides.workDate ?? "2026-08-14"}`,
    recalledAt: null,
    createdAt: NOW,
    leaveRequest: {
      id: "req-1",
      accountBookId: ACCOUNT_BOOK_ID,
      employeeId: "emp-006",
      leaveType: LeaveType.ANNUAL,
      reason: "家庭旅遊",
      status: "APPROVED",
      decidedByEmployeeId: "emp-005",
      decidedAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
      employee: {
        id: "emp-006",
        employeeNo: "EMP006",
        name: "李冠廷",
        department: { name: "第一工務段" },
        jobTitle: { title: "工地工程師" },
      },
    },
    recalls: overrides.pending ? [{ id: "recall-old" }] : [],
  }) as unknown as ILeaveDayRecord;

const recallRecord = (
  overrides: Partial<{ status: LeaveRecallStatus; employeeId: string }> = {},
) =>
  ({
    id: "recall-1",
    leaveDayId: "leave-day-1",
    pendingLeaveDayId: "leave-day-1",
    shiftPatternId: SITE_DAY.id,
    requestedByEmployeeId: "emp-005",
    reason: "颱風後搶修，第一工區缺兩名工程師",
    status: overrides.status ?? LeaveRecallStatus.PENDING,
    respondedAt: null,
    responseNote: null,
    createdAt: NOW,
    shiftPattern: { id: SITE_DAY.id, name: SITE_DAY.name },
    requestedBy: { employeeNo: "EMP005", name: "張文彬" },
    leaveDay: {
      id: "leave-day-1",
      workDate: "2026-08-14",
      leaveRequest: {
        employeeId: overrides.employeeId ?? "emp-006",
        leaveType: LeaveType.ANNUAL,
        employee: { id: "emp-006", employeeNo: "EMP006", name: "李冠廷" },
      },
    },
  }) as unknown as ILeaveRecallRecord;

class FakeLeaveRepo implements ILeaveRepository {
  public created: unknown[] = [];

  public resolved: {
    decision: LeaveRecallDecision;
    projection?: ILeaveRecallProjection;
  }[] = [];

  public day: ILeaveDayRecord | null = leaveDay();

  public recall: ILeaveRecallRecord | null = recallRecord();

  // Info: (20260814 - Julian) 模擬附條件更新沒搶到 PENDING（另一個分頁先回應了）
  public loseRace = false;

  // Info: (20260814 - Julian) 模擬 repo 丟出 Prisma 錯誤，用純物件是因為 service 只看 code
  public throwOnResolve: { code: string } | null = null;

  async findActiveLeaveDays() {
    return this.day ? [this.day] : [];
  }

  async findActiveLeaveDayById() {
    return this.day;
  }

  async createRecall(params: {
    leaveDayId: string;
    shiftPatternId: string;
    requestedByEmployeeId: string;
    reason: string;
  }) {
    this.created.push(params);
    return recallRecord();
  }

  async findRecallById() {
    return this.recall;
  }

  async findPendingRecallsFor() {
    return this.recall ? [this.recall] : [];
  }

  async resolveRecall(
    params: ILeaveRecallResolveParams,
  ): Promise<ILeaveRecallResolution> {
    if (this.throwOnResolve) throw this.throwOnResolve;
    if (this.loseRace) {
      return { outcome: LeaveRecallResolutionOutcome.ALREADY_ANSWERED };
    }
    this.resolved.push({
      decision: params.decision,
      projection:
        params.decision === LeaveRecallDecision.ACCEPT
          ? params.projection
          : undefined,
    });
    return {
      outcome: LeaveRecallResolutionOutcome.RESOLVED,
      recall: recallRecord({
        status:
          params.decision === LeaveRecallDecision.ACCEPT
            ? LeaveRecallStatus.ACCEPTED
            : LeaveRecallStatus.DECLINED,
      }),
    };
  }
}

class FakeEmployeeRepo implements IEmployeeRepository {
  public manager = true;

  async findByUserId(): Promise<Employee | null> {
    return null;
  }

  async findByAccountBookAndEmails(): Promise<Employee[]> {
    return [];
  }

  async linkUser(): Promise<boolean> {
    return true;
  }

  async findRosterInPeriod(): Promise<IAttendanceRosterRow[]> {
    return [];
  }

  async findByIdInAccountBook(): Promise<Employee | null> {
    return null;
  }

  async isDepartmentManager(): Promise<boolean> {
    return this.manager;
  }
}

class FakeShiftPatternRepo implements IShiftPatternRepository {
  async findByAccountBook(): Promise<ShiftPattern[]> {
    return [SITE_DAY];
  }

  async findByIdInAccountBook(): Promise<ShiftPattern | null> {
    return SITE_DAY;
  }
}

let leaves: FakeLeaveRepo;
let employees: FakeEmployeeRepo;
let service: LeaveService;

const request = (leaveDayId = "leave-day-1") =>
  service.requestRecall({
    accountBookId: ACCOUNT_BOOK_ID,
    leaveDayId,
    shiftPatternId: SITE_DAY.id,
    reason: "颱風後搶修，第一工區缺兩名工程師",
    actorEmployeeId: "emp-005",
    actorEmployeeNo: "EMP005",
    observedAt: NOW,
  });

const respond = (decision: LeaveRecallDecision, employeeId = "emp-006") =>
  service.respondRecall({
    accountBookId: ACCOUNT_BOOK_ID,
    recallId: "recall-1",
    employeeId,
    employeeNo: "EMP006",
    decision,
    respondedAt: NOW,
  });

beforeEach(() => {
  leaves = new FakeLeaveRepo();
  employees = new FakeEmployeeRepo();
  service = new LeaveService(leaves, employees, new FakeShiftPatternRepo(), TZ);
});

describe("今日請假名單（A11）", () => {
  it("對一般員工也回傳完整名單，只是不能發起徵詢", async () => {
    employees.manager = false;

    const view = await service.listToday({
      accountBookId: ACCOUNT_BOOK_ID,
      viewerEmployeeId: "emp-006",
      observedAt: NOW,
    });

    expect(view.entries).toHaveLength(1);
    expect(view.entries[0].employeeNo).toBe("EMP006");
    expect(view.canRequestRecall).toBe(false);
  });

  it("以當地日曆日決定「今天」，不是 UTC 的今天", async () => {
    // Info: (20260813 - Julian) 台北 2026-08-14 00:30 在 UTC 仍是 8/13
    const view = await service.listToday({
      accountBookId: ACCOUNT_BOOK_ID,
      viewerEmployeeId: "emp-005",
      observedAt: new Date("2026-08-13T16:30:00.000Z"),
    });

    expect(view.workDate).toBe("2026-08-14");
  });

  it("已有待回應徵詢的那一列標記 hasPendingRecall", async () => {
    leaves.day = leaveDay({ pending: true });

    const view = await service.listToday({
      accountBookId: ACCOUNT_BOOK_ID,
      viewerEmployeeId: "emp-005",
      observedAt: NOW,
    });

    expect(view.entries[0].hasPendingRecall).toBe(true);
  });
});

describe("發起徵詢（A12）", () => {
  it("非主管一律拒絕", async () => {
    employees.manager = false;
    await expect(request()).rejects.toMatchObject({
      apiCode: API_ERRORS.FO_ATTENDANCE_SUPERVISOR_ONLY.code,
    });
    expect(leaves.created).toHaveLength(0);
  });

  /**
   * Info: (20260813 - Julian) 這一條是整個模組最重要的測試。
   *
   * 發起徵詢**不得**碰排班：破掉的話員工還沒回應就處在「排了班卻沒到」，
   * 現場頁會把他算進未到工 —— 而那個畫面看起來完全正常。
   */
  it("發起徵詢時不投影任何排班", async () => {
    await request();

    expect(leaves.created).toHaveLength(1);
    expect(leaves.resolved).toHaveLength(0);
  });

  it("已過去的請假日不得徵詢", async () => {
    leaves.day = leaveDay({ workDate: "2026-08-12" });

    await expect(request()).rejects.toMatchObject({
      apiCode: API_ERRORS.VA_LEAVE_RECALL_PAST.code,
    });
  });

  it("當天（今日）的請假日可以徵詢", async () => {
    leaves.day = leaveDay({ workDate: "2026-08-13" });

    await expect(request()).resolves.toMatchObject({ workDate: "2026-08-14" });
  });

  it("同一天已有待回應徵詢時回 409", async () => {
    leaves.day = leaveDay({ pending: true });

    await expect(request()).rejects.toMatchObject({
      apiCode: API_ERRORS.CF_LEAVE_RECALL_PENDING.code,
    });
  });

  it("請假日不存在或已不生效時回 404", async () => {
    leaves.day = null;

    await expect(request()).rejects.toMatchObject({
      apiCode: API_ERRORS.NF_LEAVE_DAY.code,
    });
  });
});

describe("回應徵詢（A14）", () => {
  it("同意時才投影回排班，且帶著徵詢指定的班別", async () => {
    const view = await respond(LeaveRecallDecision.ACCEPT);

    expect(view.status).toBe(LeaveRecallStatus.ACCEPTED);
    expect(leaves.resolved).toHaveLength(1);
    expect(leaves.resolved[0].projection).toMatchObject({
      leaveDayId: "leave-day-1",
      employeeId: "emp-006",
      workDate: "2026-08-14",
      shiftPatternId: SITE_DAY.id,
    });
  });

  it("婉拒時完全不投影排班", async () => {
    const view = await respond(LeaveRecallDecision.DECLINE);

    expect(view.status).toBe(LeaveRecallStatus.DECLINED);
    expect(leaves.resolved[0].projection).toBeUndefined();
  });

  it("不是被徵詢的本人一律 403", async () => {
    await expect(
      respond(LeaveRecallDecision.ACCEPT, "emp-007"),
    ).rejects.toMatchObject({
      apiCode: API_ERRORS.FO_LEAVE_RECALL_NOT_OWNER.code,
    });
    expect(leaves.resolved).toHaveLength(0);
  });

  it("已回應過的徵詢不可覆寫", async () => {
    leaves.recall = recallRecord({ status: LeaveRecallStatus.ACCEPTED });

    await expect(respond(LeaveRecallDecision.DECLINE)).rejects.toMatchObject({
      apiCode: API_ERRORS.CF_LEAVE_RECALL_ANSWERED.code,
    });
  });

  it("徵詢不存在時回 404", async () => {
    leaves.recall = null;

    await expect(respond(LeaveRecallDecision.ACCEPT)).rejects.toMatchObject({
      apiCode: API_ERRORS.NF_LEAVE_RECALL.code,
    });
  });

  it("拋出的一律是 AppError，不是裸 Error", async () => {
    leaves.recall = null;

    await expect(respond(LeaveRecallDecision.ACCEPT)).rejects.toBeInstanceOf(
      AppError,
    );
  });
});

/**
 * Info: (20260814 - Julian) 型別層的護欄：`@ts-expect-error` 在「這行其實編得過」時反而會報錯，
 * 所以這兩條是由 tsc 執行的斷言，不是由 jest。哪天有人把 projection 改回選擇性，這裡會先紅。
 */
describe("同意徵詢必須帶排班投影（型別層）", () => {
  it("ACCEPT 少了 projection 編不過；DECLINE 多給 projection 也編不過", () => {
    const base = { recallId: "recall-1", respondedAt: NOW };

    // @ts-expect-error Info: (20260814 - Julian) ACCEPT 缺 projection
    const missing: ILeaveRecallResolveParams = {
      ...base,
      decision: LeaveRecallDecision.ACCEPT,
    };

    const extra: ILeaveRecallResolveParams = {
      ...base,
      decision: LeaveRecallDecision.DECLINE,
      // @ts-expect-error Info: (20260814 - Julian) DECLINE 沒有 projection 這個欄位
      projection: {} as ILeaveRecallProjection,
    };

    expect([missing, extra]).toHaveLength(2);
  });
});

/**
 * Info: (20260814 - Julian) 兩個分頁同時回應同一張徵詢。
 * service 的 `status === PENDING` 檢查讀的是查詢當下的快照，兩邊都會看到 PENDING，
 * 真正決勝的是 repo 的附條件更新——輸的那邊必須拿到 409，且一格排班都不能動。
 */
describe("回應徵詢的併發（A14）", () => {
  let leaves: FakeLeaveRepo;
  let service: LeaveService;

  beforeEach(() => {
    leaves = new FakeLeaveRepo();
    service = new LeaveService(
      leaves,
      new FakeEmployeeRepo(),
      new FakeShiftPatternRepo(),
      TZ,
    );
  });

  const respond = (decision: LeaveRecallDecision) =>
    service.respondRecall({
      accountBookId: ACCOUNT_BOOK_ID,
      recallId: "recall-1",
      employeeId: "emp-006",
      employeeNo: "EMP006",
      decision,
      respondedAt: NOW,
    });

  it("沒搶到 PENDING 時回 409，而不是把第二個答案寫進去", async () => {
    leaves.loseRace = true;

    await expect(respond(LeaveRecallDecision.DECLINE)).rejects.toMatchObject({
      apiCode: API_ERRORS.CF_LEAVE_RECALL_ANSWERED.code,
    });
  });

  it("沒搶到 PENDING 時不投影排班", async () => {
    leaves.loseRace = true;

    await expect(respond(LeaveRecallDecision.ACCEPT)).rejects.toBeInstanceOf(
      AppError,
    );
    expect(leaves.resolved).toHaveLength(0);
  });

  // Info: (20260814 - Julian) P2002 已不再代表「徵詢被搶走」，那條路改由回傳值表達
  it("排班撞唯一鍵時回排班衝突，不是徵詢已回應", async () => {
    leaves.throwOnResolve = { code: "P2002" };

    await expect(respond(LeaveRecallDecision.ACCEPT)).rejects.toMatchObject({
      apiCode: API_ERRORS.CF_SCHEDULE_DAY_CONFLICT.code,
    });
  });

  it("repo 丟出未知的 Prisma 錯誤時原樣拋回，不冒充業務錯誤", async () => {
    leaves.throwOnResolve = { code: "P1001" };

    await expect(
      respond(LeaveRecallDecision.ACCEPT),
    ).rejects.not.toBeInstanceOf(AppError);
  });
});
