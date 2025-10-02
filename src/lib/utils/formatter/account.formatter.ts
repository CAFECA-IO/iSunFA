import { SortOrder } from '@/constants/sort';
import { IAccount, IAccountEntity, IPaginatedAccount } from '@/interfaces/accounting_account';
import { Account as PrismaAccount } from '@prisma/client';
import { FormatterError } from '@/lib/utils/error/formatter_error';
import { accountEntityValidator } from '@/lib/utils/zod_schema/account';

export function formatAccount(account: PrismaAccount): IAccount {
  return {
    id: account.id,
    accountBookId: account.accountBookId,
    system: account.system,
    type: account.type,
    liquidity: account.liquidity,
    debit: account.debit,
    code: account.code,
    name: account.name,
    note: account.note ?? '',
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    deletedAt: account.deletedAt,
  };
}

export function formatAccounts(accounts: PrismaAccount[]): IAccount[] {
  const formattedAccounts: IAccount[] = accounts.map((account) => formatAccount(account));
  return formattedAccounts;
}

export function formatIPaginatedAccount(accounts: {
  data: PrismaAccount[];
  page: number;
  limit: number;
  totalPage: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  sortOrder: SortOrder.ASC | SortOrder.DESC;
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

/**
 * Info: (20241023 - Murky)
 * @description this function is used to convert Prisma.Account to IAccountEntity
 * @note Reference of recursive schema: https://github.com/colinhacks/zod?tab=readme-ov-file#recursive-types
 */
export function parsePrismaAccountToAccountEntity(dto: PrismaAccount): IAccountEntity {
  const { data, success, error } = accountEntityValidator.safeParse(dto);

  if (!success) {
    throw new FormatterError('AccountEntity format prisma data error', {
      dto,
      zodErrorMessage: error.message,
      issues: error.issues,
    });
  }

  return data;
}
