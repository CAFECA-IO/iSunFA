import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { accountingAccountService } from "@/services/accounting_account.service";
import { IAccountingAccountInput } from "@/interfaces/accounting_account";

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
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const type = searchParams.get("type") || undefined;

    const items = await accountingAccountService.getAccountingAccounts(
      accountBookId,
      search,
      type,
    );

    return jsonOk({ items });
  } catch (error) {
    console.error("Error fetching accounting accounts:", error);
    if ((error as Error).message === "ACCOUNT_BOOK_NOT_FOUND") {
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }
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
    const body = await request.json();
    const { input }: { input: IAccountingAccountInput } = body;

    if (!input || !input.name || !input.code || !input.parentCode) {
      return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);
    }

    const newId = await accountingAccountService.createCustomAccount(
      accountBookId,
      creator.id,
      input,
    );

    return jsonOk({ id: newId });
  } catch (error) {
    console.error("Error creating accounting account:", error);
    const message = (error as Error).message;
    if (message === "ACCOUNT_BOOK_NOT_FOUND") {
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }
    if (message === "CODE_ALREADY_EXISTS") {
      return jsonFail(API_ERRORS.VA_CODE_ALREADY_EXISTS);
    }
    if (message === "PARENT_ACCOUNT_NOT_FOUND") {
      return jsonFail(API_ERRORS.NF_PARENT_ACCOUNT);
    }
    return jsonFail(API_ERRORS.IN_FAILED_TO_CREATE_ACCOUNT);
  }
}
