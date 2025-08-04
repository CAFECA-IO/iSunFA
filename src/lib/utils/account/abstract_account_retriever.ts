import { AccountType, EquityType } from '@/constants/account';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { ReportSheetType } from '@/constants/report';
import { IAccountQueryArgs, IPaginatedAccount } from '@/interfaces/accounting_account';
import { findManyAccountsInPrisma } from '@/lib/utils/repo/account.repo';
import { formatIPaginatedAccount } from '@/lib/utils/formatter/account.formatter';
import { SortOrder } from '@/constants/sort';

export abstract class AbstractAccountRetriever {
  protected accountBookId: number;

  protected includeDefaultAccount: boolean | undefined;

  protected liquidity: boolean | undefined;

  protected type: AccountType | undefined;

  protected reportType: ReportSheetType | undefined;

  protected equityType: EquityType | undefined;

  protected forUser: boolean | undefined;

  protected page: number = DEFAULT_PAGE_NUMBER;

  protected limit: number = DEFAULT_PAGE_LIMIT;

  protected sortBy: 'code' | 'createdAt' = 'code';

  protected sortOrder: SortOrder.ASC | SortOrder.DESC = SortOrder.ASC;

  protected searchKey: string | undefined;

  protected isDeleted: boolean | undefined;

  constructor({
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
    this.accountBookId = accountBookId;
    this.includeDefaultAccount = includeDefaultAccount;
    this.liquidity = liquidity;
    this.type = type;
    this.reportType = reportType;
    this.equityType = equityType;
    this.forUser = forUser;
    this.page = page || this.page;
    this.limit = limit || this.limit;
    this.sortBy = sortBy || this.sortBy;
    this.sortOrder = sortOrder || this.sortOrder;
    this.searchKey = searchKey;
    this.isDeleted = isDeleted;
  }

  public async getAccounts(): Promise<IPaginatedAccount> {
    const accounts = await findManyAccountsInPrisma({
      accountBookId: this.accountBookId,
      includeDefaultAccount: this.includeDefaultAccount,
      liquidity: this.liquidity,
      type: this.type,
      reportType: this.reportType,
      equityType: this.equityType,
      forUser: this.forUser,
      page: this.page,
      limit: this.limit,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
      searchKey: this.searchKey,
      isDeleted: this.isDeleted,
    });

    const paginatedAccount = formatIPaginatedAccount(accounts);
    return paginatedAccount;
  }
}
