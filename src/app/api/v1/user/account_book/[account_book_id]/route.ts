import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import {
  getAccountBooksByUserId,
  updateAccountBook,
} from "@/services/account_book.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    // Info: (20260308 - Luphia) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    const { account_book_id: accountBookId } = await params;

    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const accountBooks = await getAccountBooksByUserId(sessionUser.id);
    const accountBook = accountBooks.find((ab) => ab.id === accountBookId);
    if (!accountBook) {
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }

    return jsonOk(accountBook);
  } catch (error) {
    console.error("[API] /account_book GET error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    const { account_book_id: accountBookId } = await params;

    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const accountBooks = await getAccountBooksByUserId(sessionUser.id);
    const accountBook = accountBooks.find((ab) => ab.id === accountBookId);
    if (!accountBook) {
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }

    if (accountBook.userRole !== "OWNER") {
      return jsonFail({
        code: "FO000099",
        message: "Only the owner can edit the...",
        status: ApiCode.FORBIDDEN,
      });
    }

    const body = await request.json();
    const {
      name,
      country,
      currency,
      rule,
      enterpriseId,
      startYear,
      esgIndustryId,
    } = body;

    const createdAt = startYear
      ? new Date(`${startYear}-01-01T00:00:00.000Z`)
      : undefined;

    const updatedAccountBook = await updateAccountBook(accountBookId, {
      name,
      country,
      currency,
      rule,
      enterpriseId,
      esgIndustryId,
      createdAt,
    });

    return jsonOk(updatedAccountBook);
  } catch (error) {
    console.error("[API] /account_book PUT error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
