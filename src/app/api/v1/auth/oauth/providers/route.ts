import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";
import { oauthService } from "@/services/oauth.service";

/**
 * Info: (20260809 - Luphia) 回傳目前部署環境已完成設定的第三方登入方式。
 * 前端據此決定要渲染哪些登入按鈕，未設定金鑰的 provider 不外露。
 * GET /api/v1/auth/oauth/providers
 */
export async function GET() {
  try {
    /**
     * Info: (20260810 - Luphia) 一併回傳 canonical origin。
     *
     * OAuth 流程必須從頭到尾待在同一個 origin：state token 存在 sessionStorage（依 origin 隔離），
     * 而 redirect_uri 又必須與 Google Console 註冊的網址完全相符。
     * 因此在非 canonical origin 上登入註定失敗——與其讓使用者按下去換到一個 400，
     * 不如把正確網址交給前端直接說明。NEXT_PUBLIC_APP_URL 本身就是公開值，不涉洩漏。
     */
    return jsonOk({
      providers: await oauthService.listProviders(),
      canonicalOrigin: oauthService.getCanonicalOrigin(),
    });
  } catch (error) {
    logger.error("[API] List OAuth providers error:", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
