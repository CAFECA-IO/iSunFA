import { NextRequest } from "next/server";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { resolveInviteByToken } from "@/services/team_invitation.service";

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
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const invite = await resolveInviteByToken(token, Date.now());
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
    console.error("[API] /invite/[token] GET error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
