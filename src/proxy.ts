import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const targetUrlStr = process.env.NEXT_PUBLIC_APP_URL;

  if (targetUrlStr) {
    try {
      const targetUrl = new URL(targetUrlStr);
      const hostHeader = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
      const currentHostname = hostHeader ? hostHeader.split(":")[0] : request.nextUrl.hostname;

      // Info: (20260413 - Luphia) 當進來的網域與環境變數設定的網域不同時，強制重導向至正確的網址
      if (currentHostname !== targetUrl.hostname) {
        const redirectUrl = new URL(request.url);
        redirectUrl.hostname = targetUrl.hostname;
        redirectUrl.protocol = targetUrl.protocol;
        redirectUrl.port = targetUrl.port;

        return NextResponse.redirect(redirectUrl);
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
