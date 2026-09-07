import { MoneyUtil } from "@/lib/utils/money";

/**
 * Info: (20260821 - Luphia) 訂閱期間的純數學：這次購買之後，當期從哪天到哪天。
 *
 * ## 為什麼要一個獨立模組
 *
 * 這裡的每一條分支都直接決定「使用者付的錢換到多少天服務」，而算錯不會噴錯
 * ——只會讓某個人少拿或多拿一段期間，沒有人會來回報。因此它必須是決定論、
 * 不碰 DB、不碰時鐘（時間由呼叫端注入）的純函式，與席次計價
 * （`seat_billing.ts`）同一套原則。
 *
 * ## 三條規則（產品裁定 20260821）
 *
 * | 情形 | 期間怎麼算 | 為什麼 |
 * |---|---|---|
 * | 沒有訂閱／當期已結束 | 自現在起算一期 | 中間沒有權益的空窗不該追認為已付費期間 |
 * | **同方案**再買一期 | 期末往後加一期，期初不動 | 付兩次＝兩期；提早續購不吃掉剩餘天數 |
 * | **換方案**（升級） | 自現在起算一期，**再加上舊期剩餘價值折抵的天數** | 見下 |
 *
 * ## 換方案為什麼要折抵，而不是沿用剩餘天數或作廢
 *
 * 三種做法只有一種站得住：
 *
 * - **作廢剩餘天數**（自現在重算）：退款政策 §2.2 原則不退費，所以作廢等於
 *   沒收。年繳團隊版第 1 天升級會沒收 8,377 元（年費的 99.7%）——
 *   **禁止造成用戶損失的設計**（產品裁定 20260821），這條直接出局。
 * - **剩餘天數 1:1 當新方案天數**（本 PR 二輪之前的行為）：使用者不吃虧，
 *   但平台把一段高階服務免費送出去——年繳團隊版第 1 天升企業版可用 29,400
 *   拿到 729 天（送 20,942 元），跨週期更誇張（review #6687 二輪阻擋-1）。
 * - **按已付價值折抵天數**（本模組）：剩餘天數 × 舊方案日單價 ÷ 新方案日單價。
 *   使用者付過的錢一分不作廢，平台也不再免費送——同一段錢換成新方案的天數。
 *
 * 例：年繳團隊版（8,400/年＝23.01/天）第 180 天升年繳企業版（29,400/年＝
 * 80.55/天）。剩餘 185 天值 4,258 元，折抵 52.9 天，於是付 29,400 得 417.9 天。
 */

const DAY_MS = 86_400_000;

export const PERIOD_RESOLUTION_KIND = {
  // Info: (20260821 - Luphia) 沒有訂閱或當期已結束：自現在起算
  FRESH: "FRESH",
  // Info: (20260821 - Luphia) 同方案續購：期末往後加，期初不動
  EXTENSION: "EXTENSION",
  // Info: (20260821 - Luphia) 換方案：自現在起算一期，加上折抵的天數
  UPGRADE_CREDIT: "UPGRADE_CREDIT",
  /**
   * Info: (20260821 - Luphia) 換方案但**換算不出折抵**（舊列的週期尚未回填）：
   * 退回「剩餘期間 1:1 沿用」。那對使用者永遠不會更差（他至少拿到同樣長度的
   * 高階服務），代價由平台承擔。Service 層在建單前就會擋掉這種列
   * （`TW_SEAT_BILLING_INTERVAL_MISSING` 的同一個成因，見 `changeTeamSubscription`），
   * 所以走到這裡代表有漏網——寧可平台吃虧，不可沒收使用者已付的期間。
   */
  UPGRADE_CARRYOVER: "UPGRADE_CARRYOVER",
} as const;

export type PeriodResolutionKind =
  (typeof PERIOD_RESOLUTION_KIND)[keyof typeof PERIOD_RESOLUTION_KIND];

export interface IExistingPeriod {
  planId: string;
  periodStartMs: number;
  periodEndMs: number;
  // Info: (20260821 - Luphia) 本期單價快照（單一席次）；免費方案為 0
  unitPrice: number;
  /**
   * Info: (20260821 - Luphia) 本期的**一期天數**（月 30／年 365）。
   * `null`＝訂閱列的 `billingInterval` 尚未回填（`db push` 後的既有列），
   * 那時換算不出日單價，見 `UPGRADE_CARRYOVER`。
   */
  periodDays: number | null;
}

export interface INextPeriod {
  planId: string;
  unitPrice: number;
  periodDays: number;
}

export interface IPeriodResolution {
  periodStartMs: number;
  periodEndMs: number;
  // Info: (20260821 - Luphia) 折抵進期末的毫秒數（0＝沒有折抵）
  creditedMs: number;
  kind: PeriodResolutionKind;
}

/**
 * Info: (20260821 - Luphia) 舊期剩餘價值折抵成新方案的毫秒數。
 *
 * `剩餘時間 × (舊單價 / 舊期天數) / (新單價 / 新期天數)`，整理後是
 * `剩餘時間 × 舊單價 × 新期天數 / (舊期天數 × 新單價)`——一次乘除，
 * 不做中間的日單價四捨五入（先算日單價會在年繳上丟掉可觀的尾數）。
 *
 * 用 Decimal 而非原生浮點：這個比例最終換算成使用者實得的天數，
 * 而金額與期間的乘除一律走 Decimal（CLAUDE.md §2）。
 * 無條件捨去：邊界上的零頭算給平台的成本，不足一毫秒的部分不值得爭。
 */
export function resolveUpgradeCreditMs(params: {
  remainingMs: number;
  oldUnitPrice: number;
  oldPeriodDays: number;
  newUnitPrice: number;
  newPeriodDays: number;
}): number {
  const {
    remainingMs,
    oldUnitPrice,
    oldPeriodDays,
    newUnitPrice,
    newPeriodDays,
  } = params;

  if (remainingMs <= 0) return 0;
  // Info: (20260821 - Luphia) 舊方案沒付過錢（免費版）＝沒有價值可折抵，回 0 是正確答案
  if (oldUnitPrice <= 0) return 0;
  if (oldPeriodDays <= 0 || newPeriodDays <= 0) return 0;
  // Info: (20260821 - Luphia) 新方案單價為 0（不該發生：升級一定是付費方案）→ 不放大成無限
  if (newUnitPrice <= 0) return 0;

  return MoneyUtil.toDecimal(remainingMs)
    .times(oldUnitPrice)
    .times(newPeriodDays)
    .dividedBy(MoneyUtil.toDecimal(oldPeriodDays).times(newUnitPrice))
    .floor()
    .toNumber();
}

/**
 * Info: (20260821 - Luphia) 這次購買之後的當期範圍。
 *
 * 期初在**換方案**時改成現在（那是一份新的合約：新的方案、新的單價快照），
 * 同方案續購則維持原期初——期初是「這一期從哪天開始付費」的事實，
 * 沒有變更方案就沒有理由改寫它。
 */
export function resolveNextPeriod(params: {
  nowMs: number;
  existing: IExistingPeriod | null;
  next: INextPeriod;
}): IPeriodResolution {
  const { nowMs, existing, next } = params;
  const nextPeriodMs = next.periodDays * DAY_MS;

  const stillActive = existing !== null && existing.periodEndMs > nowMs;
  if (!stillActive) {
    return {
      periodStartMs: nowMs,
      periodEndMs: nowMs + nextPeriodMs,
      creditedMs: 0,
      kind: PERIOD_RESOLUTION_KIND.FRESH,
    };
  }

  /**
   * Info: (20260821 - Luphia) 同方案（含改計費週期）＝單純展延。
   *
   * 不需要折抵：服務等級沒變，剩餘的 N 天本來就是 N 天的同一個方案。
   * 年繳改月繳也走這裡——把年繳剩下的 185 天換算成「月繳的天數」是沒有
   * 意義的操作，那 185 天的服務內容一模一樣。
   */
  if (existing.planId === next.planId) {
    return {
      periodStartMs: existing.periodStartMs,
      periodEndMs: existing.periodEndMs + nextPeriodMs,
      creditedMs: 0,
      kind: PERIOD_RESOLUTION_KIND.EXTENSION,
    };
  }

  const remainingMs = existing.periodEndMs - nowMs;

  /**
   * Info: (20260821 - Luphia) 週期未回填 → 換算不出日單價 → 剩餘期間 1:1 沿用。
   * 使用者不會因為我們的資料缺漏而少拿任何東西（見 `UPGRADE_CARRYOVER`）。
   */
  if (existing.periodDays === null && existing.unitPrice > 0) {
    return {
      periodStartMs: nowMs,
      periodEndMs: nowMs + nextPeriodMs + remainingMs,
      creditedMs: remainingMs,
      kind: PERIOD_RESOLUTION_KIND.UPGRADE_CARRYOVER,
    };
  }

  const creditedMs = resolveUpgradeCreditMs({
    remainingMs,
    oldUnitPrice: existing.unitPrice,
    oldPeriodDays: existing.periodDays ?? 0,
    newUnitPrice: next.unitPrice,
    newPeriodDays: next.periodDays,
  });

  return {
    periodStartMs: nowMs,
    periodEndMs: nowMs + nextPeriodMs + creditedMs,
    creditedMs,
    kind: PERIOD_RESOLUTION_KIND.UPGRADE_CREDIT,
  };
}
