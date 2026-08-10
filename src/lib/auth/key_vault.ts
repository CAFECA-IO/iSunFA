import {
  createCipheriv,
  createDecipheriv,
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

export const VAULT_KEY_VERSION = 1;

/**
 * Info: (20260809 - Luphia) 加密用途。新增用途時必須用新字串，
 * 沿用既有字串會讓兩種資料共用子金鑰，失去隔離意義。
 */
export enum VaultPurpose {
  CUSTODIAL_KEY = "custodial-key",
  SYSTEM_SETTING = "system-setting",
}

export interface ISealedSecret {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: number;
}

const derivedKeys = new Map<VaultPurpose, Buffer>();

function getSubKey(purpose: VaultPurpose): Buffer {
  const cached = derivedKeys.get(purpose);
  if (cached) return cached;

  const secret = process.env.SECRET_VAULT_MASTER_KEY;

  /**
   * Info: (20260809 - Luphia) Fail Fast：主密鑰缺失或過短時直接凍結，
   * 絕不退化成弱加密或明文儲存。
   */
  if (!secret || secret.length < 32) {
    throw new AppError(API_ERRORS.IS_CONFIG_MISSING);
  }

  const key = scryptSync(secret, `${KDF_SALT_PREFIX}${purpose}`, KEY_LENGTH);
  derivedKeys.set(purpose, key);
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

// Info: (20260809 - Luphia) 供健康檢查／設定頁判斷主密鑰是否就緒，不外露密鑰內容
export function isVaultConfigured(): boolean {
  const secret = process.env.SECRET_VAULT_MASTER_KEY;
  return Boolean(secret && secret.length >= 32);
}
