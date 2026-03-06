'use client';

import AuthGuard from '@/components/auth/auth_guard';
import UserHeader from '@/components/user/user_header';
import UserFooter from '@/components/user/user_footer';
import FaithAgent from '@/components/user/faith_agent';

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <UserHeader />
        <div className="flex flex-1">
          <main className="grow lg:max-w-[calc(100vw-15px)] p-4 lg:p-8">
            {children}
          </main>
        </div>
        <FaithAgent />
        <UserFooter />
      </div>
    </AuthGuard>
  );
}
