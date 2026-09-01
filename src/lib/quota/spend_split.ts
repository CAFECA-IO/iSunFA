import {
  SPEND_PRIORITY,
  TEAM_PLAN,
  type SpendPriority,
} from "@/constants/subscription_quota";

/**
 * Info: (20260813 - Luphia) 扣費拆帳的純函式層（設計書 §5.4）。
 *
 * 原本的管線是「單一來源、全額或不放行」：預扣金額塞不進訂閱額度，就整筆改扣分配點數；
 * 分配點數也不夠，就回 402。實際效果是**剩餘 3 點的用戶被一筆需預扣 5 點的訊息完全擋死**，
 * 而畫面上的儀表還顯示「剩餘 30%」——兩邊都對，但對用戶而言就是壞的。
 *
 * 新規則（產品拍板 20260813）：
 * 1. 只要 `訂閱額度剩餘 + 分配點數 > 0` 就放行，預扣封頂到可用餘額；
 * 2. 兩個來源**拆帳**：先用光訂閱額度，不足的部分才扣錢包；
 * 3. 因封頂而產生的差額（實耗 > 預扣）一律記入**訂閱額度**——額度是軟限制，
 *    容許最後一筆超額（§5.1 早已如此）；錢包是硬限制，零容忍負餘額。
 *
 * 不碰 DB、不碰時鐘，金額一律 BigInt。
 */

export interface IQuotaWindowUsage {
  limit5h: bigint;
  used5h: bigint;
  limitWeek: bigint;
  usedWeek: bigint;
}

const ZERO = BigInt(0);

const floorAtZero = (value: bigint): bigint => (value > ZERO ? value : ZERO);

/**
 * Info: (20260813 - Luphia) 訂閱額度可用量 = 兩個視窗剩餘量的**較小值**。
 * 取較小值而非相加：兩個視窗是同時生效的上限，週額度還剩很多也不能突破 5 小時上限。
 */
export function resolveQuotaAvailable(windows: IQuotaWindowUsage): bigint {
  const remaining5h = floorAtZero(windows.limit5h - windows.used5h);
  const remainingWeek = floorAtZero(windows.limitWeek - windows.usedWeek);
  return remaining5h < remainingWeek ? remaining5h : remainingWeek;
}

export interface ISpendSplit {
  // Info: (20260813 - Luphia) 本次實際預扣（cost 封頂到可用餘額）；為 0 代表無餘額可放行
  hold: bigint;
  quotaPart: bigint;
  walletPart: bigint;
  // Info: (20260813 - Luphia) true 表示預扣被餘額封頂，結算時可能出現實耗 > 預扣
  capped: boolean;
}

/**
 * Info: (20260813 - Luphia) 把一筆預扣拆成「訂閱額度 + 錢包」兩段。
 *
 * 預設訂閱額度優先用盡（它會週期性重置，錢包點數是買來的，留著更有價值）；
 * 少數功能反過來（`SPEND_PRIORITY.ALLOCATION_FIRST`，見 FEATURE_SPEND_PRIORITY）——
 * 例如物流碳足跡優先扣分配點數，把視窗額度留給高頻的對話類功能。
 * 兩種順序都不改變總額，只改變「先動哪一邊」。
 */
export function splitSpend(
  cost: bigint,
  quotaAvailable: bigint,
  walletBalance: bigint,
  priority: SpendPriority = SPEND_PRIORITY.QUOTA_FIRST,
): ISpendSplit {
  const quota = floorAtZero(quotaAvailable);
  const wallet = floorAtZero(walletBalance);
  const available = quota + wallet;
  const hold = cost <= available ? cost : available;

  if (priority === SPEND_PRIORITY.ALLOCATION_FIRST) {
    const walletPart = hold < wallet ? hold : wallet;
    return {
      hold,
      quotaPart: hold - walletPart,
      walletPart,
      capped: hold < cost,
    };
  }

  const quotaPart = hold < quota ? hold : quota;
  return {
    hold,
    quotaPart,
    walletPart: hold - quotaPart,
    capped: hold < cost,
  };
}

export interface IRefundSplit {
  walletRefund: bigint;
  quotaRefund: bigint;
}

/**
 * Info: (20260813 - Luphia) 退差額時**先退錢包**：分配點數是買來的資產，
 * 訂閱額度到期即歸零，退回額度對用戶幾乎沒有價值。
 */
export function splitRefund(
  refund: bigint,
  walletCharged: bigint,
): IRefundSplit {
  const total = floorAtZero(refund);
  const wallet = floorAtZero(walletCharged);
  const walletRefund = total < wallet ? total : wallet;
  return { walletRefund, quotaRefund: total - walletRefund };
}

/**
 * Info: (20260825 - Luphia) 「這筆消費現在放不放行」——扣款端與試算端**共用同一個判準**
 *（issue #6714）。
 *
 * 為什麼要抽出來：可中斷任務需要一支**唯讀**的「現在夠不夠」，好讓掃描行程
 * 把「暫停中」的任務翻成「可以繼續」。而如果那支試算另寫一份判斷，
 * 兩邊遲早分岔——分岔那天畫面會很有說服力地說「可以繼續了」，
 * 使用者按下去卻又撞一次牆（檢查表 §1.10：驗收與產品要讀同一支實作）。
 *
 * 兩條判準對應 `spendCredits` 裡的兩個 402：
 *
 * - **固定價格**（`allowPartial = false`）：額度必須**足額**。沒有結算步驟就沒有人
 *   補收差額，放行等於少收；而個人鏈上點數扣不動（合約沒有平台可呼叫的 burn），
 *   因此它不參與這條判準。
 * - **可封頂**（`allowPartial = true`）：只要還有一點可用量就放行，實耗於結算時追補。
 *   這時鏈上點數算得進去——它在結算時扣得到。
 */
export function canAffordSpend(params: {
  quotaAvailable: bigint;
  // Info: (20260825 - Luphia) 可用的個人鏈上點數；不可扣款時呼叫端一律傳 0
  chainCredits: bigint;
  cost: bigint;
  allowPartial: boolean;
}): boolean {
  const { quotaAvailable, chainCredits, cost, allowPartial } = params;
  if (cost <= BigInt(0)) return false;
  if (!allowPartial) return quotaAvailable >= cost;
  return quotaAvailable + chainCredits > BigInt(0);
}

/**
 * Info: (20260825 - Luphia) 用量的**聚合範圍**：免費方案全隊共用一份、
 * 付費方案一人一池（review #6717 低-1）。
 *
 * 抽出來的理由是它**歷史上會分岔的那一半**：`canAffordSpend` 抽的是最後那個
 * 大小比較，而比較不會錯；真正會錯的是「該加總誰的用量」——聚合範圍錯了，
 * 兩個視窗的剩餘量就錯了，而後面的比較再正確也沒有用。
 *
 * 只回傳一個布林而不是自己去查：查詢要在扣款端的鎖裡進行（讀與寫必須同一把鎖），
 * 而唯讀試算沒有鎖。兩邊各自查、共用這個**判準**，是能共用的最大範圍。
 */
export function usesSharedTeamQuota(effectivePlanId: string): boolean {
  return effectivePlanId === TEAM_PLAN.FREE;
}
