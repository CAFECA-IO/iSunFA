import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { accountingAccountRepo } from "@/repositories/accounting_account.repo";
import { IAccountingAccountInput } from "@/interfaces/accounting_account";

/**
 * Info: (20260706 - Julian) 更新特定自訂會計科目
 * PATCH /api/v1/user/account_book/:account_book_id/accounting_account/:accounting_account_id
 */
export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ account_book_id: string; accounting_account_id: string }>;
  },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(API_ERRORS.NF_USER);
    }

    const {
      account_book_id: accountBookId,
      accounting_account_id: accountingAccountId,
    } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }

    const body = await request.json();
    const { input }: { input: Partial<IAccountingAccountInput> } = body;

    if (!input) {
      return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);
    }

    // Info: (20260706 - Julian) 檢查科目是否存在且屬於該帳本
    const accounts =
      await accountingAccountRepo.getCustomAccountsByAccountBookId(
        accountBookId,
      );
    const target = accounts.find((acc) => acc.id === accountingAccountId);

    if (!target) {
      return jsonFail(API_ERRORS.VA_ACCOUNT_NOT_FOUND);
    }

    // Info: (20260706 - Julian) 如果要更新 Code，檢查是否衝突
    if (input.code && input.code !== target.code) {
      const existing = await accountingAccountRepo.getCustomAccountByCode(
        accountBookId,
        input.code,
      );
      if (existing) {
        return jsonFail(API_ERRORS.VA_CODE_ALREADY_EXISTS);
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

    return jsonOk(updated);
  } catch (error) {
    console.error("Error updating accounting account:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}

/**
 * Info: (20260706 - Julian) 刪除特定自訂會計科目
 * DELETE /api/v1/user/account_book/:account_book_id/accounting_account/:accounting_account_id
 */
export async function DELETE(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ account_book_id: string; accounting_account_id: string }>;
  },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(API_ERRORS.NF_USER);
    }

    const {
      account_book_id: accountBookId,
      accounting_account_id: accountingAccountId,
    } = await params;

    // Info: (20260706 - Julian) 檢查科目是否存在
    const accounts =
      await accountingAccountRepo.getCustomAccountsByAccountBookId(
        accountBookId,
      );
    const target = accounts.find((acc) => acc.id === accountingAccountId);

    if (!target) {
      return jsonFail(API_ERRORS.VA_ACCOUNT_NOT_FOUND);
    }

    // Info: (20260706 - Julian) 檢查是否被其他科目當成父層
    const hasChildren = accounts.some((acc) => acc.parentCode === target.code);
    if (hasChildren) {
      return jsonFail(API_ERRORS.VA_ACCOUNT_HAS_CHILDREN);
    }

    await accountingAccountRepo.deleteCustomAccount(accountingAccountId);
    return jsonOk({ success: true });
  } catch (error) {
    console.error("Error deleting accounting account:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
