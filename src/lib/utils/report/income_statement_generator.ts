import { SPECIAL_ACCOUNTS } from '@/constants/account';
import { ReportSheetType } from '@/constants/report';
import { EMPTY_I_ACCOUNT_READY_FRONTEND } from '@/constants/financial_report';
import incomeStatementMapping from '@/constants/account_sheet_mapping/income_statement_mapping.json';
import {
  calculateIncomeStatementNetIncome,
  mappingAccountToSheetDisplay,
  transformForestToMap,
  transformLineItemsFromDBToMap,
  updateAccountAmounts,
} from '@/lib/utils/account/common';
import {
  IAccountForSheetDisplay,
  IAccountNode,
  IAccountReadyForFrontend,
} from '@/interfaces/accounting_account';
import { IncomeStatementOtherInfo } from '@/interfaces/report';
import FinancialReportGenerator from '@/lib/utils/report/financial_report_generator';

export default class IncomeStatementGenerator extends FinancialReportGenerator {
  private eslintEscape = '';

  constructor(companyId: number, startDateInSecond: number, endDateInSecond: number) {
    const reportSheetType = ReportSheetType.INCOME_STATEMENT;
    super(companyId, startDateInSecond, endDateInSecond, reportSheetType);
  }

  // Info: (20240416 - Murky) Calculate revenue and expense ratio
  public override async generateFinancialReportTree(curPeriod: boolean): Promise<IAccountNode[]> {
    const lineItemsFromDB = await this.getAllLineItemsByReportSheet(curPeriod);
    const accountForest = await this.getAccountForestByReportSheet();

    const lineItemsMap = transformLineItemsFromDBToMap(lineItemsFromDB);

    let updatedAccountForest = updateAccountAmounts(accountForest, lineItemsMap);

    updatedAccountForest = calculateIncomeStatementNetIncome(updatedAccountForest);
    return updatedAccountForest;
  }

  public override async generateFinancialReportMap(curPeriod: boolean): Promise<
    Map<
      string,
      {
        accountNode: IAccountNode;
        percentage: number;
      }
    >
  > {
    const accountForest = await this.generateFinancialReportTree(curPeriod);
    const accountMap = transformForestToMap(accountForest);
    return accountMap;
  }

  public override async generateFinancialReportArray(
    curPeriod: boolean
  ): Promise<IAccountForSheetDisplay[]> {
    const accountMap = await this.generateFinancialReportMap(curPeriod);

    // Info: (20240726 - Murky) Calculate revenue and expense ratio
    const accountList = mappingAccountToSheetDisplay(accountMap, incomeStatementMapping);

    return accountList;
  }

  // Info: (20240726 - Murky) Calculate revenue and expense ratio
  private static calculateRevenueAndExpenseRatio(
    revenue?: IAccountReadyForFrontend,
    totalCost?: IAccountReadyForFrontend,
    salesExpense?: IAccountReadyForFrontend,
    administrativeExpense?: IAccountReadyForFrontend
  ): {
    curRatio: number;
    preRatio: number;
  } {
    let curRatio = 0;
    let preRatio = 0;

    if (!revenue || !totalCost || !salesExpense || !administrativeExpense) {
      return {
        curRatio,
        preRatio,
      };
    }

    if (
      totalCost.curPeriodAmount +
        salesExpense.curPeriodAmount +
        administrativeExpense.curPeriodAmount !==
      0
    ) {
      curRatio =
        revenue.curPeriodAmount /
        (totalCost.curPeriodAmount +
          salesExpense.curPeriodAmount +
          administrativeExpense.curPeriodAmount);
    }

    if (
      totalCost.prePeriodAmount +
        salesExpense.prePeriodAmount +
        administrativeExpense.prePeriodAmount !==
      0
    ) {
      preRatio =
        revenue.prePeriodAmount /
        (totalCost.prePeriodAmount +
          salesExpense.prePeriodAmount +
          administrativeExpense.prePeriodAmount);
    }

    return {
      curRatio,
      preRatio,
    };
  }

  private static generateRevenueAndExpenseRatioMap(
    accountMap: Map<string, IAccountReadyForFrontend>
  ) {
    const revenue = accountMap.get(SPECIAL_ACCOUNTS.OPERATING_INCOME.code);
    const totalCost = accountMap.get(SPECIAL_ACCOUNTS.OPERATING_COST.code);
    const salesExpense = accountMap.get(SPECIAL_ACCOUNTS.SELLING_EXPENSE_TOTAL.code);
    const administrativeExpense = accountMap.get(SPECIAL_ACCOUNTS.OPERATING_EXPENSE_TOTAL.code);
    const { curRatio, preRatio } = IncomeStatementGenerator.calculateRevenueAndExpenseRatio(
      revenue,
      totalCost,
      salesExpense,
      administrativeExpense
    );

    return {
      revenue: revenue || EMPTY_I_ACCOUNT_READY_FRONTEND,
      totalCost: totalCost || EMPTY_I_ACCOUNT_READY_FRONTEND,
      salesExpense: salesExpense || EMPTY_I_ACCOUNT_READY_FRONTEND,
      administrativeExpense: administrativeExpense || EMPTY_I_ACCOUNT_READY_FRONTEND,
      ratio: {
        curRatio,
        preRatio,
      },
    };
  }

  private static calculateRevenueToRDRatio(
    revenue?: IAccountReadyForFrontend,
    researchAndDevelopment?: IAccountReadyForFrontend
  ): {
    curRatio: number;
    preRatio: number;
  } {
    let curRatio = 0;
    let preRatio = 0;

    if (!revenue || !researchAndDevelopment) {
      return {
        curRatio,
        preRatio,
      };
    }

    if (revenue.curPeriodAmount !== 0) {
      curRatio = researchAndDevelopment.curPeriodAmount / revenue.curPeriodAmount;
    }

    if (revenue.prePeriodAmount !== 0) {
      preRatio = researchAndDevelopment.prePeriodAmount / revenue.prePeriodAmount;
    }

    return {
      curRatio,
      preRatio,
    };
  }

  private static generateRevenueToRDMap(accountMap: Map<string, IAccountReadyForFrontend>) {
    const revenue = accountMap.get(SPECIAL_ACCOUNTS.OPERATING_INCOME.code);
    const researchAndDevelopmentExpense = accountMap.get(SPECIAL_ACCOUNTS.RD_EXPENSE_TOTAL.code);
    const { curRatio, preRatio } = IncomeStatementGenerator.calculateRevenueToRDRatio(
      revenue,
      researchAndDevelopmentExpense
    );

    return {
      revenue: revenue || EMPTY_I_ACCOUNT_READY_FRONTEND,
      researchAndDevelopmentExpense:
        researchAndDevelopmentExpense || EMPTY_I_ACCOUNT_READY_FRONTEND,
      ratio: {
        curRatio,
        preRatio,
      },
    };
  }

  public override generateOtherInfo(
    incomeArray: IAccountReadyForFrontend[]
  ): IncomeStatementOtherInfo {
    this.eslintEscape = '';
    const accountMap = new Map<string, IAccountReadyForFrontend>();
    incomeArray.forEach((account) => {
      if (account.code.length > 0) {
        accountMap.set(account.code, account);
      }
    });

    const revenueAndExpenseRatio =
      IncomeStatementGenerator.generateRevenueAndExpenseRatioMap(accountMap);
    const revenueToRD = IncomeStatementGenerator.generateRevenueToRDMap(accountMap);

    const otherInfo: IncomeStatementOtherInfo = {
      revenueAndExpenseRatio,
      revenueToRD,
    };

    return otherInfo;
  }

  public override async generateReport(): Promise<{
    content: IAccountReadyForFrontend[];
    otherInfo: IncomeStatementOtherInfo;
  }> {
    const content = await this.generateIAccountReadyForFrontendArray();
    const otherInfo = this.generateOtherInfo(content);

    return {
      content,
      otherInfo,
    };
  }
}
