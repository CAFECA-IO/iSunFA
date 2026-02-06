'use client';

import { useTranslation } from '@/i18n/i18n_context';

export default function Acknowledgement() {
  const { t } = useTranslation();

  return (
    <div className="bg-slate-900 py-8 border-t border-slate-800">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <p className="text-sm text-gray-400">
            {t('acknowledgement.text')}
          </p>
        </div>
      </div>
    </div>
  );
}
