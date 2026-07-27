import { Decimal } from "decimal.js";
import { IAccount } from "@/constants/accounts";
import { IVoucher } from "@/interfaces/voucher";
import { ILedger, ILedgerItem, ILedgerOptions } from "@/interfaces/ledger";
import { MoneyUtil } from "@/lib/utils/money";
import { AccountUtil } from "@/lib/utils/account_util";
import { LabelType } from "@/constants/ledger";
import { LedgerSorting } from "@/constants/sort";

/**
 * Info: (20260727 - Julian)
 * 分類帳 (Ledger) 純函式產生器。
 *
 * 設計要點（對齊 documents/ 規範）：
 * 1. 金額全程以 Decimal (MoneyUtil) 運算，輸出為字串（ADR 003）。
 * 2. 帳別 (labelType) 以 COA 樹狀結構判定，嚴禁以代碼是否含 "-" 或前綴硬判（見 01_tree_traversal_reporting_engine.md）：
 *    - DETAILED（明細分類帳）：僅保留葉節點（末層明細科目）之過帳。
 *    - GENERAL（總分類帳）：將葉節點過帳沿 parentCode 上捲歸屬至其父（總帳）科目，逐筆呈現、餘額於父科目累計。
 *    - ALL：不過濾、不上捲，依原過帳科目呈現。
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
  accountType: string;
  accountingTitle: string;
  particulars: string;
  debit: Decimal;
  credit: Decimal;
}

// Info: (20260727 - Julian) 建立「具子科目之科目代碼」集合：凡被其他科目指為 parentCode 者即非葉節點
function buildParentCodeSet(dictionary: IAccount[]): Set<string> {
  const parents = new Set<string>();
  dictionary.forEach((account) => {
    if (account.parentCode) parents.add(account.parentCode);
  });
  return parents;
}

/**
 * Info: (20260727 - Julian) 依帳別解析該過帳「是否納入」與「歸屬顯示科目」。
 * - DETAILED：僅納入葉節點過帳，顯示於原科目。
 * - GENERAL：全數納入；葉節點過帳上捲歸屬至其父（總帳）科目，非葉或無父則保留自身。
 * - ALL：全數納入，顯示於原科目。
 */
function resolveLabel(
  code: string,
  labelType: LabelType,
  dictionary: IAccount[],
  parentCodeSet: Set<string>,
): { include: boolean; displayCode: string } {
  const isLeaf = !parentCodeSet.has(code);

  if (labelType === LabelType.DETAILED) {
    return { include: isLeaf, displayCode: code };
  }

  if (labelType === LabelType.GENERAL) {
    const parentCode = AccountUtil.getAccount(code, dictionary)?.parentCode;
    const parentExists =
      !!parentCode && !!AccountUtil.getAccount(parentCode, dictionary);
    const displayCode = isLeaf && parentExists ? parentCode! : code;
    return { include: true, displayCode };
  }

  // Info: (20260727 - Julian) LabelType.ALL
  return { include: true, displayCode: code };
}

// Info: (20260727 - Julian) 使用者指定的科目代碼區間（含），以字典序比較
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

// Info: (20260727 - Julian) 關鍵字比對（不分大小寫）：科目編號/會計科目/摘要/傳票編號
function matchesKeyword(item: ILedgerItem, keyword: string): boolean {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return true;
  return (
    item.code.toLowerCase().includes(kw) ||
    item.accountingTitle.toLowerCase().includes(kw) ||
    item.particulars.toLowerCase().includes(kw) ||
    item.voucherNumber.toLowerCase().includes(kw)
  );
}

export function generateLedger(
  vouchers: IVoucher[],
  dictionary: IAccount[],
  options: ILedgerOptions,
): ILedger {
  const { startAccountNo, endAccountNo, labelType, currencyAlias, keyword } =
    options;
  const sorting = options.sorting ?? LedgerSorting.CODE_ASC;
  const parentCodeSet = buildParentCodeSet(dictionary);

  // Info: (20260727 - Julian) 攤平傳票分錄為原始明細
  const rawEntries: IRawEntry[] = [];
  vouchers.forEach((voucher) => {
    voucher.lineItems.lines.forEach((line) => {
      const code = line.accountingCode || line.accounting?.code;

      // Info: (20260727 - Julian) [AUDIT FIX] 缺乏會計代碼或借貸方向者一律阻斷，禁止沉默丟失
      if (!code || line.isDebit === null) {
        throw new Error(
          `[Data Integrity Violation] 分類帳發現無法勾稽的傳票明細，缺乏會計代碼或借貸方向 (Line ID: ${line.id})`,
        );
      }

      // Info: (20260727 - Julian) 依帳別決定是否納入與歸屬顯示科目（GENERAL 上捲至父科目）
      const { include, displayCode } = resolveLabel(
        code,
        labelType,
        dictionary,
        parentCodeSet,
      );
      if (!include) return;

      // Info: (20260727 - Julian) 科目區間過濾套用於顯示科目（使用者所見）
      if (!inAccountRange(displayCode, startAccountNo, endAccountNo)) return;

      const amount = MoneyUtil.toDecimal(line.amount);
      const displayAccount = AccountUtil.getAccount(displayCode, dictionary);
      // Info: (20260727 - Julian) 上捲後名稱取父科目；未上捲時可退回原分錄名稱
      const accountingTitle =
        displayAccount?.name ||
        (displayCode === code
          ? line.accounting?.name || line.particular || code
          : displayCode);

      rawEntries.push({
        voucherId: voucher.id,
        voucherDate: voucher.tradingDate,
        voucherNumber: voucher.id,
        voucherType: voucher.tradingType ?? null,
        code: displayCode,
        accountType: displayAccount?.type ?? "",
        accountingTitle,
        particulars: line.particular || "",
        debit: line.isDebit ? amount : new Decimal(0),
        credit: line.isDebit ? new Decimal(0) : amount,
      });
    });
  });

  // Info: (20260727 - Julian) 以固定順序 (科目→日期→傳票) 累計 running balance，確保餘額決定論
  const canonical = [...rawEntries].sort(
    (a, b) =>
      a.code.localeCompare(b.code) ||
      a.voucherDate - b.voucherDate ||
      a.voucherId.localeCompare(b.voucherId),
  );

  // Info: (20260727 - Julian) running balance 以「全量」於標準順序計算，確保餘額決定論
  const balanceByCode = new Map<string, Decimal>();
  const itemByRef = new Map<IRawEntry, ILedgerItem>();

  canonical.forEach((entry) => {
    const prev = balanceByCode.get(entry.code) ?? new Decimal(0);
    // Info: (20260727 - Julian) running balance = 前餘額 + 借方 - 貸方
    const balance = prev.plus(entry.debit).minus(entry.credit);
    balanceByCode.set(entry.code, balance);

    itemByRef.set(entry, {
      voucherId: entry.voucherId,
      voucherDate: entry.voucherDate,
      voucherNumber: entry.voucherNumber,
      voucherType: entry.voucherType,
      code: entry.code,
      accountType: entry.accountType,
      accountingTitle: entry.accountingTitle,
      particulars: entry.particulars,
      debitAmount: entry.debit.toString(),
      creditAmount: entry.credit.toString(),
      balance: balance.toString(),
    });
  });

  // Info: (20260727 - Julian) 依顯示排序輸出（餘額已於標準順序計算完畢）
  let items = canonical
    .map((entry) => itemByRef.get(entry)!)
    .sort(buildComparator(sorting));

  // Info: (20260727 - Julian) 關鍵字於「產出列」過濾（餘額不受影響，仍為各科目真實累計值）
  if (keyword && keyword.trim()) {
    items = items.filter((item) => matchesKeyword(item, keyword));
  }

  // Info: (20260727 - Julian) 借貸總額取「顯示列」加總，與畫面/匯出一致
  let totalDebit = new Decimal(0);
  let totalCredit = new Decimal(0);
  items.forEach((item) => {
    totalDebit = totalDebit.plus(MoneyUtil.toDecimal(item.debitAmount));
    totalCredit = totalCredit.plus(MoneyUtil.toDecimal(item.creditAmount));
  });

  return {
    currencyAlias,
    items,
    total: {
      totalDebit: totalDebit.toString(),
      totalCredit: totalCredit.toString(),
    },
  };
}
