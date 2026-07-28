import { Decimal } from "decimal.js";
import { IAccount } from "@/constants/accounts";
import { IVoucher } from "@/interfaces/voucher";
import { ILedger, ILedgerItem, ILedgerOptions } from "@/interfaces/ledger";
import { MoneyUtil } from "@/lib/utils/money";
import { AccountUtil } from "@/lib/utils/account_util";
import { LabelType, BalanceComparator } from "@/constants/ledger";
import { LedgerSorting } from "@/constants/sort";
import { AccountType, toAccountType } from "@/constants/enums";

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
 * 5. running balance 於固定的 (科目→日期→傳票) 標準順序累計，確保餘額決定論；顯示排序另行套用。
 * 6. running balance 依科目正常餘額方向呈現（借方科目借加貸減、貸方科目貸加借減），使負債/權益/收入亦顯示為正值（比照傳統明細分類帳）。
 */

interface IRawEntry {
  voucherId: string;
  voucherDate: number;
  voucherNumber: string;
  voucherType: string | null;
  code: string;
  accountType: AccountType | null;
  accountingTitle: string;
  particulars: string;
  debit: Decimal;
  credit: Decimal;
  // Info: (20260728 - Julian) 科目正常餘額方向：true=借方科目(資產/費用)、false=貸方科目(負債/權益/收入)；不在字典時預設借方
  accountIsDebit: boolean;
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

// Info: (20260728 - Julian) balanceOf 由呼叫端提供已快取之 Decimal，避免排序期間 O(n log n) 次重複 parse
function buildComparator(
  sorting: LedgerSorting,
  balanceOf: (item: ILedgerItem) => Decimal,
): (a: ILedgerItem, b: ILedgerItem) => number {
  // Info: (20260728 - Julian) 末順位一律以 voucherId 打破平手，確保任何排序下行順序完全決定論（避免滾動餘額因排序跳動而視覺錯亂）
  const tie = (a: ILedgerItem, b: ILedgerItem) =>
    a.voucherId.localeCompare(b.voucherId);

  switch (sorting) {
    case LedgerSorting.CODE_DESC:
      return (a, b) =>
        b.code.localeCompare(a.code) ||
        a.voucherDate - b.voucherDate ||
        tie(a, b);
    case LedgerSorting.DATE_ASC:
      return (a, b) => a.voucherDate - b.voucherDate || tie(a, b);
    case LedgerSorting.DATE_DESC:
      return (a, b) => b.voucherDate - a.voucherDate || tie(a, b);
    case LedgerSorting.BALANCE_ASC:
      return (a, b) => balanceOf(a).comparedTo(balanceOf(b)) || tie(a, b);
    case LedgerSorting.BALANCE_DESC:
      return (a, b) => balanceOf(b).comparedTo(balanceOf(a)) || tie(a, b);
    case LedgerSorting.CODE_ASC:
    default:
      return (a, b) =>
        a.code.localeCompare(b.code) ||
        a.voucherDate - b.voucherDate ||
        tie(a, b);
  }
}

// Info: (20260727 - Julian) 餘額金額區間比對；以「絕對值」比較（例如查 1000 以下＝ |餘額| ∈ 0~1000），避免大額負數被誤納
// Info: (20260728 - Julian) balance 為已快取之 Decimal、valueAbs 為預先計算之 |比較值|，避免逐列重複 parse
function matchesBalance(
  balance: Decimal,
  op: BalanceComparator,
  valueAbs: Decimal,
): boolean {
  const cmp = balance.abs().comparedTo(valueAbs);
  if (op === BalanceComparator.GTE) return cmp >= 0;
  if (op === BalanceComparator.LTE) return cmp <= 0;
  return cmp === 0;
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
  const {
    startAccountNo,
    endAccountNo,
    labelType,
    currencyAlias,
    keyword,
    accountType,
    rootCode,
    balanceOp,
    balanceValue,
  } = options;
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
        accountType: toAccountType(displayAccount?.type),
        accountingTitle,
        particulars: line.particular || "",
        debit: line.isDebit ? amount : new Decimal(0),
        credit: line.isDebit ? new Decimal(0) : amount,
        accountIsDebit: displayAccount?.isDebit ?? true,
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
  // Info: (20260728 - Julian) 每列 Decimal 快取（借/貸/餘額），供排序、餘額過濾與總額加總重用，避免重複 parse
  const amountCache = new Map<
    ILedgerItem,
    { debit: Decimal; credit: Decimal; balance: Decimal }
  >();

  canonical.forEach((entry) => {
    const prev = balanceByCode.get(entry.code) ?? new Decimal(0);
    // Info: (20260728 - Julian) running balance 依科目正常餘額方向累計：借方科目=借加貸減；貸方科目=貸加借減，使餘額為正常方向之正值
    const delta = entry.accountIsDebit
      ? entry.debit.minus(entry.credit)
      : entry.credit.minus(entry.debit);
    const balance = prev.plus(delta);
    balanceByCode.set(entry.code, balance);

    const item: ILedgerItem = {
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
    };
    itemByRef.set(entry, item);
    amountCache.set(item, {
      debit: entry.debit,
      credit: entry.credit,
      balance,
    });
  });

  // Info: (20260728 - Julian) 存取快取 Decimal（呼叫端保證 item 來自本次 canonical 建列）
  const balanceOf = (item: ILedgerItem): Decimal =>
    amountCache.get(item)!.balance;

  // Info: (20260727 - Julian) 依顯示排序輸出（餘額已於標準順序計算完畢）
  let items = canonical
    .map((entry) => itemByRef.get(entry)!)
    .sort(buildComparator(sorting, balanceOf));

  // Info: (20260727 - Julian) 科目類別於「產出列」過濾（供試算表總帳節點 drill-down）
  if (accountType && accountType.trim()) {
    items = items.filter((item) => item.accountType === accountType);
  }

  // Info: (20260727 - Julian) 科目子樹於「產出列」過濾：保留 rootCode 及其所有子孫（含虛擬集計根如 1XXX），供試算表統馭科目 drill-down。各科目餘額仍為獨立累計之真實值
  if (rootCode && rootCode.trim()) {
    items = items.filter((item) =>
      AccountUtil.isDescendantOf(item.code, rootCode, dictionary),
    );
  }

  // Info: (20260727 - Julian) 關鍵字於「產出列」過濾（餘額不受影響，仍為各科目真實累計值）
  if (keyword && keyword.trim()) {
    items = items.filter((item) => matchesKeyword(item, keyword));
  }

  // Info: (20260727 - Julian) 餘額金額區間於「產出列」過濾（餘額仍為各科目真實累計值）
  if (balanceOp && balanceValue !== undefined && balanceValue.trim() !== "") {
    // Info: (20260728 - Julian) 比較值絕對值僅計算一次；每列取快取餘額 Decimal
    const valueAbs = MoneyUtil.toDecimal(balanceValue).abs();
    items = items.filter((item) =>
      matchesBalance(amountCache.get(item)!.balance, balanceOp, valueAbs),
    );
  }

  // Info: (20260727 - Julian) 借貸總額取「顯示列」加總，與畫面/匯出一致
  let totalDebit = new Decimal(0);
  let totalCredit = new Decimal(0);
  items.forEach((item) => {
    const amt = amountCache.get(item)!;
    totalDebit = totalDebit.plus(amt.debit);
    totalCredit = totalCredit.plus(amt.credit);
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
