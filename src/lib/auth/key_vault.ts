import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
} from "crypto";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";

/**
 * Info: (20260809 - Luphia) 通用信封加密保險庫。
 *
 * 明文只在「解密 → 使用」的那幾行存在於記憶體，落盤的一律是 AES-256-GCM 密文。
 * 主密鑰放在部署環境變數（不是 DB）——它保護 DB 內容，自己就不能存在 DB 裡。
 *
 * 不同用途以 purpose 做 KDF domain separation：同一把主密鑰派生出互不相通的子金鑰，
 * 因此託管私鑰的密文不可能被當成系統設定解開，反之亦然。
 */
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 12;

// Info: (20260809 - Luphia) KDF salt 前綴；主密鑰本身已是高熵隨機值，salt 只負責用途隔離與定長化
const KDF_SALT_PREFIX = "isunfa-vault-v1:";

/**
 * Info: (20260809 - Luphia) 密文上記錄的主密鑰版本。
 *
 * Info: (20260811 - Luphia) 誠實記錄現況：這個欄位目前**只寫不讀**。
 *
 * openSecret 完全不參考 sealed.keyVersion，getSubKey 也不接受版本參數，
 * KDF salt 裡的 `v1` 與這個常數沒有關聯。因此把它改成 2 並換掉主密鑰的話，
 * 舊密文（包含所有託管私鑰）會一律 authTag 失敗，兩個版本無法並存——
 * 結果是全體託管使用者都簽不了名。
 *
 * 換句話說：欄位存在，輪替機制不存在。真正的輪替需要
 * 「以密文自己的 keyVersion 選對應子金鑰」＋「一支重新封裝的遷移程序」，
 * 兩者都還沒有。在那之前請不要調整這個值。見 ADR 017 的後續工作。
 */
export const VAULT_KEY_VERSION = 1;

/**
 * Info: (20260809 - Luphia) 加密用途。新增用途時必須用新字串，
 * 沿用既有字串會讓兩種資料共用子金鑰，失去隔離意義。
 */
export enum VaultPurpose {
  CUSTODIAL_KEY = "custodial-key",
  SYSTEM_SETTING = "system-setting",
  /**
   * Info: (20260812 - Luphia) 託管帳號的 PRF 替身（見 ADR 016 補充）。
   *
   * 刻意**不**沿用 CUSTODIAL_KEY:那把子金鑰保護的是可以動用資金的簽章私鑰,
   * 這裡要的是一個決定性的加密秘密。共用同一把會讓「解開對話」與「動用資金」
   * 落在同一個信任邊界內 —— 而它們的外洩後果完全不同。
   */
  CUSTODIAL_PRF = "custodial-prf",
  /**
   * Info: (20260817 - Luphia) 費思長期記憶的欄位級加密（規範 §6.2）。
   *
   * 獨立的子金鑰：記憶是使用者的對話偏好，與簽章私鑰、系統設定的外洩後果都不同，
   * 共用一把會把三種資產綁進同一個信任邊界。
   */
  FAITH_MEMORY = "faith-memory",
}

export interface ISealedSecret {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: number;
}

/**
 * Info: (20260811 - Luphia) 快取鍵含主密鑰指紋，不只是 purpose。
 *
 * 只用 purpose 當鍵的話，主密鑰換掉之後仍會沿用上一把派生金鑰——這正是
 * key_vault.test.ts 必須靠 jest.resetModules() 繞過的原因，而那個「測試上的不便」
 * 其實是行為上的錯誤：輪替主密鑰在同一個 process 內不會生效。
 */
const derivedKeys = new Map<string, Buffer>();

function getSubKey(purpose: VaultPurpose): Buffer {
  const raw = process.env.SECRET_VAULT_MASTER_KEY;

  /**
   * Info: (20260809 - Luphia) Fail Fast：主密鑰缺失或過短時直接凍結，
   * 絕不退化成弱加密或明文儲存。
   *
   * Info: (20260811 - Luphia) 先 trim 再量長度：32 個空白不是金鑰。
   */
  const secret = raw?.trim();
  if (!secret || secret.length < 32) {
    throw new AppError(API_ERRORS.IS_CONFIG_MISSING);
  }

  const fingerprint = createHash("sha256")
    .update(secret)
    .digest("base64url")
    .slice(0, 16);
  const cacheKey = `${fingerprint}:${purpose}`;

  const cached = derivedKeys.get(cacheKey);
  if (cached) return cached;

  const key = scryptSync(secret, `${KDF_SALT_PREFIX}${purpose}`, KEY_LENGTH);
  derivedKeys.set(cacheKey, key);
  return key;
}

export function sealSecret(
  plaintext: string,
  purpose: VaultPurpose,
): ISealedSecret {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getSubKey(purpose), iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    keyVersion: VAULT_KEY_VERSION,
  };
}

export function openSecret(
  sealed: ISealedSecret,
  purpose: VaultPurpose,
): string {
  const decipher = createDecipheriv(
    ALGORITHM,
    getSubKey(purpose),
    Buffer.from(sealed.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(sealed.authTag, "base64"));

  // Info: (20260809 - Luphia) authTag 不符時 final() 會 throw，等同偵測到密文被竄改
  return Buffer.concat([
    decipher.update(Buffer.from(sealed.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/**
 * Info: (20260812 - Luphia) 從某個用途的子金鑰派生一段**決定性**秘密。
 *
 * `sealSecret` 每次的 IV 都不同,拿它當「同樣的輸入要得到同樣的輸出」用不了;
 * 這支用 HMAC 取代,同一把主密鑰 + 同一個 purpose + 同一份 info 永遠得到同一個 32 bytes。
 *
 * `getSubKey` 仍然不外露 —— 呼叫端拿到的是派生結果,不是子金鑰本身,
 * 因此無法用它去解別的東西。
 *
 * Info: (20260812 - Luphia) `info` 收 `Buffer` 而不只是字串（PR review P-3）。
 *
 * 綁字串的話,呼叫端只能餵「某個值的字串表示」;而當那個值本來是 bytes
 * (例如 base64 的 salt),派生結果就對**編碼方式**敏感 ——
 * base64 → base64url、去掉 padding、trim,任何一個看起來無害的改動都會換掉秘密。
 * 收 Buffer 讓呼叫端可以綁 bytes 本身,與另一條路徑（WebAuthn PRF 吃的就是 bytes）
 * 依賴同一件事。
 */
export function derivePurposeSecret(
  purpose: VaultPurpose,
  info: string | Buffer,
): Buffer {
  const material = typeof info === "string" ? Buffer.from(info, "utf8") : info;
  return createHmac("sha256", getSubKey(purpose)).update(material).digest();
}

// Info: (20260809 - Luphia) 供健康檢查／設定頁判斷主密鑰是否就緒，不外露密鑰內容
export function isVaultConfigured(): boolean {
  // Info: (20260811 - Luphia) 與 getSubKey 用同一條規則：先 trim，32 個空白不算金鑰
  const secret = process.env.SECRET_VAULT_MASTER_KEY?.trim();
  return Boolean(secret && secret.length >= 32);
}
