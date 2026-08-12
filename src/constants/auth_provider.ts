/**
 * Info: (20260809 - Luphia) 第三方身分提供者（FIDO2 passkey 以外的登入方式）。
 * 值會直接寫入 UserIdentity.provider 欄位，新增 provider 時必須同步：
 * 1. 這裡的 enum
 * 2. src/lib/auth/oauth/registry.ts 的 OAUTH_PROVIDERS
 * 3. .env.example 的 <PROVIDER>_OAUTH_CLIENT_ID / _CLIENT_SECRET
 */
export enum AuthProvider {
  GOOGLE = "GOOGLE",
}

export const AUTH_PROVIDER_VALUES = Object.values(AuthProvider);

export function isAuthProvider(value: unknown): value is AuthProvider {
  return (
    typeof value === "string" &&
    AUTH_PROVIDER_VALUES.includes(value as AuthProvider)
  );
}

/**
 * Info: (20260809 - Luphia) 使用者持有 SCW 簽章金鑰的方式。
 * PASSKEY：私鑰在使用者裝置的安全元件內，伺服器只有公鑰（非託管）。
 * CUSTODIAL：私鑰由伺服器加密保管，供純第三方登入的使用者使用（託管）。
 */
export enum WalletCustodyType {
  PASSKEY = "PASSKEY",
  CUSTODIAL = "CUSTODIAL",
}

// Info: (20260809 - Luphia) 託管金鑰的 credentialId 前綴，用來和真實 passkey credential 區隔
export const CUSTODIAL_CREDENTIAL_PREFIX = "custodial-";

// Info: (20260809 - Luphia) OAuth state token 的有效期，與 challenge_token 一致取 5 分鐘
export const OAUTH_STATE_TTL = "5m";
