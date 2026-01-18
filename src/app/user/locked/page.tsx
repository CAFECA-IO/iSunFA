'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useTranslation } from '@/i18n/i18n_context';
import ConfirmModal from '@/components/common/confirm_modal';

export default function LockedPage() {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePurchase = () => {
    setIsModalOpen(true);
  };

  return (
    <div className="flex h-full flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="mb-6 rounded-full bg-gray-100 p-6 ring-1 ring-gray-200">
          <Lock className="h-12 w-12 text-gray-400" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          {t('locked.title')}
        </h1>
        <p className="mb-8 text-sm text-gray-500 max-w-sm">
          {/* Info: (20260118 - Luphia) Optional description, can add if needed */}
        </p>
        <button
          onClick={handlePurchase}
          className="rounded-md bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 transition-all hover:scale-105"
        >
          {t('locked.purchase')}
        </button>
      </div>

      <ConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('pricing.coming_soon_title')}
        message={t('pricing.coming_soon_message')}
        confirmText={t('common.confirm')}
        onConfirm={() => setIsModalOpen(false)}
      />
    </div>
  );
}
