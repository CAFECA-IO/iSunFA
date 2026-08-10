import { NextResponse } from "next/server";
import { validateEnv } from "@/validators/env";
import { hostnameOf, normalizeHostname } from "@/lib/utils/host";
import type { NextRequest } from "next/server";

// Info: (20260809 - Luphia) 記錄「這個主機已嘗試過 canonical 導向」的短效 cookie，用於斷開導向迴圈
const CANONICAL_REDIRECT_COOKIE = "canonical_redirect_attempted";

// Info: (20260809 - Luphia) 反向代理後面要以 x-forwarded-host 為準，否則看到的是內部主機名
function readClientHost(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-host") || "";
  const host = forwarded
    ? forwarded.split(",")[0].trim()
    : request.headers.get("host") || "";
  return host || request.nextUrl.host;
}

export async function proxy(request: NextRequest) {
  const targetUrlStr = process.env.NEXT_PUBLIC_APP_URL;
  const envIsValid = await validateEnv();

  if (envIsValid && targetUrlStr) {
    try {
      const targetUrl = new URL(targetUrlStr);
      const clientHost = readClientHost(request);
      const currentHostname = normalizeHostname(hostnameOf(clientHost));
      const targetHostname = normalizeHostname(targetUrl.hostname);

      const isPublicShare =
        request.nextUrl.pathname.startsWith("/share/report");
      const isSetup = request.nextUrl.pathname.startsWith("/admin/setup");

      // Info: (20260413 - Luphia) 當進來的網域與環境變數設定的網域不同時，強制重導向至正確的網址 (但設定、分享頁面例外)
      if (!isSetup && !isPublicShare && currentHostname !== targetHostname) {
        const target = new URL(
          `${request.nextUrl.pathname}${request.nextUrl.search}`,
          targetUrl.origin,
        );
        const location = target.toString();

        /**
         * Info: (20260809 - Luphia) 防迴圈護欄：每個主機最多只嘗試導向一次。
         *
         * 為什麼需要它——實測（20260810）發現 middleware 發出的 Location 會被 Next
         * 收斂成「只剩路徑」的相對網址，hostname / protocol / port 全部遺失，
         * 連自行寫入 Location 標頭也一樣被改掉。結果是導向指回同一個網址，
         * 瀏覽器重試又命中同一條規則，變成 ERR_TOO_MANY_REDIRECTS。
         *
         * 因此不能只比對「意圖的目標」——bug 出在序列化，比對意圖看不出來。
         * 改用一個短效 cookie 記錄「這個主機已經試過導向了」：
         * 若導向沒有真的生效（瀏覽器又用同一個主機打回來），就直接把頁面送出，
         * 而不是無止盡地彈。10 分鐘後自動失效，因此改好 NEXT_PUBLIC_APP_URL 之後
         * 不需要手動清 cookie 也會恢復正常導向。
         *
         * 選 cookie 而不是在網址上加參數，是為了不污染使用者看到的網址。
         * 迴圈發生在同一個主機上，所以 cookie 一定帶得回來。
         */
        const alreadyTried = request.cookies.get(CANONICAL_REDIRECT_COOKIE);

        if (!alreadyTried) {
          const response = new NextResponse(null, {
            status: 307,
            headers: { location },
          });
          response.cookies.set(CANONICAL_REDIRECT_COOKIE, "1", {
            path: "/",
            maxAge: 600,
            sameSite: "lax",
          });
          return response;
        }
      }
    } catch {
      // Info: (20260413 - Luphia) URL 解析錯誤時忽略
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-url", request.url);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Info: (20260116 - Luphia) Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
