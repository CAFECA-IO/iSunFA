import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import {
  getAccountBooksByUserId,
  updateAccountBook,
} from "@/services/account_book.service";
import { UpdateAccountBookSchema } from "@/validators";

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
      return jsonFail(API_ERRORS.FO_ONLY_THE_OWNER_CAN_EDIT_THE);
    }

    const body = await request.json();
    const parseResult = UpdateAccountBookSchema.safeParse(body);

    if (!parseResult.success) {
      return jsonFail({
        ...API_ERRORS.VL_SCHEMA_ERROR,
        message: `Validation Error: ${parseResult.error.issues[0].message} (${parseResult.error.issues[0].path.join(".")})`,
      });
    }

    const {
      name,
      country,
      currency,
      rule,
      enterpriseId,
      startYear,
      esgIndustryId,
      parValue,
    } = parseResult.data;

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
      parValue,
      createdAt,
    });

    return jsonOk(updatedAccountBook);
  } catch (error) {
    console.error("[API] /account_book PUT error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
