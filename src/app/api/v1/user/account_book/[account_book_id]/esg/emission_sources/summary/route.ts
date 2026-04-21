import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { esgRepo } from "@/repositories/esg.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";

/**
 * Info: (20260420 - Julian) 取得排放源之摘要
 * GET /api/v1/user/account_book/:account_book_id/esg/emission_sources/summary
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
      console.error("User not found");
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    // Info: (20260312 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    // Info: (20260421 - Julian) 取得排放源之摘要
    const result = await esgRepo.getEsgEmissionSourcesSummary(accountBookId);

    return jsonOk(result);
  } catch (error) {
    console.error("Error fetching emission sources summary:", error);
    return jsonFail(
      ApiCode.INTERNAL_SERVER_ERROR,
      "Failed to fetch emission sources summary",
    );
  }
}
