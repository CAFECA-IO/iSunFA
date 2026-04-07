import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { voucherRepo } from "@/repositories/voucher.repo";

/**
 * Info: (20260331 - Julian) 取得帳本中「已核對的傳票數目」
 * GET /api/v1/user/account_book/:account_book_id/report/verify_voucher
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

    // Info: (20260309 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    const countOfVerifiedVouchers = await voucherRepo.countVouchers({
      accountBookId,
      isVerified: true,
    });

    return jsonOk({ count: countOfVerifiedVouchers });
  } catch (error) {
    console.error("Get count of verified vouchers failed", error);
    return jsonFail(
      ApiCode.INTERNAL_SERVER_ERROR,
      "Get count of verified vouchers failed",
    );
  }
}
