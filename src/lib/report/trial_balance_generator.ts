import { Decimal } from "decimal.js";
import { IAccount } from "@/constants/accounts";
import { IVoucher } from "@/interfaces/voucher";
import {
  ITrialBalance,
  ITrialBalanceItem,
  ITrialBalanceOptions,
} from "@/interfaces/trial_balance";
import { MoneyUtil } from "@/lib/utils/money";
import { AccountUtil } from "@/lib/utils/account_util";
import { TrialBalanceSorting } from "@/constants/sort";

/**
 * Info: (20260724 - Julian)
 * 試算表 (Trial Balance) 純函式產生器。
 *
 * 設計要點（對齊 documents/ 規範）：
 * 1. 金額全程以 Decimal (MoneyUtil) 運算，嚴禁原生 number；輸出為字串（ADR 003）。
 * 2. 科目向上彙總 (rollup) 沿 COA 字典的 parentCode 父指標遍歷，
 *    嚴禁 startsWith / 代碼前綴判斷（見 01_tree_traversal_reporting_engine.md）。
 * 3. 未核對 (isVerified=false) 之懸記分錄一併納入，以維持借貸平衡（見 03_suspense_and_quarantine_guardrails.md）。
 * 4. 產生器為唯讀 Consumer，不寫 DB、不重算沖銷/匯率/稅務（SoD，ADR 009）。
 * 5. Fail Fast：三個期間的借貸總額須各自相等，否則 throw（A = L + E 精神）。
 */

// Info: (20260724 - Julian) 期間內部累計用的可變結構（Decimal 尚未字串化）
interface IMutableAmounts {
  beginningDebit: Decimal;
  beginningCredit: Decimal;
  midtermDebit: Decimal;
  midtermCredit: Decimal;
}

const zeroAmounts = (): IMutableAmounts => ({
  beginningDebit: new Decimal(0),
  beginningCredit: new Decimal(0),
  midtermDebit: new Decimal(0),
  midtermCredit: new Decimal(0),
});

/**
 * Info: (20260724 - Julian)
 * 取得預設的當下 401 申報週期（台灣每兩個月為一期）。
 * periodBegin 作為「期初 / 期中」分界；periodEnd 作為累計截止日。
 */
export function getDefault401Period(reference: Date = new Date()): {
  periodBegin: Date;
  periodEnd: Date;
} {
  const year = reference.getFullYear();
  const month = reference.getMonth() + 1; // Info: (20260724 - Julian) getMonth() 從 0 起算

  let startMonth: number;
  let endMonth: number;
  if (month <= 2) {
    startMonth = 1;
    endMonth = 2;
  } else if (month <= 4) {
    startMonth = 3;
    endMonth = 4;
  } else if (month <= 6) {
    startMonth = 5;
    endMonth = 6;
  } else if (month <= 8) {
    startMonth = 7;
    endMonth = 8;
  } else if (month <= 10) {
    startMonth = 9;
    endMonth = 10;
  } else {
    startMonth = 11;
    endMonth = 12;
  }

  // Info: (20260724 - Julian) periodBegin 為該期第一天 00:00；periodEnd 為該期最後一天 23:59:59
  const periodBegin = new Date(year, startMonth - 1, 1, 0, 0, 0, 0);
  const periodEnd = new Date(year, endMonth, 0, 23, 59, 59, 999);
  return { periodBegin, periodEnd };
}

/**
 * Info: (20260724 - Julian)
 * 沿 COA 字典 parentCode 父指標，回傳 targetCode 及其所有祖先科目代碼（含自身）。
 * 使用 AccountUtil.getAccount 作為唯一字典存取入口，並以 visited 防呆避免髒資料無窮迴圈。
 */
function getSelfAndAncestorCodes(
  targetCode: string,
  dictionary: IAccount[],
): string[] {
  const codes: string[] = [];
  const visited = new Set<string>();
  let currentCode: string | undefined = targetCode;

  while (currentCode && !visited.has(currentCode)) {
    visited.add(currentCode);
    codes.push(currentCode);
    const account = AccountUtil.getAccount(currentCode, dictionary);
    currentCode = account?.parentCode || undefined;
  }

  return codes;
}

// Info: (20260724 - Julian) 依排序選項回傳排序比較器（金額比較以 Decimal 進行）
function buildComparator(
  sorting: TrialBalanceSorting,
): (a: ITrialBalanceItem, b: ITrialBalanceItem) => number {
  const byCodeAsc = (a: ITrialBalanceItem, b: ITrialBalanceItem) =>
    a.code.localeCompare(b.code);

  const amountDesc =
    (key: keyof ITrialBalanceItem) =>
    (a: ITrialBalanceItem, b: ITrialBalanceItem) =>
      MoneyUtil.toDecimal(b[key] as string).comparedTo(
        MoneyUtil.toDecimal(a[key] as string),
      );
  const amountAsc =
    (key: keyof ITrialBalanceItem) =>
    (a: ITrialBalanceItem, b: ITrialBalanceItem) =>
      MoneyUtil.toDecimal(a[key] as string).comparedTo(
        MoneyUtil.toDecimal(b[key] as string),
      );

  switch (sorting) {
    case TrialBalanceSorting.CODE_DESC:
      return (a, b) => b.code.localeCompare(a.code);
    case TrialBalanceSorting.BEGINNING_DEBIT_DESC:
      return amountDesc("beginningDebit");
    case TrialBalanceSorting.BEGINNING_DEBIT_ASC:
      return amountAsc("beginningDebit");
    case TrialBalanceSorting.BEGINNING_CREDIT_DESC:
      return amountDesc("beginningCredit");
    case TrialBalanceSorting.BEGINNING_CREDIT_ASC:
      return amountAsc("beginningCredit");
    case TrialBalanceSorting.MIDTERM_DEBIT_DESC:
      return amountDesc("midtermDebit");
    case TrialBalanceSorting.MIDTERM_DEBIT_ASC:
      return amountAsc("midtermDebit");
    case TrialBalanceSorting.MIDTERM_CREDIT_DESC:
      return amountDesc("midtermCredit");
    case TrialBalanceSorting.MIDTERM_CREDIT_ASC:
      return amountAsc("midtermCredit");
    case TrialBalanceSorting.ENDING_DEBIT_DESC:
      return amountDesc("endingDebit");
    case TrialBalanceSorting.ENDING_DEBIT_ASC:
      return amountAsc("endingDebit");
    case TrialBalanceSorting.ENDING_CREDIT_DESC:
      return amountDesc("endingCredit");
    case TrialBalanceSorting.ENDING_CREDIT_ASC:
      return amountAsc("endingCredit");
    case TrialBalanceSorting.CODE_ASC:
    default:
      return byCodeAsc;
  }
}

function sortTreeInPlace(
  items: ITrialBalanceItem[],
  comparator: (a: ITrialBalanceItem, b: ITrialBalanceItem) => number,
): void {
  items.sort(comparator);
  items.forEach((item) => sortTreeInPlace(item.subAccounts, comparator));
}

export function generateTrialBalance(
  vouchers: IVoucher[],
  dictionary: IAccount[],
  options: ITrialBalanceOptions,
): ITrialBalance {
  const { startDate, endDate, currencyAlias } = options;
  const sorting = options.sorting ?? TrialBalanceSorting.CODE_ASC;

  // Info: (20260724 - Julian) tradingDate 為 epoch 秒，故分界點亦轉為秒
  const beginningCutoff = Math.floor(startDate.getTime() / 1000);
  const endingCutoff = Math.floor(endDate.getTime() / 1000);

  // Info: (20260724 - Julian) leafMap：僅記錄實際過帳科目的原始發生額，供總計避免重複計算
  const leafMap = new Map<string, IMutableAmounts>();
  // Info: (20260724 - Julian) 科目名稱字典（過帳科目找不到時的備援）
  const postedNameMap = new Map<string, string>();

  vouchers.forEach((voucher) => {
    const tradingDate = voucher.tradingDate;
    // Info: (20260724 - Julian) 保險起見再次過濾截止日之後的傳票（資料源理應已過濾）
    if (tradingDate > endingCutoff) return;
    const isBeginning = tradingDate < beginningCutoff;

    voucher.lineItems.lines.forEach((line) => {
      const code = line.accountingCode || line.accounting?.code;

      // Info: (20260724 - Julian) [AUDIT FIX] 缺乏會計代碼或借貸方向者一律阻斷，禁止沉默丟失
      if (!code || line.isDebit === null) {
        throw new Error(
          `[Data Integrity Violation] 試算表發現無法勾稽的傳票明細，缺乏會計代碼或借貸方向 (Line ID: ${line.id})`,
        );
      }

      if (!leafMap.has(code)) leafMap.set(code, zeroAmounts());
      if (!postedNameMap.has(code)) {
        postedNameMap.set(
          code,
          line.accounting?.name || line.particular || code,
        );
      }

      const acc = leafMap.get(code)!;
      const amount = MoneyUtil.toDecimal(line.amount);

      if (line.isDebit) {
        if (isBeginning) acc.beginningDebit = acc.beginningDebit.plus(amount);
        else acc.midtermDebit = acc.midtermDebit.plus(amount);
      } else if (isBeginning) {
        acc.beginningCredit = acc.beginningCredit.plus(amount);
      } else {
        acc.midtermCredit = acc.midtermCredit.plus(amount);
      }
    });
  });

  // Info: (20260724 - Julian) nodeMap：以樹狀上捲後的每一節點（含祖先）金額
  const nodeMap = new Map<string, IMutableAmounts>();
  const ensureNode = (code: string): IMutableAmounts => {
    if (!nodeMap.has(code)) nodeMap.set(code, zeroAmounts());
    return nodeMap.get(code)!;
  };
  // Info: (20260727 - Julian) nodeTypeMap：節點科目類別；集計根(如 1XXX/11XX)不在字典時，由葉科目往上傳播
  const nodeTypeMap = new Map<string, string>();

  leafMap.forEach((amounts, leafCode) => {
    const leafType = AccountUtil.getAccount(leafCode, dictionary)?.type ?? "";
    const chain = getSelfAndAncestorCodes(leafCode, dictionary);
    chain.forEach((code) => {
      const node = ensureNode(code);
      node.beginningDebit = node.beginningDebit.plus(amounts.beginningDebit);
      node.beginningCredit = node.beginningCredit.plus(amounts.beginningCredit);
      node.midtermDebit = node.midtermDebit.plus(amounts.midtermDebit);
      node.midtermCredit = node.midtermCredit.plus(amounts.midtermCredit);

      // Info: (20260727 - Julian) 節點自身在字典有類別則用之，否則沿用葉科目類別作為 fallback
      const ownType = AccountUtil.getAccount(code, dictionary)?.type;
      if (ownType) nodeTypeMap.set(code, String(ownType));
      else if (!nodeTypeMap.has(code) && leafType)
        nodeTypeMap.set(code, String(leafType));
    });
  });

  // Info: (20260724 - Julian) 將節點轉為 ITrialBalanceItem（含 ending = beginning + midterm），並過濾全零節點
  const nodeItemMap = new Map<string, ITrialBalanceItem>();
  nodeMap.forEach((amounts, code) => {
    const endingDebit = amounts.beginningDebit.plus(amounts.midtermDebit);
    const endingCredit = amounts.beginningCredit.plus(amounts.midtermCredit);

    const allZero =
      amounts.beginningDebit.isZero() &&
      amounts.beginningCredit.isZero() &&
      amounts.midtermDebit.isZero() &&
      amounts.midtermCredit.isZero();
    if (allZero) return;

    const account = AccountUtil.getAccount(code, dictionary);
    const name = account?.name || postedNameMap.get(code) || code;

    nodeItemMap.set(code, {
      code,
      name,
      accountType: String(account?.type ?? nodeTypeMap.get(code) ?? ""),
      beginningDebit: amounts.beginningDebit.toString(),
      beginningCredit: amounts.beginningCredit.toString(),
      midtermDebit: amounts.midtermDebit.toString(),
      midtermCredit: amounts.midtermCredit.toString(),
      endingDebit: endingDebit.toString(),
      endingCredit: endingCredit.toString(),
      subAccounts: [],
    });
  });

  // Info: (20260724 - Julian) 依 parentCode 組樹：父節點若存在於結果集中則掛為子科目，否則為頂層
  const topLevel: ITrialBalanceItem[] = [];
  nodeItemMap.forEach((item, code) => {
    const account = AccountUtil.getAccount(code, dictionary);
    const parentCode = account?.parentCode;
    const parentItem =
      parentCode && parentCode !== code
        ? nodeItemMap.get(parentCode)
        : undefined;
    if (parentItem) {
      parentItem.subAccounts.push(item);
    } else {
      topLevel.push(item);
    }
  });

  const comparator = buildComparator(sorting);
  sortTreeInPlace(topLevel, comparator);

  // Info: (20260724 - Julian) 總計由 leafMap 加總（避免上捲父節點造成重複計算）
  let totalBeginningDebit = new Decimal(0);
  let totalBeginningCredit = new Decimal(0);
  let totalMidtermDebit = new Decimal(0);
  let totalMidtermCredit = new Decimal(0);
  leafMap.forEach((amounts) => {
    totalBeginningDebit = totalBeginningDebit.plus(amounts.beginningDebit);
    totalBeginningCredit = totalBeginningCredit.plus(amounts.beginningCredit);
    totalMidtermDebit = totalMidtermDebit.plus(amounts.midtermDebit);
    totalMidtermCredit = totalMidtermCredit.plus(amounts.midtermCredit);
  });
  const totalEndingDebit = totalBeginningDebit.plus(totalMidtermDebit);
  const totalEndingCredit = totalBeginningCredit.plus(totalMidtermCredit);

  // Info: (20260724 - Julian) [FAIL FAST] 雙軌記帳下，各期間借貸總額必須相等，否則凍結
  if (
    !totalBeginningDebit.equals(totalBeginningCredit) ||
    !totalMidtermDebit.equals(totalMidtermCredit) ||
    !totalEndingDebit.equals(totalEndingCredit)
  ) {
    throw new Error(
      "[Trial Balance Imbalance] 借貸總額不平衡，疑似分錄資料異常，已依決定論護欄凍結輸出",
    );
  }

  return {
    currencyAlias,
    items: topLevel,
    total: {
      beginningDebit: totalBeginningDebit.toString(),
      beginningCredit: totalBeginningCredit.toString(),
      midtermDebit: totalMidtermDebit.toString(),
      midtermCredit: totalMidtermCredit.toString(),
      endingDebit: totalEndingDebit.toString(),
      endingCredit: totalEndingCredit.toString(),
    },
  };
}
