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
import { IFinancialReportInDB, IncomeStatementOtherInfo } from '@/interfaces/report';
import FinancialReportGenerator from '@/lib/utils/report/financial_report_generator';
import { DecimalOperations } from '@/lib/utils/decimal_operations';
import { DecimalCompatibility } from '@/lib/utils/decimal_compatibility';

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

  private static calculatePercentageByOperatingRevenue(
    accountMap: Map<
      string,
      {
        accountNode: IAccountNode;
        percentage: number;
      }
    >
  ): Map<
    string,
    {
      accountNode: IAccountNode;
      percentage: number;
    }
  > {
    const operatingRevenue = accountMap.get(SPECIAL_ACCOUNTS.OPERATING_INCOME.code);
    if (!operatingRevenue) {
      throw new Error(
        'Operating Revenue not found in accountMap in calculatePercentageByOperatingRevenue'
      );
    }

    const operatingRevenueAmount = operatingRevenue.accountNode.amount;
    const updatedAccountMap = new Map<
      string,
      {
        accountNode: IAccountNode;
        percentage: number;
      }
    >();

    accountMap.forEach((value, key) => {
      updatedAccountMap.set(key, {
        accountNode: value.accountNode,
        percentage: DecimalCompatibility.decimalToNumber(
          DecimalOperations.isZero(operatingRevenueAmount) 
            ? '0' 
            : DecimalOperations.divide(
                DecimalCompatibility.numberToDecimal(value.accountNode.amount),
                DecimalCompatibility.numberToDecimal(operatingRevenueAmount)
              )
        ),
      });
    });

    return updatedAccountMap;
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
    let accountMap = transformForestToMap(accountForest);

    /**
     * Info: (20241018 - Murky)
     * @description Income Statement 的百分比應該是要用營業收入計算，先從這邊patch, 之後要Refactor transformForestToMap
     */
    accountMap = IncomeStatementGenerator.calculatePercentageByOperatingRevenue(accountMap);
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

    const totalCurrentExpenses = DecimalOperations.add(
      DecimalOperations.add(
        DecimalCompatibility.numberToDecimal(totalCost.curPeriodAmount),
        DecimalCompatibility.numberToDecimal(salesExpense.curPeriodAmount)
      ),
      DecimalCompatibility.numberToDecimal(administrativeExpense.curPeriodAmount)
    );

    if (!DecimalOperations.isZero(totalCurrentExpenses)) {
      curRatio = DecimalCompatibility.decimalToNumber(
        DecimalOperations.divide(
          DecimalCompatibility.numberToDecimal(revenue.curPeriodAmount),
          totalCurrentExpenses
        )
      );
    }

    const totalPreviousExpenses = DecimalOperations.add(
      DecimalOperations.add(
        DecimalCompatibility.numberToDecimal(totalCost.prePeriodAmount),
        DecimalCompatibility.numberToDecimal(salesExpense.prePeriodAmount)
      ),
      DecimalCompatibility.numberToDecimal(administrativeExpense.prePeriodAmount)
    );

    if (!DecimalOperations.isZero(totalPreviousExpenses)) {
      preRatio = DecimalCompatibility.decimalToNumber(
        DecimalOperations.divide(
          DecimalCompatibility.numberToDecimal(revenue.prePeriodAmount),
          totalPreviousExpenses
        )
      );
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

    const currentRevenueAmount = DecimalCompatibility.numberToDecimal(revenue.curPeriodAmount);
    if (!DecimalOperations.isZero(currentRevenueAmount)) {
      curRatio = DecimalCompatibility.decimalToNumber(
        DecimalOperations.divide(
          DecimalCompatibility.numberToDecimal(researchAndDevelopment.curPeriodAmount),
          currentRevenueAmount
        )
      );
    }

    const previousRevenueAmount = DecimalCompatibility.numberToDecimal(revenue.prePeriodAmount);
    if (!DecimalOperations.isZero(previousRevenueAmount)) {
      preRatio = DecimalCompatibility.decimalToNumber(
        DecimalOperations.divide(
          DecimalCompatibility.numberToDecimal(researchAndDevelopment.prePeriodAmount),
          previousRevenueAmount
        )
      );
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
    content: IFinancialReportInDB;
  }> {
    const content = await this.generateIAccountReadyForFrontendArray();
    const otherInfo = this.generateOtherInfo(content);

    const financialReportInDB = {
      content,
      otherInfo,
    };

    return {
      content: financialReportInDB,
    };
  }
}
