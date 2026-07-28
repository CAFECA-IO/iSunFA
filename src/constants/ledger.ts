/**
 * Info: (20260724 - Julian)
 * 分類帳 (Ledger) 帳別篩選類型。
 * - GENERAL：僅總帳科目（末層以上的彙總科目）。
 * - DETAILED：僅明細科目（末層科目 / 子科目）。
 * - ALL：全部科目。
 *
 * 是否為末層 / 子科目，一律透過 COA metadata（IAccount.level / AccountUtil 樹狀溯源）判定，
 * 嚴禁以科目代碼字串前綴或是否含 "-" 硬判（見 documents/architecture/compliance_and_audit/01_tree_traversal_reporting_engine.md）。
 */
export enum LabelType {
  GENERAL = "general",
  DETAILED = "detailed",
  ALL = "all",
}

/**
 * Info: (20260727 - Julian)
 * 分類帳「餘額金額」篩選的比較運算子：
 * - GTE：以上（>=）
 * - LTE：以下（<=）
 * - EQ：相等（==）
 */
export enum BalanceComparator {
  GTE = "gte",
  LTE = "lte",
  EQ = "eq",
}
