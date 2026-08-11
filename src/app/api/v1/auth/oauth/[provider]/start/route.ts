import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";
import { AppError } from "@/lib/utils/error";
import { authProviderSchema, oauthStartSchema } from "@/validators";
import { AuthProvider } from "@/constants/auth_provider";
import { oauthService } from "@/services/oauth.service";

/**
 * Info: (20260809 - Luphia) 發起第三方授權。
 * POST /api/v1/auth/oauth/google/start
 * body: { redirectUri, returnTo? }
 * 回傳 { authorizationUrl, stateToken }；前端保管 stateToken 後導向 authorizationUrl。
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider } = await context.params;
    const parsedProvider = authProviderSchema.safeParse(provider);
    if (!parsedProvider.success) {
      return jsonFail(API_ERRORS.AUTH_PROVIDER_UNSUPPORTED);
    }

    const body = await request.json();
    const parsedBody = oauthStartSchema.safeParse(body);
    if (!parsedBody.success) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const result = await oauthService.startAuthorization(
      parsedProvider.data as AuthProvider,
      parsedBody.data,
    );

    return jsonOk(result);
  } catch (error) {
    logger.error("[API] OAuth start error:", {
      message: (error as Error).message,
    });
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
