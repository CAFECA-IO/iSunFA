import { IAccount } from '@/interfaces/accounting_account';
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
  };
}

export function formatAccounts(accounts: Account[]): IAccount[] {
  const formattedAccounts: IAccount[] = accounts.map((account) => formatAccount(account));
  return formattedAccounts;
}
