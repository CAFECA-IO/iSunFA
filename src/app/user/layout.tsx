"use client";

import { ReactNode } from "react";

import AuthGuard from "@/components/auth/auth_guard";
import UserHeader from "@/components/user/user_header";
import UserFooter from "@/components/user/user_footer";

/**
 * Info: (20260812 - Luphia) 費思（FaithAgent）已移至帳本 layout
 * （src/app/user/account_book/[account_book_id]/layout.tsx，設計書 §5.3「使用前提」）：
 * 選定帳本後才能使用，故此處不再全域掛載。原本為碳盤查頁避免雙浮動鈕而寫的
 * pathname 判斷隨之移除——碳盤查頁不在帳本路由下，天生就不會出現費思。
 */
export default function UserLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen flex-col bg-gray-50">
        <UserHeader />
        <div className="flex min-w-0 flex-1">
          <main className="w-full max-w-full min-w-0 grow p-4 lg:max-w-[calc(100vw-15px)] lg:p-8">
            {children}
          </main>
        </div>
        <UserFooter />
      </div>
    </AuthGuard>
  );
}
