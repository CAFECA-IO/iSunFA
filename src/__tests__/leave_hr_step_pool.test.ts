import { describe, it, expect, beforeEach } from "@jest/globals";
import { LeaveRequestService } from "@/services/leave_request.service";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { LeaveRequestStatus } from "@/constants/leave";
import {
  LeaveApprovalNodeKind,
  LeaveApprovalStepStatus,
} from "@/constants/leave_policy";
import { EmployeeHrFunction } from "@/constants/hr_management";
import {
  ILeaveApprovalStepRecord,
  ILeaveRequestContext,
  ILeaveRequestRecord,
  ILeaveRequestRepository,
  LeaveApprovalOutcome,
} from "@/interfaces/leave_request";
import { IEmployeeHrFunctionRepository } from "@/repositories/employee_hr_function.repo";

/**
 * Info: (20260820 - Julian) `HR` 關是一池人，不是一個人（review 第 6 輪 M19）。
 *
 * ## 被修掉的死結
 *
 * schema 對 `LeaveApprovalNodeKind.HR` 寫的是「具 HR 角色者，**任一人簽核
 * 即通過**」，而 `claimStep` 一律比對 `step.approverEmployeeId` ——
 * 展開時為了讓快照落在一個具體的人，取的是排序後的第一位。
 * 那位人資請假或離職（欄位是 `SetNull`），這一關就**永久卡住**，
 * 而那句註解讓讀者以為任何人資都接得手。
 *
 * ## 為什麼連「誰真的按下去」一起測
 *
 * 放寬之後 `approverEmployeeId`（誰應該簽）與實際簽的人會不一樣。
 * 只放寬而不記錄的話，帳面上會顯示由被指派的那位簽核、事實上是另一位 ——
 * 那比原本的永久卡住更糟：卡住看得見，簽錯人看不見。
 */

const BOOK = "book-1";
const APPLICANT = "emp-a";
const ASSIGNED_HR = "emp-hr-1";
const OTHER_HR = "emp-hr-2";
const OUTSIDER = "emp-x";

const stepOf = (
  overrides: Partial<ILeaveApprovalStepRecord> = {},
): ILeaveApprovalStepRecord => ({
  id: "step-1",
  order: 0,
  nodeKind: LeaveApprovalNodeKind.HR,
  approverEmployeeId: ASSIGNED_HR,
  approverEmployeeNo: "HR001",
  approverName: "被指派的人資",
  status: LeaveApprovalStepStatus.PENDING,
  isPending: true,
  ...overrides,
});

const recordOf = (step: ILeaveApprovalStepRecord): ILeaveRequestRecord => ({
  id: "req-1",
  accountBookId: BOOK,
  employeeId: APPLICANT,
  leavePolicyId: "policy-1",
  status: LeaveRequestStatus.PENDING,
  totalMinutes: 480,
  totalDays: 1,
  days: [{ id: "day-1", workDate: "2026-08-20", minutes: 480 }],
  /**
   * Info: (20260820 - Julian) **兩關**，被測的是第一關。
   *
   * 只放一關的話 `step.order === steps.length - 1` 為真，`approve` 會走
   * `completeApproval`（結帳那一條）而不是 `advanceStep` —— 那條路要扣額度、
   * 要投影排班，與這裡要測的「誰接得了這一關」無關，
   * 而替身少一支方法會以 TypeError 收場，看起來像被測邏輯壞了。
   */
  steps: [
    step,
    {
      id: "step-2",
      order: 1,
      nodeKind: LeaveApprovalNodeKind.DEPARTMENT_MANAGER,
      approverEmployeeId: "emp-mgr",
      approverEmployeeNo: "MGR001",
      approverName: "部門主管",
      status: LeaveApprovalStepStatus.PENDING,
      isPending: false,
    },
  ],
});

class FakeRepo implements Partial<ILeaveRequestRepository> {
  public step: ILeaveApprovalStepRecord = stepOf();

  /** Info: (20260820 - Julian) 送到 repository 的那一份決行參數 */
  public decided: { actorEmployeeId: string; accountBookId: string } | null =
    null;

  public listQuery: { includeHrPool: boolean } | null = null;

  async findById(): Promise<ILeaveRequestRecord | null> {
    return recordOf(this.step);
  }

  /**
   * Info: (20260820 - Julian) 不該被呼叫到 —— 被測的是第一關。
   * 丟出來而不是回一個假結局：安靜地成功會讓「走錯分支」看起來像通過。
   */
  async completeApproval(): Promise<LeaveApprovalOutcome> {
    throw new Error("這一組測的是非末關，不該走到結帳那一條");
  }

  async advanceStep(params: {
    actorEmployeeId: string;
    accountBookId: string;
  }): Promise<LeaveApprovalOutcome> {
    this.decided = params;
    return LeaveApprovalOutcome.ADVANCED;
  }

  async listPendingForApprover(params: { includeHrPool: boolean }) {
    this.listQuery = params;
    return [];
  }
}

class FakeHrFunctions implements Partial<IEmployeeHrFunctionRepository> {
  public holders = new Set([ASSIGNED_HR, OTHER_HR]);

  async hasAnyFunction(params: {
    employeeId: string;
    hrFunctions: readonly EmployeeHrFunction[];
  }): Promise<boolean> {
    return (
      params.hrFunctions.includes(EmployeeHrFunction.HR_ADMIN) &&
      this.holders.has(params.employeeId)
    );
  }
}

let repo: FakeRepo;
let hrFunctions: FakeHrFunctions;
let service: LeaveRequestService;

const approveBy = (actorEmployeeId: string) =>
  service.approve({
    accountBookId: BOOK,
    requestId: "req-1",
    actorEmployeeId,
    observedAt: new Date("2026-08-20T01:00:00.000Z"),
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

beforeEach(() => {
  repo = new FakeRepo();
  hrFunctions = new FakeHrFunctions();
  service = new LeaveRequestService(
    repo as unknown as ILeaveRequestRepository,
    {} as unknown as ILeaveRequestContext,
    undefined,
    hrFunctions as unknown as IEmployeeHrFunctionRepository,
  );
});

describe("HR 關：任一位 HR_ADMIN 都接得了", () => {
  // Info: (20260820 - Julian) 對照組：被指派的那位當然簽得動
  it("被指派的那位人資簽得動", async () => {
    await approveBy(ASSIGNED_HR);
    expect(repo.decided?.actorEmployeeId).toBe(ASSIGNED_HR);
  });

  /**
   * Info: (20260820 - Julian) 本檔的紅線：**另一位**人資也簽得動。
   * 這一條紅的時候，症狀就是那位被指派的人資離職後這一關永久卡住。
   */
  it("另一位人資也簽得動，且落地的是他而不是被指派的那位", async () => {
    await approveBy(OTHER_HR);

    expect(repo.decided?.actorEmployeeId).toBe(OTHER_HR);
    // Info: (20260820 - Julian) 「應該簽的人」沒有被改寫 —— 兩者是不同的事實
    expect(repo.step.approverEmployeeId).toBe(ASSIGNED_HR);
    expect(repo.decided?.accountBookId).toBe(BOOK);
  });

  it("沒有 HR 職能的人簽不動", async () => {
    expect(await codeOf(() => approveBy(OUTSIDER))).toBe(
      API_ERRORS.FO_NOT_AUTHORIZED_REVIEWER.code,
    );
    expect(repo.decided).toBeNull();
  });

  /**
   * Info: (20260820 - Julian) 不得自我核准仍然優先。
   * 人資自己請假時展開就會換人（`candidateFor` 的 `excludeEmployeeId`），
   * 但那是解析時的事 —— 真的撞上時這一道要還在。
   */
  it("申請人自己就算有 HR 職能也簽不動", async () => {
    hrFunctions.holders.add(APPLICANT);

    expect(await codeOf(() => approveBy(APPLICANT))).toBe(
      API_ERRORS.FO_SELF_APPROVAL_FORBIDDEN.code,
    );
    expect(repo.decided).toBeNull();
  });

  /**
   * Info: (20260820 - Julian) **其餘節點型別不得跟著放寬。**
   *
   * 少了這一條，把整個比對拿掉也會讓上面幾條通過 ——
   * 而那會讓任何一位人資簽得動「直屬主管」那一關。
   */
  it("非 HR 節點仍然只有被指派的那個人簽得動", async () => {
    repo.step = stepOf({
      nodeKind: LeaveApprovalNodeKind.DIRECT_MANAGER,
      approverEmployeeId: "emp-mgr",
    });

    expect(await codeOf(() => approveBy(OTHER_HR))).toBe(
      API_ERRORS.FO_NOT_AUTHORIZED_REVIEWER.code,
    );
  });
});

/**
 * Info: (20260820 - Julian) 看得到的與簽得動的必須是同一群人。
 * 只放寬簽核而不放寬清單，其他人資就看不到他們簽得動的單；
 * 只放寬清單而不放寬簽核，按下去會被擋。兩條成對。
 */
describe("待簽清單：人資看得到整池的 HR 關", () => {
  it("有 HR 職能時撈整池", async () => {
    await service.listPending({ accountBookId: BOOK, actorEmployeeId: OTHER_HR });
    expect(repo.listQuery?.includeHrPool).toBe(true);
  });

  it("沒有 HR 職能時只撈指名給自己的", async () => {
    await service.listPending({ accountBookId: BOOK, actorEmployeeId: OUTSIDER });
    expect(repo.listQuery?.includeHrPool).toBe(false);
  });
});
