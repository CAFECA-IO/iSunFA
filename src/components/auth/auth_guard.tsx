'use client';

import { useEffect, useState, ReactNode } from 'react';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth_context';

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Info: (20260118 - Luphia) Redirect to home if not authenticated
        router.replace('/');
      } else {
         
        setAuthorized(true);
      }
    }
  }, [user, loading, router]);

  if (loading || !authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
