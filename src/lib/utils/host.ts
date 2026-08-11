/**
 * Info: (20260810 - Luphia) 主機名比對的單一來源。
 *
 * 系統有多處需要判斷「這個請求／網址是不是我自己」：middleware 的 canonical 導向、
 * OAuth 的 redirect_uri 白名單、部署精靈的網域切換。這些判斷若各自用字面字串比對，
 * 就會在 localhost 與 127.0.0.1 之間互相打架——它們指向同一台機器，但字串不相等。
 *
 * 20260810 連續踩到兩次：先是 middleware 把 localhost 無限導向，修好之後
 * OAuth 的 redirect_uri 檢查又以同樣理由拒絕。抽成共用模組就是為了不再有第三次。
 *
 * 只寫純字串運算，middleware runtime 也能用。
 */

/**
 * Info: (20260810 - Luphia) 迴環位址的各種寫法都指向本機，視為同一台主機。
 *
 * Info: (20260811 - Luphia) 移除 0.0.0.0。它是「未指定位址」不是迴環位址：
 * 監聽時代表「所有介面」，當成目標連線時的行為隨平台而異。把它併進迴環集合，
 * isSameEffectiveOrigin 就會認定 http://0.0.0.0:3000 與 localhost:3000 同源，
 * 白白放寬了 OAuth redirect_uri 的白名單。
 */
const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * Info: (20260811 - Luphia) 站內路徑：必須以單一斜線開頭，且不得含反斜線。
 *
 * `startsWith("/")` 不足以判斷「這是站內」——`//evil.com` 同樣以斜線開頭，
 * 但瀏覽器會把它解讀成 protocol-relative 的絕對網址，直接把使用者導出站；
 * 部分瀏覽器也把反斜線當斜線處理，所以 `/\evil.com` 一併排除。
 */
export const INTERNAL_PATH_PATTERN = /^\/(?!\/)[^\\]*$/;

export function isInternalPath(value: string): boolean {
  return INTERNAL_PATH_PATTERN.test(value);
}

/**
 * Info: (20260810 - Luphia) 把主機名正規化到可比對的形式。
 * 迴環位址一律收斂成 localhost；其餘只做小寫化。
 * 正式環境的網域永遠落不進迴環集合，因此這個正規化不會放寬任何線上的檢查。
 */
export function normalizeHostname(hostname: string): string {
  // Info: (20260810 - Luphia) 去掉 IPv6 的方括號後再比對
  const bare = hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  return LOOPBACK_HOSTNAMES.has(bare) ? "localhost" : bare;
}

/**
 * Info: (20260810 - Luphia) 從 Host 標頭取出主機名。
 * IPv6 是 [::1]:3000 的形式，直接 split(":") 會切錯，必須先處理方括號。
 */
export function hostnameOf(host: string): string {
  const ipv6 = host.match(/^\[([^\]]+)\]/);
  if (ipv6) return ipv6[1];
  return host.split(":")[0];
}

/**
 * Info: (20260810 - Luphia) 兩個網址是否指向同一個實際來源。
 *
 * protocol 與 port 維持嚴格比對——http 與 https、不同埠號是不同的信任邊界，
 * 放寬會讓 open redirect 的防線失效。只有主機名走迴環正規化。
 */
export function isSameEffectiveOrigin(a: URL, b: URL): boolean {
  return (
    a.protocol === b.protocol &&
    a.port === b.port &&
    normalizeHostname(a.hostname) === normalizeHostname(b.hostname)
  );
}
