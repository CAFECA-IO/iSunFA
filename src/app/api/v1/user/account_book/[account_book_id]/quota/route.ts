import { NextRequest } from "next/server";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { getAccountBookQuotaView } from "@/services/team_subscription.service";

/**
 * Info: (20260813 - Luphia) GET /api/v1/user/account_book/[account_book_id]/quota。
 *
 * 費思在帳本情境內運作（設計書 §5.3「使用前提」），畫面上只有 accountBookId；
 * 而額度掛在團隊上。與其讓前端先查團隊再查訂閱（兩趟往返、且等於把
 * 「哪個團隊付錢」的推導交回 client），不如由 server 以帳本推導後直接回額度。
 *
 * route 為純端口：認證 → 呼叫 service → 回應映射；授權（帳本存在且為所屬團隊成員）
 * 由 service 沿用既有的 assertAccountBookMember 收斂點。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    const user = await getIdentityFromDeWT(
      request.headers.get("Authorization"),
    );
    if (!user) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const { account_book_id: accountBookId } = await params;
    const view = await getAccountBookQuotaView({
      userId: user.id,
      accountBookId,
      nowSec: Math.floor(Date.now() / 1000),
    });
    return jsonOk(view);
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    console.error("[API] /account_book/[id]/quota error:", error);
    return jsonFail(API_ERRORS.TW_OPERATION_FAILED);
  }
}
