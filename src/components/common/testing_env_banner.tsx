'use client';

import { useTranslation } from '@/i18n/i18n_context';
import { usePathname } from 'next/navigation';

export default function TestingEnvBanner() {
  const { t } = useTranslation();
  const pathname = usePathname();

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <div className="bg-yellow-100 text-yellow-800 text-center py-1.5 px-3 sm:py-2 sm:px-4 text-xs sm:text-sm font-medium z-50 break-words leading-relaxed sm:leading-normal">
      <span>{t('common.testing_env_banner.message')}</span>
      <a href="https://isunfa.com" className="font-bold underline hover:text-yellow-600 inline-block mt-0.5 sm:mt-0 sm:ml-1 break-all">
        https://isunfa.com
      </a>
    </div>
  );
}
