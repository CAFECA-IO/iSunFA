'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth_context';
import { MODULES } from '@/constants/modules';
import { useTranslation } from '@/i18n/i18n_context';

const SYSTEM_PAGES = ['settings', 'billing', 'team'];

export default function UserDynamicPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  // Info: (20260118 - Luphia) Safely extract slug (handle string or array)
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Info: (20260118 - Luphia) AuthGuard handles this usually
      return;
    }

    // Info: (20260118 - Luphia) 1. Check if it's a System Page
    if (SYSTEM_PAGES.includes(slug as string)) {
      // Authorized
      return;
    }

    // Info: (20260118 - Luphia) 2. Check if it's a Module
    const foundModule = MODULES.find((m) => m.key === slug);
    if (foundModule) {
      // Info: (20260118 - Luphia) Check permission
      if (user.modules && user.modules.includes(slug as string)) {
        // Info: (20260118 - Luphia) Authorized
      } else {
        // Info: (20260118 - Luphia) Valid module but user doesn't have it -> Locked
        router.replace('/user/locked');
      }
      return;
    }

    // Info: (20260118 - Luphia) 3. Unknown page -> Locked
    router.replace('/user/locked');
  }, [user, loading, slug, router]);

  if (loading || !user) {
    return <div className="p-8 text-center text-gray-500">{t('common.loading')}</div>;
  }

  // Info: (20260118 - Luphia) Determine if we should show content
  const isSystemPage = SYSTEM_PAGES.includes(slug as string);
  const foundModule = MODULES.find((m) => m.key === slug as string);
  const isModulePage = !!foundModule;
  const hasModuleAccess = isModulePage && user.modules?.includes(slug as string);

  const isAuthorized = isSystemPage || (isModulePage && hasModuleAccess);

  if (!isAuthorized) {
    // Info: (20260118 - Luphia) Will redirect in useEffect, show loading meanwhile or nothing
    return <div className="p-8 text-center text-gray-500">{t('common.loading')}</div>;
  }

  // Info: (20260118 - Luphia) Render Placeholder for valid Content
  const title = isSystemPage
    ? t(`sidebar.${slug as string}`)
    : t(`chat.tags.${slug as string}`);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      </div>
      <div className="flex flex-1 items-center justify-center rounded-xl bg-white border border-dashed border-gray-300 p-12">
        <div className="text-center">
          <h3 className="mt-2 text-sm font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-500">{t('pricing.coming_soon_message')}</p>
        </div>
      </div>
    </div>
  );
}
