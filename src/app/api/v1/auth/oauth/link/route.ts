import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";
import { AppError } from "@/lib/utils/error";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { oauthLinkSchema, oauthUnlinkSchema } from "@/validators";
import { AuthProvider } from "@/constants/auth_provider";
import { oauthService } from "@/services/oauth.service";

// Info: (20260809 - Luphia) AppError 帶回其源自 API_ERRORS 的錯誤定義
function failFrom(error: unknown) {
  if (error instanceof AppError) {
    return jsonFail({
      code: error.apiCode,
      message: error.message,
      status: error.code,
    });
  }
  return jsonFail(API_ERRORS.IS_UNKNOWN);
}

/**
 * Info: (20260809 - Luphia) 列出目前帳號已綁定的第三方登入方式。
 * GET /api/v1/auth/oauth/link
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getIdentityFromDeWT(
      request.headers.get("Authorization"),
    );
    if (!user) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    return jsonOk({ identities: await oauthService.listIdentities(user.id) });
  } catch (error) {
    logger.error("[API] List identities error:", {
      message: (error as Error).message,
    });
    return failFrom(error);
  }
}

/**
 * Info: (20260809 - Luphia) 將第三方帳號綁定到目前已登入的帳號。
 * 既有 passkey 使用者要多一種登入方式，只能走這條路——
 * 系統不會用 email 自動合併帳號。
 * POST /api/v1/auth/oauth/link
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getIdentityFromDeWT(
      request.headers.get("Authorization"),
    );
    if (!user) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const body = await request.json();
    const parsed = oauthLinkSchema.safeParse(body);
    if (!parsed.success) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    return jsonOk(await oauthService.linkIdentity(user.id, parsed.data));
  } catch (error) {
    logger.error("[API] Link identity error:", {
      message: (error as Error).message,
    });
    return failFrom(error);
  }
}

/**
 * Info: (20260809 - Luphia) 解除綁定。
 * DELETE /api/v1/auth/oauth/link
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getIdentityFromDeWT(
      request.headers.get("Authorization"),
    );
    if (!user) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const body = await request.json();
    const parsed = oauthUnlinkSchema.safeParse(body);
    if (!parsed.success) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    await oauthService.unlinkIdentity(
      user.id,
      parsed.data.provider as AuthProvider,
    );
    return jsonOk({ provider: parsed.data.provider });
  } catch (error) {
    logger.error("[API] Unlink identity error:", {
      message: (error as Error).message,
    });
    return failFrom(error);
  }
}
