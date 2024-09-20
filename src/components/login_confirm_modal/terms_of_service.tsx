import React from 'react';
import { useTranslation } from 'next-i18next';

// Info: (20240919 - Liz) 服務條款

const TermsOfService: React.FC = () => {
  const { t } = useTranslation(['common', 'terms']);
  return (
    <main className="flex flex-col gap-20px text-lg font-semibold">
      <h1 className="mb-10px text-40px font-bold text-text-brand-primary-lv3">
        {t('common:LANDING_FOOTER.TERMS_OF_SERVICE')}
      </h1>

      <p>{t('terms:TERMS_OF_SERVICE.TEXT_01')}</p>
      <p>{t('terms:TERMS_OF_SERVICE.TEXT_02')}</p>
      <p>{t('terms:TERMS_OF_SERVICE.TEXT_03')}</p>
      <p>{t('terms:TERMS_OF_SERVICE.TEXT_04')}</p>
      <p>{t('terms:TERMS_OF_SERVICE.TEXT_05')}</p>
      <p>{t('terms:TERMS_OF_SERVICE.TEXT_06')}</p>
      <p>{t('terms:TERMS_OF_SERVICE.TEXT_07')}</p>
      <p>{t('terms:TERMS_OF_SERVICE.TEXT_08')}</p>
      <p>{t('terms:TERMS_OF_SERVICE.TEXT_09')}</p>
      <p>{t('terms:TERMS_OF_SERVICE.TEXT_10')}</p>
      <p>{t('terms:TERMS_OF_SERVICE.TEXT_11')}</p>
      <p>{t('terms:TERMS_OF_SERVICE.TEXT_12')}</p>
      <p>{t('terms:TERMS_OF_SERVICE.TEXT_13')}</p>
      <p>{t('terms:TERMS_OF_SERVICE.TEXT_14')}</p>
      <p>
        {t('terms:TERMS_OF_SERVICE.TEXT_15')}
        <ul className="list-inside list-disc indent-6">
          <li>{t('terms:TERMS_OF_SERVICE.TEXT_15_01')}</li>
          <li>{t('terms:TERMS_OF_SERVICE.TEXT_15_02')}</li>
        </ul>
      </p>
    </main>
  );
};

export default TermsOfService;
