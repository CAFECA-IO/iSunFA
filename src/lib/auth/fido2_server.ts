import crypto from "crypto";
import { server } from "@passwordless-id/webauthn";
import type {
  RegistrationJSON,
  AuthenticationJSON,
  CredentialInfo,
} from "@passwordless-id/webauthn/dist/esm/types";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";

// Info: (20260416 - Luphia) 設定與共用工具 (Configuration & Utils)

const configuredOrigin =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
// Info: (20260416 - Luphia) 確保 Origin 唯一性並包含 localhost 開發環境與正式網址
const allowedOrigins = Array.from(
  new Set([
    configuredOrigin,
    "http://localhost:3000",
    "https://isunfa.localhost",
    "https://isunfa.tw",
    "https://isunfa.com",
  ]),
);
const isAllowedOrigin = (origin: string) => allowedOrigins.includes(origin);

// Info: (20260416 - Luphia) WebAuthn 核心驗證 (Core Verification)

/**
 * Info: (20251223 - Tzuhan)
 * 驗證註冊 (Registration)
 */
export async function verifyRegistration(
  registration: RegistrationJSON,
  expectedChallenge: string,
) {
  try {
    return await server.verifyRegistration(registration, {
      challenge: expectedChallenge,
      origin: isAllowedOrigin,
    });
  } catch (error) {
    console.error("Registration verification failed:", error);
    throw new AppError(API_ERRORS.VL_MISSING_FIDO2);
  }
}

/**
 * Info: (20251223 - Tzuhan)
 * 驗證登入 (Authentication)
 */
export async function verifyAuthentication(
  authentication: AuthenticationJSON,
  credential: CredentialInfo,
  expectedChallenge: string,
) {
  try {
    // Info: (20260416 - Luphia) 優先使用 Library 原生驗證
    return await server.verifyAuthentication(authentication, credential, {
      challenge: expectedChallenge,
      origin: isAllowedOrigin,
      userVerified: false,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Info: (20260416 - Luphia) 修正非完美 32-byte R/S ASN.1 DER 簽章的硬體 Bug (發生率 ~0.8%)
    if (errorMessage.includes("Invalid signature")) {
      try {
        return verifySignatureNativeFallback(
          authentication,
          credential,
          expectedChallenge,
        );
      } catch (fallbackError) {
        console.error("Native fallback verification failed:", fallbackError);
        throw new AppError(API_ERRORS.AUTH_INVALID_TOKEN);
      }
    }

    // Info: (20260416 - Luphia) 非簽章問題的其他錯誤，直接拋出
    console.error("Authentication verification failed:", error);
    throw new AppError(API_ERRORS.AUTH_INVALID_TOKEN);
  }
}

// Info: (20260416 - Luphia) 內部輔助函式 (Internal Helpers)

/**
 * Info: (20260416 - Luphia) 原生 Node.js Crypto DER 驗證 (Fallback)
 * 解決 @passwordless-id/webauthn 簽章長度不足截斷的例外狀況
 */
function verifySignatureNativeFallback(
  authentication: AuthenticationJSON,
  credential: CredentialInfo,
  expectedChallenge: string,
) {
  console.warn(
    "Library verifyAuthentication failed signature. Falling back to native crypto DER verification.",
  );

  const { clientDataJSON, authenticatorData, signature } =
    authentication.response;

  // Info: (20260416 - Luphia) 驗證 Challenge 與 Origin
  const clientDataRaw = Buffer.from(clientDataJSON, "base64url").toString(
    "utf-8",
  );
  const clientDataParsed = JSON.parse(clientDataRaw);

  if (clientDataParsed.challenge !== expectedChallenge) {
    throw new Error(
      `Unexpected ClientData challenge: ${clientDataParsed.challenge}`,
    );
  }
  if (!isAllowedOrigin(clientDataParsed.origin)) {
    throw new Error(`Unexpected ClientData origin: ${clientDataParsed.origin}`);
  }

  // Info: (20260416 - Luphia) 組合 Combo Buffer (authenticatorData + sha256(clientDataJSON))
  const clientHash = crypto
    .createHash("sha256")
    .update(Buffer.from(clientDataJSON, "base64url"))
    .digest();

  const comboBuffer = Buffer.concat([
    Buffer.from(authenticatorData, "base64url"),
    clientHash,
  ]);

  // Info: (20260416 - Luphia) 準備 PEM 格式的 Public Key
  const pubKeyBase64 = Buffer.from(credential.publicKey, "base64url").toString(
    "base64",
  );
  const pubKeyPEM = `-----BEGIN PUBLIC KEY-----\n${pubKeyBase64.match(/.{1,64}/g)?.join("\n")}\n-----END PUBLIC KEY-----`;

  // Info: (20260416 - Luphia) 執行原生驗證
  const isValid = crypto
    .createVerify("SHA256")
    .update(comboBuffer)
    .verify(pubKeyPEM, Buffer.from(signature, "base64url"));

  if (!isValid) {
    throw new Error("Invalid native signature: " + signature);
  }

  return { fallbackUsed: true };
}
