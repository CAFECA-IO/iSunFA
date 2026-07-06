import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { accountingAccountService } from "@/services/accounting_account.service";
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

    const body = await request.json();
    const { input }: { input: Partial<IAccountingAccountInput> } = body;

    if (!input) {
      return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);
    }

    const updated = await accountingAccountService.updateCustomAccount(
      accountBookId,
      accountingAccountId,
      input,
    );

    return jsonOk(updated);
  } catch (error) {
    console.error("Error updating accounting account:", error);
    const message = (error as Error).message;
    if (message === "ACCOUNT_BOOK_NOT_FOUND") {
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }
    if (message === "ACCOUNT_NOT_FOUND") {
      return jsonFail(API_ERRORS.VA_ACCOUNT_NOT_FOUND);
    }
    if (message === "CODE_ALREADY_EXISTS") {
      return jsonFail(API_ERRORS.VA_CODE_ALREADY_EXISTS);
    }
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}

/**
 * Info: (20260706 - Julian) 刪除特定自訂會計科目
 * DELETE /api/v1/user/account_book/:account_book_id/accounting_account/:accounting_account_id
 */
export async function DELETE(
  _request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ account_book_id: string; accounting_account_id: string }>;
  },
) {
  try {
    const authHeader = _request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(API_ERRORS.NF_USER);
    }

    const {
      account_book_id: accountBookId,
      accounting_account_id: accountingAccountId,
    } = await params;

    await accountingAccountService.deleteCustomAccount(
      accountBookId,
      accountingAccountId,
    );

    return jsonOk({ success: true });
  } catch (error) {
    console.error("Error deleting accounting account:", error);
    const message = (error as Error).message;
    if (message === "ACCOUNT_NOT_FOUND") {
      return jsonFail(API_ERRORS.VA_ACCOUNT_NOT_FOUND);
    }
    if (message === "ACCOUNT_HAS_CHILDREN") {
      return jsonFail(API_ERRORS.VA_ACCOUNT_HAS_CHILDREN);
    }
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
