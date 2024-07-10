import { AccountSheetType } from "@/constants/account";
import FinancialReportGenerator from "@/lib/utils/financial_report/financial_report_generator";
import BalanceSheetGenerator from "@/lib/utils/financial_report/balance_sheet_generator";
import IncomeStatementGenerator from "@/lib/utils/financial_report/income_statement_generator";
import { IAccountForSheetDisplay, IAccountNode } from "@/interfaces/accounting_account";
import { IOperatingCashFlowMapping } from "@/interfaces/cash_flow";
import { OPERATING_CASH_FLOW_INDIRECT_MAPPING } from "@/constants/operating_cash_flow";

export default class CashFlowStatementGenerator extends FinancialReportGenerator {
  private balanceSheetGenerator: BalanceSheetGenerator;

  private incomeStatementGenerator: IncomeStatementGenerator;

  constructor(
    companyId: number,
    startDateInSecond: number,
    endDateInSecond: number,
  ) {
    const accountSheetType = AccountSheetType.CASH_FLOW_STATEMENT;
    super(companyId, startDateInSecond, endDateInSecond, accountSheetType);

    this.balanceSheetGenerator = new BalanceSheetGenerator(companyId, startDateInSecond, endDateInSecond);
    this.incomeStatementGenerator = new IncomeStatementGenerator(companyId, startDateInSecond, endDateInSecond);
  }

  // Info: (20240710 - Murky) This method is only used in this class
  // eslint-disable-next-line class-methods-use-this
  private mergeMap(
      balanceSheetMap: Map<string, IAccountNode>,
      incomeStatementMap: Map<string, IAccountNode>
  ): Map<string, IAccountNode> {
      const mergedMap = new Map<string, IAccountNode>([...balanceSheetMap, ...incomeStatementMap]);
      return mergedMap;
  }

  private generateIndirectOperatingCashFlowRecursive(
    referenceMap: Map<string, IAccountNode>,
    currentCode: string,
    level: number,
    node: IOperatingCashFlowMapping
  ): Map<string, IAccountForSheetDisplay> {
    // Info: (20240710 - Murky) DFS
    let childMap = new Map<string, IAccountForSheetDisplay>();
    node.child?.forEach((value, key) => {
        const childAccountForSheet = this.generateIndirectOperatingCashFlowRecursive(referenceMap, key, level + 1, value);
        childMap = new Map([...childMap, ...childAccountForSheet]);
    });

    const { fromCode, name, debit, operatingFunction } = node;

    let amount = fromCode.reduce((acc, code) => {
        const account = referenceMap.get(code);
        if (account) {
            const isAccountDebit = account.debit;
            const accountAmount = debit !== isAccountDebit ? -account.amount : account.amount;
            return operatingFunction(acc, accountAmount);
        }
        return acc;
    }, 0);

    childMap.forEach((value) => {
        if (value.amount) {
            amount = operatingFunction(amount, value.amount);
        }
    });

    const accountForSheetDisplay: IAccountForSheetDisplay = {
        code: currentCode,
        name,
        amount,
        indent: level,
        debit,
    };

    const newAccountSheetMapping = new Map<string, IAccountForSheetDisplay>(
        [...childMap, [currentCode, accountForSheetDisplay]]
    );

    return newAccountSheetMapping;
  }

  private generateIndirectOperatingCashFlow(
      referenceMap: Map<string, IAccountNode>,
  ): Map<string, IAccountForSheetDisplay> {
      let accountSheetMap = new Map<string, IAccountForSheetDisplay>();

      OPERATING_CASH_FLOW_INDIRECT_MAPPING.forEach((value, key) => {
          const childMap = this.generateIndirectOperatingCashFlowRecursive(referenceMap, key, 0, value);
          accountSheetMap = new Map([...accountSheetMap, ...childMap]);
      });
      return accountSheetMap;
  }

  private async getIndirectOperatingCashFlow() {
    const balanceSheetMap = await this.balanceSheetGenerator.generateFinancialReportMap();
    const incomeStatementMap = await this.incomeStatementGenerator.generateFinancialReportMap();

    const mergedMap = this.mergeMap(balanceSheetMap, incomeStatementMap);
    const indirectOperatingCashFlow = this.generateIndirectOperatingCashFlow(mergedMap);

    // ToDo: (20240710 - Murky) 特殊 indirect cash flow的項目都還沒有實作
    // ToDo: (20240710 - Murky) 現在暫時用Map內的順序，之後需要用DevTool的表格排序
    return indirectOperatingCashFlow;
  }

  // ToDo: (20240710 - Murky) Need to implement later
  // eslint-disable-next-line class-methods-use-this
  public override async generateFinancialReportTree(): Promise<IAccountNode[]> {
    return [];
  }

  // ToDo: (20240710 - Murky) Need to implement later
  // eslint-disable-next-line class-methods-use-this
  public override async generateFinancialReportMap(): Promise<Map<string, IAccountNode>> {
    return new Map<string, IAccountNode>();
  }

  // ToDo: (20240710 - Murky) Need to implement complete cash flow not just indirect
  public override async generateFinancialReportArray(): Promise<IAccountForSheetDisplay[]> {
    const indirectOperatingCashFlow = await this.getIndirectOperatingCashFlow();
    const indirectOperatingCashFlowArray = Array.from(indirectOperatingCashFlow.values());
    return indirectOperatingCashFlowArray;
  }
}
