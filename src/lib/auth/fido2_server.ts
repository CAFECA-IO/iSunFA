import { server } from "@passwordless-id/webauthn";
import type {
  RegistrationJSON,
  AuthenticationJSON,
  CredentialInfo,
} from "@passwordless-id/webauthn/dist/esm/types";
import { AppError } from "@/lib/utils/error";
import { ApiCode } from "@/lib/utils/status";

const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const allowedOrigins = [configuredOrigin];
if (!allowedOrigins.includes("http://localhost:3000")) allowedOrigins.push("http://localhost:3000");

/**
 * Info: (20251223 - Tzuhan)
 * 驗證註冊 (Registration)
 */
export async function verifyRegistration(
  registration: RegistrationJSON,
  expectedChallenge: string,
) {
  try {
    const result = await server.verifyRegistration(registration, {
      challenge: expectedChallenge,
      origin: (origin: string) => allowedOrigins.includes(origin),
    });
    return result;
  } catch (error) {
    console.error("Registration verification failed:", error);
    throw new AppError(ApiCode.VALIDATION_ERROR, "Invalid registration data: " + String(error));
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
    const result = await server.verifyAuthentication(
      authentication,
      credential,
      {
        challenge: expectedChallenge,
        origin: (origin: string) => allowedOrigins.includes(origin),
        userVerified: false,
      },
    );
    return result;
  } catch (error) {
    console.error("Authentication verification failed:", error);
    throw new AppError(ApiCode.UNAUTHORIZED, "Invalid signature or challenge: " + String(error));
  }
}
