import { ReportSheetType } from '@/constants/report';
import FinancialReportGenerator from '@/lib/utils/report/financial_report_generator';
import BalanceSheetGenerator from '@/lib/utils/report/balance_sheet_generator';
import IncomeStatementGenerator from '@/lib/utils/report/income_statement_generator';
import {
  IAccountForSheetDisplay,
  IAccountNode,
  IAccountReadyForFrontend,
} from '@/interfaces/accounting_account';
import { IDirectCashFlowMapping, IOperatingCashFlowMapping } from '@/interfaces/cash_flow';
import {
  OPERATING_CASH_FLOW_INDIRECT_MAPPING,
  OPERATING_CASHFLOW_SPECIAL_ACCOUNTS,
} from '@/constants/cash_flow/operating_cash_flow';
import { IVoucherForCashFlow } from '@/interfaces/voucher';
import { findManyVoucherWithCashInPrisma } from '@/lib/utils/repo/voucher.repo';
import { INVESTING_CASH_FLOW_DIRECT_MAPPING } from '@/constants/cash_flow/investing_cash_flow';
import { FINANCING_CASH_FLOW_DIRECT_MAPPING } from '@/constants/cash_flow/financing_cash_flow';
import { CASH_AND_CASH_EQUIVALENTS_REGEX } from '@/constants/cash_flow/common_cash_flow';
import CashFlowMapForDisplayJSON from '@/constants/account_sheet_mapping/cash_flow_statement_mapping.json';
import { CashFlowStatementOtherInfo, IFinancialReportInDB } from '@/interfaces/report';
import { EMPTY_I_ACCOUNT_READY_FRONTEND } from '@/constants/financial_report';
import { timestampInMilliSeconds } from '@/lib/utils/common';
import { absoluteNetIncome, noAdjustNetIncome } from '@/lib/utils/account/common';
import { SPECIAL_ACCOUNTS } from '@/constants/account';
import { DecimalOperations } from '@/lib/utils/decimal_operations';

export default class CashFlowStatementGenerator extends FinancialReportGenerator {
  private balanceSheetGenerator: BalanceSheetGenerator;

  private incomeStatementGenerator: IncomeStatementGenerator;

  private voucherRelatedToCash: IVoucherForCashFlow[];

  private voucherLastPeriod: IVoucherForCashFlow[];

  private voucherLastPeriodStartToEndDate: IVoucherForCashFlow[];

  private voucherTwoYearsAgo: IVoucherForCashFlow[];

  private YEAR_RANGE = 5;

  private eslintEscape = '';

  constructor(
    companyId: number,
    startDateInSecond: number,
    endDateInSecond: number,
    voucherRelatedToCash: IVoucherForCashFlow[]
  ) {
    const reportSheetType = ReportSheetType.CASH_FLOW_STATEMENT;
    super(companyId, startDateInSecond, endDateInSecond, reportSheetType);

    this.balanceSheetGenerator = new BalanceSheetGenerator(
      companyId,
      startDateInSecond,
      endDateInSecond
    );
    this.incomeStatementGenerator = new IncomeStatementGenerator(
      companyId,
      startDateInSecond,
      endDateInSecond
    );
    this.voucherRelatedToCash = voucherRelatedToCash.filter((voucher) => {
      const laterThanStartDate = voucher.date >= startDateInSecond;
      const earlierThanEndDate = voucher.date <= endDateInSecond;
      return laterThanStartDate && earlierThanEndDate;
    });

    this.voucherLastPeriodStartToEndDate = voucherRelatedToCash.filter((voucher) => {
      const laterThanStartDate = voucher.date >= this.lastPeriodStartDateInSecond;
      const earlierThanEndDate = voucher.date <= this.lastPeriodEndDateInSecond;
      return laterThanStartDate && earlierThanEndDate;
    });

    this.voucherLastPeriod = voucherRelatedToCash.filter((voucher) => {
      const earlierThanStartDate = voucher.date < startDateInSecond;
      return earlierThanStartDate;
    });

    this.voucherTwoYearsAgo = voucherRelatedToCash.filter((voucher) => {
      const earlierThanStartDate = voucher.date < this.lastPeriodStartDateInSecond;
      return earlierThanStartDate;
    });
  }

  static async createInstance(
    companyId: number,
    startDateInSecond: number,
    endDateInSecond: number
  ) {
    const voucherRelatedToCash = await findManyVoucherWithCashInPrisma(
      companyId,
      0,
      endDateInSecond
    );
    const instance = new CashFlowStatementGenerator(
      companyId,
      startDateInSecond,
      endDateInSecond,
      voucherRelatedToCash
    );
    return instance;
  }

  private static mergeMap(
    balanceSheetMap: Map<
      string,
      {
        accountNode: IAccountNode;
        percentage: number;
      }
    >,
    incomeStatementMap: Map<
      string,
      {
        accountNode: IAccountNode;
        percentage: number;
      }
    >
  ): Map<string, IAccountNode> {
    const mergedMap = new Map<string, IAccountNode>();

    balanceSheetMap.forEach((value, key) => {
      mergedMap.set(key, value.accountNode);
    });

    incomeStatementMap.forEach((value, key) => {
      mergedMap.set(key, value.accountNode);
    });

    return mergedMap;
  }

  private getCashStartAndEndAmount(curPeriod: boolean): {
    startCashBalance: string;
    endCashBalance: string;
  } {
    const voucherRelatedToCash = curPeriod ? this.voucherRelatedToCash : this.voucherLastPeriod;
    const voucherLastPeriod = curPeriod ? this.voucherLastPeriod : this.voucherTwoYearsAgo;
    const startCashBalance = voucherLastPeriod.reduce((acc, voucher) => {
      const { debitAmount, creditAmount } =
        CashFlowStatementGenerator.sumDebitAndCreditAmount(voucher);
      return DecimalOperations.subtract(
        DecimalOperations.add(acc, debitAmount),
        creditAmount
      );
    }, '0');

    const endCashBalance = voucherRelatedToCash.reduce((acc, voucher) => {
      const { debitAmount, creditAmount } =
        CashFlowStatementGenerator.sumDebitAndCreditAmount(voucher);
      return DecimalOperations.subtract(
        DecimalOperations.add(acc, debitAmount),
        creditAmount
      );
    }, startCashBalance);

    return { startCashBalance, endCashBalance };
  }

  private generateIndirectOperatingCashFlowRecursive(
    referenceMap: Map<string, IAccountNode>,
    currentCode: string,
    level: number,
    node: IOperatingCashFlowMapping
  ): Map<string, IAccountForSheetDisplay> {
    // Info: (20240710 - Murky) DFS
    let childMap = new Map<string, IAccountForSheetDisplay>();

    let childAmount = '0';
    node.child?.forEach((value, key) => {
      const childAccountForSheet = this.generateIndirectOperatingCashFlowRecursive(
        referenceMap,
        key,
        level + 1,
        value
      );
      childAccountForSheet.forEach((childValue) => {
        if (childValue.indent === level + 1) {
          const childValueAmount = (childValue.amount || 0).toString();
          childAmount = DecimalOperations.add(childAmount, childValueAmount);
        }
      });
      childMap = new Map([...childMap, ...childAccountForSheet]);
    });

    const { fromCode, name, debit, operatingFunction } = node;

    let amount = fromCode.reduce((acc, code) => {
      const account = referenceMap.get(code);
      if (account) {
        const isAccountDebit = account.debit;
        const accountAmountDecimal = account.amount.toString();

        let accountAmount = '0';
        switch (operatingFunction) {
          case noAdjustNetIncome:
          case absoluteNetIncome:
            accountAmount = accountAmountDecimal;
            break;
          default:
            accountAmount = debit !== isAccountDebit
              ? DecimalOperations.negate(accountAmountDecimal)
              : accountAmountDecimal;
        }

        // Note: operatingFunction expects number parameters, so we need compatibility
        const accNum = parseFloat(acc);
        const amountNum = parseFloat(accountAmount);
        const result = operatingFunction(accNum, amountNum);
        return result.toString();
      }
      return acc;
    }, '0');

    // Note: operatingFunction expects number parameters, so we need compatibility
    const amountNum = parseFloat(amount);
    const childAmountNum = parseFloat(childAmount);
    const finalAmount = operatingFunction(amountNum, childAmountNum);
    amount = finalAmount.toString();

    const accountForSheetDisplay: IAccountForSheetDisplay = {
      accountId: -1,
      code: currentCode,
      name,
      amount: parseFloat(amount),
      indent: level,
      debit,
      percentage: null,
      children: [],
    };

    const newReportSheetMapping = new Map<string, IAccountForSheetDisplay>([
      ...childMap,
      [currentCode, accountForSheetDisplay],
    ]);

    return newReportSheetMapping;
  }

  private generateIndirectOperatingCashFlow(
    referenceMap: Map<string, IAccountNode>
  ): Map<string, IAccountForSheetDisplay> {
    let reportSheetMap = new Map<string, IAccountForSheetDisplay>();

    OPERATING_CASH_FLOW_INDIRECT_MAPPING.forEach((value, key) => {
      const childMap = this.generateIndirectOperatingCashFlowRecursive(referenceMap, key, 0, value);
      reportSheetMap = new Map([...reportSheetMap, ...childMap]);
    });
    return reportSheetMap;
  }

  private static sumIndirectOperatingCashFlow(
    indirectOperatingCashFlow: Map<string, IAccountForSheetDisplay>
  ): number {
    const operatingAmount = (
      indirectOperatingCashFlow.get(SPECIAL_ACCOUNTS.CASH_GENERATE_FROM_OPERATING.code)?.amount || 0
    ).toString();
    const dividendAmount = (
      indirectOperatingCashFlow.get(SPECIAL_ACCOUNTS.CASH_OUTFLOW_FOR_DIVIDEND.code)?.amount || 0
    ).toString();
    const taxRefundAmount = (
      indirectOperatingCashFlow.get(SPECIAL_ACCOUNTS.CASH_FROM_TAX_REFUND.code)?.amount || 0
    ).toString();

    const sum = DecimalOperations.add(
      DecimalOperations.add(operatingAmount, dividendAmount),
      taxRefundAmount
    );

    return parseFloat(sum);
  }

  private async getIndirectOperatingCashFlow(
    curPeriod: boolean
  ): Promise<Map<string, IAccountForSheetDisplay>> {
    const balanceSheetMap = await this.balanceSheetGenerator.generateFinancialReportMap(curPeriod);
    const incomeStatementMap =
      await this.incomeStatementGenerator.generateFinancialReportMap(curPeriod);

    const mergedMap = CashFlowStatementGenerator.mergeMap(balanceSheetMap, incomeStatementMap);
    const indirectOperatingCashFlow = this.generateIndirectOperatingCashFlow(mergedMap);

    const sum = CashFlowStatementGenerator.sumIndirectOperatingCashFlow(indirectOperatingCashFlow);

    indirectOperatingCashFlow.set(SPECIAL_ACCOUNTS.CASH_FLOW_FROM_OPERATING.code, {
      accountId: -1,
      code: SPECIAL_ACCOUNTS.CASH_FLOW_FROM_OPERATING.code,
      name: SPECIAL_ACCOUNTS.CASH_FLOW_FROM_OPERATING.name,
      amount: sum,
      indent: 0,
      percentage: null,
      children: [],
    });

    return indirectOperatingCashFlow;
  }

  private static getDebitCreditCodes(voucher: IVoucherForCashFlow) {
    const debitCodes = new Set<string>();
    const creditCodes = new Set<string>();

    voucher.lineItems.forEach((lineItem) => {
      if (lineItem.debit) {
        debitCodes.add(lineItem.account.code);
      } else {
        creditCodes.add(lineItem.account.code);
      }
    });
    return { debitCodes, creditCodes };
  }

  private isMatchingInvestingCashFlowMapping(
    mapping: IDirectCashFlowMapping,
    debitCodes: Set<string>,
    creditCodes: Set<string>
  ) {
    const matchDebit = this.matchPattern(mapping.voucherPattern.debit, debitCodes);
    const matchCredit = this.matchPattern(mapping.voucherPattern.credit, creditCodes);

    const matchEither = this.matchEitherPattern(mapping.either, debitCodes, creditCodes);
    return matchDebit && matchCredit && matchEither;
  }

  private static sumDebitAndCreditAmount(voucher: IVoucherForCashFlow) {
    let debitAmount = '0';
    let creditAmount = '0';
    voucher.lineItems.forEach((lineItem) => {
      if (
        Array.from(CASH_AND_CASH_EQUIVALENTS_REGEX).some((regex) => {
          return regex.test(lineItem.account.code);
        })
      ) {
        const lineItemAmount = typeof lineItem.amount === 'string'
          ? lineItem.amount
          : lineItem.amount.toString();
        if (lineItem.debit) {
          debitAmount = DecimalOperations.add(debitAmount, lineItemAmount);
        } else {
          creditAmount = DecimalOperations.add(creditAmount, lineItemAmount);
        }
      }
    });
    return { debitAmount, creditAmount };
  }

  private aggregateVouchers(
    firstLineName: string,
    cashFlowMapping: Map<string, IDirectCashFlowMapping>,
    curPeriod: boolean
  ): {
    reportSheetMapping: Map<string, IAccountForSheetDisplay>;
    directCashFlow: number;
  } {
    const result = new Map<string, IAccountForSheetDisplay>();
    result.set('header', {
      accountId: -1,
      code: 'header',
      name: firstLineName,
      amount: null,
      indent: 0,
      percentage: null,
      children: [],
    });

    let directCashFlow = '0';
    const voucherRelatedToCash = curPeriod
      ? this.voucherRelatedToCash
      : this.voucherLastPeriodStartToEndDate;
    cashFlowMapping.forEach((mapping, investCode) => {
      let total = '0';
      voucherRelatedToCash.forEach((voucher) => {
        const { debitCodes, creditCodes } = CashFlowStatementGenerator.getDebitCreditCodes(voucher);
        const isMatchingMapping = this.isMatchingInvestingCashFlowMapping(
          mapping,
          debitCodes,
          creditCodes
        );
        if (isMatchingMapping) {
          const { debitAmount, creditAmount } =
            CashFlowStatementGenerator.sumDebitAndCreditAmount(voucher);
          total = DecimalOperations.add(total, debitAmount);
          total = DecimalOperations.subtract(total, creditAmount);
        }
      });

      const accountForSheetDisplay: IAccountForSheetDisplay = {
        accountId: -1,
        code: investCode,
        name: mapping.name,
        amount: parseFloat(total),
        indent: 1,
        percentage: null,
        children: [],
      };

      directCashFlow = DecimalOperations.add(directCashFlow, total);
      result.set(investCode, accountForSheetDisplay);
    });
    return {
      reportSheetMapping: result,
      directCashFlow: parseFloat(directCashFlow),
    };
  }

  private getOperatingCashFlowSpecialAccounts(
    curPeriod: boolean
  ): Map<string, IAccountForSheetDisplay> {
    const { reportSheetMapping, directCashFlow } = this.aggregateVouchers(
      '',
      OPERATING_CASHFLOW_SPECIAL_ACCOUNTS,
      curPeriod
    );

    reportSheetMapping.set(SPECIAL_ACCOUNTS.CASH_FLOW_FROM_OPERATING_SPECIAL_ACCOUNT.code, {
      accountId: -1,
      code: SPECIAL_ACCOUNTS.CASH_FLOW_FROM_OPERATING_SPECIAL_ACCOUNT.code,
      name: SPECIAL_ACCOUNTS.CASH_FLOW_FROM_OPERATING_SPECIAL_ACCOUNT.name,
      amount: directCashFlow,
      indent: 1,
      percentage: null,
      children: [],
    });
    return reportSheetMapping;
  }

  private getInvestingCashFlow(curPeriod: boolean): Map<string, IAccountForSheetDisplay> {
    const { reportSheetMapping, directCashFlow } = this.aggregateVouchers(
      '投資活動之現金流量',
      INVESTING_CASH_FLOW_DIRECT_MAPPING,
      curPeriod
    );
    reportSheetMapping.set(SPECIAL_ACCOUNTS.CASH_FLOW_FROM_INVESTING.code, {
      accountId: -1,
      code: SPECIAL_ACCOUNTS.CASH_FLOW_FROM_INVESTING.code,
      name: SPECIAL_ACCOUNTS.CASH_FLOW_FROM_INVESTING.name,
      amount: directCashFlow,
      indent: 1,
      percentage: null,
      children: [],
    });
    return reportSheetMapping;
  }

  private getFinancingCashFlow(curPeriod: boolean): Map<string, IAccountForSheetDisplay> {
    const { reportSheetMapping, directCashFlow } = this.aggregateVouchers(
      '籌資活動之現金流量',
      FINANCING_CASH_FLOW_DIRECT_MAPPING,
      curPeriod
    );
    reportSheetMapping.set(SPECIAL_ACCOUNTS.CASH_FLOW_FROM_FINANCING.code, {
      accountId: -1,
      code: SPECIAL_ACCOUNTS.CASH_FLOW_FROM_FINANCING.code,
      name: SPECIAL_ACCOUNTS.CASH_FLOW_FROM_FINANCING.name,
      amount: directCashFlow,
      indent: 1,
      percentage: null,
      children: [],
    });
    return reportSheetMapping;
  }

  private static sumCashFlow(
    indirectOperatingCashFlow: Map<string, IAccountForSheetDisplay>,
    investingCashFlow: Map<string, IAccountForSheetDisplay>,
    financingCashFlow: Map<string, IAccountForSheetDisplay>,
    operatingCashFlowSpecialAccounts: Map<string, IAccountForSheetDisplay>
  ): number {
    const cashFlowFromOperating =
      (indirectOperatingCashFlow.get(SPECIAL_ACCOUNTS.CASH_FLOW_FROM_OPERATING.code)?.amount || 0) +
      (investingCashFlow.get(SPECIAL_ACCOUNTS.CASH_FLOW_FROM_INVESTING.code)?.amount || 0) +
      (financingCashFlow.get(SPECIAL_ACCOUNTS.CASH_FLOW_FROM_FINANCING.code)?.amount || 0) +
      (operatingCashFlowSpecialAccounts.get(
        SPECIAL_ACCOUNTS.CASH_FLOW_FROM_OPERATING_SPECIAL_ACCOUNT.code
      )?.amount || 0);
    return cashFlowFromOperating;
  }

  private concatCashFlow(
    indirectOperatingCashFlow: Map<string, IAccountForSheetDisplay>,
    investingCashFlow: Map<string, IAccountForSheetDisplay>,
    financingCashFlow: Map<string, IAccountForSheetDisplay>,
    operatingCashFlowSpecialAccounts: Map<string, IAccountForSheetDisplay>,
    curPeriod: boolean
  ): Map<string, IAccountForSheetDisplay> {
    const { startCashBalance, endCashBalance } = this.getCashStartAndEndAmount(curPeriod);
    const cashFlowFromOperating = CashFlowStatementGenerator.sumCashFlow(
      indirectOperatingCashFlow,
      investingCashFlow,
      financingCashFlow,
      operatingCashFlowSpecialAccounts
    );

    const result = new Map<string, IAccountForSheetDisplay>([
      ...Array.from(indirectOperatingCashFlow),
      ...Array.from(investingCashFlow),
      ...Array.from(financingCashFlow),
      ...Array.from(operatingCashFlowSpecialAccounts),
    ]);

    result.set(SPECIAL_ACCOUNTS.CASH_FLOW_FROM_FOREIGN_EXCHANGE.code, {
      accountId: -1,
      code: SPECIAL_ACCOUNTS.CASH_FLOW_FROM_FOREIGN_EXCHANGE.code,
      name: SPECIAL_ACCOUNTS.CASH_FLOW_FROM_FOREIGN_EXCHANGE.name,
      amount: 0,
      indent: 0,
      percentage: null,
      children: [],
    });

    result.set(SPECIAL_ACCOUNTS.CASH_INCREASE_THIS_PERIOD.code, {
      accountId: -1,
      code: SPECIAL_ACCOUNTS.CASH_INCREASE_THIS_PERIOD.code,
      name: SPECIAL_ACCOUNTS.CASH_INCREASE_THIS_PERIOD.name,
      amount: cashFlowFromOperating,
      indent: 0,
      percentage: null,
      children: [],
    });

    result.set(SPECIAL_ACCOUNTS.CASH_AMOUNT_IN_BEGINNING.code, {
      accountId: -1,
      code: SPECIAL_ACCOUNTS.CASH_AMOUNT_IN_BEGINNING.code,
      name: SPECIAL_ACCOUNTS.CASH_AMOUNT_IN_BEGINNING.name,
      amount: parseFloat(startCashBalance),
      indent: 0,
      percentage: null,
      children: [],
    });

    result.set(SPECIAL_ACCOUNTS.CASH_AMOUNT_IN_END.code, {
      accountId: -1,
      code: SPECIAL_ACCOUNTS.CASH_AMOUNT_IN_END.code,
      name: SPECIAL_ACCOUNTS.CASH_AMOUNT_IN_END.name,
      amount: parseFloat(endCashBalance),
      indent: 0,
      percentage: null,
      children: [],
    });
    return result;
  }

  private static transformMapToArray(
    accountMap: Map<string, IAccountForSheetDisplay>
  ): IAccountForSheetDisplay[] {
    const result = CashFlowMapForDisplayJSON.map((account) => {
      const accountCode = account.code;
      const accountInfo = accountMap.get(accountCode);
      if (accountInfo) {
        return accountInfo;
      }
      return {
        accountId: -1,
        code: accountCode,
        name: account.name,
        amount: 0,
        indent: account.indent,
        percentage: 0,
        children: [],
      };
    });
    return result;
  }

  public override async generateFinancialReportTree(): Promise<IAccountNode[]> {
    this.eslintEscape = '';
    return [];
  }

  public override async generateFinancialReportMap(): Promise<
    Map<
      string,
      {
        accountNode: IAccountNode;
        percentage: number;
      }
    >
  > {
    this.eslintEscape = '';
    return new Map<
      string,
      {
        accountNode: IAccountNode;
        percentage: number;
      }
    >();
  }

  public override async generateFinancialReportArray(
    curPeriod: boolean
  ): Promise<IAccountForSheetDisplay[]> {
    const indirectOperatingCashFlow = await this.getIndirectOperatingCashFlow(curPeriod);

    const operatingCashFlowSpecialAccounts = this.getOperatingCashFlowSpecialAccounts(curPeriod);

    const investingCashFlow = this.getInvestingCashFlow(curPeriod);

    const financingCashFlow = this.getFinancingCashFlow(curPeriod);

    const concatCashFlow = this.concatCashFlow(
      indirectOperatingCashFlow,
      investingCashFlow,
      financingCashFlow,
      operatingCashFlowSpecialAccounts,
      curPeriod
    );

    const result = CashFlowStatementGenerator.transformMapToArray(concatCashFlow);
    return result;
  }

  private calculateOperatingStabilizedRatio(
    currentYear: number,
    beforeIncomeTax?: IAccountReadyForFrontend,
    salesDepreciation?: IAccountReadyForFrontend,
    salesAmortization?: IAccountReadyForFrontend,
    manageDepreciation?: IAccountReadyForFrontend,
    manageAmortization?: IAccountReadyForFrontend,
    rdDepreciation?: IAccountReadyForFrontend,
    tax?: IAccountReadyForFrontend,
    operatingIncomeCashFlow?: IAccountReadyForFrontend
  ) {
    const startYear = currentYear - this.YEAR_RANGE + 1;

    const years = Array.from({ length: this.YEAR_RANGE }, (_, i) => (startYear + i).toString());
    const ratio: { [key: string]: string } = {};
    const amortizationDepreciation: { [key: string]: string } = {};

    years.forEach((year) => {
      ratio[year] = '0';
      amortizationDepreciation[year] = '0';
    });

    let curDepreciateAndAmortize = '0';
    let preDepreciateAndAmortize = '0';
    if (
      beforeIncomeTax &&
      salesDepreciation &&
      salesAmortization &&
      manageDepreciation &&
      manageAmortization &&
      rdDepreciation &&
      tax &&
      operatingIncomeCashFlow
    ) {
      curDepreciateAndAmortize = DecimalOperations.add(
        DecimalOperations.add(
          DecimalOperations.add(
            DecimalOperations.add(
              salesDepreciation.curPeriodAmount,
              salesAmortization.curPeriodAmount
            ),
            manageDepreciation.curPeriodAmount
          ),
          manageAmortization.curPeriodAmount
        ),
        rdDepreciation.curPeriodAmount
      );

      preDepreciateAndAmortize = DecimalOperations.add(
        DecimalOperations.add(
          DecimalOperations.add(
            DecimalOperations.add(
              salesDepreciation.prePeriodAmount,
              salesAmortization.prePeriodAmount
            ),
            manageDepreciation.prePeriodAmount
          ),
          manageAmortization.prePeriodAmount
        ),
        rdDepreciation.prePeriodAmount
      );

      amortizationDepreciation[currentYear] = curDepreciateAndAmortize;
      amortizationDepreciation[currentYear - 1] = preDepreciateAndAmortize;

      ratio[currentYear] =
        !DecimalOperations.isZero(operatingIncomeCashFlow.curPeriodAmount)
          ? DecimalOperations.divide(
              DecimalOperations.subtract(
                DecimalOperations.add(
                  beforeIncomeTax.curPeriodAmount,
                  curDepreciateAndAmortize
                ),
                tax.curPeriodAmount
              ),
              operatingIncomeCashFlow.curPeriodAmount
            )
          : '0';

      ratio[currentYear - 1] =
        !DecimalOperations.isZero(operatingIncomeCashFlow.prePeriodAmount)
          ? DecimalOperations.divide(
              DecimalOperations.subtract(
                DecimalOperations.add(
                  beforeIncomeTax.prePeriodAmount,
                  preDepreciateAndAmortize
                ),
                tax.prePeriodAmount
              ),
              operatingIncomeCashFlow.prePeriodAmount
            )
          : '0';
    }
    const lineChartDataForRatio = {
      data: Object.values(ratio),
      labels: years,
    };
    return {
      ratio,
      lineChartDataForRatio,
      amortizationDepreciation,
    };
  }

  private formatByPeriod(currentYear: number, accountReadyForFrontend?: IAccountReadyForFrontend) {
    const startYear = currentYear - this.YEAR_RANGE + 1;

    const years = Array.from({ length: this.YEAR_RANGE }, (_, i) => (startYear + i).toString());
    const result: { [key: string]: string } = {};

    years.forEach((year) => {
      result[year] = '0';
    });

    result[currentYear] = accountReadyForFrontend?.curPeriodAmount || '0';

    result[currentYear - 1] = accountReadyForFrontend?.prePeriodAmount || '0';
    return result;
  }

  private operatingStabilizedMap(
    currentYear: number,
    accountMap: Map<string, IAccountReadyForFrontend>
  ) {
    const beforeIncomeTax = accountMap.get(SPECIAL_ACCOUNTS.NET_INCOME_IN_CASH_FLOW.code);
    const salesDepreciation = accountMap.get(SPECIAL_ACCOUNTS.SALES_DEPRECIATION.code);
    const salesAmortization = accountMap.get(SPECIAL_ACCOUNTS.SALES_AMORTIZATION.code);
    const manageDepreciation = accountMap.get(SPECIAL_ACCOUNTS.MANAGE_DEPRECIATION.code);
    const manageAmortization = accountMap.get(SPECIAL_ACCOUNTS.MANAGE_AMORTIZATION.code);
    const rdDepreciation = accountMap.get(SPECIAL_ACCOUNTS.RD_DEPRECIATION.code);
    const tax = accountMap.get(SPECIAL_ACCOUNTS.CASH_FROM_TAX_REFUND.code);
    const operatingIncomeCashFlow = accountMap.get(SPECIAL_ACCOUNTS.CASH_FLOW_FROM_OPERATING.code);
    const { ratio, lineChartDataForRatio, amortizationDepreciation } =
      this.calculateOperatingStabilizedRatio(
        currentYear,
        beforeIncomeTax,
        salesDepreciation,
        salesAmortization,
        manageDepreciation,
        manageAmortization,
        rdDepreciation,
        tax,
        operatingIncomeCashFlow
      );

    return {
      operatingStabilized: {
        beforeIncomeTax: this.formatByPeriod(currentYear, beforeIncomeTax),
        amortizationDepreciation,
        tax: this.formatByPeriod(currentYear, tax),
        operatingIncomeCashFlow: this.formatByPeriod(currentYear, operatingIncomeCashFlow),
        ratio,
      },
      lineChartDataForRatio,
    };
  }

  private static ppeVSStrategyInvestMap(
    currentYear: number,
    accountMap: Map<string, IAccountReadyForFrontend>
  ) {
    const getPPE =
      accountMap.get(SPECIAL_ACCOUNTS.CASH_INVEST_PPE.code) || EMPTY_I_ACCOUNT_READY_FRONTEND;
    const salePPE =
      accountMap.get(SPECIAL_ACCOUNTS.CASH_DISPOSE_PPE.code) || EMPTY_I_ACCOUNT_READY_FRONTEND;
    const getFVPL =
      accountMap.get(SPECIAL_ACCOUNTS.CASH_INVEST_FVPL.code) || EMPTY_I_ACCOUNT_READY_FRONTEND;
    const getFVOCI =
      accountMap.get(SPECIAL_ACCOUNTS.CASH_INVEST_FVOCI.code) || EMPTY_I_ACCOUNT_READY_FRONTEND;
    const getAmortizedFA =
      accountMap.get(SPECIAL_ACCOUNTS.CASH_INVEST_AMORTIZED_FINANCIAL_ASSET.code) ||
      EMPTY_I_ACCOUNT_READY_FRONTEND;
    const saleFVOCI =
      accountMap.get(SPECIAL_ACCOUNTS.CASH_DISPOSE_FVOCI.code) || EMPTY_I_ACCOUNT_READY_FRONTEND;
    const saleAmortizedFA =
      accountMap.get(SPECIAL_ACCOUNTS.CASH_DISPOSE_AMORTIZED_FINANCIAL_ASSET.code) ||
      EMPTY_I_ACCOUNT_READY_FRONTEND;
    const removeHedgeAsset =
      accountMap.get(SPECIAL_ACCOUNTS.CASH_REMOVE_HEDGE_ASSET.code) ||
      EMPTY_I_ACCOUNT_READY_FRONTEND;
    const receiveStockDividend =
      accountMap.get(SPECIAL_ACCOUNTS.CASH_RECEIVE_STOCK_DIVIDEND.code) ||
      EMPTY_I_ACCOUNT_READY_FRONTEND;
    const totalInvestCashFlow =
      accountMap.get(SPECIAL_ACCOUNTS.CASH_FLOW_FROM_INVESTING.code) ||
      EMPTY_I_ACCOUNT_READY_FRONTEND;

    const curPPEInvest = DecimalOperations.multiply(
      '-1',
      DecimalOperations.subtract(getPPE.curPeriodAmount, salePPE.curPeriodAmount)
    );
    const curStrategyInvest = DecimalOperations.multiply(
      '-1',
      DecimalOperations.add(
        DecimalOperations.subtract(
          DecimalOperations.subtract(
            DecimalOperations.subtract(
              DecimalOperations.add(
                DecimalOperations.add(
                  getFVPL.curPeriodAmount,
                  getFVOCI.curPeriodAmount
                ),
                getAmortizedFA.curPeriodAmount
              ),
              saleFVOCI.curPeriodAmount
            ),
            saleAmortizedFA.curPeriodAmount
          ),
          removeHedgeAsset.curPeriodAmount
        ),
        receiveStockDividend.curPeriodAmount
      )
    );
    const curOtherInvest = DecimalOperations.multiply(
      '-1',
      DecimalOperations.add(
        DecimalOperations.add(
          totalInvestCashFlow.curPeriodAmount,
          curPPEInvest
        ),
        curStrategyInvest
      )
    );

    const prePPEInvest = -1 * parseFloat(DecimalOperations.subtract(getPPE.prePeriodAmount || '0', salePPE.prePeriodAmount || '0'));
    const preStrategyInvest =
      -1 *
      parseFloat(DecimalOperations.subtract(
        DecimalOperations.add(
          DecimalOperations.add(
            getFVPL.prePeriodAmount || '0',
            getFVOCI.prePeriodAmount || '0'
          ),
          DecimalOperations.add(
            getAmortizedFA.prePeriodAmount || '0',
            receiveStockDividend.prePeriodAmount || '0'
          )
        ),
        DecimalOperations.add(
          DecimalOperations.add(
            saleFVOCI.prePeriodAmount || '0',
            saleAmortizedFA.prePeriodAmount || '0'
          ),
          removeHedgeAsset.prePeriodAmount || '0'
        )
      ));
    const preOtherInvest =
      -1 * parseFloat(DecimalOperations.add(
        DecimalOperations.add(
          totalInvestCashFlow.prePeriodAmount || '0',
          prePPEInvest.toString()
        ),
        preStrategyInvest.toString()
      ));

    const labels = ['不動產', '策略性投資項目', '其他'];

    const curYearString = currentYear.toString();
    const preYearString = (currentYear - 1).toString();
    return {
      [curYearString]: {
        data: [curPPEInvest.toString(), curStrategyInvest.toString(), curOtherInvest.toString()],
        labels,
      },
      [preYearString]: {
        data: [prePPEInvest.toString(), preStrategyInvest.toString(), preOtherInvest.toString()],
        labels,
      },
    };
  }

  private static freeMoneyMap(
    currentYear: number,
    accountMap: Map<string, IAccountReadyForFrontend>
  ) {
    const operatingCashFlow =
      accountMap.get(SPECIAL_ACCOUNTS.CASH_FLOW_FROM_OPERATING.code) ||
      EMPTY_I_ACCOUNT_READY_FRONTEND;
    const getPPE =
      accountMap.get(SPECIAL_ACCOUNTS.CASH_INVEST_PPE.code) || EMPTY_I_ACCOUNT_READY_FRONTEND;
    const salePPE =
      accountMap.get(SPECIAL_ACCOUNTS.CASH_DISPOSE_PPE.code) || EMPTY_I_ACCOUNT_READY_FRONTEND;
    const getIntangibleAsset =
      accountMap.get(SPECIAL_ACCOUNTS.CASH_INVEST_AMORTIZED_FINANCIAL_ASSET.code) ||
      EMPTY_I_ACCOUNT_READY_FRONTEND;
    const saleIntangibleAsset =
      accountMap.get(SPECIAL_ACCOUNTS.CASH_DISPOSE_INTANGIBLE_ASSET.code) ||
      EMPTY_I_ACCOUNT_READY_FRONTEND;

    // Info: (20240730 - Anna) get本來就是負的
    const curFreeCash = parseFloat(DecimalOperations.subtract(
      DecimalOperations.add(
        DecimalOperations.add(
          operatingCashFlow.curPeriodAmount || '0',
          getPPE.curPeriodAmount || '0'
        ),
        getIntangibleAsset.curPeriodAmount || '0'
      ),
      DecimalOperations.add(
        salePPE.curPeriodAmount || '0',
        saleIntangibleAsset.curPeriodAmount || '0'
      )
    ));
    const preFreeCash = parseFloat(DecimalOperations.subtract(
      DecimalOperations.add(
        DecimalOperations.add(
          operatingCashFlow.prePeriodAmount || '0',
          getPPE.prePeriodAmount || '0'
        ),
        getIntangibleAsset.prePeriodAmount || '0'
      ),
      DecimalOperations.add(
        salePPE.prePeriodAmount || '0',
        saleIntangibleAsset.prePeriodAmount || '0'
      )
    ));

    const curYearString = currentYear.toString();
    const preYearString = (currentYear - 1).toString();

    return {
      [curYearString]: {
        operatingCashFlow: operatingCashFlow.curPeriodAmount,
        ppe: Math.abs(parseFloat(DecimalOperations.subtract(getPPE.curPeriodAmount || '0', salePPE.curPeriodAmount || '0'))).toString(),
        intangibleAsset: Math.abs(parseFloat(
          DecimalOperations.subtract(getIntangibleAsset.curPeriodAmount || '0', saleIntangibleAsset.curPeriodAmount || '0')
        )).toString(),
        freeCash: curFreeCash.toString(),
      },
      [preYearString]: {
        operatingCashFlow: operatingCashFlow.prePeriodAmount,
        ppe: Math.abs(parseFloat(DecimalOperations.subtract(getPPE.prePeriodAmount || '0', salePPE.prePeriodAmount || '0'))).toString(),
        intangibleAsset: Math.abs(parseFloat(
          DecimalOperations.subtract(getIntangibleAsset.prePeriodAmount || '0', saleIntangibleAsset.prePeriodAmount || '0')
        )).toString(),
        freeCash: preFreeCash.toString(),
      },
    };
  }

  public override generateOtherInfo(
    cashFlowAccounts: IAccountReadyForFrontend[],
    incomeStatementAccounts: IAccountReadyForFrontend[]
  ): CashFlowStatementOtherInfo {
    const currentInMillisecond = timestampInMilliSeconds(this.endDateInSecond);
    const currentDate = new Date(currentInMillisecond);

    const currentYear = currentDate.getFullYear();
    const accountMap = new Map<string, IAccountReadyForFrontend>();
    cashFlowAccounts.forEach((account) => {
      accountMap.set(account.code, account);
    });
    incomeStatementAccounts.forEach((account) => {
      accountMap.set(account.code, account);
    });

    const { operatingStabilized, lineChartDataForRatio } = this.operatingStabilizedMap(
      currentYear,
      accountMap
    );
    const strategyInvest = CashFlowStatementGenerator.ppeVSStrategyInvestMap(
      currentYear,
      accountMap
    );
    const freeCash = CashFlowStatementGenerator.freeMoneyMap(currentYear, accountMap);

    return {
      operatingStabilized,
      lineChartDataForRatio,
      strategyInvest,
      ourThoughts: ['無分析意見', '無分析意見', '無分析意見'],
      freeCash,
      thirdTitle: '無分析意見',
      fourthTitle: '無分析意見',
      fourPointOneTitle: '無分析意見',
    };
  }

  public override async generateReport(): Promise<{
    content: IFinancialReportInDB;
  }> {
    const cashFlowAccounts = await this.generateIAccountReadyForFrontendArray();
    const incomeStatementAccount =
      await this.incomeStatementGenerator.generateIAccountReadyForFrontendArray();
    const otherInfo = this.generateOtherInfo(cashFlowAccounts, incomeStatementAccount);
    const financialReportInDB = { content: cashFlowAccounts, otherInfo };

    return { content: financialReportInDB };
  }
}
