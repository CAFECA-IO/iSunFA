import { SortOrder } from '@/constants/sort';
import { IAccount, IAccountEntity, IPaginatedAccount } from '@/interfaces/accounting_account';
import { Account as PrismaAccount } from '@prisma/client';
import { z } from 'zod';
import { AccountType } from '@/constants/account';
import { FormatterError } from '@/lib/utils/error/formatter_error';

export function formatAccount(account: PrismaAccount): IAccount {
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
  // ToDo: (20241023 - Murky) Need to move to other place

  const basicAccountEntitySchema = z.object({
    id: z.number(),
    companyId: z.number(),
    system: z.string(), // Info: (20241023 - Murky) Change to enum ['IFRS', 'GAAP'] if needed
    type: z.nativeEnum(AccountType),
    debit: z.boolean(),
    liquidity: z.boolean(),
    code: z.string(),
    name: z.string(),
    forUser: z.boolean(),
    level: z.number(),
    parentCode: z.string(),
    rootCode: z.string(),
    createdAt: z.number(),
    updatedAt: z.number(),
    deletedAt: z.number().nullable(),
  });

  type AccountEntity = z.infer<typeof basicAccountEntitySchema> & {
    parent?: AccountEntity;
    root?: AccountEntity;
  };

  const accountEntitySchema: z.ZodType<AccountEntity> = basicAccountEntitySchema.extend({
    parent: z.lazy(() => accountEntitySchema.optional()),
    root: z.lazy(() => accountEntitySchema.optional()),
  });

  const { data, success, error } = accountEntitySchema.safeParse(dto);

  if (!success) {
    throw new FormatterError('AccountEntity format prisma data error', {
      dto,
      zodErrorMessage: error.message,
      issues: error.errors,
    });
  }

  return data;
}
