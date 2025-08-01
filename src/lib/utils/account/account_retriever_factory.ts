import { AccountType } from '@/constants/account';
import { ACCOUNT_TYPE_REPORT_SHEET_TYPE_MAPPING, ReportSheetType } from '@/constants/report';
import { GeneralAccountRetriever } from '@/lib/utils/account/general_account_retriever';
import { BalanceSheetAccountRetriever } from '@/lib/utils/account/balance_sheet_account_retriever';
import { EquityAccountRetriever } from '@/lib/utils/account/equity_account_retriever';
import { IncomeStatementAccountRetriever } from '@/lib/utils/account/income_statement_account_retriever';
import { AssetAccountRetriever } from '@/lib/utils/account/asset_account_retriever';
import { LiabilityAccountRetriever } from '@/lib/utils/account/liability_account_retriever';
import { IAccountQueryArgs } from '@/interfaces/accounting_account';

export default class AccountRetrieverFactory {
  static createRetriever({
    accountBookId,
    includeDefaultAccount,
    liquidity,
    type,
    reportType,
    equityType,
    forUser,
    page,
    limit,
    sortBy,
    sortOrder,
    searchKey,
    isDeleted,
  }: IAccountQueryArgs) {
    const reportTypeLocal = type
      ? type !== AccountType.OTHER
        ? ACCOUNT_TYPE_REPORT_SHEET_TYPE_MAPPING[type]
        : undefined
      : undefined;

    switch (reportTypeLocal) {
      case ReportSheetType.BALANCE_SHEET:
        switch (type) {
          case AccountType.ASSET:
            return new AssetAccountRetriever(
              accountBookId,
              includeDefaultAccount,
              liquidity,
              type,
              reportType,
              equityType,
              forUser,
              page,
              limit,
              sortBy,
              sortOrder,
              searchKey,
              isDeleted
            );
          case AccountType.LIABILITY:
            return new LiabilityAccountRetriever(
              accountBookId,
              includeDefaultAccount,
              liquidity,
              type,
              reportType,
              equityType,
              forUser,
              page,
              limit,
              sortBy,
              sortOrder,
              searchKey,
              isDeleted
            );
          case AccountType.EQUITY:
            return new EquityAccountRetriever(
              accountBookId,
              includeDefaultAccount,
              liquidity,
              type,
              reportType,
              equityType,
              forUser,
              page,
              limit,
              sortBy,
              sortOrder,
              searchKey,
              isDeleted
            );
          default:
            return new BalanceSheetAccountRetriever(
              accountBookId,
              includeDefaultAccount,
              liquidity,
              type,
              reportType,
              equityType,
              forUser,
              page,
              limit,
              sortBy,
              sortOrder,
              searchKey,
              isDeleted
            );
        }
      case ReportSheetType.INCOME_STATEMENT:
        return new IncomeStatementAccountRetriever(
          accountBookId,
          includeDefaultAccount,
          liquidity,
          type,
          reportType,
          equityType,
          forUser,
          page,
          limit,
          sortBy,
          sortOrder,
          searchKey,
          isDeleted
        );
      default:
        return new GeneralAccountRetriever(
          accountBookId,
          includeDefaultAccount,
          liquidity,
          type,
          reportType,
          equityType,
          forUser,
          page,
          limit,
          sortBy,
          sortOrder,
          searchKey,
          isDeleted
        );
    }
  }
}
