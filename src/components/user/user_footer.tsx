'use client';

import { useState } from 'react';
import CookieSettingsTrigger from '@/components/landing_page/cookie_settings_link';
import { useTranslation } from '@/i18n/i18n_context';
import LegalModal from '@/components/common/legal_modal';

export default function UserFooter() {
  const { t } = useTranslation();
  const [legalDoc, setLegalDoc] = useState<'terms_of_service' | 'privacy_policy' | 'refund_policy' | null>(null);

  return (
    <footer className="bg-gray-900 text-white border-t border-white/10" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs leading-5 text-gray-500">
            &copy; 2017 - {new Date().getFullYear()} iSunFA. {t('footer.rights_reserved')}
          </p>
          <div className="flex space-x-6 items-center">
            <button
              onClick={() => setLegalDoc('terms_of_service')}
              className="text-xs leading-5 text-gray-500 hover:text-orange-500 transition-colors"
            >
              {t('footer.terms')}
            </button>
            <button
              onClick={() => setLegalDoc('privacy_policy')}
              className="text-xs leading-5 text-gray-500 hover:text-orange-500 transition-colors"
            >
              {t('footer.privacy')}
            </button>
            <button
              onClick={() => setLegalDoc('refund_policy')}
              className="text-xs leading-5 text-gray-500 hover:text-orange-500 transition-colors"
            >
              {t('footer.refund')}
            </button>
            <CookieSettingsTrigger />
          </div>
        </div>
      </div>
      <LegalModal
        isOpen={!!legalDoc}
        onClose={() => setLegalDoc(null)}
        documentType={legalDoc}
      />
    </footer>
  );
}
