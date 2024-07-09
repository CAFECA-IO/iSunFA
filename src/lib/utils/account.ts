import { PUBLIC_COMPANY_ID } from '@/constants/company';
import { IAccountForSheetDisplay, IAccountNode } from '@/interfaces/accounting_account';
import { ILineItemIncludeAccount } from '@/interfaces/line_item';
import { Account } from '@prisma/client';

// Deprecated: (20240702 - Murky) This is for testing purpose
// import { AccountType } from "@/constants/account";
// import { findManyAccountsInPrisma } from "@/lib/utils/repo/account.repo";
// import { getSumOfLineItemsGroupByAccountInPrisma } from "@/lib/utils/repo/line_item.repo";
// import balanceSheetMapping from '@/constants/account_sheet_mapping/balance_sheet_mapping.json';

export function transformLineItemsFromDBToMap(
  lineItemsFromDB: ILineItemIncludeAccount[]
): Map<number, number> {
  const lineItems: Map<number, number> = new Map();
  lineItemsFromDB.forEach((lineItem) => {
    const isAccountDebit = lineItem.account.debit;
    const isLineItemDebit = lineItem.debit;
    const { amount } = lineItem;

    const adjustedAmount = isAccountDebit === isLineItemDebit ? amount : -amount;

    const lineItemOriginalAmount = lineItems.get(lineItem.accountId) || 0;
    lineItems.set(lineItem.accountId, lineItemOriginalAmount + adjustedAmount);
  });
  return lineItems;
}

function transformAccountsToMap(accounts: Account[]): Map<string, IAccountNode> {
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

export function buildAccountForest(accounts: Account[]): IAccountNode[] {
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
  const updatedAccount: IAccountNode = { ...account, children: updatedChildren };

  updatedAccount.amount = newAmount;

  // Info: (20240702 - Murky)刪除children中公司自行建立的account
  updatedAccount.children = updatedAccount.children.filter(
    (child) => child.companyId === PUBLIC_COMPANY_ID
  );
  return updatedAccount;
}

export function updateAccountAmountsInSingleTree(
  accounts: IAccountNode,
  lineItemsMap: Map<number, number>
) {
  const updatedIAccountNode = updateAccountAmountsByDFS(accounts, lineItemsMap);
  return updatedIAccountNode;
}

export function updateAccountAmounts(forest: IAccountNode[], lineItemsMap: Map<number, number>) {
  const updatedForest = forest.map((account) => updateAccountAmountsInSingleTree(account, lineItemsMap));
  return updatedForest;
}

export function addAccountNodeToMapRecursively(
  accountMap: Map<string, IAccountNode>,
  account: IAccountNode
) {
  const newAccountNode = { ...account, children: [] };
  accountMap.set(account.code, newAccountNode);
  account.children.forEach((child) => {
    addAccountNodeToMapRecursively(accountMap, child);
  });
}

export function transformForestToMap(forest: IAccountNode[]): Map<string, IAccountNode> {
  const accountMap = new Map<string, IAccountNode>();

  forest.forEach((accountNode) => {
    addAccountNodeToMapRecursively(accountMap, accountNode);
  });

  return accountMap;
}

export function mappingAccountToSheetDisplay(
  accountMap: Map<string, IAccountNode>,
  sheetMappingRow: {
    code: string;
    name: string;
    indent: number;
  }[]
): IAccountForSheetDisplay[] {
  const sheetDisplay: IAccountForSheetDisplay[] = [];

  sheetMappingRow.forEach((row) => {
    if (!row.code) {
      sheetDisplay.push({
        code: row.code,
        name: row.name,
        amount: null,
        indent: row.indent,
      });
      return;
    }
    const account = accountMap.get(row.code);
    if (!account) {
      sheetDisplay.push({
        code: row.code,
        name: row.name,
        amount: 0,
        indent: row.indent,
      });
      return;
    }

    sheetDisplay.push({
      code: row.code,
      name: row.name,
      amount: account.amount,
      indent: row.indent,
    });
  });

  return sheetDisplay;
}

// Deprecated: (20240702 - Murky) Accounting logic need to be refactor, Income sum up should be done when update account tree
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
