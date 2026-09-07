import { describe, it, expect } from "@jest/globals";
import { deriveGrantSchedule } from "@/lib/leave_entitlement_rules";
import {
  ANNUAL_LEAVE_TIER_SEED,
  LeaveAccrualMethod,
  LeaveCycleBasis,
} from "@/constants/leave_policy";
import { ILeaveAccrualPolicy } from "@/interfaces/leave_entitlement";

/**
 * Info: (20260817 - Julian) T2：到職日制（週年制）與曆年制的授予排程。
 *
 * `deriveGrantSchedule` 算的是**應然**：到 `asOfDate` 為止應該有哪些批次。
 * 它必須冪等 —— 授予 Worker 每日重跑不會多給一份，因此測試同時驗
 * 「同輸入同輸出」這件事本身。
 */

const DAY_MINUTES = 480;

const annualPolicy = (cycleBasis: LeaveCycleBasis): ILeaveAccrualPolicy => ({
  accrualMethod: LeaveAccrualMethod.SENIORITY_TIER,
  cycleBasis,
  annualDays: null,
  tiers: ANNUAL_LEAVE_TIER_SEED,
  // Info: (20260817 - Julian) §38 IV：經協商同意得遞延一年
  carryForwardMonths: 12,
  proratedRoundingScale: 1,
});

describe("deriveGrantSchedule — 週年制（HIRE_ANNIVERSARY）", () => {
  const schedule = deriveGrantSchedule({
    hireDate: "2026-01-01",
    asOfDate: "2028-01-01",
    policy: annualPolicy(LeaveCycleBasis.HIRE_ANNIVERSARY),
    dayEquivalentMinutes: DAY_MINUTES,
  });

  it("第一個週期自「滿六個月」起算，而不是到職日", () => {
    expect(schedule[0].cycleStartDate).toBe("2026-07-01");
    expect(schedule[0].grantedDays).toBe(3);
  });

  /**
   * Info: (20260817 - Julian) 第一段（滿六個月到滿一年）與第二段（滿一年起）
   * 刻意不合併：那 3 日與次年的 7 日是兩筆各自到期的額度，
   * 合併會弄丟前者的到期日，而到期日是 FIFO 扣減的唯一排序鍵。
   */
  it("第一段結束於「滿一年」的前一天", () => {
    expect(schedule[0].cycleEndDate).toBe("2026-12-31");
    expect(schedule[1].cycleStartDate).toBe("2027-01-01");
  });

  it("依年資逐段升級", () => {
    expect(schedule.map((grant) => grant.grantedDays)).toEqual([3, 7, 10]);
  });

  it("到期日 = 週期結束日 + 遞延月數（§38 IV）", () => {
    expect(schedule.map((grant) => grant.expiresOn)).toEqual([
      "2027-12-31",
      "2028-12-31",
      "2029-12-31",
    ]);
  });

  it("分鐘數 = 法定日數 × 授予當下的日約當分鐘", () => {
    expect(schedule.map((grant) => grant.grantedMinutes)).toEqual([
      1440, 3360, 4800,
    ]);
  });

  it("週年制不標示為比例給假", () => {
    expect(schedule.every((grant) => grant.isProrated)).toBe(false);
  });

  it("冪等：同輸入同輸出", () => {
    const again = deriveGrantSchedule({
      hireDate: "2026-01-01",
      asOfDate: "2028-01-01",
      policy: annualPolicy(LeaveCycleBasis.HIRE_ANNIVERSARY),
      dayEquivalentMinutes: DAY_MINUTES,
    });
    expect(again).toEqual(schedule);
  });

  it("尚未滿六個月者沒有任何額度", () => {
    expect(
      deriveGrantSchedule({
        hireDate: "2026-01-01",
        asOfDate: "2026-06-30",
        policy: annualPolicy(LeaveCycleBasis.HIRE_ANNIVERSARY),
        dayEquivalentMinutes: DAY_MINUTES,
      }),
    ).toEqual([]);
  });

  it("已離職者不再授予離職日之後的週期", () => {
    const withLeave = deriveGrantSchedule({
      hireDate: "2026-01-01",
      asOfDate: "2028-01-01",
      leaveDate: "2026-12-31",
      policy: annualPolicy(LeaveCycleBasis.HIRE_ANNIVERSARY),
      dayEquivalentMinutes: DAY_MINUTES,
    });
    expect(withLeave).toHaveLength(1);
    expect(withLeave[0].grantedDays).toBe(3);
  });
});

describe("deriveGrantSchedule — 曆年制（CALENDAR_YEAR）", () => {
  it("首年按比例給假並標示 isProrated", () => {
    const schedule = deriveGrantSchedule({
      hireDate: "2026-01-01",
      asOfDate: "2027-12-31",
      policy: annualPolicy(LeaveCycleBasis.CALENDAR_YEAR),
      dayEquivalentMinutes: DAY_MINUTES,
    });

    // Info: (20260817 - Julian) 3 日 × (2026-07-01 ~ 12-31 共 184 天 / 365 天) = 1.5123 → 進位 1.6
    expect(schedule[0]).toMatchObject({
      cycleStartDate: "2026-07-01",
      cycleEndDate: "2026-12-31",
      grantedDays: 1.6,
      isProrated: true,
    });

    // Info: (20260817 - Julian) 次年整年落在同一級距，不比例
    expect(schedule[1]).toMatchObject({
      cycleStartDate: "2027-01-01",
      grantedDays: 7,
      isProrated: false,
    });
  });

  /**
   * Info: (20260817 - Julian) 跨級距年度是加權：一個 3 月到職的人，
   * 2027 年的 1/1–2/28 仍在「六個月以上一年未滿」（3 日），
   * 3/1 起跳到「一年以上二年未滿」（7 日）。
   */
  it("跨級距年度依段落加權", () => {
    const schedule = deriveGrantSchedule({
      hireDate: "2026-03-01",
      asOfDate: "2027-12-31",
      policy: annualPolicy(LeaveCycleBasis.CALENDAR_YEAR),
      dayEquivalentMinutes: DAY_MINUTES,
    });

    // Info: (20260817 - Julian) 3 × 122/365 = 1.0027 → 進位 1.1
    expect(schedule[0].grantedDays).toBe(1.1);
    // Info: (20260817 - Julian) 3 × 59/365 + 7 × 306/365 = 6.3534 → 進位 6.4
    expect(schedule[1]).toMatchObject({ grantedDays: 6.4, isProrated: true });
  });

  it("比例給假的分鐘數無條件進位（餘數不由勞工承擔）", () => {
    const schedule = deriveGrantSchedule({
      hireDate: "2026-03-01",
      asOfDate: "2026-12-31",
      policy: annualPolicy(LeaveCycleBasis.CALENDAR_YEAR),
      dayEquivalentMinutes: 465,
    });
    // Info: (20260817 - Julian) 1.1 × 465 = 511.5 → 512
    expect(schedule[0].grantedMinutes).toBe(512);
  });
});

describe("deriveGrantSchedule — 曆月制（CALENDAR_MONTH）", () => {
  /**
   * Info: (20260817 - Julian) 生理假是「每月得請一日」（性平法 §14）——
   * 那是每個月各自成立的權利，不是一個被切碎的年度額度，故**不按比例**。
   */
  const menstrualPolicy: ILeaveAccrualPolicy = {
    accrualMethod: LeaveAccrualMethod.FIXED_PER_CYCLE,
    cycleBasis: LeaveCycleBasis.CALENDAR_MONTH,
    annualDays: 1,
    tiers: [],
    carryForwardMonths: 0,
    proratedRoundingScale: 1,
  };

  const schedule = deriveGrantSchedule({
    hireDate: "2026-03-15",
    asOfDate: "2026-05-31",
    policy: menstrualPolicy,
    dayEquivalentMinutes: DAY_MINUTES,
  });

  it("每個月各一筆，月中到職當月一樣有一日", () => {
    expect(schedule).toHaveLength(3);
    expect(schedule.map((grant) => grant.grantedDays)).toEqual([1, 1, 1]);
  });

  it("到職當月的週期自到職日起算，結束於月底", () => {
    expect(schedule[0]).toMatchObject({
      cycleStartDate: "2026-03-15",
      cycleEndDate: "2026-03-31",
    });
  });

  it("不可遞延：到期日即週期結束日", () => {
    expect(schedule[0].expiresOn).toBe("2026-03-31");
  });
});

describe("deriveGrantSchedule — 不產生排程的假別", () => {
  it.each([LeaveAccrualMethod.NONE, LeaveAccrualMethod.PER_EVENT])(
    "%s 回空陣列（額度來自事件而非時間推移）",
    (accrualMethod) => {
      expect(
        deriveGrantSchedule({
          hireDate: "2026-01-01",
          asOfDate: "2030-01-01",
          policy: {
            accrualMethod,
            cycleBasis: LeaveCycleBasis.CALENDAR_YEAR,
            annualDays: 8,
            tiers: [],
            carryForwardMonths: 0,
            proratedRoundingScale: 1,
          },
          dayEquivalentMinutes: DAY_MINUTES,
        }),
      ).toEqual([]);
    },
  );
});
