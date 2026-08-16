import { NextRequest } from "next/server";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { acceptInviteByToken } from "@/services/team_invitation.service";

/**
 * Info: (20260815 - Luphia) 接受 email 邀請（規範 §4 / P4）。
 *
 * 要登入——加入團隊得知道加的是誰；但**不要求 FIDO 簽章**：
 * 授權來自 token 本身（一次性、七天期限、雜湊存放），
 * 而剛註冊完的受邀者手上沒有任何與這個團隊相關的憑證可簽。
 * 多要一次簽章不會多出任何保證，只會多一個放棄的理由。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const { token } = await params;
    const result = await acceptInviteByToken({
      token,
      userId: sessionUser.id,
      nowMs: Date.now(),
    });

    return jsonOk(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    console.error("[API] /invite/[token]/accept POST error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
