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
 *
 * Info: (20260818 - Luphia) **本專案的部署已確認會恆定覆寫 `x-forwarded-for`**
 * （維護者於 2026-08-18 確認）。因此上面那個取捨在目前的部署形態下是理論上的：
 * 解析不出 IP 的值必然來自呼叫端，而「完全不送標頭」也到不了應用層。
 * 這一行是給**未來換部署形態的人**看的——若哪天前面多一層不覆寫 XFF 的 CDN，
 * 這個判斷的前提就沒了，`logger.warn` 的量會先告訴你。
 */
export const MALFORMED_CLIENT_IP = "malformed";

function asIpAddress(value: string | null | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;
  // Info: (20260818 - Luphia) isIP 回 0 代表兩種格式都不是；4 / 6 才是有效位址
  return isIP(candidate) === 0 ? null : candidate;
}

/**
 * Info: (20260818 - Luphia) 信任幾層反向代理（第六輪第 8 條）。
 *
 * `x-forwarded-for` 是**由左往右附加**的：最左邊是最早的一段（可能由呼叫端自己
 * 送出、完全不可信），最右邊那一段是**我們自己的代理**寫上去的對端位址。
 *
 * 因此該取的是**右邊數第 N 段**，N = 我們前面有幾層自己的代理：
 *
 * - 只有一層 nginx（不論它是覆寫還是用 `$proxy_add_x_forwarded_for` 附加）→ 1
 * - 前面還有一層 CDN → 2（最右邊是 CDN 的位址，再往左一段才是真正的呼叫端）
 *
 * 先前是固定取**最左邊**那一段。在「代理會覆寫」的部署下兩者相同，所以目前沒有
 * 症狀（維護者已確認本專案的部署會覆寫）；但若哪天改成附加，最左邊就是呼叫端
 * 自己送的值——輪替 `1.2.3.x` 即可取得無限多個限流桶，而格式驗證擋不到。
 * 把「取第幾段」變成設定，這個前提就不再只是一句註解。
 */
const DEFAULT_TRUSTED_PROXY_DEPTH = 1;

function resolveTrustedProxyDepth(): number {
  const raw = process.env.TRUSTED_PROXY_DEPTH?.trim();
  if (!raw) return DEFAULT_TRUSTED_PROXY_DEPTH;
  const parsed = Number.parseInt(raw, 10);
  // Info: (20260818 - Luphia) 非正整數一律退回預設：設錯不該讓限流失去維度
  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : DEFAULT_TRUSTED_PROXY_DEPTH;
}

export function resolveClientIp(request: NextRequest): string {
  const forwardedRaw = request.headers.get("x-forwarded-for");
  const segments = forwardedRaw?.split(",") ?? [];
  /**
   * Info: (20260818 - Luphia) 由右往左數第 `depth` 段。
   * 段數不足時取最左邊那一段——那是這串裡最舊的資訊，
   * 而「不足」本身代表部署形態與設定不一致，另有 `logger.warn` 會看到。
   */
  const depth = resolveTrustedProxyDepth();
  const picked = segments[Math.max(segments.length - depth, 0)];
  const forwarded = asIpAddress(picked);
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
