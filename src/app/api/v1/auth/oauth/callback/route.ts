import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { oauthCallbackSchema } from "@/validators";
import { oauthService } from "@/services/oauth.service";

/**
 * Info: (20260809 - Luphia) 以授權碼換取 DeWT。
 * POST /api/v1/auth/oauth/callback
 * body: { provider, code, state, stateToken }
 *
 * 刻意由前端 POST 交換而非後端直接 302 帶 token 回前端：
 * DeWT 不會出現在網址列、瀏覽器紀錄或 Referer 標頭中。
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = oauthCallbackSchema.safeParse(body);
    if (!parsed.success) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const result = await oauthService.completeLogin(parsed.data);
    return jsonOk(result);
  } catch (error) {
    console.error("[API] OAuth callback error:", error);
    // Info: (20260809 - Luphia) AppError 帶回其源自 API_ERRORS 的錯誤定義
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    return jsonFail(API_ERRORS.AUTH_LOGIN_FAILED);
  }
}
