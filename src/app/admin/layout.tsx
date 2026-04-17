'use client';

import { ReactNode } from 'react';

import { usePathname } from 'next/navigation';
import AdminAuthGuard from '@/components/admin/admin_auth_guard';
import UserHeader from '@/components/user/user_header';
import UserFooter from '@/components/user/user_footer';

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  // Info: (20260415 - Luphia) Do not protect setup and reboot routes
  if (pathname.startsWith('/admin/setup') || pathname.startsWith('/admin/reboot')) {
    return <>{children}</>;
  }

  return (
    <AdminAuthGuard>
      <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
        <UserHeader />
        <main className="flex-grow min-w-0">
          {children}
        </main>
        <UserFooter />
      </div>
    </AdminAuthGuard>
  );
}
