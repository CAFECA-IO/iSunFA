import { NextRequest } from "next/server";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { declineInviteByToken } from "@/services/team_invitation.service";

/**
 * Info: (20260816 - Luphia) 拒絕 email 邀請（條款 §3.6）。
 *
 * **不需要登入**（與同層的 accept 不同）：加入團隊必須知道加的是誰，拒絕不需要，
 * 而受邀者多半還沒有帳號。要求他先註冊才能說「不用了」等於沒有人會用，
 * 那一席就佔到逾期為止——而條款寫的是「經拒絕即行釋出」。理由詳見 service。
 *
 * 用 POST 而非 GET：郵件安全掃描器會替使用者造訪信裡的每一條連結，
 * 掛在 GET 上的拒絕會在收件者看到信之前就把邀請作廢。
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const result = await declineInviteByToken(token, Date.now());
    return jsonOk(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    console.error("[API] /invite/[token]/decline POST error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
