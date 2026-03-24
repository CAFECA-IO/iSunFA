import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { prisma } from "@/lib/prisma";
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
      return jsonFail(ApiCode.UNAUTHORIZED, "Unauthorized");
    }

    // Info: (20260324 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await prisma.accountBook.findUnique({
      where: {
        id: accountBookId,
        team: {
          teamMembers: { some: { user: { address: sessionUser.address } } },
        },
      },
    });

    if (!accountBook) {
      return jsonFail(
        ApiCode.NOT_FOUND,
        "Accountbook not found or no permission",
      );
    }

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    // Info: (20260324 - Julian) 取得今日日記帳數量
    const todayJournalCount = await prisma.journal.count({
      where: { accountBookId, tradingDate: { gte: startOfToday } },
    });

    // Info: (20260324 - Julian) 取得待處理日記帳數量
    const pendingJournalCount = await prisma.journal.count({
      where: { accountBookId, isVerified: false },
    });

    // Info: (20260324 - Julian) 取得 AI 平均信心指數
    const aiAverageConfidenceAggr = await prisma.journal.aggregate({
      where: { accountBookId },
      _avg: { confidence: true },
    });
    const aiAverageConfidence = Math.round(
      aiAverageConfidenceAggr._avg.confidence || 0,
    );

    // Info: (20260324 - Julian) 組合 response
    const dashboardSummary: IJournalDashboardSummary = {
      todayJournalCount,
      pendingJournalCount,
      aiAverageConfidence,
    };

    return jsonOk(dashboardSummary);
  } catch (error) {
    console.error("Error fetching Journal summary:", error);
    return jsonFail(
      ApiCode.INTERNAL_SERVER_ERROR,
      "Failed to fetch Journal summary",
    );
  }
}
