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

/**
 * Info: (20260814 - Julian) Passkey 登入的三段進度，供 UI 顯示現在卡在哪一步。
 * 定義在這裡而非 `lib/auth/passkey_login.ts`：它會被 `auth_modal` 的
 * `setLoginStep` 接走，是跨檔比對的狀態值（CLAUDE.md §3.4）。
 */
export enum PasskeyLoginStep {
  FETCHING_CHALLENGE = "FETCHING_CHALLENGE",
  AUTHENTICATING = "AUTHENTICATING",
  VERIFYING = "VERIFYING",
}

/**
 * Info: (20261015 - Luphia) 鏈下帳號位址推導的網域標籤（區塊鏈退役）。
 *
 * 位址 = keccak256(encodePacked(tag, credentialId, pubKeyX, pubKeyY)) 取後 20 bytes，
 * 見 `src/lib/auth/account_address.ts`。標籤帶版本號：日後推導規則若要改，
 * 必須換新標籤（v2），已發出的位址永遠以 v1 重算得回來——**不可修改這個值**，
 * 改了之後所有 v1 帳號的位址都對不上它們的金鑰。
 */
export const ACCOUNT_ADDRESS_DERIVATION_TAG = "isunfa-account-v1";

/**
 * Info: (20261015 - Luphia) Passkey 註冊的進度（區塊鏈退役後只剩伺服器建帳一步）。
 * 原本還有預測 SCW 位址、算 UserOp 雜湊、二次簽名、部署、等鏈同步等步驟，
 * 那些全部隨區塊鏈移除；位址改由伺服器以 `deriveAccountAddress` 決定性推導。
 */
export enum RegistrationStep {
  IDLE = "IDLE",
  FETCHING_CHALLENGE = "FETCHING_CHALLENGE",
  CREATING_PASSKEY = "CREATING_PASSKEY",
  REGISTERING = "REGISTERING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
}
