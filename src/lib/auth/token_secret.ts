import { createHash } from "crypto";

/**
 * Info: (20260811 - Luphia) 短效 HS256 token 的對稱金鑰來源。
 *
 * 原本兩支 token（OAuth state、challenge token）都直接寫成
 *   `process.env.DEWT_PRIVATE_KEY_PEM || "temporary_secret"`
 * 這有兩個問題：
 *
 * 1. **Fail open**：.env.example 裡 DEWT_PRIVATE_KEY_PEM 是空值，dewt.ts 缺 key 時也只
 *    logger.error 不中止啟動。任何漏設此變數的環境（CI、測試機、忘了掛 env 的 compose）
 *    都會退回一個寫在原始碼裡的公開字串——攻擊者可自簽合法的 state token（內含任意
 *    redirectUri），OAuth 的 CSRF 防線與 redirect 白名單同時失效。因此這裡缺 key 直接 throw，
 *    與 key_vault 的處理方式一致：寧可該功能不可用，也不要用一把公開的金鑰假裝有保護。
 *
 * 2. **金鑰重用**：把 ES256 的私鑰 PEM 原封當成 HMAC 的對稱金鑰，等於同一份秘密同時
 *    承擔兩種用途。改成以用途做 domain separation 派生子金鑰，兩種 token 之間也不再共用，
 *    一種 token 的簽章不可能被拿去冒充另一種。
 */
export enum TokenSecretPurpose {
  OAUTH_STATE = "oauth-state",
  CHALLENGE = "challenge",
}

export function getTokenSecret(purpose: TokenSecretPurpose): Uint8Array {
  const master = process.env.DEWT_PRIVATE_KEY_PEM;

  if (!master || master.trim().length === 0) {
    throw new Error(
      "DEWT_PRIVATE_KEY_PEM is not configured; refusing to sign tokens with a default secret",
    );
  }

  return createHash("sha256")
    .update(`isunfa-token-v1:${purpose}:`)
    .update(master)
    .digest();
}
