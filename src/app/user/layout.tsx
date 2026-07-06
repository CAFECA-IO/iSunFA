"use client";

import { ReactNode } from "react";

import AuthGuard from "@/components/auth/auth_guard";
import UserHeader from "@/components/user/user_header";
import UserFooter from "@/components/user/user_footer";
import FaithAgent from "@/components/user/faith_agent";

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
        <FaithAgent />
        <UserFooter />
      </div>
    </AuthGuard>
  );
}
