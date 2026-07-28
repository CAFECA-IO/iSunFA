import { TrialBalanceSorting } from "@/constants/sort";
import { AccountType } from "@/constants/enums";

/**
 * Info: (20260724 - Julian)
 * 試算表 (Trial Balance) 單一科目列。
 * 金額一律以 Decimal 字串呈現（後端不輸出原生 number；見 ADR 003），
 * 千分位等展示格式交由前端渲染層處理。
 * subAccounts 為以 COA 樹狀結構向上彙總 (rollup) 後的子科目。
 */
export interface ITrialBalanceItem {
  code: string;
  name: string;
  // Info: (20260728 - Julian) 科目類別；集計根等無明確類別者為 null（取代空字串哨兵，遵守 §3）
  accountType: AccountType | null;
  beginningDebit: string;
  beginningCredit: string;
  midtermDebit: string;
  midtermCredit: string;
  endingDebit: string;
  endingCredit: string;
  subAccounts: ITrialBalanceItem[];
}

/**
 * Info: (20260724 - Julian) 試算表六欄總計。雙軌記帳下三個期間的借貸總額應各自相等。
 */
export interface ITrialBalanceTotal {
  beginningDebit: string;
  beginningCredit: string;
  midtermDebit: string;
  midtermCredit: string;
  endingDebit: string;
  endingCredit: string;
}

/**
 * Info: (20260724 - Julian) 試算表產生器輸出。
 */
export interface ITrialBalance {
  currencyAlias: string;
  items: ITrialBalanceItem[];
  total: ITrialBalanceTotal;
}

/**
 * Info: (20260724 - Julian) 試算表產生器選項。
 * startDate 為「期初 / 期中」分界點；endDate 為累計截止日 (as-of)。
 */
export interface ITrialBalanceOptions {
  startDate: Date;
  endDate: Date;
  currencyAlias: string;
  sorting?: TrialBalanceSorting;
}
