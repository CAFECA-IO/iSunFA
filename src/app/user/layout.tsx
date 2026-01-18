'use client';

import AuthGuard from '@/components/auth/auth_guard';
import UserHeader from '@/components/user/user_header';
import UserFooter from '@/components/user/user_footer';

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <UserHeader />
        <main className="flex-grow">
          {children}
        </main>
        <UserFooter />
      </div>
    </AuthGuard>
  );
}
