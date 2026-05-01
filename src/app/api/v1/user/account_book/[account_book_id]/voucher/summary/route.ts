import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { voucherRepo } from "@/repositories/voucher.repo";
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
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    // Info: (20260316 - Julian) 取得帳簿
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

    const {
      todayVoucherCount,
      monthTotalAmount,
      pendingVoucherCount,
      aiAverageConfidence,
    } = await voucherRepo.getVoucherSummary(accountBookId);

    // Info: (20260316 - Julian) 組合 response
    const dashboardSummary: IVoucherDashboardSummary = {
      todayVoucherCount,
      monthTotalAmount,
      pendingVoucherCount,
      aiAverageConfidence,
    };

    return jsonOk(dashboardSummary);
  } catch (error) {
    console.error("Error fetching Voucher summary:", error);
    return jsonFail({
      code: "IN000099",
      message: "Failed to fetch Voucher sum...",
      status: ApiCode.INTERNAL_SERVER_ERROR,
    });
  }
}
