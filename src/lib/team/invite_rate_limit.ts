import { NextRequest, NextResponse } from "next/server";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { resolveClientIp, UNIDENTIFIED_CLIENT_IP } from "@/lib/utils/client_ip";

/**
 * Info: (20260818 - Luphia) 免登入邀請端點的限流（PR #6652 第四輪 B-4）。
 *
 * 這兩支端點（`resolve` / `decline`）刻意不要求登入——受邀者多半還沒有帳號——
 * 所以唯一的維度是來源 IP。而 `resolveClientIp` 取不到標頭時回 `"unknown"`，
 * 於是**所有取不到 IP 的流量共用同一個桶**：若部署形態沒有恆定覆寫
 * `x-forwarded-for`，全站受邀者加起來每分鐘 20 次，第 21 位打開落地頁就是 429。
 * 而那個桶的註解自己寫著「誤限流在這條路徑上就是可用性事故」。
 *
 * 因此分成兩個桶：
 *
 * - **有 IP**：照原本的尺寸限（20/分、200/日）。這是防「拿一批轉寄出去的連結
 *   一封封拒掉」的那道防線，維度有意義。
 * - **完全沒有來源標頭**：改用寬鬆得多的共用桶。它擋的只是失控流量的絕對上限，
 *   不假裝能區分使用者——因為在這個狀態下我們確實區分不了。
 *
 * 刻意**不 fail-open**：無法識別呼叫者不等於不限流，只是限得鬆。
 *
 * Info: (20260818 - Luphia) 寬鬆桶只給「**沒有標頭**」那一種（第五輪 C 高）。
 *
 * 先前是「解析不出 IP 就算無法識別」，於是送 `x-forwarded-for: unknown`
 * 就能自選寬鬆桶——一道防線由被限流的那一方關掉，而且很容易把寬鬆桶打滿，
 * 讓真的取不到 IP 的受邀者全部 429。標頭有值但不是 IP 時，那個值是**呼叫端
 * 送上來的**，因此收斂到 `MALFORMED_CLIENT_IP` 並走**嚴格**的桶。
 *
 * 呼叫端仍可以「完全不送標頭」來取得寬鬆桶——但那只在反向代理沒有覆寫
 * `x-forwarded-for` 的部署下成立，而那種部署本來就對所有人都看不見 IP。
 * 這是這個維度的誠實下限，不是這裡能修的東西。
 */
export function enforceInviteRateLimit(
  request: NextRequest,
): NextResponse | null {
  const ip = resolveClientIp(request);
  const identified = ip !== UNIDENTIFIED_CLIENT_IP;

  return enforceRateLimit(
    ip,
    identified
      ? RateLimitBucketEnum.INVITE_TOKEN
      : RateLimitBucketEnum.INVITE_TOKEN_UNIDENTIFIED,
  );
}
