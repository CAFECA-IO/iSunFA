import { NextRequest } from "next/server";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { acceptInviteByToken } from "@/services/team_invitation.service";
import { inviteTokenBodySchema } from "@/validators";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { RateLimitBucketEnum } from "@/constants/rate_limit";

/**
 * Info: (20260815 - Luphia) 接受 email 邀請（規範 §4 / P4）。
 *
 * 要登入——加入團隊得知道加的是誰；但**不要求 FIDO 簽章**：
 * 授權來自 token 本身（一次性、七天期限、雜湊存放），
 * 而剛註冊完的受邀者手上沒有任何與這個團隊相關的憑證可簽。
 * 多要一次簽章不會多出任何保證，只會多一個放棄的理由。
 *
 * Info: (20260818 - Luphia) token 改由 body 帶入（第三輪 D，理由見 `buildInviteUrl`）。
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    /**
     * Info: (20260818 - Luphia) 限流以 address 為維度（第三輪 D）：
     * 這支要登入，有身分就用身分——IP 是整間辦公室共用的。
     */
    const limited = enforceRateLimit(
      sessionUser.address,
      RateLimitBucketEnum.INVITE_TOKEN,
    );
    if (limited) return limited;

    const parsed = inviteTokenBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonFail(API_ERRORS.NO_INVITATION_NOT_FOUND_OR_NO);
    }

    const result = await acceptInviteByToken({
      token: parsed.data.token,
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
    console.error("[API] /invite/accept POST error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
