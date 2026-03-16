import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { prisma } from "@/lib/prisma";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { IVoucherDashboardSummary } from "@/interfaces/voucher";

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
      return jsonFail(ApiCode.UNAUTHORIZED, "Unauthorized");
    }

    // Info: (20260316 - Julian) 取得帳簿
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
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Info: (20260316 - Julian) 取得今日傳票數量
    const todayVoucherCount = await prisma.voucher.count({
      where: { accountBookId, tradingDate: { gte: startOfToday } },
    });

    // Info: (20260316 - Julian) 取得本月傳票總額 (依據借方分錄加總)
    const monthTotalAmountAggr = await prisma.voucherLine.aggregate({
      where: {
        isDebit: true,
        voucher: {
          accountBookId,
          tradingDate: { gte: startOfMonth },
        },
      },
      _sum: { amount: true },
    });
    const monthTotalAmount = monthTotalAmountAggr._sum.amount || 0;

    // Info: (20260316 - Julian) 取得待處理傳票數量
    const pendingVoucherCount = await prisma.voucher.count({
      where: { accountBookId, status: "MANUAL" },
    });

    // Info: (20260316 - Julian) 取得 AI 平均信心指數
    const aiAverageConfidenceAggr = await prisma.voucher.aggregate({
      where: { accountBookId },
      _avg: { confidence: true },
    });
    const aiAverageConfidence = Math.round(aiAverageConfidenceAggr._avg.confidence || 0);

    // Info: (20260316 - Julian) 組合 response
    const dashboardSummary: IVoucherDashboardSummary = {
      todayVoucherCount,
      monthTotalAmount,
      pendingVoucherCount,
      aiAverageConfidence,
    };

    return jsonOk(dashboardSummary);
  } catch (error) {
    console.error("Error fetching ESG summary:", error);
    return jsonFail(
      ApiCode.INTERNAL_SERVER_ERROR,
      "Failed to fetch ESG summary",
    );
  }
}
