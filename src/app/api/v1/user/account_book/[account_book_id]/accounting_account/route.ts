import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { accountingAccountRepo } from "@/repositories/accounting_account.repo";
import { ACCOUNTS, IAccount } from "@/constants/accounts";
import {
  IAccountingAccount,
  IAccountingAccountInput,
} from "@/interfaces/accounting_account";
import { CountryCode } from "@/constants/enums";

/**
 * Info: (20260703 - Julian) 取得帳本下所有會計科目 (整合標準與自訂)
 * GET /api/v1/user/account_book/:account_book_id/accounting_account
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(API_ERRORS.NF_USER);
    }

    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
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

    // Info: (20260703 - Julian) 篩選邏輯 (如果有 search params)
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase();
    const type = searchParams.get("type");

    let filteredAccounts = allAccounts;

    if (type && type !== "all") {
      filteredAccounts = filteredAccounts.filter((acc) => acc.type === type);
    }

    if (search) {
      filteredAccounts = filteredAccounts.filter(
        (acc) =>
          acc.code.toLowerCase().includes(search) ||
          acc.name.toLowerCase().includes(search),
      );
    }

    return jsonOk({ items: filteredAccounts });
  } catch (error) {
    console.error("Error fetching accounting accounts:", error);
    return jsonFail(API_ERRORS.IN_FAILED_TO_FETCH_ACCOUNT);
  }
}

/**
 * Info: (20260703 - Julian) 新增自訂會計科目
 * POST /api/v1/user/account_book/:account_book_id/accounting_account
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(API_ERRORS.NF_USER);
    }

    const creator = await webAuthnRepo.findUserByAddress(sessionUser.address);
    if (!creator) {
      return jsonFail(API_ERRORS.NF_USER);
    }

    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }

    const body = await request.json();
    const { input }: { input: IAccountingAccountInput } = body;

    if (!input || !input.name || !input.code || !input.parentCode) {
      return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);
    }

    // Info: (20260703 - Julian) 檢查 Code 是否重複
    const existing = await accountingAccountRepo.getCustomAccountByCode(
      accountBookId,
      input.code,
    );
    if (existing) {
      return jsonFail(API_ERRORS.VA_CODE_ALREADY_EXISTS);
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
      return jsonFail(API_ERRORS.NF_PARENT_ACCOUNT);
    }

    // Info: (20260703 - Julian) 建立自訂科目，繼承父層屬性
    const newAccount = await accountingAccountRepo.createCustomAccount({
      code: input.code,
      name: input.name,
      parentCode: input.parentCode,
      level: parent.level + 1, // Info: (20260703 - Julian) 層級加一
      type: parent.type,
      isDebit: parent.isDebit,
      accountBookId: accountBook.id,
      userId: creator.id,
    });

    return jsonOk({ id: newAccount.newId });
  } catch (error) {
    console.error("Error creating accounting account:", error);
    return jsonFail(API_ERRORS.IN_FAILED_TO_CREATE_ACCOUNT);
  }
}
