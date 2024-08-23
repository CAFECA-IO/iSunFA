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
import { OPERATING_CASH_FLOW_INDIRECT_MAPPING } from '@/constants/cash_flow/operating_cash_flow';
import { IVoucherFromPrismaIncludeJournalLineItems } from '@/interfaces/voucher';
import { findManyVoucherWithCashInPrisma } from '@/lib/utils/repo/voucher.repo';
import { INVESTING_CASH_FLOW_DIRECT_MAPPING } from '@/constants/cash_flow/investing_cash_flow';
import { FINANCING_CASH_FLOW_DIRECT_MAPPING } from '@/constants/cash_flow/financing_cash_flow';
import { CASH_AND_CASH_EQUIVALENTS_REGEX } from '@/constants/cash_flow/common_cash_flow';
import CashFlowMapForDisplayJSON from '@/constants/account_sheet_mapping/cash_flow_statement_mapping.json';
import {
  BalanceSheetOtherInfo,
  CashFlowStatementOtherInfo,
  IncomeStatementOtherInfo,
} from '@/interfaces/report';
import { EMPTY_I_ACCOUNT_READY_FRONTEND } from '@/constants/financial_report';
import { timestampInMilliSeconds } from '@/lib/utils/common';
import { absoluteNetIncome, noAdjustNetIncome } from '@/lib/utils/account/common';
import { SPECIAL_ACCOUNTS } from '@/constants/account';

export default class CashFlowStatementGenerator extends FinancialReportGenerator {
  private balanceSheetGenerator: BalanceSheetGenerator;

  private incomeStatementGenerator: IncomeStatementGenerator;

  private voucherRelatedToCash: IVoucherFromPrismaIncludeJournalLineItems[];

  private voucherLastPeriod: IVoucherFromPrismaIncludeJournalLineItems[];

  private YEAR_RANGE = 5;

  private eslintEscape = '';

  constructor(
    companyId: number,
    startDateInSecond: number,
    endDateInSecond: number,
    voucherRelatedToCash: IVoucherFromPrismaIncludeJournalLineItems[]
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
      const laterThanStartDate = voucher.journal.createdAt >= startDateInSecond;
      const earlierThanEndDate = voucher.journal.createdAt <= endDateInSecond;
      return laterThanStartDate && earlierThanEndDate;
    });

    this.voucherLastPeriod = voucherRelatedToCash.filter((voucher) => {
      const earlierThanStartDate = voucher.journal.createdAt < startDateInSecond;
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

  private getCashStartAndEndAmount(): { startCashBalance: number; endCashBalance: number } {
    const startCashBalance = this.voucherLastPeriod.reduce((acc, voucher) => {
      const { debitAmount, creditAmount } =
        CashFlowStatementGenerator.sumDebitAndCreditAmount(voucher);
      return acc + debitAmount - creditAmount;
    }, 0);

    const endCashBalance = this.voucherRelatedToCash.reduce((acc, voucher) => {
      const { debitAmount, creditAmount } =
        CashFlowStatementGenerator.sumDebitAndCreditAmount(voucher);
      return acc + debitAmount - creditAmount;
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

    let childAmount = 0;
    node.child?.forEach((value, key) => {
      const childAccountForSheet = this.generateIndirectOperatingCashFlowRecursive(
        referenceMap,
        key,
        level + 1,
        value
      );
      childAccountForSheet.forEach((childValue) => {
        if (childValue.indent === level + 1) {
          childAmount += childValue.amount || 0;
        }
      });
      childMap = new Map([...childMap, ...childAccountForSheet]);
    });

    const { fromCode, name, debit, operatingFunction } = node;

    let amount = fromCode.reduce((acc, code) => {
      const account = referenceMap.get(code);
      if (account) {
        const isAccountDebit = account.debit;

        let accountAmount = 0;
        switch (operatingFunction) {
          case noAdjustNetIncome:
          case absoluteNetIncome:
            accountAmount = account.amount;
            break;
          default:
            accountAmount = debit !== isAccountDebit ? -account.amount : account.amount;
        }

        return operatingFunction(acc, accountAmount);
      }
      return acc;
    }, 0);

    amount = operatingFunction(amount, childAmount);

    const accountForSheetDisplay: IAccountForSheetDisplay = {
      code: currentCode,
      name,
      amount,
      indent: level,
      debit,
      percentage: null,
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
    const sum =
      (indirectOperatingCashFlow.get(SPECIAL_ACCOUNTS.CASH_GENERATE_FROM_OPERATING.code)?.amount ||
        0) +
      (indirectOperatingCashFlow.get(SPECIAL_ACCOUNTS.CASH_OUTFLOW_FOR_DIVIDEND.code)?.amount ||
        0) +
      (indirectOperatingCashFlow.get(SPECIAL_ACCOUNTS.CASH_FROM_TAX_REFUND.code)?.amount || 0);

    return sum;
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
      code: SPECIAL_ACCOUNTS.CASH_FLOW_FROM_OPERATING.code,
      name: SPECIAL_ACCOUNTS.CASH_FLOW_FROM_OPERATING.name,
      amount: sum,
      indent: 0,
      percentage: null,
    });

    return indirectOperatingCashFlow;
  }

  private static getDebitCreditCodes(voucher: IVoucherFromPrismaIncludeJournalLineItems) {
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

  private static sumDebitAndCreditAmount(voucher: IVoucherFromPrismaIncludeJournalLineItems) {
    let debitAmount = 0;
    let creditAmount = 0;
    voucher.lineItems.forEach((lineItem) => {
      if (
        Array.from(CASH_AND_CASH_EQUIVALENTS_REGEX).some((regex) => {
          return regex.test(lineItem.account.code);
        })
      ) {
        if (lineItem.debit) {
          debitAmount += lineItem.amount;
        } else {
          creditAmount += lineItem.amount;
        }
      }
    });
    return { debitAmount, creditAmount };
  }

  private aggregateVouchers(
    firstLineName: string,
    cashFlowMapping: Map<string, IDirectCashFlowMapping>
  ): {
    reportSheetMapping: Map<string, IAccountForSheetDisplay>;
    directCashFlow: number;
  } {
    const result = new Map<string, IAccountForSheetDisplay>();
    result.set('header', {
      code: 'header',
      name: firstLineName,
      amount: null,
      indent: 0,
      percentage: null,
    });

    let directCashFlow = 0;
    cashFlowMapping.forEach((mapping, investCode) => {
      let total = 0;
      this.voucherRelatedToCash.forEach((voucher) => {
        const { debitCodes, creditCodes } = CashFlowStatementGenerator.getDebitCreditCodes(voucher);
        const isMatchingMapping = this.isMatchingInvestingCashFlowMapping(
          mapping,
          debitCodes,
          creditCodes
        );
        if (isMatchingMapping) {
          const { debitAmount, creditAmount } =
            CashFlowStatementGenerator.sumDebitAndCreditAmount(voucher);
          total += debitAmount;
          total -= creditAmount;
        }
      });

      const accountForSheetDisplay: IAccountForSheetDisplay = {
        code: investCode,
        name: mapping.name,
        amount: total,
        indent: 1,
        percentage: null,
      };

      directCashFlow += total;
      result.set(investCode, accountForSheetDisplay);
    });
    return {
      reportSheetMapping: result,
      directCashFlow,
    };
  }

  private getInvestingCashFlow(): Map<string, IAccountForSheetDisplay> {
    const { reportSheetMapping, directCashFlow } = this.aggregateVouchers(
      '投資活動之現金流量',
      INVESTING_CASH_FLOW_DIRECT_MAPPING
    );
    reportSheetMapping.set(SPECIAL_ACCOUNTS.CASH_FLOW_FROM_INVESTING.code, {
      code: SPECIAL_ACCOUNTS.CASH_FLOW_FROM_INVESTING.code,
      name: SPECIAL_ACCOUNTS.CASH_FLOW_FROM_INVESTING.name,
      amount: directCashFlow,
      indent: 1,
      percentage: null,
    });
    return reportSheetMapping;
  }

  private getFinancingCashFlow(): Map<string, IAccountForSheetDisplay> {
    const { reportSheetMapping, directCashFlow } = this.aggregateVouchers(
      '籌資活動之現金流量',
      FINANCING_CASH_FLOW_DIRECT_MAPPING
    );
    reportSheetMapping.set(SPECIAL_ACCOUNTS.CASH_FLOW_FROM_FINANCING.code, {
      code: SPECIAL_ACCOUNTS.CASH_FLOW_FROM_FINANCING.code,
      name: SPECIAL_ACCOUNTS.CASH_FLOW_FROM_FINANCING.name,
      amount: directCashFlow,
      indent: 1,
      percentage: null,
    });
    return reportSheetMapping;
  }

  private static sumCashFlow(
    indirectOperatingCashFlow: Map<string, IAccountForSheetDisplay>,
    investingCashFlow: Map<string, IAccountForSheetDisplay>,
    financingCashFlow: Map<string, IAccountForSheetDisplay>
  ): number {
    const cashFlowFromOperating =
      (indirectOperatingCashFlow.get(SPECIAL_ACCOUNTS.CASH_FLOW_FROM_OPERATING.code)?.amount || 0) +
      (investingCashFlow.get(SPECIAL_ACCOUNTS.CASH_FLOW_FROM_INVESTING.code)?.amount || 0) +
      (financingCashFlow.get(SPECIAL_ACCOUNTS.CASH_FLOW_FROM_FINANCING.code)?.amount || 0);
    return cashFlowFromOperating;
  }

  private concatCashFlow(
    indirectOperatingCashFlow: Map<string, IAccountForSheetDisplay>,
    investingCashFlow: Map<string, IAccountForSheetDisplay>,
    financingCashFlow: Map<string, IAccountForSheetDisplay>
  ): Map<string, IAccountForSheetDisplay> {
    const { startCashBalance, endCashBalance } = this.getCashStartAndEndAmount();
    const cashFlowFromOperating = CashFlowStatementGenerator.sumCashFlow(
      indirectOperatingCashFlow,
      investingCashFlow,
      financingCashFlow
    );

    const result = new Map<string, IAccountForSheetDisplay>([
      ...Array.from(indirectOperatingCashFlow),
      ...Array.from(investingCashFlow),
      ...Array.from(financingCashFlow),
    ]);

    result.set(SPECIAL_ACCOUNTS.CASH_FLOW_FROM_FOREIGN_EXCHANGE.code, {
      code: SPECIAL_ACCOUNTS.CASH_FLOW_FROM_FOREIGN_EXCHANGE.code,
      name: SPECIAL_ACCOUNTS.CASH_FLOW_FROM_FOREIGN_EXCHANGE.name,
      amount: 0,
      indent: 0,
      percentage: null,
    });

    result.set(SPECIAL_ACCOUNTS.CASH_INCREASE_THIS_PERIOD.code, {
      code: SPECIAL_ACCOUNTS.CASH_INCREASE_THIS_PERIOD.code,
      name: SPECIAL_ACCOUNTS.CASH_INCREASE_THIS_PERIOD.name,
      amount: cashFlowFromOperating,
      indent: 0,
      percentage: null,
    });

    result.set(SPECIAL_ACCOUNTS.CASH_AMOUNT_IN_BEGINNING.code, {
      code: SPECIAL_ACCOUNTS.CASH_AMOUNT_IN_BEGINNING.code,
      name: SPECIAL_ACCOUNTS.CASH_AMOUNT_IN_BEGINNING.name,
      amount: startCashBalance,
      indent: 0,
      percentage: null,
    });

    result.set(SPECIAL_ACCOUNTS.CASH_AMOUNT_IN_END.code, {
      code: SPECIAL_ACCOUNTS.CASH_AMOUNT_IN_END.code,
      name: SPECIAL_ACCOUNTS.CASH_AMOUNT_IN_END.name,
      amount: endCashBalance,
      indent: 0,
      percentage: null,
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
        code: accountCode,
        name: account.name,
        amount: 0,
        indent: account.indent,
        percentage: 0,
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

    const investingCashFlow = this.getInvestingCashFlow();

    const financingCashFlow = this.getFinancingCashFlow();

    const concatCashFlow = this.concatCashFlow(
      indirectOperatingCashFlow,
      investingCashFlow,
      financingCashFlow
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
    const ratio: { [key: string]: number } = {};
    const amortizationDepreciation: { [key: string]: number } = {};

    years.forEach((year) => {
      ratio[year] = 0;
      amortizationDepreciation[year] = 0;
    });

    let curDepreciateAndAmortize = 0;
    let preDepreciateAndAmortize = 0;
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
      curDepreciateAndAmortize =
        salesDepreciation.curPeriodAmount +
        salesAmortization.curPeriodAmount +
        manageDepreciation.curPeriodAmount +
        manageAmortization.curPeriodAmount +
        rdDepreciation.curPeriodAmount;

      preDepreciateAndAmortize =
        salesDepreciation.prePeriodAmount +
        salesAmortization.prePeriodAmount +
        manageDepreciation.prePeriodAmount +
        manageAmortization.prePeriodAmount +
        rdDepreciation.prePeriodAmount;

      amortizationDepreciation[currentYear] = curDepreciateAndAmortize;
      amortizationDepreciation[currentYear - 1] = preDepreciateAndAmortize;

      ratio[currentYear] =
        operatingIncomeCashFlow.curPeriodAmount !== 0
          ? (beforeIncomeTax.curPeriodAmount + curDepreciateAndAmortize - tax.curPeriodAmount) /
            operatingIncomeCashFlow.curPeriodAmount
          : 0;

      ratio[currentYear - 1] =
        operatingIncomeCashFlow.prePeriodAmount !== 0
          ? (beforeIncomeTax.prePeriodAmount + preDepreciateAndAmortize - tax.prePeriodAmount) /
            operatingIncomeCashFlow.prePeriodAmount
          : 0;
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
    const result: { [key: string]: number } = {};

    years.forEach((year) => {
      result[year] = 0;
    });

    result[currentYear] = accountReadyForFrontend?.curPeriodAmount || 0;

    result[currentYear - 1] = accountReadyForFrontend?.prePeriodAmount || 0;
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
    // const saleFVPL = accountMap.get('B00200') || EMPTY_I_ACCOUNT_READY_FRONTEND; // Info: (20240729 - Murky)
    const saleAmortizedFA =
      accountMap.get(SPECIAL_ACCOUNTS.CASH_DISPOSE_AMORTIZED_FINANCIAL_ASSET.code) ||
      EMPTY_I_ACCOUNT_READY_FRONTEND;
    const removeHedgeAsset =
      accountMap.get(SPECIAL_ACCOUNTS.CASH_REMOVE_HEDGE_ASSET.code) ||
      EMPTY_I_ACCOUNT_READY_FRONTEND;
    const receiveStockDividend =
      accountMap.get(SPECIAL_ACCOUNTS.CASH_RECEIVE_STOCK_DIVIDEND.code) ||
      EMPTY_I_ACCOUNT_READY_FRONTEND;
    // const equityDividend = accountMap.get('xxxx') || EMPTY_I_ACCOUNT_READY_FRONTEND; <= //  Info: (20240729 - Murky) 沒有這個項目
    const totalInvestCashFlow =
      accountMap.get(SPECIAL_ACCOUNTS.CASH_FLOW_FROM_INVESTING.code) ||
      EMPTY_I_ACCOUNT_READY_FRONTEND;

    const curPPEInvest = -1 * (getPPE.curPeriodAmount - salePPE.curPeriodAmount);
    const curStrategyInvest =
      -1 *
      (getFVPL.curPeriodAmount +
        getFVOCI.curPeriodAmount +
        getAmortizedFA.curPeriodAmount -
        saleFVOCI.curPeriodAmount -
        saleAmortizedFA.curPeriodAmount -
        removeHedgeAsset.curPeriodAmount +
        receiveStockDividend.curPeriodAmount);
    const curOtherInvest =
      -1 * (totalInvestCashFlow.curPeriodAmount + curPPEInvest + curStrategyInvest);

    const prePPEInvest = -1 * (getPPE.prePeriodAmount - salePPE.prePeriodAmount);
    const preStrategyInvest =
      -1 *
      (getFVPL.prePeriodAmount +
        getFVOCI.prePeriodAmount +
        getAmortizedFA.prePeriodAmount -
        saleFVOCI.prePeriodAmount -
        saleAmortizedFA.prePeriodAmount -
        removeHedgeAsset.prePeriodAmount +
        receiveStockDividend.prePeriodAmount);
    const preOtherInvest =
      -1 * (totalInvestCashFlow.prePeriodAmount + prePPEInvest + preStrategyInvest);

    const labels = ['不動產、廠房、設備的收支項目', '策略性投資項目', '其他'];

    const curYearString = currentYear.toString();
    const preYearString = (currentYear - 1).toString();
    return {
      [curYearString]: {
        data: [curPPEInvest, curStrategyInvest, curOtherInvest],
        labels,
      },
      [preYearString]: {
        data: [prePPEInvest, preStrategyInvest, preOtherInvest],
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
    const curFreeCash =
      operatingCashFlow.curPeriodAmount +
      getPPE.curPeriodAmount -
      salePPE.curPeriodAmount +
      getIntangibleAsset.curPeriodAmount -
      saleIntangibleAsset.curPeriodAmount;
    const preFreeCash =
      operatingCashFlow.prePeriodAmount +
      getPPE.prePeriodAmount -
      salePPE.prePeriodAmount +
      getIntangibleAsset.prePeriodAmount -
      saleIntangibleAsset.prePeriodAmount;

    const curYearString = currentYear.toString();
    const preYearString = (currentYear - 1).toString();

    return {
      [curYearString]: {
        operatingCashFlow: operatingCashFlow.curPeriodAmount,
        ppe: Math.abs(getPPE.curPeriodAmount - salePPE.curPeriodAmount),
        intangibleAsset: Math.abs(
          getIntangibleAsset.curPeriodAmount - saleIntangibleAsset.curPeriodAmount
        ),
        freeCash: curFreeCash,
      },
      [preYearString]: {
        operatingCashFlow: operatingCashFlow.prePeriodAmount,
        ppe: Math.abs(getPPE.prePeriodAmount - salePPE.prePeriodAmount),
        intangibleAsset: Math.abs(
          getIntangibleAsset.prePeriodAmount - saleIntangibleAsset.prePeriodAmount
        ),
        freeCash: preFreeCash,
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
    content: IAccountReadyForFrontend[];
    otherInfo: BalanceSheetOtherInfo | CashFlowStatementOtherInfo | IncomeStatementOtherInfo;
  }> {
    const cashFlowAccounts = await this.generateIAccountReadyForFrontendArray();
    const incomeStatementAccount =
      await this.incomeStatementGenerator.generateIAccountReadyForFrontendArray();
    const otherInfo = this.generateOtherInfo(cashFlowAccounts, incomeStatementAccount);
    return { content: cashFlowAccounts, otherInfo };
  }
}
