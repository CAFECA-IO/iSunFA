import { NextRequest } from "next/server";
import type { RegistrationJSON } from "@passwordless-id/webauthn/dist/esm/types";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { AppError } from "@/lib/utils/error";
import { webAuthnService } from "@/services/webauthn.service";
import { passkeyRegistrationSchema } from "@/validators";

/**
 * Info: (20261015 - Luphia) POST /api/v1/auth/register — Passkey 註冊（區塊鏈退役）。
 *
 * body：`{ registration, challengeToken, name }`，challengeToken 取自
 * `GET /api/v1/auth/options?action=register`。成功回傳新帳號的位址；
 * 不簽發 DeWT——前端接著走一般的 passkey 登入，登入那一步才證明持有私鑰。
 */
export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = passkeyRegistrationSchema.safeParse(body);
    if (!parsed.success) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    /**
     * Info: (20261015 - Luphia) schema 只驗外形，真偽由 verifyRegistration 判定；
     * 這裡的轉型只是把驗過外形的物件交給函式庫的型別。
     */
    const result = await webAuthnService.registerWithPasskey({
      registration: parsed.data.registration as unknown as RegistrationJSON,
      challengeToken: parsed.data.challengeToken,
      name: parsed.data.name,
    });

    return jsonOk(result);
  } catch (error) {
    console.error("[API] Passkey registration error:", error);
    // Info: (20261015 - Luphia) Service 拋出的都是已分類的 AppError（重複註冊、驗證失敗、token 過期）
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    // Info: (20261015 - Luphia) 其餘（DB 錯誤等）不把原始訊息送到前端
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
