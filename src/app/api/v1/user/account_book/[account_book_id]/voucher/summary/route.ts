import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { voucherRepo } from "@/repositories/voucher.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";

/**
 * Info: (20260316 - Julian) 取得傳票儀表板摘要
 * GET /api/v1/user/account_book/:account_book_id/voucher/summary
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    // Info: (20260304 - Julian) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    // Info: (20260316 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookByIdAndUserAddress(
      accountBookId,
      sessionUser.address,
    );

    if (!accountBook) {
      return jsonFail(API_ERRORS.NO_ACCOUNTBOOK_NOT_FOUND_OR_NO);
    }

    const summary = await voucherRepo.getVoucherSummary(accountBookId);

    return jsonOk(summary);
  } catch (error) {
    console.error("Error fetching Voucher summary:", error);
    return jsonFail(API_ERRORS.IN_FAILED_TO_FETCH_VOUCHER_SUM);
  }
}
