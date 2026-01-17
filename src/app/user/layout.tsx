'use client';

import AuthGuard from '@/components/auth/auth_guard';

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
