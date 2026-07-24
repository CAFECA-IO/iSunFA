import { Decimal } from "decimal.js";
import { IAccount } from "@/constants/accounts";
import { IVoucher } from "@/interfaces/voucher";
import { ILedger, ILedgerItem, ILedgerOptions } from "@/interfaces/ledger";
import { MoneyUtil } from "@/lib/utils/money";
import { AccountUtil } from "@/lib/utils/account_util";
import { LabelType } from "@/constants/ledger";
import { LedgerSorting } from "@/constants/sort";

/**
 * Info: (20260724 - Julian)
 * 分類帳 (Ledger) 純函式產生器。
 *
 * 設計要點（對齊 documents/ 規範）：
 * 1. 金額全程以 Decimal (MoneyUtil) 運算，輸出為字串（ADR 003）。
 * 2. 帳別 (labelType) 以 COA 樹狀結構「是否為葉節點」判定（DETAILED=葉；GENERAL=具子科目），
 *    嚴禁以科目代碼是否含 "-" 或前綴硬判（見 01_tree_traversal_reporting_engine.md）。
 * 3. 未核對 (isVerified=false) 之懸記分錄一併納入（見 03_suspense_and_quarantine_guardrails.md）。
 * 4. 唯讀 Consumer：不寫 DB、不重算沖銷/匯率/稅務（SoD，ADR 009）。
 * 5. running balance 於固定的 (科目→日期) 標準順序累計，確保餘額決定論；顯示排序另行套用。
 */

interface IRawEntry {
  voucherId: string;
  voucherDate: number;
  voucherNumber: string;
  voucherType: string | null;
  code: string;
  accountingTitle: string;
  particulars: string;
  debit: Decimal;
  credit: Decimal;
}

// Info: (20260724 - Julian) 建立「具子科目之科目代碼」集合：凡被其他科目指為 parentCode 者即非葉節點
function buildParentCodeSet(dictionary: IAccount[]): Set<string> {
  const parents = new Set<string>();
  dictionary.forEach((account) => {
    if (account.parentCode) parents.add(account.parentCode);
  });
  return parents;
}

// Info: (20260724 - Julian) 依帳別判定是否保留該科目（葉節點=DETAILED；非葉=GENERAL）
function matchesLabelType(
  code: string,
  labelType: LabelType,
  parentCodeSet: Set<string>,
): boolean {
  if (labelType === LabelType.ALL) return true;
  const isLeaf = !parentCodeSet.has(code);
  return labelType === LabelType.DETAILED ? isLeaf : !isLeaf;
}

// Info: (20260724 - Julian) 使用者指定的科目代碼區間（含），以字典序比較
function inAccountRange(
  code: string,
  startAccountNo?: string,
  endAccountNo?: string,
): boolean {
  if (startAccountNo && code.localeCompare(startAccountNo) < 0) return false;
  if (endAccountNo && code.localeCompare(endAccountNo) > 0) return false;
  return true;
}

function buildComparator(
  sorting: LedgerSorting,
): (a: ILedgerItem, b: ILedgerItem) => number {
  const byCodeThenDateAsc = (a: ILedgerItem, b: ILedgerItem) =>
    a.code.localeCompare(b.code) || a.voucherDate - b.voucherDate;

  switch (sorting) {
    case LedgerSorting.CODE_DESC:
      return (a, b) =>
        b.code.localeCompare(a.code) || a.voucherDate - b.voucherDate;
    case LedgerSorting.DATE_ASC:
      return (a, b) => a.voucherDate - b.voucherDate;
    case LedgerSorting.DATE_DESC:
      return (a, b) => b.voucherDate - a.voucherDate;
    case LedgerSorting.CODE_ASC:
    default:
      return byCodeThenDateAsc;
  }
}

export function generateLedger(
  vouchers: IVoucher[],
  dictionary: IAccount[],
  options: ILedgerOptions,
): ILedger {
  const { startAccountNo, endAccountNo, labelType, currencyAlias } = options;
  const sorting = options.sorting ?? LedgerSorting.CODE_ASC;
  const parentCodeSet = buildParentCodeSet(dictionary);

  // Info: (20260724 - Julian) 攤平傳票分錄為原始明細
  const rawEntries: IRawEntry[] = [];
  vouchers.forEach((voucher) => {
    voucher.lineItems.lines.forEach((line) => {
      const code = line.accountingCode || line.accounting?.code;

      // Info: (20260724 - Julian) [AUDIT FIX] 缺乏會計代碼或借貸方向者一律阻斷，禁止沉默丟失
      if (!code || line.isDebit === null) {
        throw new Error(
          `[Data Integrity Violation] 分類帳發現無法勾稽的傳票明細，缺乏會計代碼或借貸方向 (Line ID: ${line.id})`,
        );
      }

      // Info: (20260724 - Julian) 套用科目區間與帳別過濾
      if (!inAccountRange(code, startAccountNo, endAccountNo)) return;
      if (!matchesLabelType(code, labelType, parentCodeSet)) return;

      const amount = MoneyUtil.toDecimal(line.amount);
      const account = AccountUtil.getAccount(code, dictionary);

      rawEntries.push({
        voucherId: voucher.id,
        voucherDate: voucher.tradingDate,
        voucherNumber: voucher.id,
        voucherType: voucher.tradingType ?? null,
        code,
        accountingTitle:
          account?.name || line.accounting?.name || line.particular || code,
        particulars: line.particular || "",
        debit: line.isDebit ? amount : new Decimal(0),
        credit: line.isDebit ? new Decimal(0) : amount,
      });
    });
  });

  // Info: (20260724 - Julian) 以固定順序 (科目→日期→傳票) 累計 running balance，確保餘額決定論
  const canonical = [...rawEntries].sort(
    (a, b) =>
      a.code.localeCompare(b.code) ||
      a.voucherDate - b.voucherDate ||
      a.voucherId.localeCompare(b.voucherId),
  );

  const balanceByCode = new Map<string, Decimal>();
  const itemByRef = new Map<IRawEntry, ILedgerItem>();

  let totalDebit = new Decimal(0);
  let totalCredit = new Decimal(0);

  canonical.forEach((entry) => {
    const prev = balanceByCode.get(entry.code) ?? new Decimal(0);
    // Info: (20260724 - Julian) running balance = 前餘額 + 借方 - 貸方
    const balance = prev.plus(entry.debit).minus(entry.credit);
    balanceByCode.set(entry.code, balance);

    totalDebit = totalDebit.plus(entry.debit);
    totalCredit = totalCredit.plus(entry.credit);

    itemByRef.set(entry, {
      voucherId: entry.voucherId,
      voucherDate: entry.voucherDate,
      voucherNumber: entry.voucherNumber,
      voucherType: entry.voucherType,
      code: entry.code,
      accountingTitle: entry.accountingTitle,
      particulars: entry.particulars,
      debitAmount: entry.debit.toString(),
      creditAmount: entry.credit.toString(),
      balance: balance.toString(),
    });
  });

  // Info: (20260724 - Julian) 依顯示排序輸出（餘額已於標準順序計算完畢）
  const items = canonical
    .map((entry) => itemByRef.get(entry)!)
    .sort(buildComparator(sorting));

  return {
    currencyAlias,
    items,
    total: {
      totalDebit: totalDebit.toString(),
      totalCredit: totalCredit.toString(),
    },
  };
}
