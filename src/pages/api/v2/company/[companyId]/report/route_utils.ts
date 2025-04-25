import balanceSheetLiteMapping from '@/constants/account_sheet_mapping/v2/balance_sheet_lite_mapping.json';
import cashFlowStatementLiteMapping from '@/constants/account_sheet_mapping/v2/cash_flow_statement_lite_mapping.json';
import incomeStatementLiteMapping from '@/constants/account_sheet_mapping/v2/income_statement_lite_mapping.json';

import { ReportSheetType } from '@/constants/report';
import { IAccountReadyForFrontend } from '@/interfaces/accounting_account';

type FilterType = {
  code: string;
  name: string;
  indent: number;
};

/**
 * Info: (20241016 - Murky)
 * This function returns the appropriate mapping (general and detail sections)
 * for one of the three main financial reports: Balance Sheet, Cash Flow Statement,
 * and Income Statement. The report type 401 (unsupported report) will throw an error.
 *
 * @param {ReportSheetType} reportType - The type of financial report.
 * It should be one of the following:
 *   - ReportSheetType.BALANCE_SHEET
 *   - ReportSheetType.CASH_FLOW_STATEMENT
 *   - ReportSheetType.INCOME_STATEMENT
 * @returns {{general: FilterType[], detail: FilterType[]}} The general and detail
 * mapping configuration for the specified report type.
 * @throws {Error} Throws an error if the reportType is not supported (e.g., 401). * Get
 */
export function getReportFilterByReportType(reportType: ReportSheetType): {
  general: FilterType[];
  detail: FilterType[];
} {
  switch (reportType) {
    case ReportSheetType.BALANCE_SHEET:
      return balanceSheetLiteMapping;
    case ReportSheetType.CASH_FLOW_STATEMENT:
      return cashFlowStatementLiteMapping;
    case ReportSheetType.INCOME_STATEMENT:
      return incomeStatementLiteMapping;
    default:
      throw new Error(`[Error] getMappingByReportType not supporting ${reportType} report type.`);
  }
}

/**
 * Info: (20241016 - Murky)
 * Transforms an array of accounts into a Map for efficient access.
 *
 * This function reshapes the provided list of accounts from the FinancialReport class
 * into a Map where each account can be accessed by its unique code in constant time (O(1)).
 * This transformation is particularly useful for optimizing lookup operations on large datasets.
 *
 * @param {IAccountReadyForFrontend[]} accounts - An array of account objects generated
 * from the FinancialReport class, typically passed through the `content` argument.
 * Each account is expected to have a non-empty `code` property.
 *
 * @returns {Map<string, IAccountReadyForFrontend>} - A Map where:
 *   - {Key}: The `code` of the account, which serves as the unique identifier for each entry.
 *   - {Value}: The corresponding account object of type `IAccountReadyForFrontend`.
 */
export function transformAccountsToMap(accounts: IAccountReadyForFrontend[]) {
  const accountsMap = new Map<string, IAccountReadyForFrontend>();

  accounts.forEach((account) => {
    if (account.code.length > 0) {
      accountsMap.set(account.code, account);
    }
  });

  return accountsMap;
}

/**
 * Info: (20241016 - Murky)
 * Reconstructs an account array based on a provided filter sequence and account data source.
 *
 * This function takes a `filter` array and an `accountsMap` as input, and returns a new array of
 * accounts that follows the order specified by the filter. Each item in the `filter` array
 * corresponds to an account code, and the matching account is retrieved from `accountsMap`.
 *
 * The resulting array will only include accounts whose codes are present both in the filter
 * and the `accountsMap`. Accounts not found in the `accountsMap` will be skipped.
 *
 * @param {Object} param - An object containing the following properties:
 * @param {FilterType[]} param.filter - An array of filter objects, each containing an account code.
 * This determines the sequence of the output array.
 * @param {Map<string, IAccountReadyForFrontend>} param.accountsMap - A Map object where each key is
 * an account code and the value is the corresponding account object.
 *
 * @returns {IAccountReadyForFrontend[]} A new array of accounts following the order specified
 * in the filter array. Only accounts with matching codes in `accountsMap` are included.
 */
export function transformAccountsMapToFilterSequence({
  filter,
  accountsMap,
}: {
  filter: FilterType[];
  accountsMap: Map<string, IAccountReadyForFrontend>;
}) {
  const accountsAfterFilter = filter.reduce((result: IAccountReadyForFrontend[], filterItem) => {
    const account = accountsMap.get(filterItem.code);
    if (account) {
      result.push(account);
    }
    return result;
  }, []);

  return accountsAfterFilter;
}
