import {
  ALLOCATE_OFFCHAIN_EXIT_FEATURE_CODE,
  CONSERVATION_REPAIR_FEATURE_CODE,
  TEAM_WALLET_ENTRY_TYPE,
  type TeamWalletEntryType,
} from "@/constants/subscription_quota";

/**
 * Info: (20261015 - Luphia) 團隊點數移轉紀錄頁（/user/team/[team_id]/ledger）的常數。
 *
 * 篩選在**伺服器端**做：流水帳是分頁的，若在前端過濾，一頁 20 筆裡可能只剩 2 筆
 * 符合，頁數與總筆數也會對不上——管理者會以為紀錄不見了。
 */
export const TEAM_WALLET_LEDGER_FILTER = {
  ALL: "ALL",
  PURCHASE: "PURCHASE",
  ALLOCATE: "ALLOCATE",
  CONSUME: "CONSUME",
  REFUND: "REFUND",
} as const;

export type TeamWalletLedgerFilter =
  (typeof TEAM_WALLET_LEDGER_FILTER)[keyof typeof TEAM_WALLET_LEDGER_FILTER];

export const TEAM_WALLET_LEDGER_FILTER_VALUES = Object.values(
  TEAM_WALLET_LEDGER_FILTER,
) as [TeamWalletLedgerFilter, ...TeamWalletLedgerFilter[]];

export type TeamWalletLedgerTypedFilter = Exclude<
  TeamWalletLedgerFilter,
  typeof TEAM_WALLET_LEDGER_FILTER.ALL
>;

/**
 * Info: (20261015 - Luphia) 篩選 → 分錄類型。「分配」同時涵蓋分配與收回：
 * 兩者是同一個管理動作的兩個方向，管理者查「我分了多少給誰」時兩邊都要看得到。
 * ADJUST 不在任何一個篩選裡，只在「全部」出現（見下方系統調整的說明）。
 */
export const TEAM_WALLET_LEDGER_FILTER_ENTRY_TYPES: Readonly<
  Record<TeamWalletLedgerTypedFilter, readonly TeamWalletEntryType[]>
> = {
  PURCHASE: [TEAM_WALLET_ENTRY_TYPE.PURCHASE],
  ALLOCATE: [TEAM_WALLET_ENTRY_TYPE.ALLOCATE, TEAM_WALLET_ENTRY_TYPE.REVOKE],
  CONSUME: [TEAM_WALLET_ENTRY_TYPE.CONSUME],
  REFUND: [TEAM_WALLET_ENTRY_TYPE.REFUND],
};

export const TEAM_WALLET_LEDGER_PAGE_SIZE = 20;

/**
 * Info: (20261015 - Luphia) 內部記帳用的 ADJUST 分錄（系統調整）。
 *
 * 分配的「價值離開離鏈帳本」配對分錄與守恆修復分錄都不是任何人做的事，
 * 而是讓守恆恆等式成立的記帳。它們**標示為系統調整而不隱藏**：
 * 1. 隱藏會讓分頁失真（一頁少幾筆、總筆數對不上），在前端隱藏尤其如此。
 * 2. 未分配池餘額是逐筆遞延的；藏掉一筆，相鄰兩列的「池餘額」就接不起來，
 *    查帳的人會看到一個說不出來源的落差——這比多看到一列更糟（零捏造原則）。
 * view 只回傳 featureCode（不含 idempotencyKey），因此以 featureCode 判斷。
 */
export const SYSTEM_ADJUSTMENT_FEATURE_CODES: readonly string[] = [
  ALLOCATE_OFFCHAIN_EXIT_FEATURE_CODE,
  CONSERVATION_REPAIR_FEATURE_CODE,
];

export function isSystemAdjustmentEntry(entry: {
  entryType: TeamWalletEntryType;
  featureCode: string | null;
}): boolean {
  return (
    entry.entryType === TEAM_WALLET_ENTRY_TYPE.ADJUST &&
    entry.featureCode !== null &&
    SYSTEM_ADJUSTMENT_FEATURE_CODES.includes(entry.featureCode)
  );
}

// Info: (20261015 - Luphia) 點數移轉紀錄頁的載入狀態（畫面分辨「載入中」與「載入失敗」）
export const TEAM_WALLET_LEDGER_LOAD_STATUS = {
  LOADING: "LOADING",
  READY: "READY",
  ERROR: "ERROR",
} as const;

export type TeamWalletLedgerLoadStatus =
  (typeof TEAM_WALLET_LEDGER_LOAD_STATUS)[keyof typeof TEAM_WALLET_LEDGER_LOAD_STATUS];
