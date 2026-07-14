"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";

import AuthGuard from "@/components/auth/auth_guard";
import UserHeader from "@/components/user/user_header";
import UserFooter from "@/components/user/user_footer";
import FaithAgent from "@/components/user/faith_agent";

export default function UserLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Info: (20260714 - Emily) 碳盤查頁已有專屬的碳會計師浮動聊天(CarbonChatWidget),隱藏通用 FaithAgent 避免雙浮動鈕並存
  const hideFaithAgent = pathname?.startsWith("/user/carbon_chatbot");

  return (
    <AuthGuard>
      <div className="flex min-h-screen flex-col bg-gray-50">
        <UserHeader />
        <div className="flex min-w-0 flex-1">
          <main className="w-full max-w-full min-w-0 grow p-4 lg:max-w-[calc(100vw-15px)] lg:p-8">
            {children}
          </main>
        </div>
        {!hideFaithAgent && <FaithAgent />}
        <UserFooter />
      </div>
    </AuthGuard>
  );
}
