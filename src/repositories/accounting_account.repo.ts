import { prisma } from "@/lib/prisma";
import { Prisma, AccountingAccount } from "@/generated";
import { IAccountingAccount } from "@/interfaces/accounting_account";

export interface IAccountingAccountRepository {
  getCustomAccountsByAccountBookId(
    accountBookId: string,
  ): Promise<IAccountingAccount[]>;
  createCustomAccount(
    data: Prisma.AccountingAccountUncheckedCreateInput,
  ): Promise<{ newId: string }>;
  updateCustomAccount(
    id: string,
    data: Prisma.AccountingAccountUpdateInput,
  ): Promise<IAccountingAccount | null>;
  deleteCustomAccount(id: string): Promise<{ id: string } | null>;
  getCustomAccountByCode(
    accountBookId: string,
    code: string,
  ): Promise<IAccountingAccount | null>;
}

export class AccountingAccountRepository implements IAccountingAccountRepository {
  // Info: (20260703 - Julian) 轉換會計科目格式，從資料庫格式轉換為前端需要的格式
  private transformToFrontendFormat(
    account: AccountingAccount,
  ): IAccountingAccount {
    return {
      code: account.code,
      name: account.name,
      description: account.description || "",
      type: account.type,
      level: account.level,
      parentCode: account.parentCode,
      isDebit: account.isDebit,
      id: account.id,
      accountBookId: account.accountBookId,
      createdAt: Math.floor(account.createdAt.getTime() / 1000),
      updatedAt: Math.floor(account.updatedAt.getTime() / 1000),
      isCustom: true,
    };
  }

  // Info: (20260703 - Julian) 取得特定帳本下的所有自訂科目
  async getCustomAccountsByAccountBookId(accountBookId: string) {
    const accounts = await prisma.accountingAccount.findMany({
      where: { accountBookId, deletedAt: null },
      orderBy: { code: "asc" },
    });

    return accounts.map(this.transformToFrontendFormat);
  }

  // Info: (20260703 - Julian) 建立新的自訂科目
  async createCustomAccount(
    data: Prisma.AccountingAccountUncheckedCreateInput,
  ) {
    const result = await prisma.accountingAccount.create({ data });
    return { newId: result.id };
  }

  // Info: (20260703 - Julian) 更新自訂科目
  async updateCustomAccount(
    id: string,
    data: Prisma.AccountingAccountUpdateInput,
  ) {
    const account = await prisma.accountingAccount.update({
      where: { id },
      data,
    });

    if (!account) return null;
    return this.transformToFrontendFormat(account);
  }

  // Info: (20260703 - Julian) 刪除自訂科目 (軟刪除)
  async deleteCustomAccount(id: string) {
    const result = await prisma.accountingAccount.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return result ? { id: result.id } : null;
  }

  // Info: (20260703 - Julian) 取得特定帳本下的自訂科目 (透過編號)
  async getCustomAccountByCode(accountBookId: string, code: string) {
    const account = await prisma.accountingAccount.findFirst({
      where: { accountBookId, code, deletedAt: null },
    });

    if (!account) return null;
    return this.transformToFrontendFormat(account);
  }
}

export const accountingAccountRepo = new AccountingAccountRepository();
