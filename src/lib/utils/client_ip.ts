import { NextRequest } from "next/server";

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
 * Info: (20260818 - Luphia) 取不到來源 IP 時的哨符（第四輪自審）。
 *
 * 呼叫端需要分得出「這是某個 IP」與「不知道是誰」——限流會據此換用寬鬆的桶。
 * 因此這個值必須是共用常數而不是各處手寫的 `"unknown"`：
 * 兩邊各寫一次字串，改其中一邊就會讓那個判斷永遠不成立，而症狀是限流變嚴
 * （所有人共用小桶）——一個安靜的可用性問題。
 */
export const UNIDENTIFIED_CLIENT_IP = "unknown";

export function resolveClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  // Info: (20260818 - Luphia) 取不到時回固定哨符：可辨識、可被限流換桶，不會每次都不同
  return UNIDENTIFIED_CLIENT_IP;
}
