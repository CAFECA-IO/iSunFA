import { isIP } from "node:net";
import { NextRequest } from "next/server";
import { logger } from "@/lib/utils/logger";

/**
 * Info: (20260818 - Luphia) 來源 IP（限流與稽核用，PR #6652 第三輪 D）。
 *
 * 未登入的端點沒有身分可綁——邀請連結的三支端點裡有兩支刻意不要求登入
 * （受邀者多半還沒有帳號），因此限流與紀錄只剩下 IP 這一個維度。
 *
 * `x-forwarded-for` 是**用戶端可偽造的標頭**：只有在請求確實經過我們自己的
 * 反向代理、且該代理會覆寫此標頭時，第一個值才可信。這裡取第一個值是因為
 * 部署形態如此；若哪天前面多一層 CDN，這個函式是唯一要改的地方。
 *
 * 因此它的定位是「盡力而為的維度」，不是身分斷言：
 * 拿它做限流可以擋掉沒有動機換 IP 的雜訊流量，但不該用它做授權判斷。
 */

/**
 * Info: (20260818 - Luphia) **沒有任何來源標頭**時的哨符（第四輪自審）。
 *
 * 這是「部署形態本身沒提供 IP」的情形——不是呼叫端做了什麼。限流據此換用
 * 寬鬆的共用桶，否則全站受邀者會共用一個 20/min 的桶（可用性事故）。
 */
export const UNIDENTIFIED_CLIENT_IP = "unknown";

/**
 * Info: (20260818 - Luphia) 標頭**有值但解析不出 IP** 時的哨符（第五輪 C 高）。
 *
 * 與上面那個嚴格分開，因為兩者的責任歸屬不同：
 *
 * - 沒有標頭 → 我們自己看不到 IP → 寬鬆桶（否則誤傷所有人）
 * - 有標頭但不是 IP → **值是呼叫端送上來的** → 嚴格桶
 *
 * 原本兩者混為一談，於是送 `x-forwarded-for: unknown` 就能讓自己被判成
 * 「無法識別」而換到 300/min 的寬鬆桶——**一道防線由被限流的那一方自選關閉**，
 * 而且很容易把寬鬆桶打滿，讓真的取不到 IP 的受邀者全部 429。
 *
 * 所有無法解析的值都收斂到**同一個**哨符，因此「輪替垃圾值換取無限多個桶」
 * 也一併收掉（既有問題，非本輪引入，但同一個根因）。
 *
 * ⚠️ 已知取捨：Apache mod_proxy 與舊版 squid 取不到來源時會真的寫 `unknown`。
 * 那種部署下所有流量會落在這個嚴格的共用桶裡——症狀是邀請落地頁大量 429。
 * 我們無法從請求上分辨「代理寫的 unknown」與「呼叫端送的 unknown」，
 * 因此選擇保守的一側，並在下方留一筆 `logger.warn` 讓維運看得見。
 */
export const MALFORMED_CLIENT_IP = "malformed";

function asIpAddress(value: string | null | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;
  // Info: (20260818 - Luphia) isIP 回 0 代表兩種格式都不是；4 / 6 才是有效位址
  return isIP(candidate) === 0 ? null : candidate;
}

export function resolveClientIp(request: NextRequest): string {
  /**
   * Info: (20260818 - Luphia) 取第一段：後面幾段是經手的代理各自附加的，
   * 其中包含用戶端自己送上來的那一段——取最後一個等於讓呼叫者自選限流維度。
   */
  const forwardedRaw = request.headers.get("x-forwarded-for");
  const forwarded = asIpAddress(forwardedRaw?.split(",")[0]);
  if (forwarded) return forwarded;

  const realIpRaw = request.headers.get("x-real-ip");
  const realIp = asIpAddress(realIpRaw);
  if (realIp) return realIp;

  // Info: (20260818 - Luphia) 兩個標頭都沒有：部署形態的問題，不是呼叫端的
  if (!forwardedRaw && !realIpRaw) return UNIDENTIFIED_CLIENT_IP;

  /**
   * Info: (20260818 - Luphia) 有值但不是 IP。記一筆讓維運看得見——
   * 若這在正式環境大量出現，代表反向代理沒有正確覆寫標頭（要改的是代理設定），
   * 而它的症狀（受邀者被 429）不會有人主動回報成「限流設定不對」。
   */
  logger.warn("client ip header present but unparseable", {
    xForwardedFor: forwardedRaw ?? "",
    xRealIp: realIpRaw ?? "",
  });
  return MALFORMED_CLIENT_IP;
}
