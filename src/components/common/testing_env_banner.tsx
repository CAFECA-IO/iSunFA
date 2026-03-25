'use client';

import { useTranslation } from '@/i18n/i18n_context';

export default function TestingEnvBanner() {
  const { t } = useTranslation();

  return (
    <div className="bg-yellow-100 text-yellow-800 text-center py-2 px-4 text-sm font-medium z-50">
      {t('common.testing_env_banner.message')}
      <a href="https://isunfa.com" className="font-bold underline hover:text-yellow-600">
        https://isunfa.com
      </a>
    </div>
  );
}
