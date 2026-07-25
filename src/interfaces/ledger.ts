import { LabelType } from "@/constants/ledger";
import { LedgerSorting } from "@/constants/sort";

/**
 * Info: (20260724 - Julian)
 * 分類帳 (Ledger) 逐筆明細列。金額一律以 Decimal 字串呈現（ADR 003）。
 * balance 為該科目截至此列的 running balance（借方為正、貸方為負累計）。
 * voucherNumber 目前以 voucher.id 呈現（Schema 無獨立傳票編號欄位）。
 */
export interface ILedgerItem {
  voucherId: string;
  voucherDate: number;
  voucherNumber: string;
  voucherType: string | null;
  code: string;
  accountingTitle: string;
  particulars: string;
  debitAmount: string;
  creditAmount: string;
  balance: string;
}

/**
 * Info: (20260724 - Julian) 分類帳借貸總額。
 */
export interface ILedgerTotal {
  totalDebit: string;
  totalCredit: string;
}

/**
 * Info: (20260724 - Julian) 分類帳產生器輸出。
 */
export interface ILedger {
  currencyAlias: string;
  items: ILedgerItem[];
  total: ILedgerTotal;
}

/**
 * Info: (20260724 - Julian) 分類帳產生器選項。
 * startAccountNo / endAccountNo 為使用者指定的科目代碼區間（含）。
 * labelType 以 COA 樹狀結構判定（非字串前綴）：DETAILED=僅末層明細科目；
 * GENERAL=將明細過帳上捲歸屬至父（總帳）科目；ALL=不過濾不上捲。
 */
export interface ILedgerOptions {
  startAccountNo?: string;
  endAccountNo?: string;
  labelType: LabelType;
  sorting?: LedgerSorting;
  currencyAlias: string;
}
