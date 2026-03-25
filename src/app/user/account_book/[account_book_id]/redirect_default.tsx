'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

function Redirector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const prefix = '/user/account_book/default';
    let suffix = '/dashboard';
    if (pathname && pathname.startsWith(prefix)) {
      suffix = pathname.substring(prefix.length);
      if (!suffix.startsWith('/')) {
        suffix = '/' + suffix;
      }
    }
    if (suffix === '/' || suffix === '') suffix = '/dashboard';

    // Info: (20260325 - Luphia) Include the original query string
    const query = searchParams.toString();
    const finalSuffix = query ? `${suffix}?${query}` : suffix;

    router.replace(`/user/account_book?uri_query=${encodeURIComponent(finalSuffix)}`);
  }, [pathname, searchParams, router]);

  return null;
}

export default function RedirectDefault() {
  return (
    <Suspense fallback={null}>
      <Redirector />
    </Suspense>
  );
}
