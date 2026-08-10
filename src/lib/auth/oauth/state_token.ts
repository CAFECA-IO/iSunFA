import { SignJWT, jwtVerify } from "jose";
import { logger } from "@/lib/utils/logger";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { OAUTH_STATE_TTL, isAuthProvider } from "@/constants/auth_provider";
import { IOAuthStatePayload } from "@/interfaces/oauth";

/**
 * Info: (20260809 - Luphia) 沿用 challenge_token 的無狀態設計：
 * 不進 DB、不開 session store，用 HS256 簽一個短效 token 綁住整段授權流程。
 * 前端把它放在 sessionStorage，callback 時原封帶回來與 provider 回傳的 state 交叉比對，
 * 兩者不符即視為 CSRF 攻擊。
 */
const SECRET = new TextEncoder().encode(
  process.env.DEWT_PRIVATE_KEY_PEM || "temporary_secret",
);

const STATE_TOKEN_TYPE = "oauth_state";

export async function signStateToken(
  payload: IOAuthStatePayload,
): Promise<string> {
  return new SignJWT({ ...payload, typ: STATE_TOKEN_TYPE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(OAUTH_STATE_TTL)
    .sign(SECRET);
}

export async function verifyStateToken(
  token: string,
): Promise<IOAuthStatePayload> {
  try {
    const { payload } = await jwtVerify(token, SECRET);

    if (payload.typ !== STATE_TOKEN_TYPE) {
      throw new Error("Unexpected token type");
    }

    const { provider, state, codeVerifier, redirectUri, returnTo } = payload;

    if (
      !isAuthProvider(provider) ||
      typeof state !== "string" ||
      typeof codeVerifier !== "string" ||
      typeof redirectUri !== "string"
    ) {
      throw new Error("Malformed state token payload");
    }

    return {
      provider,
      state,
      codeVerifier,
      redirectUri,
      returnTo: typeof returnTo === "string" ? returnTo : undefined,
    };
  } catch (error) {
    logger.error("OAuth state token verification failed:", {
      message: (error as Error).message,
    });
    throw new AppError(API_ERRORS.AUTH_OAUTH_STATE_INVALID);
  }
}
