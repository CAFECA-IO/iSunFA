import ReportGenerator from '@/lib/utils/report/report_generator';
import { buildAccountForest } from '@/lib/utils/account/common';
import { easyFindManyAccountsInPrisma } from '@/lib/utils/repo/account.repo';
import { ReportSheetAccountTypeMap, ReportSheetType } from '@/constants/report';
import { getLineItemsInPrisma } from '@/lib/utils/repo/line_item.repo';
import {
  IAccountForSheetDisplay,
  IAccountNode,
  IAccountReadyForFrontend,
} from '@/interfaces/accounting_account';
import { EitherPattern, VoucherPattern } from '@/interfaces/cash_flow';
import { AccountType } from '@/constants/account';
import {
  BalanceSheetOtherInfo,
  CashFlowStatementOtherInfo,
  IFinancialReportInDB,
  IncomeStatementOtherInfo,
} from '@/interfaces/report';
import { formatNumberSeparateByComma, getTimestampOfSameDateOfLastYear } from '@/lib/utils/common';

export default abstract class FinancialReportGenerator extends ReportGenerator {
  protected lastPeriodStartDateInSecond: number;

  protected lastPeriodEndDateInSecond: number;

  protected curPeriodContent: IAccountForSheetDisplay[] = [];

  protected prePeriodContent: IAccountForSheetDisplay[] = [];

  constructor(
    companyId: number,
    startDateInSecond: number,
    endDateInSecond: number,
    reportSheetType: ReportSheetType
  ) {
    super(companyId, startDateInSecond, endDateInSecond, reportSheetType);
    const { lastPeriodStartDateInSecond, lastPeriodEndDateInSecond } =
      FinancialReportGenerator.getLastPeriodStartAndEndDate(
        reportSheetType,
        startDateInSecond,
        endDateInSecond
      );

    this.lastPeriodStartDateInSecond = lastPeriodStartDateInSecond;
    this.lastPeriodEndDateInSecond = lastPeriodEndDateInSecond;
  }

  static getLastPeriodStartAndEndDate(
    reportSheetType: ReportSheetType,
    startDateInSecond: number,
    endDateInSecond: number
  ) {
    const lastPeriodStartDateInSecond =
      reportSheetType === ReportSheetType.BALANCE_SHEET
        ? 0
        : Math.max(getTimestampOfSameDateOfLastYear(startDateInSecond), 0);
    const lastPeriodEndDateInSecond = Math.max(
      getTimestampOfSameDateOfLastYear(endDateInSecond),
      0
    );
    return { lastPeriodStartDateInSecond, lastPeriodEndDateInSecond };
  }

  protected matchPattern(pattern: VoucherPattern, codes: Set<string>): boolean {
    switch (pattern.type) {
      case 'AND':
        return pattern.patterns.every((p) => this.matchPattern(p, codes));
      case 'OR':
        return pattern.patterns.some((p) => this.matchPattern(p, codes));
      case 'CODE':
        return Array.from(pattern.codes).some((regex) => {
          return Array.from(codes).some((code) => regex.test(code));
        });
      default:
        return false;
    }
  }

  protected matchEitherPattern(
    either: EitherPattern | undefined,
    debitCodes: Set<string>,
    creditCodes: Set<string>
  ): boolean {
    if (!either) {
      return true; // If no either pattern is specified, return true
    }
    return (
      this.matchPattern(either.debit, debitCodes) || this.matchPattern(either.credit, creditCodes)
    );
  }

  protected async buildAccountForestFromDB(accountType: AccountType) {
    // const forUser = undefined;
    // const page = 1;
    // const limit = Number.MAX_SAFE_INTEGER;
    // const liquidity = undefined;
    // const isDeleted = false;
    // const accounts = await findManyAccountsInPrisma({
    //   companyId: this.companyId,
    //   includeDefaultAccount: undefined,
    //   liquidity,
    //   type: accountType,
    //   reportType: undefined,
    //   equityType: undefined,
    //   forUser,
    //   isDeleted,
    //   page,
    //   limit,
    //   sortBy: 'code',
    //   sortOrder: 'asc',
    // });

    const accounts = await easyFindManyAccountsInPrisma(this.companyId, accountType);
    const forest = buildAccountForest(accounts);

    return forest;
  }

  protected async getAccountForestByReportSheet() {
    const accountTypes = ReportSheetAccountTypeMap[this.reportSheetType];
    const forestArray = await Promise.all(
      accountTypes.map(async (type) => {
        return this.buildAccountForestFromDB(type);
      })
    );

    const forest = forestArray.flat(1);

    return forest;
  }

  protected getDateInSecond(curPeriod: boolean) {
    const startDateInSecond = curPeriod ? this.startDateInSecond : this.lastPeriodStartDateInSecond;
    const endDateInSecond = curPeriod ? this.endDateInSecond : this.lastPeriodEndDateInSecond;
    return { startDateInSecond, endDateInSecond };
  }

  protected async getAllLineItemsByReportSheet(
    curPeriod: boolean,
    reportSheetType?: ReportSheetType
  ) {
    const { startDateInSecond, endDateInSecond } = this.getDateInSecond(curPeriod);

    const reportSheetTypeForQuery = reportSheetType || this.reportSheetType;
    const accountTypes = ReportSheetAccountTypeMap[reportSheetTypeForQuery];
    const isLineItemDeleted = false;
    const lineItemsFromDBArray = await Promise.all(
      accountTypes.map((type) => {
        return getLineItemsInPrisma(
          this.companyId,
          type,
          startDateInSecond,
          endDateInSecond,
          isLineItemDeleted
        );
      })
    );

    const lineItemsFromDB = lineItemsFromDBArray.flat();
    return lineItemsFromDB;
  }

  public async generateIAccountReadyForFrontendArray(): Promise<IAccountReadyForFrontend[]> {
    const curPeriodAccountReadyForFrontendArray: IAccountReadyForFrontend[] = [];

    this.curPeriodContent = await this.generateFinancialReportArray(true);

    this.prePeriodContent = await this.generateFinancialReportArray(false);

    if (
      this.curPeriodContent &&
      this.prePeriodContent &&
      this.curPeriodContent.length > 0 &&
      this.prePeriodContent.length > 0 &&
      this.curPeriodContent.length === this.prePeriodContent.length
    ) {
      this.curPeriodContent.forEach((curPeriodAccount, index) => {
        const lastPeriodAccount = this.prePeriodContent[index];
        const curPeriodAmount = curPeriodAccount.amount || 0;
        const prePeriodAmount = lastPeriodAccount.amount || 0;
        const curPeriodAmountString = formatNumberSeparateByComma(curPeriodAmount);
        const prePeriodAmountString = formatNumberSeparateByComma(prePeriodAmount);
        const curPeriodPercentage = curPeriodAccount?.percentage
          ? Math.round(curPeriodAccount.percentage * 100)
          : 0;
        const prePeriodPercentage = lastPeriodAccount?.percentage
          ? Math.round(lastPeriodAccount.percentage * 100)
          : 0;
        const accountReadyForFrontend: IAccountReadyForFrontend = {
          code: curPeriodAccount.code,
          name: curPeriodAccount.name,
          curPeriodAmount,
          curPeriodPercentage,
          curPeriodAmountString,
          prePeriodAmount,
          prePeriodPercentage,
          prePeriodAmountString,
          indent: curPeriodAccount.indent,
        };
        curPeriodAccountReadyForFrontendArray.push(accountReadyForFrontend);
      });
    }

    return curPeriodAccountReadyForFrontendArray;
  }

  public abstract generateFinancialReportTree(curPeriod: boolean): Promise<IAccountNode[]>;

  public abstract generateFinancialReportMap(curPeriod: boolean): Promise<
    Map<
      string,
      {
        accountNode: IAccountNode;
        percentage: number;
      }
    >
  >;
  public abstract generateFinancialReportArray(
    curPeriod: boolean
  ): Promise<IAccountForSheetDisplay[]>;

  public abstract generateOtherInfo(
    ...contents: IAccountReadyForFrontend[][]
  ): BalanceSheetOtherInfo | CashFlowStatementOtherInfo | IncomeStatementOtherInfo;

  public abstract override generateReport(): Promise<{
    content: IFinancialReportInDB
  }>;
}
