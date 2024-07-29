import { ReportSheetType } from '@/constants/report';

import FinancialReportGenerator from '@/lib/utils/financial_report/financial_report_generator';
import {
  calculateIncomeStatementNetIncome,
  mappingAccountToSheetDisplay,
  transformForestToMap,
  transformLineItemsFromDBToMap,
  updateAccountAmounts,
} from '@/lib/utils/account/common';
import { IAccountForSheetDisplay, IAccountNode, IAccountReadyForFrontend } from '@/interfaces/accounting_account';
import incomeStatementMapping from '@/constants/account_sheet_mapping/income_statement_mapping.json';
import { IncomeStatementOtherInfo } from '@/interfaces/report';
import { EMPTY_I_ACCOUNT_READY_FRONTEND } from '@/constants/financial_report';

export default class IncomeStatementGenerator extends FinancialReportGenerator {
  constructor(companyId: number, startDateInSecond: number, endDateInSecond: number) {
    const reportSheetType = ReportSheetType.INCOME_STATEMENT;
    super(companyId, startDateInSecond, endDateInSecond, reportSheetType);
  }

  // Info: Calculate revenue and expense ratio (20240416 - Murky)
  // eslint-disable-next-line class-methods-use-this

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

  public override async generateFinancialReportArray(curPeriod: boolean): Promise<IAccountForSheetDisplay[]> {
    const accountMap = await this.generateFinancialReportMap(curPeriod);

    // Info: Calculate revenue and expense ratio (20240726 - Murky)
    const accountList = mappingAccountToSheetDisplay(accountMap, incomeStatementMapping);

    return accountList;
  }

  // Info: Calculate revenue and expense ratio (20240726 - Murky)
  // eslint-disable-next-line class-methods-use-this
  private calculateRevenueAndExpenseRatio(
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

    if (totalCost.curPeriodAmount + salesExpense.curPeriodAmount + administrativeExpense.curPeriodAmount !== 0) {
      curRatio = revenue.curPeriodAmount / (totalCost.curPeriodAmount + salesExpense.curPeriodAmount + administrativeExpense.curPeriodAmount);
    }

    if (totalCost.prePeriodAmount + salesExpense.prePeriodAmount + administrativeExpense.prePeriodAmount !== 0) {
      preRatio = revenue.prePeriodAmount / (totalCost.prePeriodAmount + salesExpense.prePeriodAmount + administrativeExpense.prePeriodAmount);
    }

    return {
      curRatio,
      preRatio,
    };
  }

  private generateRevenueAndExpenseRatioMap(accountMap: Map<string, IAccountReadyForFrontend>) {
    const revenue = accountMap.get('4000');
    const totalCost = accountMap.get('5000');

    const salesExpense = accountMap.get('6100');
    const administrativeExpense = accountMap.get('6200');
    const { curRatio, preRatio } = this.calculateRevenueAndExpenseRatio(revenue, totalCost, salesExpense, administrativeExpense);

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

  // eslint-disable-next-line class-methods-use-this
  private calculateRevenueToRDRatio(
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

  private generateRevenueToRDMap(accountMap: Map<string, IAccountReadyForFrontend>) {
    const revenue = accountMap.get('4000');
    const researchAndDevelopmentExpense = accountMap.get('6300');
    const { curRatio, preRatio } = this.calculateRevenueToRDRatio(revenue, researchAndDevelopmentExpense);

    return {
      revenue: revenue || EMPTY_I_ACCOUNT_READY_FRONTEND,
      researchAndDevelopmentExpense: researchAndDevelopmentExpense || EMPTY_I_ACCOUNT_READY_FRONTEND,
      ratio: {
        curRatio,
        preRatio,
      },
    };
  }

  public override generateOtherInfo(incomeArray: IAccountReadyForFrontend[]): IncomeStatementOtherInfo {
    const accountMap = new Map<string, IAccountReadyForFrontend>();
    incomeArray.forEach((account) => {
      if (account.code.length > 0) {
        accountMap.set(account.code, account);
      }
    });

    const revenueAndExpenseRatio = this.generateRevenueAndExpenseRatioMap(accountMap);
    const revenueToRD = this.generateRevenueToRDMap(accountMap);

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
