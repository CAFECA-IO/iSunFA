import { ACCOUNTS, IAccount } from "@/constants/accounts";
import { CountryCode } from "@/constants/enums";
import { accountingAccountRepo } from "@/repositories/accounting_account.repo";
import { getAccountBookById } from "@/services/account_book.service";
import {
  IAccountingAccount,
  IAccountingAccountInput,
} from "@/interfaces/accounting_account";

/**
 * Info: (20260706 - Julian) 會計科目 Service
 */
export const accountingAccountService = {
  /**
   * Info: (20260706 - Julian) 取得帳本下所有會計科目 (整合標準與自訂)
   */
  async getAccountingAccounts(
    accountBookId: string,
    search?: string,
    type?: string,
  ): Promise<IAccountingAccount[]> {
    const accountBook = await getAccountBookById(accountBookId);

    if (!accountBook) {
      throw new Error("ACCOUNT_BOOK_NOT_FOUND");
    }

    // Info: (20260703 - Julian) 根據帳本國家取得標準科目
    const country = accountBook.country as CountryCode;
    const standardAccounts: IAccount[] = ACCOUNTS[country] || ACCOUNTS.TW;

    const formattedStandardAccounts: IAccountingAccount[] =
      standardAccounts.map((acc) => ({
        ...acc,
        isCustom: false,
      }));

    // Info: (20260703 - Julian) 取得資料庫中的自訂科目
    const customAccounts =
      await accountingAccountRepo.getCustomAccountsByAccountBookId(
        accountBookId,
      );

    // Info: (20260703 - Julian) 合併並排序
    const allAccounts: IAccountingAccount[] = [
      ...formattedStandardAccounts,
      ...customAccounts,
    ].sort((a, b) => a.code.localeCompare(b.code));

    let filteredAccounts = allAccounts;

    if (type && type !== "all") {
      filteredAccounts = filteredAccounts.filter((acc) => acc.type === type);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredAccounts = filteredAccounts.filter(
        (acc) =>
          acc.code.toLowerCase().includes(searchLower) ||
          acc.name.toLowerCase().includes(searchLower),
      );
    }

    return filteredAccounts;
  },

  /**
   * Info: (20260706 - Julian) 新增自訂會計科目
   */
  async createCustomAccount(
    accountBookId: string,
    userId: string,
    input: IAccountingAccountInput,
  ): Promise<string> {
    const accountBook = await getAccountBookById(accountBookId);

    if (!accountBook) {
      throw new Error("ACCOUNT_BOOK_NOT_FOUND");
    }

    // Info: (20260703 - Julian) 檢查 Code 是否重複
    const existing = await accountingAccountRepo.getCustomAccountByCode(
      accountBookId,
      input.code,
    );
    if (existing) {
      throw new Error("CODE_ALREADY_EXISTS");
    }

    // Info: (20260703 - Julian) 取得父層資訊 (先找標準科目，找不到再找自訂科目)
    const country = accountBook.country as CountryCode;
    const standardAccounts: IAccount[] = ACCOUNTS[country] || ACCOUNTS.TW;
    let parent = standardAccounts.find((acc) => acc.code === input.parentCode);

    if (!parent) {
      const customAccounts =
        await accountingAccountRepo.getCustomAccountsByAccountBookId(
          accountBookId,
        );
      parent = customAccounts.find((acc) => acc.code === input.parentCode);
    }

    if (!parent) {
      throw new Error("PARENT_ACCOUNT_NOT_FOUND");
    }

    // Info: (20260703 - Julian) 建立自訂科目，繼承父層屬性
    const newAccount = await accountingAccountRepo.createCustomAccount({
      code: input.code,
      name: input.name,
      description: input.description,
      parentCode: input.parentCode,
      level: parent.level + 1,
      type: parent.type,
      isDebit: parent.isDebit,
      accountBookId: accountBook.id,
      userId: userId,
    });

    return newAccount.newId;
  },

  /**
   * Info: (20260706 - Julian) 更新特定自訂會計科目
   */
  async updateCustomAccount(
    accountBookId: string,
    accountingAccountId: string,
    input: Partial<IAccountingAccountInput>,
  ): Promise<IAccountingAccount> {
    const accountBook = await getAccountBookById(accountBookId);

    if (!accountBook) {
      throw new Error("ACCOUNT_BOOK_NOT_FOUND");
    }

    // Info: (20260706 - Julian) 檢查科目是否存在且屬於該帳本
    const accounts =
      await accountingAccountRepo.getCustomAccountsByAccountBookId(
        accountBookId,
      );
    const target = accounts.find((acc) => acc.id === accountingAccountId);

    if (!target) {
      throw new Error("ACCOUNT_NOT_FOUND");
    }

    // Info: (20260706 - Julian) 如果要更新 Code，檢查是否衝突
    if (input.code && input.code !== target.code) {
      const existing = await accountingAccountRepo.getCustomAccountByCode(
        accountBookId,
        input.code,
      );
      if (existing) {
        throw new Error("CODE_ALREADY_EXISTS");
      }
    }

    const updated = await accountingAccountRepo.updateCustomAccount(
      accountingAccountId,
      {
        name: input.name,
        code: input.code,
        description: input.description,
      },
    );

    if (!updated) {
      throw new Error("UPDATE_FAILED");
    }

    return updated;
  },

  /**
   * Info: (20260706 - Julian) 刪除特定自訂會計科目
   */
  async deleteCustomAccount(
    accountBookId: string,
    accountingAccountId: string,
  ): Promise<void> {
    // Info: (20260706 - Julian) 檢查科目是否存在
    const accounts =
      await accountingAccountRepo.getCustomAccountsByAccountBookId(
        accountBookId,
      );
    const target = accounts.find((acc) => acc.id === accountingAccountId);

    if (!target) {
      throw new Error("ACCOUNT_NOT_FOUND");
    }

    // Info: (20260706 - Julian) 檢查是否被其他科目當成父層
    const hasChildren = accounts.some((acc) => acc.parentCode === target.code);
    if (hasChildren) {
      throw new Error("ACCOUNT_HAS_CHILDREN");
    }

    await accountingAccountRepo.deleteCustomAccount(accountingAccountId);
  },
};
