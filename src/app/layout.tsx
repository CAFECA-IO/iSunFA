import { promises as fs } from 'fs';
import path from 'path';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GoogleAnalytics } from '@next/third-parties/google';
import "@/app/globals.css";
import { I18nProvider } from "@/i18n/i18n_context";
import { AuthProvider } from "@/contexts/auth_context";
import { AiContextProvider } from "@/contexts/ai_context";
import CookieConsent from "@/components/common/cookie_consent";
import TestingEnvBanner from "@/components/common/testing_env_banner";
import { isProduction } from "@/lib/utils/common";

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
  description: "專為企業數位轉型與綠色金融而生！結合前瞻 AI 技術，無縫整合財務會計與溫室氣體盤查。從單據自動辨識、碳排精準核算到產出合規報表，一站式解決企業財會與永續發展痛點，讓您無痛實現碳盤查並邁向淨零碳排！",
  icons: {
    icon: "/favicon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Info: (20260118 - Luphia) Check if .env has all required keys from .env.example
  const headersList = await headers();
  const currentUrl = headersList.get('x-url') || "";

  // Info: (20260118 - Luphia) .env validator
  const { validateEnv } = await import('@/validators/env');
  const envIsValid = await validateEnv();

  // Info: (20260118 - Luphia) If validation fails, force setup page (unless we are already there)
  if (!envIsValid && !currentUrl.includes('/admin/setup')) {
    redirect('/admin/setup');
  }

  // Info: (20260118 - Luphia) once valid, never setup again
  if (envIsValid && currentUrl.includes('/admin/setup')) {
    redirect('/');
  }

  const privacyPolicyPath = path.join(process.cwd(), 'documents/privacy_policy.md');
  const privacyPolicyContent = await fs.readFile(privacyPolicyPath, 'utf8');
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-XXXXXXXXXX";

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GoogleAnalytics gaId={gaId} />
        <I18nProvider>
          {!isProduction() && <TestingEnvBanner />}
          <AuthProvider>
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
