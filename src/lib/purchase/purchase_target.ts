import { TeamRole } from "@/constants/team";
import { TEAM_PLAN } from "@/constants/subscription_quota";

/**
 * Info: (20260814 - Luphia) 訂閱 / 購點的歸屬對象規則（設計書 §6.1、§7、§6.4）。
 *
 * 抽成純函式是因為這裡的規則會漂：哪些方案要選團隊、誰有資格代表團隊付款、
 * 什麼情況該擋住送出——每一條都寫在畫面裡的話，只會在有人回報「我按不下去」時才被發現。
 * 不碰 DOM、不碰網路，可單測。
 */

export const PURCHASE_MODE = {
  // Info: (20260814 - Luphia) 團隊訂閱：額度掛在 TeamSubscription 上，一定屬於某個團隊
  SUBSCRIPTION: "SUBSCRIPTION",
  // Info: (20260814 - Luphia) 點數包：可買給自己（鏈上點數）或買進團隊錢包
  CREDIT_PACK: "CREDIT_PACK",
  /**
   * Info: (20260814 - Luphia) 不需要選歸屬對象：客製方案（on_premise、iso*、carbon_label）
   * 走匯款、由業務接手，沒有自動履行，也就沒有「灌進誰的帳」這個問題。
   */
  NONE: "NONE",
} as const;

export type PurchaseMode = (typeof PURCHASE_MODE)[keyof typeof PURCHASE_MODE];

export const BLOCKING_REASON = {
  // Info: (20260814 - Luphia) 沒有任何有權限的團隊（不是擁有者 / 沒有團隊）
  NO_ELIGIBLE_TEAM: "NO_ELIGIBLE_TEAM",
  // Info: (20260814 - Luphia) 有得選但還沒選
  TEAM_NOT_SELECTED: "TEAM_NOT_SELECTED",
} as const;

export type BlockingReason =
  (typeof BLOCKING_REASON)[keyof typeof BLOCKING_REASON];

// Info: (20260814 - Luphia) 訂閱限 OWNER、購點限 OWNER / ADMIN（設計書 §6.4 權限矩陣）
const SUBSCRIPTION_ROLES: string[] = [TeamRole.OWNER];
const WALLET_ROLES: string[] = [TeamRole.OWNER, TeamRole.ADMIN];

export function resolvePurchaseMode(
  planId: string | undefined,
  creditPlanId: string | undefined,
): PurchaseMode {
  if (planId === TEAM_PLAN.TEAM || planId === TEAM_PLAN.BUSINESS) {
    return PURCHASE_MODE.SUBSCRIPTION;
  }
  if (!planId && creditPlanId) return PURCHASE_MODE.CREDIT_PACK;
  return PURCHASE_MODE.NONE;
}

/**
 * Info: (20260814 - Luphia) 只留下「我有資格代表它付款」的團隊。
 * 讓人選了才被 server 打回票，是把權限規則的成本轉嫁給用戶。
 */
export function filterEligibleTeams<T extends { role: string | null }>(
  teams: T[],
  mode: PurchaseMode,
): T[] {
  if (mode === PURCHASE_MODE.NONE) return [];
  const allowed =
    mode === PURCHASE_MODE.SUBSCRIPTION ? SUBSCRIPTION_ROLES : WALLET_ROLES;
  return teams.filter((team) => team.role && allowed.includes(team.role));
}

/**
 * Info: (20260814 - Luphia) 尚未備妥就不該讓人送出：沒有歸屬的訂單付得掉卻履行不了，
 * 而錢已經收了。回傳 null 代表可以付款。
 */
export function resolveBlockingReason(params: {
  mode: PurchaseMode;
  usesTeam: boolean;
  /**
   * Info: (20260817 - Luphia) 改收 id 清單而非只收數量（PR #6652 第二輪 C-3）。
   *
   * 原本只判斷 `!selectedTeamId`，於是「選了 T3 買點數 → 切到訂閱（T3 不合格）」
   * 之後，殘留的 T3 仍讓送出鈕保持啟用，而下拉框是空白的、金額退回單席價。
   * 光靠呼叫端在切換時清掉選擇是不夠的——那是一個容易漏掉的 effect，
   * 而這個函式是送出鈕的唯一守門員，它自己就該確認選中的團隊還在名單上。
   */
  eligibleTeamIds: readonly string[];
  selectedTeamId: string | null;
}): BlockingReason | null {
  const { mode, usesTeam, eligibleTeamIds, selectedTeamId } = params;
  if (mode === PURCHASE_MODE.NONE) return null;
  if (!usesTeam) return null;
  if (eligibleTeamIds.length === 0) return BLOCKING_REASON.NO_ELIGIBLE_TEAM;
  // Info: (20260817 - Luphia) 選了但已不合格，與「還沒選」是同一件事
  if (!selectedTeamId || !eligibleTeamIds.includes(selectedTeamId)) {
    return BLOCKING_REASON.TEAM_NOT_SELECTED;
  }
  return null;
}
