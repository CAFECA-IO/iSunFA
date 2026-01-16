import { promises as fs } from 'fs';
import path from 'path';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/app/globals.css";
import { I18nProvider } from "@/i18n/i18n_context";
import { AuthProvider } from "@/contexts/auth_context";

import CookieConsent from "@/components/common/cookie_consent";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "iSunFA - 解決財務會計大小事",
  description: "為公司提供企業融資及政府補助申請所需的記帳與稅務解決方案。",
  icons: {
    icon: "/favicon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Info: (20260116 - Antigravity) First run check for .env
  const headersList = await headers();
  const currentUrl = headersList.get('x-url') || "";
  const envPath = path.join(process.cwd(), '.env');
  let envExists = false;

  try {
    await fs.access(envPath);
    envExists = true;
  } catch {
    envExists = false;
  }

  if (currentUrl.includes('/admin/setup')) {
    if (envExists) {
      redirect('/');
    }
  } else {
    if (!envExists) {
      redirect('/admin/setup');
    }
  }

  const privacyPolicyPath = path.join(process.cwd(), 'documents/privacy_policy.md');
  const privacyPolicyContent = await fs.readFile(privacyPolicyPath, 'utf8');

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <I18nProvider>
          <AuthProvider>
            {children}
            <CookieConsent privacyPolicyContent={privacyPolicyContent} />
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
