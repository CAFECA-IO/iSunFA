'use client';

import { useEffect, ReactNode } from 'react';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth_context';

export default function AdminAuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Info: (20260415 - Luphia) 衍生狀態，直接在渲染期間同步計算
  const isAuthorized = Boolean(
    user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')
  );

  useEffect(() => {
    // Info: (20260415 - Luphia) 只有在讀取完畢且未獲授權時，才執行導向
    if (!loading && !isAuthorized) {
      router.replace('/');
    }
  }, [loading, isAuthorized, router]);

  // Info: (20260415 - Luphia) 讀取中，或是獲授權中時顯示 Loading
  if (loading || !isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
