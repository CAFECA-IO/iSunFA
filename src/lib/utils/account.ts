import { AccountType } from '@/constants/account';
import { IAccountEntity } from '@/interfaces/accounting_account';
import { Account as PrismaAccount } from '@prisma/client';
import { getTimestampNow } from '@/lib/utils/common';

export function initAccountEntity(
  dto: Partial<PrismaAccount> & {
    companyId: number;
    system: string;
    type: AccountType;
    debit: boolean;
    liquidity: boolean;
    code: string;
    name: string;
    forUser: boolean;
    parentCode: string;
    level: number;
    parent?: IAccountEntity;
    root?: IAccountEntity;
  }
): IAccountEntity {
  const nowInSecond = getTimestampNow();
  const accountEntity: IAccountEntity = {
    id: dto.id || -1,
    companyId: dto.companyId,
    system: dto.system,
    type: dto.type,
    debit: dto.debit,
    liquidity: dto.liquidity,
    code: dto.code,
    name: dto.name,
    forUser: dto.forUser,
    level: dto.level,
    parentCode: dto.parentCode,
    rootCode: dto.rootCode,
    parent: dto.parent,
    root: dto.root,
    createdAt: dto.createdAt || nowInSecond,
    updatedAt: dto.updatedAt || nowInSecond,
    deletedAt: dto.deletedAt || null,
  };
  return accountEntity;
}
