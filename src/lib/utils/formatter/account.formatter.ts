import { IAccount, IPaginatedAccount } from '@/interfaces/accounting_account';
import { Account } from '@prisma/client';

export function formatAccount(account: Account): IAccount {
  return {
    id: account.id,
    companyId: account.companyId,
    system: account.system,
    type: account.type,
    liquidity: account.liquidity,
    debit: account.debit,
    code: account.code,
    name: account.name,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    deletedAt: account.deletedAt,
  };
}

export function formatAccounts(accounts: Account[]): IAccount[] {
  const formattedAccounts: IAccount[] = accounts.map((account) => formatAccount(account));
  return formattedAccounts;
}

export function formatIPaginatedAccount(accounts: {
  data: Account[];
  page: number;
  limit: number;
  totalPage: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  sortOrder: 'asc' | 'desc';
  sortBy: 'code' | 'createdAt';
}): IPaginatedAccount {
  const formattedAccounts: IAccount[] = formatAccounts(accounts.data);

  const paginatedAccount: IPaginatedAccount = {
    data: formattedAccounts,
    page: accounts.page,
    totalPages: accounts.totalPage,
    totalCount: accounts.totalCount,
    pageSize: accounts.limit,
    hasNextPage: accounts.hasNextPage,
    hasPreviousPage: accounts.hasPreviousPage,
    sort: [
      {
        sortBy: accounts.sortBy,
        sortOrder: accounts.sortOrder,
      },
    ],
  };

  return paginatedAccount;
}
