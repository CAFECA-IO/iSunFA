/**
 * Info: (20260812 - Luphia) 對話主私鑰的「包裝來源」標記（PR review P-1 / P-5）。
 *
 * `UserEncryptionKey.algorithm` 這個欄位的註解本來就寫著「包裝/派生演算法標記（版本化）」,
 * 但兩條路徑都留在同一個預設值 —— 對託管列來說 `WebAuthnPRF-…` 是錯的,
 * 那些列不是 WebAuthn PRF 包裝的。
 *
 * 沒有這個標記,三件事做不到:
 *
 * 1. **辨識平台有能力解密哪些列。** 稽核時要回答「哪些對話的金鑰在平台手上」,
 *    否則只能回頭 join `UserCustodialKey` 推論當時的 custody —— 而 custody 會變。
 * 2. **執行 ADR 016 承諾的「補綁 passkey 後重新包裝」。** 那個功能得先找出哪些列要重包。
 * 3. **偵測 custody 翻轉。** 補綁 passkey 若廢除託管金鑰列,`resolveCustodyType` 改回
 *    PASSKEY,前端會走 passkey 派生 —— 同一個 salt、不同的秘密,`unwrapMasterKey` 失敗。
 *    使用者看到的是一句通用的「解鎖失敗」,而真相是「這份對話已經解不開了」。
 *    比對這個標記才能把那個情況說成它本來的樣子。
 */

/**
 * Info: (20260812 - Luphia) PASSKEY 的值**必須**與 schema 的 `@default` 完全一致 ——
 * 既有的列都是靠那個預設值寫進去的,改一個字就會讓它們全部被判定為來源不符。
 */
export const CHATROOM_KEY_ALGORITHM = {
  PASSKEY_PRF: "WebAuthnPRF-HKDF-AES-256-GCM",
  /**
   * Info: (20260812 - Luphia) 版本寫在標記裡（P-5）。
   *
   * `derivePurposeSecret` 沒有 `ISealedSecret.keyVersion` 那樣的隨密文欄位,
   * 於是「這個包裝是哪一版主密鑰派生的」原本無處可記。輪替主密鑰時,
   * 有這個字串才知道哪些列需要重新包裝 —— 沒有的話只能全部重試到失敗為止。
   */
  CUSTODIAL_PRF: "CustodialPRF-v1-HMAC-SHA256-AES-256-GCM",
} as const;

export type ChatroomKeyAlgorithm =
  (typeof CHATROOM_KEY_ALGORITHM)[keyof typeof CHATROOM_KEY_ALGORITHM];

export const CHATROOM_KEY_ALGORITHMS: readonly string[] = Object.values(
  CHATROOM_KEY_ALGORITHM,
);

/**
 * Info: (20260812 - Luphia) 派生秘密時一併餵進 HMAC 的版本字串（P-5）。
 * 與上面的標記同源:標記換版,派生出來的秘密也必須跟著換,否則「版本」只是註解。
 */
export const CUSTODIAL_PRF_VERSION = "v1";
