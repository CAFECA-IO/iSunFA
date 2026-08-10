import { createHash } from "crypto";
import type { AuthenticationJSON } from "@passwordless-id/webauthn/dist/esm/types";
import { verifyAuthentication } from "@/lib/auth/fido2_server";
import { reconstructKeyFromXY } from "@/lib/auth/crypto_utils";
import { logger } from "@/lib/utils/logger";
import { SystemSettingKey } from "@/constants/system_setting";

/**
 * Info: (20260809 - Luphia) 系統設定的完整性簽章。
 *
 * 與 .env 的 SUPER_ADMIN_SIGNATURE 完全同構（見 src/validators/env.ts）：
 *   排序後的 `key=value` 串接 → SHA-256 → base64url → 當作 WebAuthn challenge
 * 差別只在資料來源從檔案換成資料庫，以及多了一個單調遞增的 version。
 *
 * 為什麼簽「明文」而不是 DB 裡的密文：AES-GCM 每次加密的 IV 都不同，
 * 簽密文會在每次重新加密後自我失效；而且管理員在畫面上核可的本來就是明文。
 */

// Info: (20260809 - Luphia) version 併入 canonical string，讓簽章同時承諾「這是第幾版設定」
const VERSION_FIELD = "__version__";

export interface ISettingEntry {
  key: SystemSettingKey;
  // Info: (20260809 - Luphia) 明文值；秘密值必須先解密再進來
  value: string;
}

export interface ISuperAdminCredential {
  credentialId: string;
  pubKeyX: string;
  pubKeyY: string;
}

/**
 * Info: (20260809 - Luphia) 產生 canonical string。
 * 值為空字串的設定一律省略，讓「刪除設定」與「設成空字串」得到同一個 digest，
 * 避免同一份實質設定因寫法不同而簽章對不上。
 */
export function buildCanonicalString(
  entries: ISettingEntry[],
  version: number,
): string {
  const meaningful = entries.filter((entry) => entry.value !== "");
  const sorted = [...meaningful].sort((a, b) => a.key.localeCompare(b.key));

  const lines = sorted.map((entry) => `${entry.key}=${entry.value}`);
  lines.push(`${VERSION_FIELD}=${version}`);

  return lines.join("\n");
}

export function computeDigest(canonicalString: string): string {
  return createHash("sha256").update(canonicalString).digest("base64url");
}

export function buildSettingsDigest(
  entries: ISettingEntry[],
  version: number,
): string {
  return computeDigest(buildCanonicalString(entries, version));
}

/**
 * Info: (20260809 - Luphia) 從 .env 讀取信任根。
 * 刻意不從 DB 讀 SUPER_ADMIN 的公鑰——能竄改設定的攻擊者同樣能竄改 DB 內的公鑰，
 * 那樣簽章驗證就只是自欺。信任根必須在被保護的資料之外。
 */
export function getSuperAdminCredential(): ISuperAdminCredential | null {
  const credentialId = process.env.SUPER_ADMIN_CRED_ID;
  const pubKeyX = process.env.SUPER_ADMIN_PUB_X;
  const pubKeyY = process.env.SUPER_ADMIN_PUB_Y;

  if (!credentialId || !pubKeyX || !pubKeyY) return null;
  return { credentialId, pubKeyX, pubKeyY };
}

// Info: (20260809 - Luphia) base64 / base64url 混用時的 credentialId 比對正規化，沿用 setup.auth.service 的做法
function normalizeCredentialId(id: string): string {
  return id.trim().replace(/-/g, "+").replace(/_/g, "/").replace(/=/g, "");
}

/**
 * Info: (20260809 - Luphia) 驗證一份設定簽章是否由 SUPER_ADMIN 對指定 digest 簽出。
 * 任何一步失敗都回 false，由呼叫端 fail closed（停用設定而非採用可疑內容）。
 */
export async function verifySettingsSignature(params: {
  digest: string;
  signature: AuthenticationJSON;
  credential: ISuperAdminCredential;
}): Promise<boolean> {
  const { digest, signature, credential } = params;

  if (
    normalizeCredentialId(signature.id) !==
    normalizeCredentialId(credential.credentialId)
  ) {
    logger.error("System setting signature credential mismatch", {
      expected: normalizeCredentialId(credential.credentialId),
      actual: normalizeCredentialId(signature.id),
    });
    return false;
  }

  try {
    await verifyAuthentication(
      signature,
      {
        id: credential.credentialId,
        publicKey: reconstructKeyFromXY(credential.pubKeyX, credential.pubKeyY),
        algorithm: "ES256",
        transports: [],
      },
      digest,
    );
    return true;
  } catch (error) {
    logger.error("System setting signature verification failed", {
      message: (error as Error).message,
    });
    return false;
  }
}

// Info: (20260809 - Luphia) manifest 內以 base64 存放整份 AuthenticationJSON，與 .env 的存法一致
export function encodeSignature(signature: AuthenticationJSON): string {
  return Buffer.from(JSON.stringify(signature)).toString("base64");
}

export function decodeSignature(encoded: string): AuthenticationJSON | null {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(encoded, "base64").toString("utf-8"),
    );

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as { id?: unknown }).id !== "string"
    ) {
      return null;
    }

    return parsed as AuthenticationJSON;
  } catch (error) {
    logger.error("Malformed system setting signature blob", {
      message: (error as Error).message,
    });
    return null;
  }
}
