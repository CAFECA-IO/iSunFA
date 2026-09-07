import { describe, it, expect } from "@jest/globals";
import {
  PERIOD_RESOLUTION_KIND,
  resolveNextPeriod,
  resolveUpgradeCreditMs,
} from "@/lib/billing/subscription_period";
import { TEAM_PLAN } from "@/constants/subscription_quota";

/**
 * Info: (20260821 - Luphia) 訂閱期間的純數學（產品裁定 20260821）。
 *
 * 這裡每一條都直接決定「使用者付的錢換到多少天服務」，而算錯不會噴錯——
 * 只會讓某個人少拿一段期間，沒有人會來回報。三條規則各有它要防的事故：
 *
 * - **同方案展延**：防「提早續購吃掉剩餘天數」（付兩次只拿一期）。
 * - **換方案折抵**：防兩件相反的事——作廢剩餘天數會**沒收使用者已付的錢**
 *   （退款政策 §2.2 不退費），1:1 沿用則讓平台白送一段高階服務。
 * - **自現在起算**：防「把沒有權益的空窗追認為已付費期間」。
 */

const DAY = 86_400_000;
const NOW = 1_760_000_000_000;

// Info: (20260821 - Luphia) 現行價目（每席）：團隊 840/月、8,400/年；企業 2,940/月、29,400/年
const TEAM_MONTH = { planId: TEAM_PLAN.TEAM, unitPrice: 840, periodDays: 30 };
const TEAM_YEAR = { planId: TEAM_PLAN.TEAM, unitPrice: 8400, periodDays: 365 };
const BUSINESS_MONTH = {
  planId: TEAM_PLAN.BUSINESS,
  unitPrice: 2940,
  periodDays: 30,
};
const BUSINESS_YEAR = {
  planId: TEAM_PLAN.BUSINESS,
  unitPrice: 29400,
  periodDays: 365,
};

function existing(
  plan: { planId: string; unitPrice: number; periodDays: number | null },
  remainingDays: number,
  elapsedDays = 5,
) {
  return {
    planId: plan.planId,
    unitPrice: plan.unitPrice,
    periodDays: plan.periodDays,
    periodStartMs: NOW - elapsedDays * DAY,
    periodEndMs: NOW + remainingDays * DAY,
  };
}

describe("折抵毫秒數", () => {
  /**
   * Info: (20260821 - Luphia) 基準：月繳團隊版剩 10 天（值 280 元）升月繳企業版
   *（98/天）→ 折抵 2.857 天。這一條同時證明「折抵是按價值、不是按天數」：
   * 若按天數會回 10 天。
   */
  it("按已付價值換算，不是按天數", () => {
    const credit = resolveUpgradeCreditMs({
      remainingMs: 10 * DAY,
      oldUnitPrice: 840,
      oldPeriodDays: 30,
      newUnitPrice: 2940,
      newPeriodDays: 30,
    });

    expect(credit).toBe(Math.floor((10 * DAY * 840) / 2940));
    expect(credit).toBeLessThan(10 * DAY);
    expect(credit / DAY).toBeCloseTo(2.857, 2);
  });

  /**
   * Info: (20260821 - Luphia) 跨週期：年繳團隊版剩 335 天（值 7,710 元）
   * 升月繳企業版 → 78.7 天。舊行為 1:1 沿用會白送 335 天企業版（25,120 元），
   * 那是 review #6687 二輪阻擋-1 最貴的破口。
   */
  it("跨計費週期時用各自的日單價換算", () => {
    const credit = resolveUpgradeCreditMs({
      remainingMs: 335 * DAY,
      oldUnitPrice: 8400,
      oldPeriodDays: 365,
      newUnitPrice: 2940,
      newPeriodDays: 30,
    });

    expect(credit / DAY).toBeCloseTo(78.68, 1);
  });

  // Info: (20260821 - Luphia) 同單價同週期（理論上不會發生：那是同方案）→ 1:1
  it("新舊日單價相同時折抵等於剩餘時間", () => {
    expect(
      resolveUpgradeCreditMs({
        remainingMs: 7 * DAY,
        oldUnitPrice: 840,
        oldPeriodDays: 30,
        newUnitPrice: 840,
        newPeriodDays: 30,
      }),
    ).toBe(7 * DAY);
  });

  /**
   * Info: (20260821 - Luphia) 舊方案沒付過錢（免費版）→ 0 是**正確答案**，
   * 不是資料異常：免費版沒有已付價值可折抵。回 1:1 會讓免費戶白拿付費期間。
   */
  it("舊方案單價為 0（免費版）時沒有可折抵的價值", () => {
    expect(
      resolveUpgradeCreditMs({
        remainingMs: 20 * DAY,
        oldUnitPrice: 0,
        oldPeriodDays: 30,
        newUnitPrice: 2940,
        newPeriodDays: 30,
      }),
    ).toBe(0);
  });

  // Info: (20260821 - Luphia) 髒資料一律回 0：寧可少折抵，也不要放大成無限期間
  it.each([
    ["剩餘為負", { remainingMs: -DAY }],
    ["剩餘為零", { remainingMs: 0 }],
    ["舊週期天數為 0", { oldPeriodDays: 0 }],
    ["新週期天數為 0", { newPeriodDays: 0 }],
    ["新方案單價為 0", { newUnitPrice: 0 }],
  ])("%s → 折抵 0", (_label, overrides) => {
    expect(
      resolveUpgradeCreditMs({
        remainingMs: 10 * DAY,
        oldUnitPrice: 840,
        oldPeriodDays: 30,
        newUnitPrice: 2940,
        newPeriodDays: 30,
        ...overrides,
      }),
    ).toBe(0);
  });

  /**
   * Info: (20260821 - Luphia) 不先算日單價（會丟尾數），一次乘除。
   * 年繳的日單價 8400/365 = 23.0136…，先四捨五入成 23 會讓 364 天的折抵
   * 少算 4.96 元的價值——那是使用者已經付過的錢。
   */
  it("不因日單價的尾數而少折抵", () => {
    const credit = resolveUpgradeCreditMs({
      remainingMs: 364 * DAY,
      oldUnitPrice: 8400,
      oldPeriodDays: 365,
      newUnitPrice: 29400,
      newPeriodDays: 365,
    });
    const rounded = Math.floor((364 * DAY * 23) / (29400 / 365));

    expect(credit).toBeGreaterThan(rounded);
  });
});

describe("當期範圍", () => {
  it("沒有訂閱：自現在起算一期", () => {
    const period = resolveNextPeriod({
      nowMs: NOW,
      existing: null,
      next: TEAM_MONTH,
    });

    expect(period).toEqual({
      periodStartMs: NOW,
      periodEndMs: NOW + 30 * DAY,
      creditedMs: 0,
      kind: PERIOD_RESOLUTION_KIND.FRESH,
    });
  });

  /**
   * Info: (20260821 - Luphia) 當期已結束（續訂、過期後重新訂閱）自現在起算：
   * 中間那段沒有權益的空窗不該追認為已付費期間。
   */
  it("當期已結束：自現在起算一期，不追認空窗", () => {
    const period = resolveNextPeriod({
      nowMs: NOW,
      existing: existing(TEAM_MONTH, -10),
      next: TEAM_MONTH,
    });

    expect(period.periodStartMs).toBe(NOW);
    expect(period.periodEndMs).toBe(NOW + 30 * DAY);
    expect(period.kind).toBe(PERIOD_RESOLUTION_KIND.FRESH);
  });

  /**
   * Info: (20260821 - Luphia) 同方案＝展延，期初不動。
   * 「付兩次＝兩期」是這條的全部意義（產品決定 20260820）。
   */
  it("同方案：期末往後加一期，期初不動", () => {
    const row = existing(TEAM_MONTH, 10);
    const period = resolveNextPeriod({
      nowMs: NOW,
      existing: row,
      next: TEAM_MONTH,
    });

    expect(period.periodStartMs).toBe(row.periodStartMs);
    expect(period.periodEndMs).toBe(row.periodEndMs + 30 * DAY);
    expect(period.creditedMs).toBe(0);
    expect(period.kind).toBe(PERIOD_RESOLUTION_KIND.EXTENSION);
  });

  /**
   * Info: (20260821 - Luphia) 同方案改計費週期也是展延，**不折抵**：
   * 服務等級沒變，剩餘的 10 天本來就是 10 天的同一個方案。
   */
  it("同方案改年繳：加 365 天，仍不折抵", () => {
    const row = existing(TEAM_MONTH, 10);
    const period = resolveNextPeriod({
      nowMs: NOW,
      existing: row,
      next: TEAM_YEAR,
    });

    expect(period.periodEndMs).toBe(row.periodEndMs + 365 * DAY);
    expect(period.kind).toBe(PERIOD_RESOLUTION_KIND.EXTENSION);
  });

  it("換方案：自現在起算一期，加上折抵的天數", () => {
    const period = resolveNextPeriod({
      nowMs: NOW,
      existing: existing(TEAM_MONTH, 10),
      next: BUSINESS_MONTH,
    });

    expect(period.periodStartMs).toBe(NOW);
    expect(period.creditedMs).toBe(Math.floor((10 * DAY * 840) / 2940));
    expect(period.periodEndMs).toBe(NOW + 30 * DAY + period.creditedMs);
    expect(period.kind).toBe(PERIOD_RESOLUTION_KIND.UPGRADE_CREDIT);
  });

  /**
   * Info: (20260821 - Luphia) 這一條是**禁止用戶損失**的具體形式：
   * 換方案之後的總期間必須**不短於**「一期 + 折抵」，而折抵必須是正數
   *（只要舊方案付過錢且還有剩餘）。若哪天有人把折抵改回 0（自現在重算），
   * 這條會紅——那個改動會沒收年繳戶最多 8,377 元的已付期間。
   */
  it("換方案時剩餘價值不得被沒收", () => {
    const period = resolveNextPeriod({
      nowMs: NOW,
      existing: existing(TEAM_YEAR, 364, 1),
      next: BUSINESS_YEAR,
    });

    expect(period.creditedMs).toBeGreaterThan(0);
    expect(period.periodEndMs).toBeGreaterThan(NOW + 365 * DAY);
    // Info: (20260821 - Luphia) 8,377 元的剩餘價值換成企業版 104 天
    expect(period.creditedMs / DAY).toBeCloseTo(104, 0);
  });

  /**
   * Info: (20260821 - Luphia) 另一半：折抵**不得**放大成「剩餘天數 1:1」。
   * 那是本 PR 二輪之前的行為，代價是年繳團隊版第 1 天升企業版拿到 729 天
   *（平台白送 20,942 元）。
   */
  it("換方案時折抵不得放大成 1:1 沿用", () => {
    const period = resolveNextPeriod({
      nowMs: NOW,
      existing: existing(TEAM_YEAR, 364, 1),
      next: BUSINESS_YEAR,
    });

    expect(period.creditedMs).toBeLessThan(364 * DAY);
    expect(period.periodEndMs).toBeLessThan(NOW + 729 * DAY);
  });

  it("免費版升級付費：沒有可折抵的價值", () => {
    const period = resolveNextPeriod({
      nowMs: NOW,
      existing: existing(
        { planId: TEAM_PLAN.FREE, unitPrice: 0, periodDays: 30 },
        10,
      ),
      next: TEAM_MONTH,
    });

    expect(period.creditedMs).toBe(0);
    expect(period.periodEndMs).toBe(NOW + 30 * DAY);
    expect(period.kind).toBe(PERIOD_RESOLUTION_KIND.UPGRADE_CREDIT);
  });

  /**
   * Info: (20260821 - Luphia) 週期未回填（NULL）：換算不出日單價 → 1:1 沿用。
   * Service 層在建單前擋掉這種列，走到這裡代表有漏網——那時寧可平台吃虧，
   * 也不可沒收使用者已付的期間。
   */
  it("舊列週期未回填：退回 1:1 沿用，不沒收期間", () => {
    const period = resolveNextPeriod({
      nowMs: NOW,
      existing: existing({ ...TEAM_MONTH, periodDays: null }, 10),
      next: BUSINESS_MONTH,
    });

    expect(period.creditedMs).toBe(10 * DAY);
    expect(period.periodEndMs).toBe(NOW + 30 * DAY + 10 * DAY);
    expect(period.kind).toBe(PERIOD_RESOLUTION_KIND.UPGRADE_CARRYOVER);
  });

  /**
   * Info: (20260821 - Luphia) 降級的「換方案」不會走到這裡（降級是排程到期末、
   * 不建單），但函式本身對稱：高階換低階同樣按價值折抵，折抵天數會比剩餘天數多。
   * 這一條釘住對稱性——哪天產品要開放期中降級，數學已經是對的。
   */
  it("高階換低階：折抵的天數多於剩餘天數（價值守恆）", () => {
    const period = resolveNextPeriod({
      nowMs: NOW,
      existing: existing(BUSINESS_MONTH, 10),
      next: TEAM_MONTH,
    });

    expect(period.creditedMs).toBeGreaterThan(10 * DAY);
    expect(period.creditedMs / DAY).toBeCloseTo(35, 0);
  });
});
