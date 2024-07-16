import { buildAccountForest } from '@/lib/utils/account';
import { findManyAccountsInPrisma } from '@/lib/utils/repo/account.repo';
import { ReportSheetAccountTypeMap, ReportSheetType } from '@/constants/report';
import { getLineItemsInPrisma } from '@/lib/utils/repo/line_item.repo';
import { IAccountForSheetDisplay, IAccountNode } from '@/interfaces/accounting_account';
import { EitherPattern, VoucherPattern } from '@/interfaces/cash_flow';
import { AccountType } from '@/constants/account';

export default abstract class FinancialReportGenerator {
  protected companyId: number;

  protected startDateInSecond: number;

  protected endDateInSecond: number;

  protected reportSheetType: ReportSheetType;

  constructor(
    companyId: number,
    startDateInSecond: number,
    endDateInSecond: number,
    reportSheetType: ReportSheetType
  ) {
    this.companyId = companyId;
    this.startDateInSecond = startDateInSecond;
    this.endDateInSecond = endDateInSecond;
    this.reportSheetType = reportSheetType;
  }

  protected matchPattern(pattern: VoucherPattern, codes: Set<string>): boolean {
    switch (pattern.type) {
      case 'AND':
        return pattern.patterns.every((p) => this.matchPattern(p, codes));
      case 'OR':
        return pattern.patterns.some((p) => this.matchPattern(p, codes));
      case 'CODE':
        return Array.from(pattern.codes).some((regex) =>
          Array.from(codes).some((code) => regex.test(code)));
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
    const onlyForUser = false;
    const page = 1;
    const limit = Number.MAX_SAFE_INTEGER;
    const liquidity = undefined;
    const selectDeleted = false;
    const accounts = await findManyAccountsInPrisma(
      this.companyId,
      onlyForUser,
      page,
      limit,
      accountType,
      liquidity,
      selectDeleted
    );
    const forest = buildAccountForest(accounts);
    return forest;
  }

  protected async getAccountForestByReportSheet() {
    const accountTypes = ReportSheetAccountTypeMap[this.reportSheetType];
    const forestArray = await Promise.all(
      accountTypes.map((type) => this.buildAccountForestFromDB(type))
    );

    const forest = forestArray.flat(1);
    return forest;
  }

  protected async getAllLineItemsByReportSheet(reportSheetType?: ReportSheetType) {
    const reportSheetTypeForQuery = reportSheetType || this.reportSheetType;
    const accountTypes = ReportSheetAccountTypeMap[reportSheetTypeForQuery];
    const lineItemsFromDBArray = await Promise.all(
      accountTypes.map((type) =>
        getLineItemsInPrisma(this.companyId, type, this.startDateInSecond, this.endDateInSecond))
    );

    const lineItemsFromDB = lineItemsFromDBArray.flat();
    return lineItemsFromDB;
  }

  public abstract generateFinancialReportTree(): Promise<IAccountNode[]>;
  public abstract generateFinancialReportMap(): Promise<Map<string, IAccountNode>>;
  public abstract generateFinancialReportArray(): Promise<IAccountForSheetDisplay[]>;
}
