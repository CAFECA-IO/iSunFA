import { createHash, randomBytes } from "crypto";

/**
 * Info: (20260815 - Luphia) 邀請 token 的產生與驗證（規範 §4 / P4）。
 *
 * 純函式（時間由呼叫端注入），不碰 DB、不寄信，可單測。
 *
 * 設計上只有三條規則：
 * 1. **明文只出現在寄出的那封信裡**——資料庫存的是 SHA-256 雜湊，
 *    外洩一份備份不等於任何人都能加入別人的團隊。
 * 2. **一次性**：接受之後雜湊即清空，同一條連結不能用第二次
 *    （轉寄給別人也沒有用）。
 * 3. **有期限**：逾期即失效。席次不因此退費，但會空出來給下一次邀請使用
 *    （產品拍板 20260815）。
 */

// Info: (20260815 - Luphia) 32 bytes = 256 bits 的亂數，足以抵抗猜測
const TOKEN_BYTES = 32;

/**
 * Info: (20260818 - Luphia) 明文 token 的字元數（hex，第三輪 D）。
 * 由 `TOKEN_BYTES` 推導而非各處硬寫 64：驗證器要擋的長度必須跟著產生規則走，
 * 兩邊各寫一個數字的話，換金鑰長度時擋掉的會是自己發出去的 token。
 */
export const INVITE_TOKEN_HEX_LENGTH = TOKEN_BYTES * 2;

// Info: (20260815 - Luphia) 邀請有效期（天）。規範建議 7 天，短到不會長期佔位、長到足夠對方看信
export const INVITE_TOKEN_TTL_DAYS = 7;

const DAY_MS = 86_400_000;

export interface IInviteToken {
  // Info: (20260815 - Luphia) 明文：只放進信裡，絕不寫入資料庫或 log
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createInviteToken(nowMs: number): IInviteToken {
  const token = randomBytes(TOKEN_BYTES).toString("hex");
  return {
    token,
    tokenHash: hashInviteToken(token),
    expiresAt: new Date(nowMs + INVITE_TOKEN_TTL_DAYS * DAY_MS),
  };
}

export function isInviteExpired(
  expiresAt: Date | null | undefined,
  nowMs: number,
): boolean {
  // Info: (20260815 - Luphia) 沒有期限的舊邀請（位址邀請）不受期限規則約束
  if (!expiresAt) return false;
  return expiresAt.getTime() <= nowMs;
}

/**
 * Info: (20260815 - Luphia) 邀請信裡的連結。
 * 以 base URL 組出**絕對網址**——信件裡的相對路徑點不開。
 *
 * Info: (20260818 - Luphia) token 改放在 **URL fragment**（第三輪 D）。
 *
 * 原本是 `/invite/{token}`，也就是把一把有效七天的鑰匙放在 path 上。
 * path 會進三種地方，每一種都在我們的控制之外：
 *
 * 1. **伺服器與反向代理的 access log**——通常保留數週、常被集中收容，
 *    而讀 log 的人遠多於能讀 DB 的人；
 * 2. **瀏覽器歷史**；
 * 3. 落地頁若有任何外連或第三方資源，token 會出現在 **`Referer`** 標頭裡。
 *
 * fragment（`#` 之後）**不會送給伺服器**，因此 1 與 3 都消失；瀏覽器歷史
 * 仍會留（那是信裡一條連結的必然代價，且僅限收件者自己的機器）。
 * 落地頁在瀏覽器裡讀 `location.hash`，再把 token 放進 POST body 送回來——
 * 三支 API 因此都不再把 token 放在 path 上。
 */
export function buildInviteUrl(baseUrl: string, token: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return `${trimmed}/invite#${token}`;
}
