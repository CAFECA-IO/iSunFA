import { ReportSheetType } from '@/constants/report';
import FinancialReportGenerator from '@/lib/utils/financial_report/financial_report_generator';
import BalanceSheetGenerator from '@/lib/utils/financial_report/balance_sheet_generator';
import IncomeStatementGenerator from '@/lib/utils/financial_report/income_statement_generator';
import {
  IAccountForSheetDisplay,
  IAccountNode,
  IAccountReadyForFrontend,
} from '@/interfaces/accounting_account';
import { IDirectCashFlowMapping, IOperatingCashFlowMapping } from '@/interfaces/cash_flow';
import { OPERATING_CASH_FLOW_INDIRECT_MAPPING } from '@/constants/cash_flow/operating_cash_flow';
import { IVoucherFromPrismaIncludeLineItems } from '@/interfaces/voucher';
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

export default class CashFlowStatementGenerator extends FinancialReportGenerator {
  private balanceSheetGenerator: BalanceSheetGenerator;

  private incomeStatementGenerator: IncomeStatementGenerator;

  private voucherRelatedToCash: IVoucherFromPrismaIncludeLineItems[];

  private voucherLastPeriod: IVoucherFromPrismaIncludeLineItems[];

  private YEAR_RANGE = 5;

  constructor(
    companyId: number,
    startDateInSecond: number,
    endDateInSecond: number,
    voucherRelatedToCash: IVoucherFromPrismaIncludeLineItems[]
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

  // Info: (20240710 - Murky) This method is only used in this class
  // eslint-disable-next-line class-methods-use-this
  private mergeMap(
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
      const { debitAmount, creditAmount } = this.sumDebitAndCreditAmount(voucher);
      return acc + debitAmount - creditAmount;
    }, 0);

    const endCashBalance = this.voucherRelatedToCash.reduce((acc, voucher) => {
      const { debitAmount, creditAmount } = this.sumDebitAndCreditAmount(voucher);
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

  // Info: (20240710 - Murky) This method is only used in this class
  // eslint-disable-next-line class-methods-use-this
  private sumIndirectOperatingCashFlow(
    indirectOperatingCashFlow: Map<string, IAccountForSheetDisplay>
  ): number {
    const sum =
      (indirectOperatingCashFlow.get('A33000')?.amount || 0) +
      (indirectOperatingCashFlow.get('A33400')?.amount || 0) +
      (indirectOperatingCashFlow.get('A33500')?.amount || 0);

    return sum;
  }

  private async getIndirectOperatingCashFlow(
    curPeriod: boolean
  ): Promise<Map<string, IAccountForSheetDisplay>> {
    const balanceSheetMap = await this.balanceSheetGenerator.generateFinancialReportMap(curPeriod);
    const incomeStatementMap =
      await this.incomeStatementGenerator.generateFinancialReportMap(curPeriod);

    const mergedMap = this.mergeMap(balanceSheetMap, incomeStatementMap);
    const indirectOperatingCashFlow = this.generateIndirectOperatingCashFlow(mergedMap);

    const sum = this.sumIndirectOperatingCashFlow(indirectOperatingCashFlow);

    indirectOperatingCashFlow.set('AAAA', {
      code: 'AAAA',
      name: '營運活動之淨現金流入（流出）',
      amount: sum,
      indent: 0,
      percentage: null,
    });

    // ToDo: (20240710 - Murky) 特殊 indirect cash flow的項目都還沒有實作
    // ToDo: (20240710 - Murky) 現在暫時用Map內的順序，之後需要用DevTool的表格排序
    return indirectOperatingCashFlow;
  }

  // Info: (20240710 - Murky) This method is only used in this class
  // eslint-disable-next-line class-methods-use-this
  private getDebitCreditCodes(voucher: IVoucherFromPrismaIncludeLineItems) {
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

  // Info: (20240710 - Murky) This method is only used in this class
  // eslint-disable-next-line class-methods-use-this
  private sumDebitAndCreditAmount(voucher: IVoucherFromPrismaIncludeLineItems) {
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
        const { debitCodes, creditCodes } = this.getDebitCreditCodes(voucher);
        const isMatchingMapping = this.isMatchingInvestingCashFlowMapping(
          mapping,
          debitCodes,
          creditCodes
        );
        if (isMatchingMapping) {
          const { debitAmount, creditAmount } = this.sumDebitAndCreditAmount(voucher);
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
    reportSheetMapping.set('BBBB', {
      code: 'BBBB',
      name: '投資活動之淨現金流入（流出）',
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
    reportSheetMapping.set('CCCC', {
      code: 'CCCC',
      name: '籌資活動之淨現金流入（流出）',
      amount: directCashFlow,
      indent: 1,
      percentage: null,
    });
    return reportSheetMapping;
  }

  // eslint-disable-next-line class-methods-use-this
  private sumCashFlow(
    indirectOperatingCashFlow: Map<string, IAccountForSheetDisplay>,
    investingCashFlow: Map<string, IAccountForSheetDisplay>,
    financingCashFlow: Map<string, IAccountForSheetDisplay>
  ): number {
    const cashFlowFromOperating =
      (indirectOperatingCashFlow.get('AAAA')?.amount || 0) +
      (investingCashFlow.get('BBBB')?.amount || 0) +
      (financingCashFlow.get('CCCC')?.amount || 0);
    return cashFlowFromOperating;
  }

  private concatCashFlow(
    indirectOperatingCashFlow: Map<string, IAccountForSheetDisplay>,
    investingCashFlow: Map<string, IAccountForSheetDisplay>,
    financingCashFlow: Map<string, IAccountForSheetDisplay>
  ): Map<string, IAccountForSheetDisplay> {
    const { startCashBalance, endCashBalance } = this.getCashStartAndEndAmount();
    const cashFlowFromOperating = this.sumCashFlow(
      indirectOperatingCashFlow,
      investingCashFlow,
      financingCashFlow
    );

    const result = new Map<string, IAccountForSheetDisplay>([
      ...Array.from(indirectOperatingCashFlow),
      ...Array.from(investingCashFlow),
      ...Array.from(financingCashFlow),
    ]);

    result.set('DDDD', {
      code: 'DDDD',
      name: '匯率變動對現金及約當現金之影響',
      amount: 0,
      indent: 0,
      percentage: null,
    });

    result.set('EEEE', {
      code: 'EEEE',
      name: '本期現金及約當現金增加（減少）數',
      amount: cashFlowFromOperating,
      indent: 0,
      percentage: null,
    });

    result.set('E00100', {
      code: 'E00100',
      name: '期初現金及約當現金餘額',
      amount: startCashBalance,
      indent: 0,
      percentage: null,
    });

    result.set('E00200', {
      code: 'E00200',
      name: '期末現金及約當現金餘額',
      amount: endCashBalance,
      indent: 0,
      percentage: null,
    });
    return result;
  }

  // Info: (20240710 - Murky) This method is only used in this class
  // eslint-disable-next-line class-methods-use-this
  private transformMapToArray(
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

  // ToDo: (20240710 - Murky) Need to implement later
  // eslint-disable-next-line class-methods-use-this
  public override async generateFinancialReportTree(): Promise<IAccountNode[]> {
    return [];
  }

  // ToDo: (20240710 - Murky) Need to implement later
  // eslint-disable-next-line class-methods-use-this
  public override async generateFinancialReportMap(): Promise<
    Map<
      string,
      {
        accountNode: IAccountNode;
        percentage: number;
      }
    >
  > {
    return new Map<
      string,
      {
        accountNode: IAccountNode;
        percentage: number;
      }
    >();
  }

  // ToDo: (20240710 - Murky) Need to implement complete cash flow not just indirect
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

    const result = this.transformMapToArray(concatCashFlow);
    return result;
  }

  // eslint-disable-next-line class-methods-use-this
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

  // eslint-disable-next-line class-methods-use-this
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
    const beforeIncomeTax = accountMap.get('A10000');
    const salesDepreciation = accountMap.get('6124');
    const salesAmortization = accountMap.get('6125');
    const manageDepreciation = accountMap.get('6224');
    const manageAmortization = accountMap.get('6225');
    const rdDepreciation = accountMap.get('6324');
    const tax = accountMap.get('A33500');
    const operatingIncomeCashFlow = accountMap.get('AAAA');
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

  // eslint-disable-next-line class-methods-use-this
  private ppeVSStrategyInvestMap(
    currentYear: number,
    accountMap: Map<string, IAccountReadyForFrontend>
  ) {
    const getPPE = accountMap.get('B02700') || EMPTY_I_ACCOUNT_READY_FRONTEND;
    const salePPE = accountMap.get('B02800') || EMPTY_I_ACCOUNT_READY_FRONTEND;
    const getFVPL = accountMap.get('B00100') || EMPTY_I_ACCOUNT_READY_FRONTEND;
    const getFVOCI = accountMap.get('B00010') || EMPTY_I_ACCOUNT_READY_FRONTEND;
    const getAmortizedFA = accountMap.get('B00040') || EMPTY_I_ACCOUNT_READY_FRONTEND;
    const saleFVOCI = accountMap.get('B00020') || EMPTY_I_ACCOUNT_READY_FRONTEND;
    // const saleFVPL = accountMap.get('B00200') || EMPTY_I_ACCOUNT_READY_FRONTEND;
    const saleAmortizedFA = accountMap.get('B00050') || EMPTY_I_ACCOUNT_READY_FRONTEND;
    const removeHedgeAsset = accountMap.get('B01700') || EMPTY_I_ACCOUNT_READY_FRONTEND;
    const receiveStockDividend = accountMap.get('B07600') || EMPTY_I_ACCOUNT_READY_FRONTEND;
    // const equityDividend = accountMap.get('xxxx') || EMPTY_I_ACCOUNT_READY_FRONTEND; <= 沒有這個項目
    const totalInvestCashFlow = accountMap.get('BBBB') || EMPTY_I_ACCOUNT_READY_FRONTEND;

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

  // eslint-disable-next-line class-methods-use-this
  private freeMoneyMap(currentYear: number, accountMap: Map<string, IAccountReadyForFrontend>) {
    const operatingCashFlow = accountMap.get('AAAA') || EMPTY_I_ACCOUNT_READY_FRONTEND;
    const getPPE = accountMap.get('B02700') || EMPTY_I_ACCOUNT_READY_FRONTEND;
    const salePPE = accountMap.get('B04500') || EMPTY_I_ACCOUNT_READY_FRONTEND;
    const getIntangibleAsset = accountMap.get('B04500') || EMPTY_I_ACCOUNT_READY_FRONTEND;
    const saleIntangibleAsset = accountMap.get('B04600') || EMPTY_I_ACCOUNT_READY_FRONTEND;

    // Info: get本來就是負的
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
    const strategyInvest = this.ppeVSStrategyInvestMap(currentYear, accountMap);
    const freeCash = this.freeMoneyMap(currentYear, accountMap);

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
