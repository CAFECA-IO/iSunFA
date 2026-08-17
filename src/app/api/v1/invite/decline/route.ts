import { NextRequest } from "next/server";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { declineInviteByToken } from "@/services/team_invitation.service";
import { inviteTokenBodySchema } from "@/validators";
import { enforceInviteRateLimit } from "@/lib/team/invite_rate_limit";
import { resolveClientIp } from "@/lib/utils/client_ip";

/**
 * Info: (20260816 - Luphia) 拒絕 email 邀請（條款 §3.6）。
 *
 * **不需要登入**（與同層的 accept 不同）：加入團隊必須知道加的是誰，拒絕不需要，
 * 而受邀者多半還沒有帳號。要求他先註冊才能說「不用了」等於沒有人會用，
 * 那一席就佔到逾期為止——而條款寫的是「經拒絕即行釋出」。理由詳見 service。
 *
 * 用 POST 而非 GET：郵件安全掃描器會替使用者造訪信裡的每一條連結，
 * 掛在 GET 上的拒絕會在收件者看到信之前就把邀請作廢。
 *
 * Info: (20260818 - Luphia) token 改由 body 帶入（第三輪 D，理由見 `buildInviteUrl`）。
 */
export async function POST(request: NextRequest) {
  try {
    /**
     * Info: (20260818 - Luphia) 這是三支裡最需要節流的一支（第三輪 D）：
     * 不要求登入，而一次成功的呼叫就讓一封邀請作廢、席次當場釋出。
     * 拿到一批轉寄出去的連結可以無成本地一封封拒掉。
     */
    const limited = enforceInviteRateLimit(request);
    if (limited) return limited;

    const parsed = inviteTokenBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonFail(API_ERRORS.NO_INVITATION_NOT_FOUND_OR_NO);
    }

    const result = await declineInviteByToken(parsed.data.token, Date.now(), {
      ip: resolveClientIp(request),
      userAgent: request.headers.get("user-agent"),
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
    console.error("[API] /invite/decline POST error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
