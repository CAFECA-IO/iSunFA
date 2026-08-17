import { describe, it, expect, beforeEach } from "@jest/globals";
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

const BOOK = "book-1";
const EMPLOYEE = "emp-006";
const TODAY = "2026-08-14";

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
    actorEmployeeId: null,
  });

beforeEach(() => {
  grants = new FakeGrantRepo();
  context = new FakeContextRepo();
  service = new LeaveBalanceService(grants, context);
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
