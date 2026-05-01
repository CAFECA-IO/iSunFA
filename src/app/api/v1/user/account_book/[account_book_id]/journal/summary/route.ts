import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { journalRepo } from "@/repositories/journal.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { IJournalDashboardSummary } from "@/interfaces/journal";

/**
 * Info: (20260324 - Julian) 取得日記帳儀表板摘要
 * GET /api/v1/user/account_book/:account_book_id/journal/summary
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

    // Info: (20260324 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookByIdAndUserAddress(
      accountBookId,
      sessionUser.address,
    );

    if (!accountBook) {
      return jsonFail({
        code: "NO000099",
        message: "Accountbook not found or no...",
        status: ApiCode.NOT_FOUND,
      });
    }

    const { todayJournalCount, pendingJournalCount, aiAverageConfidence } =
      await journalRepo.getJournalSummary(accountBookId);

    // Info: (20260324 - Julian) 組合 response
    const dashboardSummary: IJournalDashboardSummary = {
      todayJournalCount,
      pendingJournalCount,
      aiAverageConfidence,
    };

    return jsonOk(dashboardSummary);
  } catch (error) {
    console.error("Error fetching Journal summary:", error);
    return jsonFail({
      code: "IN000099",
      message: "Failed to fetch Journal sum...",
      status: ApiCode.INTERNAL_SERVER_ERROR,
    });
  }
}
