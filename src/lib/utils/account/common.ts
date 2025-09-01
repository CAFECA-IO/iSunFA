import { PUBLIC_ACCOUNT_BOOK_ID } from '@/interfaces/account_book';
import {
  IAccountForSheetDisplay,
  IAccountNode,
  IAccountEntity,
  IAccountNodeWithDebitAndCredit,
} from '@/interfaces/accounting_account';
import { ILineItemIncludeAccount } from '@/interfaces/line_item';
import { AccountType } from '@/constants/account';
import { Account as PrismaAccount } from '@prisma/client';
import { getTimestampNow } from '@/lib/utils/common';
import { DecimalOperations } from '@/lib/utils/decimal_operations';

export function initAccountEntity(
  dto: Partial<PrismaAccount> & {
    accountBookId: number;
    system: string;
    type: AccountType;
    debit: boolean;
    liquidity: boolean;
    code: string;
    name: string;
    forUser: boolean;
    parentCode: string;
    rootCode: string;
    parentId: number;
    rootId: number;
    level: number;
    parent?: IAccountEntity;
    root?: IAccountEntity;
  }
): IAccountEntity {
  const nowInSecond = getTimestampNow();
  const accountEntity: IAccountEntity = {
    id: dto.id || 0,
    accountBookId: dto.accountBookId,
    system: dto.system,
    type: dto.type,
    debit: dto.debit,
    liquidity: dto.liquidity,
    code: dto.code,
    name: dto.name,
    forUser: dto.forUser,
    level: dto.level,
    parentCode: dto.parentCode,
    rootCode: dto.rootCode,
    parentId: dto.parentId,
    rootId: dto.rootId,
    parent: dto.parent,
    root: dto.root,
    createdAt: dto.createdAt || nowInSecond,
    updatedAt: dto.updatedAt || nowInSecond,
    deletedAt: dto.deletedAt || null,
  };
  return accountEntity;
}

export function transformLineItemsFromDBToMap(
  lineItemsFromDB: ILineItemIncludeAccount[]
): Map<number, number> {
  const lineItems: Map<number, number> = new Map();
  lineItemsFromDB.forEach((lineItem) => {
    const isAccountDebit = lineItem.account.debit;
    const isLineItemDebit = lineItem.debit;
    const { amount } = lineItem;
    const amountString = typeof amount === 'string' ? amount : amount.toString();
    const adjustedAmountString = isAccountDebit === isLineItemDebit
      ? amountString
      : DecimalOperations.negate(amountString);

    const lineItemOriginalAmountString = (lineItems.get(lineItem.accountId) || 0).toString();
    const newAmountString = DecimalOperations.add(lineItemOriginalAmountString, adjustedAmountString);
    lineItems.set(lineItem.accountId, parseFloat(newAmountString));
  });
  return lineItems;
}

function transformAccountsToMap(accounts: PrismaAccount[]): Map<string, IAccountNode> {
  const accountMap = new Map<string, IAccountNode>();

  accounts.forEach((account) => {
    accountMap.set(account.code, {
      ...account,
      children: [],
      amount: 0,
    });
  });

  return accountMap;
}

export function buildAccountForest(accounts: PrismaAccount[]): IAccountNode[] {
  const accountMap = transformAccountsToMap(accounts);
  const rootAccounts: IAccountNode[] = [];

  accountMap.forEach((account, code) => {
    if (account.parentCode !== code) {
      const parentAccount = accountMap.get(account.parentCode);
      if (parentAccount) {
        parentAccount.children.push(account);
      }
    } else {
      rootAccounts.push(account);
    }
  });

  return rootAccounts;
}

function transformAccountsToMapAndCodeSet(accounts: PrismaAccount[]): {
  accountMap: Map<string, IAccountNodeWithDebitAndCredit>;
  accountCode: Set<string>;
} {
  const accountMap = new Map<string, IAccountNodeWithDebitAndCredit>();
  const accountCode = new Set<string>();

  accounts.forEach((account) => {
    accountCode.add(account.code);
    accountMap.set(account.code, {
      ...account,
      children: [],
      debitAmount: 0,
      creditAmount: 0,
    });
  });

  return { accountMap, accountCode };
}

/** Info: (20250102 - Shirley)
 * 將 forUser = true 的會計科目列表轉換成樹狀結構
 * @param accounts 放入 forUser = true 的會計科目列表
 * @returns 樹狀結構
 */
export function buildAccountForestForUser(
  accounts: PrismaAccount[]
): IAccountNodeWithDebitAndCredit[] {
  const { accountMap, accountCode } = transformAccountsToMapAndCodeSet(accounts);
  const rootAccounts: IAccountNodeWithDebitAndCredit[] = [];

  accountMap.forEach((account) => {
    // Info: (20241111 - Shirley) 如果 parentCode 不在 forUserCodeSet 中，則為 rootAccount
    if (!accountCode.has(account.parentCode)) {
      rootAccounts.push(account);
    } else {
      const parentAccount = accountMap.get(account.parentCode);
      if (parentAccount) {
        parentAccount.children.push(account);
      }
    }
  });

  return rootAccounts;
}

function updateAccountAmountsByDFS(account: IAccountNode, lineItemsMap: Map<number, number>) {
  let newAmount = lineItemsMap.get(account.id) || 0;

  const updatedChildren = account.children.map((child) => {
    const childAccount = updateAccountAmountsByDFS(child, lineItemsMap);

    // Info: (20240702 - Murky) 如果parent和child的debit方向不同，則child的amount要取負值
    // 例如：Parent 是 機具設備淨額，Child 是 機具設備成本 and 累計折舊－機具設備，則機具設備淨額 = 機具設備成本 - 累計折舊
    newAmount += account.debit === child.debit ? childAccount.amount : -childAccount.amount;

    return childAccount;
  });

  // Info: (20240702 - Murky) Copy child to prevent call by reference
  const updatedAccount: IAccountNode = {
    id: account.id,
    amount: newAmount,
    accountBookId: account.accountBookId,
    system: account.system,
    type: account.type,
    debit: account.debit,
    liquidity: account.liquidity,
    code: account.code,
    name: account.name,
    forUser: account.forUser,
    parentCode: account.parentCode,
    rootCode: account.rootCode,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    level: account.level,
    deletedAt: account.deletedAt,
    children: updatedChildren,
    parentId: account.parentId,
    rootId: account.rootId,
    note: account.note,
  };
  // if (account.code === '1100') {
  // console.log('account: ', account, 'newAmount: ', newAmount);
  // }

  // updatedAccount.amount = newAmount; // Info: (20240801 - Murky)

  // Info: (20240702 - Murky)刪除children中公司自行建立的account
  updatedAccount.children = updatedAccount.children.filter(
    (child) => child.accountBookId === PUBLIC_ACCOUNT_BOOK_ID
  );

  return updatedAccount;
}

// Info: (20241114 - Shirley) 用於Trial Balance，跟 `updateAccountAmountsByDFS` 的差別在於保留公司自訂會計科目
function updateAccountAmountByDFSForTrialBalance(
  account: IAccountNode,
  lineItemsMap: Map<number, { debitAmount: number; creditAmount: number }>
) {
  const newAmount = lineItemsMap.get(account.id) || { debitAmount: 0, creditAmount: 0 };

  const updatedChildren = account.children.map((child) => {
    const childAccount = updateAccountAmountByDFSForTrialBalance(child, lineItemsMap);

    // Info: (20240702 - Murky) 如果parent和child的debit方向不同，則child的amount要取負值
    // 例如：Parent 是 機具設備淨額，Child 是 機具設備成本 and 累計折舊－機具設備，則機具設備淨額 = 機具設備成本 - 累計折舊
    newAmount.debitAmount +=
      account.debit === child.debit ? childAccount.debitAmount : -childAccount.debitAmount;
    newAmount.creditAmount +=
      account.debit === child.debit ? childAccount.creditAmount : -childAccount.creditAmount;

    return childAccount;
  });

  // Info: (20240702 - Murky) Copy child to prevent call by reference
  const updatedAccount: IAccountNodeWithDebitAndCredit = {
    id: account.id,
    debitAmount: newAmount.debitAmount,
    creditAmount: newAmount.creditAmount,
    accountBookId: account.accountBookId,
    system: account.system,
    type: account.type,
    debit: account.debit,
    liquidity: account.liquidity,
    code: account.code,
    name: account.name,
    forUser: account.forUser,
    parentCode: account.parentCode,
    rootCode: account.rootCode,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    level: account.level,
    deletedAt: account.deletedAt,
    children: updatedChildren,
    parentId: account.parentId,
    rootId: account.rootId,
    note: account.note,
  };

  // updatedAccount.amount = newAmount; // Info: (20240801 - Murky)

  // Info: (20240702 - Murky)刪除children中公司自行建立的account
  // updatedAccount.children = updatedAccount.children.filter(
  //   (child) => child.companyId === PUBLIC_ACCOUNT_BOOK_ID
  // );

  return updatedAccount;
}

export function updateAccountAmountsInSingleTree(
  accounts: IAccountNode,
  lineItemsMap: Map<number, number>
) {
  const updatedIAccountNode = updateAccountAmountsByDFS(accounts, lineItemsMap);
  return updatedIAccountNode;
}

// Info: (20241114 - Shirley) 用於Trial Balance，跟 `updateAccountAmountsInSingleTree` 的差別在於保留公司自訂會計科目
export function updateAccountAmountsInSingleTreeForTrialBalance(
  accounts: IAccountNode,
  lineItemsMap: Map<number, { debitAmount: number; creditAmount: number }>
) {
  return updateAccountAmountByDFSForTrialBalance(accounts, lineItemsMap);
}

export function updateAccountAmounts(forest: IAccountNode[], lineItemsMap: Map<number, number>) {
  const updatedForest = forest.map((account) => {
    return updateAccountAmountsInSingleTree(account, lineItemsMap);
  });

  return updatedForest;
}

// Info: (20241114 - Shirley) 用於Trial Balance，跟 `updateAccountAmounts` 的差別在於保留公司自訂會計科目
export function updateAccountAmountsForTrialBalance(
  forest: IAccountNode[],
  lineItemsMap: Map<number, { debitAmount: number; creditAmount: number }>
) {
  const updatedForest = forest.map((account) => {
    return updateAccountAmountsInSingleTreeForTrialBalance(account, lineItemsMap);
  });

  return updatedForest;
}

/**
 * Info: (20241011 - Murky)
 * Start with 0 depth
 */
export function calculateMaxHeighOfNode(node: IAccountNode): number {
  if (!node.children || node.children.length === 0) {
    return 0;
  }

  let maxChildDepth = 0;
  node.children.forEach((child) => {
    maxChildDepth = Math.max(maxChildDepth, calculateMaxHeighOfNode(child));
  });

  return maxChildDepth + 1;
}

export function addAccountNodeToMapRecursively(
  accountMap: Map<string, { accountNode: IAccountNode; percentage: number }>,
  account: IAccountNode,
  rootAmount: number,
  currentDepth: number,
  // Info: (20241014 - Murky) 暫時不用
  /* eslint-disable @typescript-eslint/no-unused-vars */
  maxHeight: number
  /* eslint-enable @typescript-eslint/no-unused-vars */
) {
  // Info: (20250425 - Anna) 不限層級的會計科目都保留 children，不清空
  const newAccountNode = account;
  const percentage = rootAmount === 0 ? 0 : account.amount / rootAmount; // Info: (20240702 - Murky) Calculate percentage
  accountMap.set(account.code, { accountNode: newAccountNode, percentage });

  account.children.forEach((child) => {
    const maxHeightOfChild = calculateMaxHeighOfNode(child);
    addAccountNodeToMapRecursively(
      accountMap,
      child,
      rootAmount,
      currentDepth + 1,
      maxHeightOfChild
    );
  });

  return false;
}

export function transformForestToMap(
  forest: IAccountNode[]
): Map<string, { accountNode: IAccountNode; percentage: number }> {
  const accountMap = new Map<string, { accountNode: IAccountNode; percentage: number }>();

  forest.forEach((accountNode) => {
    const maxHeight = calculateMaxHeighOfNode(accountNode);
    addAccountNodeToMapRecursively(accountMap, accountNode, accountNode.amount, 0, maxHeight);
  });

  return accountMap;
}

export function iAccountNode2IAccountForSheetDisplay(
  accountNode: IAccountNode,
  percentage: number,
  children?: IAccountForSheetDisplay[]
): IAccountForSheetDisplay {
  const iAccountForSheetDisplay: IAccountForSheetDisplay = {
    accountId: accountNode.id,
    code: accountNode.code,
    name: accountNode.name,
    amount: accountNode.amount,
    indent: accountNode.level,
    debit: accountNode.debit,
    percentage,
    children: children || [],
  };
  return iAccountForSheetDisplay;
}

export function mappingAccountToSheetDisplay(
  accountMap: Map<string, { accountNode: IAccountNode; percentage: number }>,
  sheetMappingRow: {
    code: string;
    name: string;
    indent: number;
  }[]
): IAccountForSheetDisplay[] {
  const sheetDisplay: IAccountForSheetDisplay[] = [];
  const alreadyUsedAccountName = new Set<string>();

  const getChildren = (parent: IAccountNode): IAccountForSheetDisplay[] =>
    parent.children.map((child) => {
      const childAccount = accountMap.get(child.code)!;
      return iAccountNode2IAccountForSheetDisplay(
        childAccount.accountNode,
        childAccount.percentage,
        getChildren(childAccount.accountNode) // Info: (20250425 - Anna) 遞迴
      );
    });

  sheetMappingRow.forEach((row) => {
    // Info: (20240702 - Murky) 如果已經有相同的code，則不再加入
    if (alreadyUsedAccountName.has(row.name)) {
      return;
    }

    alreadyUsedAccountName.add(row.name);
    const account = accountMap.get(row.code);
    if (!account) {
      sheetDisplay.push({
        accountId: -1,
        code: row.code,
        name: row.name,
        amount: 0,
        indent: row.indent,
        debit: undefined,
        percentage: 0,
        children: [],
      });
    } else {
      const children = getChildren(account.accountNode);

      sheetDisplay.push({
        // Info: (20250425 - Anna) 如果 account 存在，使用實際的 accountId；找不到 account 時才設為 -1
        accountId: account.accountNode.id,
        code: row.code,
        name: row.name,
        amount: account.accountNode.amount,
        indent: row.indent,
        debit: account.accountNode.debit,
        percentage: account.percentage,
        children,
      });
    }
  });

  return sheetDisplay;
}

export function calculateIncomeStatementNetIncome(accounts: IAccountNode[]): IAccountNode[] {
  const operatingRevenues = accounts.find((account) => account.code === '4000')?.amount || 0;
  const operatingCosts = accounts.find((account) => account.code === '5000')?.amount || 0;
  const biologicalRecognizedGainLoss =
    accounts.find((account) => account.code === '5850')?.amount || 0;
  const biologicalChangeInFairValue =
    accounts.find((account) => account.code === '5860')?.amount || 0;

  const grossProfit =
    operatingRevenues - operatingCosts + biologicalRecognizedGainLoss + biologicalChangeInFairValue;
  const grossProfitAccount = accounts.find((account) => account.code === '5900');

  if (grossProfitAccount) {
    grossProfitAccount.amount = grossProfit;
  }

  const unrealizedProfitFromSales =
    accounts.find((account) => account.code === '5910')?.amount || 0;
  const realizedProfitFromSales = accounts.find((account) => account.code === '5920')?.amount || 0;
  const netGrossProfit = grossProfit + unrealizedProfitFromSales + realizedProfitFromSales;

  const netGrossProfitAccount = accounts.find((account) => account.code === '5950');
  if (netGrossProfitAccount) {
    netGrossProfitAccount.amount = netGrossProfit;
  }

  const operatingExpenses = accounts.find((account) => account.code === '6000')?.amount || 0;
  const netOtherIncome = accounts.find((account) => account.code === '6500')?.amount || 0;
  const netOperatingIncome = netGrossProfit - operatingExpenses + netOtherIncome;

  const netOperatingIncomeAccount = accounts.find((account) => account.code === '6900');
  if (netOperatingIncomeAccount) {
    netOperatingIncomeAccount.amount = netOperatingIncome;
  }

  const noneOperatingIncomeAndExpenses =
    accounts.find((account) => account.code === '7000')?.amount || 0;
  const profitFromContinuingOperationsBeforeTax =
    netOperatingIncome + noneOperatingIncomeAndExpenses;

  const profitFromContinuingOperationsBeforeTaxAccount = accounts.find(
    (account) => account.code === '7900'
  );
  if (profitFromContinuingOperationsBeforeTaxAccount) {
    profitFromContinuingOperationsBeforeTaxAccount.amount = profitFromContinuingOperationsBeforeTax;
  }

  const TaxExpense = accounts.find((account) => account.code === '7950')?.amount || 0;
  const profitFromContinuingOperations = profitFromContinuingOperationsBeforeTax - TaxExpense;
  const profitFromContinuingOperationsAccount = accounts.find((account) => account.code === '8000');
  if (profitFromContinuingOperationsAccount) {
    profitFromContinuingOperationsAccount.amount = profitFromContinuingOperations;
  }

  const profitFromDiscontinuedOperations =
    accounts.find((account) => account.code === '8100')?.amount || 0;
  const ProfitToNonControllingInterestsBeforeBusinessCombination =
    accounts.find((account) => account.code === '8160')?.amount || 0;
  const netIncome =
    profitFromContinuingOperations +
    profitFromDiscontinuedOperations +
    ProfitToNonControllingInterestsBeforeBusinessCombination;

  const netIncomeAccount = accounts.find((account) => account.code === '8200');
  if (netIncomeAccount) {
    netIncomeAccount.amount = netIncome;
  }

  const otherComprehensiveIncome = accounts.find((account) => account.code === '8300')?.amount || 0;
  const comprehensiveIncomeToNonControllingInterestsBeforeBusinessCombination =
    accounts.find((account) => account.code === '8400')?.amount || 0;
  const totalComprehensiveIncome =
    netIncome +
    otherComprehensiveIncome +
    comprehensiveIncomeToNonControllingInterestsBeforeBusinessCombination;
  const totalComprehensiveIncomeAccount = accounts.find((account) => account.code === '8500');
  if (totalComprehensiveIncomeAccount) {
    totalComprehensiveIncomeAccount.amount = totalComprehensiveIncome;
  }
  return accounts;
}

// Info: (20240702 - Murky) Cash flow related function
// Info: (20240702 - Murky) cash flow from operating

/**
 * This function is used to adjust the net income to cash flow from operating by adding non-cash expense.
 * , such as depreciation, doubtful debts expense, amortization of intangible assets, loss from Equity method investment, increase of Pension liability
 * (Used in indirect method of cash flow statement)
 * @param {number} netIncome - Net income from income statement
 * @param  {number} nonCashExpense - Non-cash expense from income statement
 * @returns {number} adjusted net income
 */
export function adjustNonCashExpenseFromNetIncome(
  netIncome: number,
  nonCashExpense: number
): number {
  return netIncome + nonCashExpense;
}

/**
 * This function is used to adjust the net income to cash flow from operating by adding non-cash revenue.
 * , such as transfer deferred income into revenue, revenue from Equity method investment
 * (Used in indirect method of cash flow statement)
 * @param {number} netIncome - Net income from income statement
 * @param  {number} nonCashRevenue - Non-cash revenue from income statement
 * @returns {number} adjusted net income
 */
export function adjustNonCashRevenueFromNetIncome(
  netIncome: number,
  nonCashRevenue: number
): number {
  return netIncome - nonCashRevenue;
}

/**
 * This function is used to adjust the net income to cash flow from operating by removing interest or dividend revenue (which means retrieve from net income).
 * the reason is that interest or dividend revenue need to be disclosure in separated row in operating cash flow
 * (Used in indirect method of cash flow statement)
 * @param {number} netIncome - Net income from income statement
 * @param {number} interestOrDividendRevenue - Interest or dividend revenue from income statement, need to be credit
 * @returns {number} adjusted net income
 */
export function removeInterestOrDividendRevenueFromNetIncome(
  netIncome: number,
  interestOrDividendRevenue: number
): number {
  return netIncome - interestOrDividendRevenue;
}

/**
 * This function is used to adjust the net income to cash flow from operating by removing interest expense (which means add to net income).
 * the reason is that interest expense need to be disclosure in separated row in operating cash flow
 * (Used in indirect method of cash flow statement)
 * @param {number} netIncome - Net income from income statement
 * @param {number} interestExpense - Interest expense from income statement, need to be debit
 * @returns {number} adjusted net income
 */
export function removeInterestExpenseFromNetIncome(
  netIncome: number,
  interestExpense: number
): number {
  return netIncome + interestExpense;
}

/**
 * This function is used to remove revenue from investment and financial activity from net income.
 * Since those revenue need to be disclosure in investment and financial activity in cash flow statement.
 * So that need to remove from operating cash flow.
 * Example: gain from disposal of fix asset
 * (Used in indirect method of cash flow statement)
 * @param {number} netIncome - Net income from income statement
 * @param {number} investAndFinancialRevenue - Income tax expense from income statement, need to be credit
 * @returns {number} adjusted net income
 */
export function removeInvestAndFinancialRevenueFromNetIncome(
  netIncome: number,
  investAndFinancialRevenue: number
): number {
  return netIncome - investAndFinancialRevenue;
}

/**
 * This function is used to remove expense from investment and financial activity from net income.
 * Since those expense need to be disclosure in investment and financial activity in cash flow statement.
 * So that need to remove from operating cash flow.
 * Example: loss from disposal of fix asset
 * (Used in indirect method of cash flow statement)
 * @param {number} netIncome - Net income from income statement
 * @param {number} investAndFinancialExpense - Income tax expense from income statement, need to be debit
 * @returns {number} adjusted net income
 */
export function removeInvestAndFinancialExpenseFromNetIncome(
  netIncome: number,
  investAndFinancialExpense: number
): number {
  return netIncome + investAndFinancialExpense;
}

/**
 * This function adjust asset increase from net income to cash flow from operating.
 * Asset increase need to be debit increase, if is decrease (or credit increase) please input negative number
 * @param {number} netIncome - Net income from income statement
 * @param {number} assetIncrease - Asset increase from balance sheet
 * @returns {number} adjusted net income
 */
export function adjustAssetIncreaseFromNetIncome(netIncome: number, assetIncrease: number): number {
  return netIncome - assetIncrease;
}

/**
 * This function adjust liability increase from net income to cash flow from operating.
 * Liability increase need to be credit increase, if is decrease (or debit increase) please input negative number
 * @param {number} netIncome - Net income from income statement
 * @param {number} liabilityIncrease - Liability increase from balance sheet
 * @returns {number} adjusted net income
 */
export function adjustLiabilityIncreaseFromNetIncome(
  netIncome: number,
  liabilityIncrease: number
): number {
  return netIncome + liabilityIncrease;
}

/**
 * This function is returning original value of item
 * @param {number} netIncome - Net income from income statement, just an placeholder to carry a zero
 * @param {number} originalNumber - Original number from income statement
 * @returns {number} net income
 */
export function noAdjustNetIncome(netIncome: number = 0, originalNumber: number = 0): number {
  return netIncome + originalNumber;
}

export function reverseNetIncome(netIncome: number = 0, originalNumber: number = 0): number {
  return -1 * (netIncome + originalNumber);
}

export function absoluteNetIncome(netIncome: number = 0, originalNumber: number = 0): number {
  return Math.abs(netIncome + originalNumber);
}
