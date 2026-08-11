import { SignJWT, jwtVerify } from "jose";
import { randomBytes } from "crypto";
import { logger } from "@/lib/utils/logger";
import { getTokenSecret, TokenSecretPurpose } from "@/lib/auth/token_secret";
import {
  ChallengePurpose,
  isChallengePurpose,
} from "@/constants/challenge_purpose";

/**
 * Info: (20260811 - Luphia) 金鑰改為每次呼叫時派生（見 token_secret.ts）。
 * 原本是模組載入時求值並帶有 "temporary_secret" fallback——缺 env 的環境會用一把
 * 寫在原始碼裡的公開字串簽發資金相關的 challenge。
 */
function secret(): Uint8Array {
  return getTokenSecret(TokenSecretPurpose.CHALLENGE);
}

export interface IChallengeToken {
  challenge: string;
  token: string;
}

/**
 * Info: (20260811 - Luphia) 簽發一枚短效 challenge token，並在裡面承諾用途與對象。
 *
 * purpose 與 sub 是後補的：原本的 payload 只有 challenge，任何一枚 token 都能拿去
 * 授權任何操作，也能拿去授權別人的操作。sub 只有 LOGIN 用途可以留空——
 * 那個當下還沒有使用者身分可綁。
 */
export async function generateChallengeToken(
  purpose: ChallengePurpose = ChallengePurpose.LOGIN,
  sub?: string,
): Promise<IChallengeToken> {
  const challenge = randomBytes(32).toString("base64url");

  if (purpose !== ChallengePurpose.LOGIN && !sub) {
    throw new Error(`Challenge purpose ${purpose} requires a subject`);
  }

  // Info: (20260105 - Tzuhan) 簽發一個短效期的 JWT，裡面包含 challenge
  const token = await new SignJWT({ challenge, purpose, sub })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m") // Info: (20260105 - Tzuhan) 5分鐘有效
    .sign(secret());

  return { challenge, token };
}

/**
 * Info: (20260811 - Luphia) 驗證 token 並確認它就是為「這個用途、這個人」發的。
 *
 * expectedPurpose 是必填的：讓每個驗證點都必須說出自己預期什麼，
 * 而不是沿用「有簽章就好」——那正是 token 可以跨用途挪用的原因。
 */
export async function verifyChallengeToken(
  token: string,
  expectedPurpose: ChallengePurpose,
  expectedSub?: string,
): Promise<string> {
  try {
    const { payload } = await jwtVerify(token, secret());

    const purpose = payload.purpose;
    if (!isChallengePurpose(purpose) || purpose !== expectedPurpose) {
      throw new Error(
        `Challenge purpose mismatch: expected ${expectedPurpose}, got ${String(purpose)}`,
      );
    }

    /**
     * Info: (20260811 - Luphia) LOGIN 以外一律要求 sub 對得上。
     * 沒有這一步，A 使用者的 token 可以拿去對 B 使用者的資源發動操作。
     */
    if (expectedPurpose !== ChallengePurpose.LOGIN) {
      if (!expectedSub || payload.sub !== expectedSub) {
        throw new Error("Challenge subject mismatch");
      }
    }

    return payload.challenge as string;
  } catch (e) {
    logger.error("Challenge token verification failed:", {
      message: (e as Error).message,
      expectedPurpose,
    });
    throw new Error("Invalid or expired login session");
  }
}

/**
 * Info: (20260811 - Luphia) 只解出 token 承諾的內容，不做 purpose / sub 比對。
 *
 * 專供託管代簽的出處驗證使用：它要判斷的是「這個 challenge 是不是本站發的、
 * 發給不發給這個人、以及能不能代簽這個用途」，三件事都需要看到 payload 才決定，
 * 因此不能用 verifyChallengeToken 那種「先講預期再比對」的形狀。
 */
export async function inspectChallengeToken(token: string): Promise<{
  challenge: string;
  purpose: ChallengePurpose;
  sub?: string;
}> {
  const { payload } = await jwtVerify(token, secret());

  if (!isChallengePurpose(payload.purpose)) {
    throw new Error("Challenge token has no recognised purpose");
  }

  return {
    challenge: payload.challenge as string,
    purpose: payload.purpose,
    sub: typeof payload.sub === "string" ? payload.sub : undefined,
  };
}
