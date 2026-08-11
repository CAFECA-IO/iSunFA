"use client";

import { ReactNode } from "react";

import { usePathname } from "next/navigation";
import AdminAuthGuard from "@/components/admin/admin_auth_guard";
import UserHeader from "@/components/user/user_header";
import UserFooter from "@/components/user/user_footer";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Info: (20260415 - Luphia) Do not protect setup and reboot routes
  if (
    pathname.startsWith("/admin/setup") ||
    pathname.startsWith("/admin/reboot")
  ) {
    return <>{children}</>;
  }

  return (
    <AdminAuthGuard>
      {/**
       * Info: (20260809 - Luphia) 不加 dark: 變體：globals.css 已把 slate 重映到 --t-* 色階，
       * 而深色階是淺色階上下顛倒，bg-slate-50 在深色模式本來就會變成 15.5% 的深底。
       * 再寫 dark:bg-slate-950 等於翻兩次 —— --neutral-dark-950 是 99% 亮度，整頁會變成近白色。
       */}
      <div className="flex min-h-screen flex-col bg-slate-50">
        <UserHeader />
        <main className="min-w-0 flex-grow">{children}</main>
        <UserFooter />
      </div>
    </AdminAuthGuard>
  );
}
