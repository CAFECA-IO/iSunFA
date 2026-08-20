import {
  describe,
  it,
  expect,
  beforeEach,
  afterAll,
  jest,
} from "@jest/globals";
import { LeaveBalanceService } from "@/services/leave_balance.service";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  LeaveAccrualMethod,
  LeaveCycleBasis,
  LeaveQuotaMode,
  ANNUAL_LEAVE_TIER_SEED,
} from "@/constants/leave_policy";
import { IPlannedGrant } from "@/interfaces/leave_entitlement";
import {
  IEmployeeGrantSummary,
  ILedgerEntryView,
} from "@/interfaces/leave_balance";
import { ILeaveGrantRepository } from "@/repositories/leave_grant.repo";
import { employeeRepo } from "@/repositories/employee.repo";
import { employeeHrFunctionRepo } from "@/repositories/employee_hr_function.repo";
import {
  IAccrualEmployee,
  IAccrualPolicy,
  ILeaveAccrualContextRepository,
} from "@/repositories/leave_accrual_context.repo";

/**
 * Info: (20260817 - Julian) 額度授予（L33）與人工調整（L9）的編排。
 *
 * ## 為什麼重點在「哪些假別被跳過」
 *
 * 授予的分鐘數怎麼算，`leave_entitlement_rules` 那幾支測試已經釘住了。
 * 這一層真正會出錯的是**選誰**：把 `UNLIMITED` 的公傷病假也建一批，
 * 餘額畫面就會多出一列「還有 0 分鐘」，而使用者會以為公傷病假有上限。
 * 那不是計算錯誤，是編排錯誤 —— 引擎測不到它。
 */

/**
 * Info: (20260819 - Julian) 權限閘走 `leave_visibility.ts`，而那一支直接取
 * repository 單例（與 `overtime_visibility.ts` 同一種寫法）。因此這裡要把
 * 那兩支方法換掉，才測得到「閘有沒有真的擋」而不是「Prisma 連不連得上」。
 *
 * ## 為什麼用 `jest.spyOn` 而不是 `jest.mock`
 *
 * `jest.mock()` 的工廠依賴**呼叫被提升到 import 之前**。這個專案走
 * `next/jest`（SWC）而且 `jest` 是從 `@jest/globals` 具名匯入的，那個提升
 * 不成立 —— 模組先被求值、`leave_visibility.ts` 已經抓到真的單例，
 * 之後才登記 mock。症狀是 `hasAnyFunctionMock.mockReset is not a function`：
 * 拿到的是**真的那支方法**，不是 mock。
 *
 * `jest.spyOn` 沒有這個前提：它在執行當下改寫物件上的屬性，而
 * `leave_visibility.ts` 是在呼叫時才做屬性存取（`repo.hasAnyFunction(...)`），
 * 因此一定看得到被換掉的那一支。
 */
const hasAnyFunctionMock = jest.spyOn(employeeHrFunctionRepo, "hasAnyFunction");
const managesEmployeeMock = jest.spyOn(employeeRepo, "managesEmployee");

const BOOK = "book-1";
const EMPLOYEE = "emp-006";
const TODAY = "2026-08-14";
/**
 * Info: (20260820 - Julian) `asOfDate` 不得指向未來（review 第 9 輪第 2 條）。
 * 固定一個晚於 `TODAY` 的時點，讓既有案例不受新的上界影響 ——
 * 而下面另有一組專門驗那道上界。
 */
const OBSERVED_AT = new Date("2026-08-14T23:00:00+08:00");

const policy = (
  id: string,
  quotaMode: LeaveQuotaMode,
  accrualMethod: LeaveAccrualMethod,
): IAccrualPolicy => ({
  id,
  code: id.toUpperCase(),
  quotaMode,
  accrual: {
    accrualMethod,
    cycleBasis: LeaveCycleBasis.HIRE_ANNIVERSARY,
    annualDays:
      accrualMethod === LeaveAccrualMethod.FIXED_PER_CYCLE ? 14 : null,
    carryForwardMonths: 12,
    proratedRoundingScale: 1,
    tiers:
      accrualMethod === LeaveAccrualMethod.SENIORITY_TIER
        ? ANNUAL_LEAVE_TIER_SEED
        : [],
  },
});

class FakeGrantRepo implements ILeaveGrantRepository {
  public issuedFor: string[] = [];

  public adjusted: { deltaMinutes: number; reason: string }[] = [];

  public summary: IEmployeeGrantSummary[] = [];

  async issue(params: {
    leavePolicyId: string;
    planned: readonly IPlannedGrant[];
  }): Promise<number> {
    if (params.planned.length === 0) return 0;
    this.issuedFor.push(params.leavePolicyId);
    return params.planned.length;
  }

  async adjust(params: {
    deltaMinutes: number;
    reason: string;
  }): Promise<void> {
    this.adjusted.push({
      deltaMinutes: params.deltaMinutes,
      reason: params.reason,
    });
  }

  async rebuildBalance(): Promise<number> {
    return 0;
  }

  async summarize(): Promise<IEmployeeGrantSummary[]> {
    return this.summary;
  }

  async listLedger(): Promise<ILedgerEntryView[]> {
    return [];
  }
}

class FakeContextRepo implements ILeaveAccrualContextRepository {
  public employee: IAccrualEmployee | null = {
    hireDate: "2020-03-01",
    leaveDate: null,
    dayEquivalentMinutes: 480,
  };

  public policies: IAccrualPolicy[] = [];

  async findEmployeeForAccrual(): Promise<IAccrualEmployee | null> {
    return this.employee;
  }

  async findAccrualPolicies(): Promise<IAccrualPolicy[]> {
    return this.policies;
  }

  async listAccruableEmployeeIds(): Promise<string[]> {
    return [EMPLOYEE];
  }
}

let grants: FakeGrantRepo;
let context: FakeContextRepo;
let service: LeaveBalanceService;

const accrue = () =>
  service.accrueForEmployee({
    accountBookId: BOOK,
    employeeId: EMPLOYEE,
    asOfDate: TODAY,
    observedAt: OBSERVED_AT,
    actorEmployeeId: null,
  });

beforeEach(() => {
  grants = new FakeGrantRepo();
  context = new FakeContextRepo();
  service = new LeaveBalanceService(grants, context);
  // Info: (20260819 - Julian) 預設：是 HR、不是誰的主管
  hasAnyFunctionMock.mockReset().mockResolvedValue(true);
  managesEmployeeMock.mockReset().mockResolvedValue(false);
});

/**
 * Info: (20260819 - Julian) `spyOn` 改的是真的那個單例物件，不還原會漏到
 * 同一個 worker 裡跑的其他測試檔 —— 而那種汙染的症狀是「單獨跑會過、
 * 整包跑會紅」，最難查的一種。
 */
afterAll(() => {
  jest.restoreAllMocks();
});

describe("L33 — 授予的對象篩選", () => {
  it("QUOTA + 年資級距（特休）會授予", async () => {
    context.policies = [
      policy("annual", LeaveQuotaMode.QUOTA, LeaveAccrualMethod.SENIORITY_TIER),
    ];
    expect(await accrue()).toBeGreaterThan(0);
    expect(grants.issuedFor).toEqual(["annual"]);
  });

  it("QUOTA + 每週期固定（事假、病假）會授予", async () => {
    context.policies = [
      policy(
        "personal",
        LeaveQuotaMode.QUOTA,
        LeaveAccrualMethod.FIXED_PER_CYCLE,
      ),
    ];
    expect(await accrue()).toBeGreaterThan(0);
  });

  /**
   * Info: (20260817 - Julian) 公傷病假、產假是 UNLIMITED —— 沒有額度可扣。
   * 建一批零額度的批次，餘額畫面會多出一列說「還有 0 分鐘」，
   * 而使用者會以為那是上限。
   */
  it("UNLIMITED（公傷病假、產假）不建批次", async () => {
    context.policies = [
      policy("injury", LeaveQuotaMode.UNLIMITED, LeaveAccrualMethod.NONE),
    ];
    expect(await accrue()).toBe(0);
    expect(grants.issuedFor).toEqual([]);
  });

  // Info: (20260817 - Julian) 婚假、喪假的額度來自事件，不來自時間的推移
  it("PER_EVENT（婚假、喪假）不建批次", async () => {
    context.policies = [
      policy("marriage", LeaveQuotaMode.QUOTA, LeaveAccrualMethod.PER_EVENT),
    ];
    expect(await accrue()).toBe(0);
    expect(grants.issuedFor).toEqual([]);
  });

  it("混合時只挑得出該授予的那些", async () => {
    context.policies = [
      policy("annual", LeaveQuotaMode.QUOTA, LeaveAccrualMethod.SENIORITY_TIER),
      policy("injury", LeaveQuotaMode.UNLIMITED, LeaveAccrualMethod.NONE),
      policy("marriage", LeaveQuotaMode.QUOTA, LeaveAccrualMethod.PER_EVENT),
      policy("sick", LeaveQuotaMode.QUOTA, LeaveAccrualMethod.FIXED_PER_CYCLE),
    ];
    await accrue();
    expect(grants.issuedFor.sort()).toEqual(["annual", "sick"]);
  });
});

describe("L33 — 拒絕在資訊不足時猜", () => {
  /**
   * Info: (20260817 - Julian) 「一天是幾分鐘」沒有預設值。
   * 猜 480 的後果是每一批額度的面額都錯，而餘額畫面會顯示一個
   * 看起來完全正常的數字 —— 那種錯誤要到有人算折現時才會被發現。
   */
  it("沒有班別時擋下，不用 8 小時當預設", async () => {
    context.employee = {
      hireDate: "2020-03-01",
      leaveDate: null,
      dayEquivalentMinutes: 0,
    };
    context.policies = [
      policy("annual", LeaveQuotaMode.QUOTA, LeaveAccrualMethod.SENIORITY_TIER),
    ];

    await expect(accrue()).rejects.toMatchObject({
      apiCode: API_ERRORS.VA_LEAVE_NO_SHIFT_FOR_ACCRUAL.code,
    });
  });

  it("找不到員工時回 NF_EMPLOYEE", async () => {
    context.employee = null;
    await expect(accrue()).rejects.toMatchObject({
      apiCode: API_ERRORS.NF_EMPLOYEE.code,
    });
  });
});

describe("L9 — 人工調整", () => {
  const adjust = (deltaMinutes: number, reason = "前公司年資併計") =>
    service.adjust({
      accountBookId: BOOK,
      employeeId: EMPLOYEE,
      leavePolicyId: "annual",
      deltaMinutes,
      reason,
      actorEmployeeId: "emp-005",
      asOfDate: TODAY,
    });

  it("正的調整寫進帳本", async () => {
    await adjust(480);
    expect(grants.adjusted).toEqual([
      { deltaMinutes: 480, reason: "前公司年資併計" },
    ]);
  });

  // Info: (20260817 - Julian) 負的也要能調——勞檢後追回溢發的額度是真實需求
  it("負的調整同樣寫得進去", async () => {
    await adjust(-240, "溢發更正");
    expect(grants.adjusted[0].deltaMinutes).toBe(-240);
  });

  /**
   * Info: (20260817 - Julian) 0 不是一個調整。它會在帳本上留下一筆
   * 什麼也沒做的紀錄，而對帳的人會以為自己漏看了什麼。
   */
  it("調整量為 0 時擋下", async () => {
    await expect(adjust(0)).rejects.toMatchObject({
      apiCode: API_ERRORS.VA_INVALID_INPUT_DATA.code,
    });
    expect(grants.adjusted).toEqual([]);
  });
});

/**
 * Info: (20260819 - Julian) 權限閘的回歸測試（review B2）。
 *
 * 在補上閘之前，這四支端點**完全沒有授權判斷**：`actorEmployeeId` 只被寫進
 * 分錄，從來沒有被拿去判斷。於是任何一個同帳本的員工都可以讀他人的完整
 * 額度帳本，並對任何人（含自己）反覆加額度 —— `deltaMinutes` 上界 366 天、
 * 冪等鍵是隨機值所以連打有效，而額度會變成錢（未休折現）。
 *
 * 這幾條測的不是「訊息對不對」，是**擋不擋**。
 */
describe("額度的權限閘", () => {
  it("L7：不是本人、不是主管、也不是 HR → 擋下", async () => {
    hasAnyFunctionMock.mockResolvedValue(false);
    await expect(
      service.list({
        accountBookId: BOOK,
        actorEmployeeId: "emp-999",
        employeeId: EMPLOYEE,
        asOfDate: TODAY,
      }),
    ).rejects.toMatchObject({
      apiCode: API_ERRORS.FO_NO_PERMISSION_TO_VIEW_THIS.code,
    });
  });

  it("L7：本人一律看得到，不必是主管也不必是 HR", async () => {
    hasAnyFunctionMock.mockResolvedValue(false);
    const view = await service.list({
      accountBookId: BOOK,
      actorEmployeeId: EMPLOYEE,
      employeeId: EMPLOYEE,
      asOfDate: TODAY,
    });
    expect(view.employeeId).toBe(EMPLOYEE);
    // Info: (20260819 - Julian) 本人這條要在查資料庫之前就短路
    expect(managesEmployeeMock).not.toHaveBeenCalled();
  });

  it("L7：管得到他的主管看得到", async () => {
    hasAnyFunctionMock.mockResolvedValue(false);
    managesEmployeeMock.mockResolvedValue(true);
    await expect(
      service.list({
        accountBookId: BOOK,
        actorEmployeeId: "emp-005",
        employeeId: EMPLOYEE,
        asOfDate: TODAY,
      }),
    ).resolves.toMatchObject({ employeeId: EMPLOYEE });
  });

  it("L8：額度異動帳本套用同一道閘", async () => {
    hasAnyFunctionMock.mockResolvedValue(false);
    await expect(
      service.listLedger({
        accountBookId: BOOK,
        actorEmployeeId: "emp-999",
        employeeId: EMPLOYEE,
        limit: 20,
      }),
    ).rejects.toMatchObject({
      apiCode: API_ERRORS.FO_NO_PERMISSION_TO_VIEW_THIS.code,
    });
  });

  /**
   * Info: (20260819 - Julian) 寫入比讀取嚴格：主管看得到組員的餘額，
   * 但**不能改**。對組員的加薪權不會因為他是主管就自動存在。
   */
  it("L9：主管管得到他，仍然不能調整額度", async () => {
    hasAnyFunctionMock.mockResolvedValue(false);
    managesEmployeeMock.mockResolvedValue(true);
    await expect(
      service.adjust({
        accountBookId: BOOK,
        employeeId: EMPLOYEE,
        leavePolicyId: "annual",
        deltaMinutes: 480,
        reason: "幫組員加一天",
        actorEmployeeId: "emp-005",
        asOfDate: TODAY,
      }),
    ).rejects.toMatchObject({
      apiCode: API_ERRORS.FO_HR_FUNCTION_REQUIRED.code,
    });
    // Info: (20260819 - Julian) 被擋下時一分鐘都不能落地
    expect(grants.adjusted).toEqual([]);
  });

  it("L33：由人觸發的授予限 HR", async () => {
    hasAnyFunctionMock.mockResolvedValue(false);
    await expect(
      service.accrueForEmployee({
        accountBookId: BOOK,
        employeeId: EMPLOYEE,
        asOfDate: TODAY,
        observedAt: OBSERVED_AT,
        actorEmployeeId: "emp-999",
      }),
    ).rejects.toMatchObject({
      apiCode: API_ERRORS.FO_HR_FUNCTION_REQUIRED.code,
    });
  });

  /**
   * Info: (20260819 - Julian) `actorEmployeeId` 為 null 代表系統（seed 與
   * 日後的每日 Worker），不受此閘限制 —— 它不是任何人按的。
   * 這一條同時釘住 seed 的呼叫方式不會因為補了閘而壞掉。
   */
  it("L33：系統觸發（actorEmployeeId 為 null）不受閘限制", async () => {
    hasAnyFunctionMock.mockResolvedValue(false);
    await expect(
      service.accrueForEmployee({
        accountBookId: BOOK,
        employeeId: EMPLOYEE,
        asOfDate: TODAY,
        observedAt: OBSERVED_AT,
        actorEmployeeId: null,
      }),
    ).resolves.toBeGreaterThanOrEqual(0);
    expect(hasAnyFunctionMock).not.toHaveBeenCalled();
  });
});

/**
 * Info: (20260820 - Julian) **HR_ADMIN 不得調整自己的額度**（review 第 5 條）。
 *
 * B2 補的是「任何一個同帳本的員工都可以對任何人（**含自己**）反覆加額度」
 * 的**前半** —— 換成限 HR_ADMIN 之後，「含自己」那一半原封不動：
 * `assertMayAdjustBalance` 收的參數裡根本沒有「對象是誰」，
 * 於是那個問題在型別上就問不出來。
 *
 * 代價是直接的：`deltaMinutes` 上界 ±366 天，冪等鍵是 `randomUUID()`
 * （刻意的，人工調整本來就允許重複），連打有效。而
 * `leave_visibility.ts` 自己寫著：「額度不是一個顯示用的數字，它會變成錢
 * ……一筆憑空的調整，最後會出現在薪資單上。」
 */
describe("L9 / L33 — 自我操作的分界（review 第 5 條）", () => {
  const HR = "emp-hr";

  beforeEach(() => {
    hasAnyFunctionMock.mockResolvedValue(true);
  });

  /**
   * Info: (20260820 - Julian) 兩個斷言成對：回 403，**且**一分鐘都沒有落地。
   * 少了後者，一個「先寫進去再丟」的實作會通過。
   */
  it("L9：HR_ADMIN 調整自己的額度時擋下，且沒有寫進帳本", async () => {
    await expect(
      service.adjust({
        accountBookId: BOOK,
        employeeId: HR,
        leavePolicyId: "annual",
        deltaMinutes: 480,
        reason: "幫自己加一天",
        actorEmployeeId: HR,
        asOfDate: TODAY,
      }),
    ).rejects.toMatchObject({
      apiCode: API_ERRORS.FO_SELF_APPROVAL_FORBIDDEN.code,
    });
    expect(grants.adjusted).toEqual([]);
  });

  /**
   * Info: (20260820 - Julian) 自我檢查排在職能查詢**之前**。
   * 順序反過來的話，一個 HR_ADMIN 會先通過職能查詢 ——
   * 而那正是這一條要擋的組合（同 `declareEmergency` 的既有處置）。
   */
  it("L9：自我調整不依賴職能查詢的結果", async () => {
    hasAnyFunctionMock.mockClear();
    await expect(
      service.adjust({
        accountBookId: BOOK,
        employeeId: HR,
        leavePolicyId: "annual",
        deltaMinutes: 480,
        reason: "幫自己加一天",
        actorEmployeeId: HR,
        asOfDate: TODAY,
      }),
    ).rejects.toMatchObject({
      apiCode: API_ERRORS.FO_SELF_APPROVAL_FORBIDDEN.code,
    });
    expect(hasAnyFunctionMock).not.toHaveBeenCalled();
  });

  // Info: (20260820 - Julian) 對照組：調整**別人**的額度仍然照常成立
  it("L9：HR_ADMIN 調整別人的額度仍然成立", async () => {
    await service.adjust({
      accountBookId: BOOK,
      employeeId: EMPLOYEE,
      leavePolicyId: "annual",
      deltaMinutes: 480,
      reason: "前公司年資併計",
      actorEmployeeId: HR,
      asOfDate: TODAY,
    });
    expect(grants.adjusted).toEqual([
      { deltaMinutes: 480, reason: "前公司年資併計" },
    ]);
  });

  /**
   * Info: (20260820 - Julian) 授予**允許對自己**，而且必須允許。
   *
   * `accrueForEmployee` 交出去的是 `deriveGrantSchedule` 算出的應然，
   * 補得出漏掉的、生不出多的。擋掉的話，一個只有一位人資的公司裡，
   * 那位人資的特休永遠沒有人授予得了 —— 那是 B7 撞到過的同一個空集合。
   *
   * 這一條與上面那條合起來才說得完整：放寬的是哪一支、沒放寬的是哪一支。
   */
  it("L33：HR_ADMIN 對自己授予不受阻", async () => {
    await expect(
      service.accrueForEmployee({
        accountBookId: BOOK,
        employeeId: HR,
        asOfDate: TODAY,
        observedAt: OBSERVED_AT,
        actorEmployeeId: HR,
      }),
    ).resolves.toBeGreaterThanOrEqual(0);
  });
});

/**
 * Info: (20260820 - Julian) `asOfDate` 的上界（review 第 9 輪第 2 條）。
 *
 * `asOfDate` 就是 `deriveGrantSchedule` 的 horizon，而它先前沒有任何上界：
 * `"9999-12-31"` 一次請求鑄出 **7,980 批、239,117 日**的額度（實測，曆年制）。
 * 而 `assertMayAccrueBalance` 放行「對自己執行」的理由正是
 * 「它交出去的是引擎算出的應然……生不出多的」—— 沒有上界的 horizon
 * 讓那句話不成立。
 */
describe("L33 — asOfDate 不得指向未來", () => {
  const accrueAt = (asOfDate: string) =>
    service.accrueForEmployee({
      accountBookId: BOOK,
      employeeId: EMPLOYEE,
      asOfDate,
      actorEmployeeId: "emp-hr",
      observedAt: OBSERVED_AT,
    });

  /**
   * Info: (20260820 - Julian) 兩個斷言成對：回 400，**且**一批都沒有落地。
   * 少了後者，一個「先鑄出來再丟」的實作會通過。
   */
  it.each([["遙遠的未來", "9999-12-31"], ["明天", "2026-08-15"]])(
    "%s：擋下，且一批都沒有落地",
    async (_label, asOfDate) => {
      await expect(accrueAt(asOfDate)).rejects.toMatchObject({
        apiCode: API_ERRORS.VA_INVALID_INPUT_DATA.code,
      });
      expect(grants.issuedFor).toEqual([]);
    },
  );

  /**
   * Info: (20260820 - Julian) 上界擋在授權**之前**：一個把日期填到三千年後的
   * 請求，不需要先問他是不是人資。順序反過來的話，錯誤訊息會變成
   * 「你沒有權限」，而真正的問題是那個日期。
   */
  it("上界不依賴職能查詢的結果", async () => {
    hasAnyFunctionMock.mockClear();
    await expect(accrueAt("9999-12-31")).rejects.toBeDefined();
    expect(hasAnyFunctionMock).not.toHaveBeenCalled();
  });

  // Info: (20260820 - Julian) 反面：今天照常成立（否則「一律擋」也會通過）
  it("asOfDate 等於今天時照常授予", async () => {
    await expect(accrueAt(TODAY)).resolves.toBeGreaterThanOrEqual(0);
  });
});
