import { ReactNode } from "react";
import { promises as fs } from "fs";
import path from "path";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "@/app/globals.css";
import { I18nProvider } from "@/i18n/i18n_context";
import { AuthProvider } from "@/contexts/auth_context";
import SessionExpiredNotice from "@/components/auth/session_expired_notice";
import { AiContextProvider } from "@/contexts/ai_context";
import CookieConsent from "@/components/common/cookie_consent";
import TestingEnvBanner from "@/components/common/testing_env_banner";
import { isProduction } from "@/lib/utils/common";
import { THEME_COOKIE_NAME } from "@/constants/theme";
import {
  parseThemeCookie,
  resolveThemeRootClass,
} from "@/lib/utils/theme_cookie";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "iSunFA",
  description:
    "專為企業數位轉型與綠色金融而生！結合前瞻 AI 技術，無縫整合財務會計與溫室氣體盤查。從單據自動辨識、碳排精準核算到產出合規報表，一站式解決企業財會與永續發展痛點，讓您無痛實現碳盤查並邁向淨零碳排！",
  icons: {
    icon: "/favicon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  // Info: (20260118 - Luphia) Check if .env has all required keys from .env.example
  const headersList = await headers();
  const cookieStore = await cookies();
  const currentUrl = headersList.get("x-url") || "";

  // Info: (20260118 - Luphia) .env validator
  const { validateEnv } = await import("@/validators/env");
  const envIsValid = await validateEnv();

  // Info: (20260118 - Luphia) If validation fails, force setup page (unless we are already there)
  if (!envIsValid && !currentUrl.includes("/admin/setup")) {
    redirect("/admin/setup");
  }

  // Info: (20260118 - Luphia) once valid, never setup again
  if (envIsValid && currentUrl.includes("/admin/setup")) {
    redirect("/admin/reboot");
  }

  const privacyPolicyPath = path.join(
    process.cwd(),
    "documents/legal/privacy_policy.md",
  );
  const privacyPolicyContent = await fs.readFile(privacyPolicyPath, "utf8");
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-XXXXXXXXXX";

  /**
   * Info: (20260802 - Luphia) 主題 class 在 SSR 當下就決定，因此沒有 FOUC，
   * 伺服器與瀏覽器算出的結果也一致，不需要 suppressHydrationWarning。
   *
   * 沒有 cookie（跟隨系統）時回空字串 —— 那一態由 globals.css 的
   * `prefers-color-scheme` 媒體查詢承接，伺服器猜不到也不該猜。
   */
  const themeClass = resolveThemeRootClass(
    parseThemeCookie(cookieStore.get(THEME_COOKIE_NAME)?.value),
  );

  return (
    <html lang="en" className={themeClass}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-surface-base text-text-primary antialiased`}
      >
        <GoogleAnalytics gaId={gaId} />
        <I18nProvider>
          {!isProduction() && <TestingEnvBanner />}
          <AuthProvider>
            {/* Info: (20260814 - Luphia) 登入過期的全域提示：401 不再無聲 */}
            <SessionExpiredNotice />
            <AiContextProvider>
              {children}
              <CookieConsent privacyPolicyContent={privacyPolicyContent} />
            </AiContextProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
