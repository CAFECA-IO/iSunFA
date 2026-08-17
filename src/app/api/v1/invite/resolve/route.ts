import { NextRequest } from "next/server";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { resolveInviteByToken } from "@/services/team_invitation.service";
import { inviteTokenBodySchema } from "@/validators";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { resolveClientIp } from "@/lib/utils/client_ip";

/**
 * Info: (20260815 - Luphia) 邀請連結的公開查詢（規範 §4 / P4）。
 *
 * **不需要登入**：受邀者多半還沒有帳號，而畫面得先說得出「是哪個團隊邀請你」，
 * 對方才知道值不值得為此註冊。
 *
 * 回應刻意只有團隊名稱與角色。受邀者的信箱不回——拿到連結的人不一定是收件者
 * （信可能被轉寄），沒有理由讓連結本身洩漏第三人的信箱。
 *
 * 失效、逾期、已接受一律回同一個 404：分開回應等於告訴掃描者
 * 「這個 token 曾經存在」，而那是猜測 token 時唯一有價值的回饋。
 *
 * Info: (20260818 - Luphia) 用 **POST 帶 body** 而非 GET 帶 path（第三輪 D）。
 *
 * 這是一次讀取，語意上該是 GET；但把一把有效七天的鑰匙放在 URL 上，
 * 它就會進 access log、瀏覽器歷史與 `Referer`（理由詳見 `buildInviteUrl`）。
 * 在「語意正確」與「秘密不落地」之間選後者，並在此註明原因，
 * 以免下一個人看到 POST 卻沒有副作用就順手改回 GET。
 */
export async function POST(request: NextRequest) {
  try {
    const limited = enforceRateLimit(
      resolveClientIp(request),
      RateLimitBucketEnum.INVITE_TOKEN,
    );
    if (limited) return limited;

    const parsed = inviteTokenBodySchema.safeParse(await request.json());
    // Info: (20260818 - Luphia) 格式不合的 token 與不存在的 token 回同一個錯，不給線索
    if (!parsed.success) {
      return jsonFail(API_ERRORS.NO_INVITATION_NOT_FOUND_OR_NO);
    }

    const invite = await resolveInviteByToken(parsed.data.token, Date.now());
    if (!invite) return jsonFail(API_ERRORS.NO_INVITATION_NOT_FOUND_OR_NO);

    return jsonOk({
      teamId: invite.teamId,
      teamName: invite.teamName,
      role: invite.role,
      expiresAt: invite.expiresAt,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    console.error("[API] /invite/resolve POST error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
