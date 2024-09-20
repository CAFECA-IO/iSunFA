import React from 'react';
import { useTranslation } from 'next-i18next';

// Info: (20240919 - Liz) 隱私權政策

const PrivacyPolicy: React.FC = () => {
  const { t } = useTranslation(['common', 'terms']);
  return (
    <main className="flex flex-col gap-20px text-lg font-semibold">
      <h1 className="mb-10px text-40px font-bold text-text-brand-primary-lv3">
        {t('common:LANDING_FOOTER.PRIVACY_POLICY')}
      </h1>

      <p>{t('terms:PRIVACY_POLICY.TEXT_01')}</p>
      <p>
        {t('terms:PRIVACY_POLICY.TEXT_02')}
        <ul className="list-inside list-disc indent-6">
          <li>{t('terms:PRIVACY_POLICY.TEXT_02_01')}</li>
          <li>{t('terms:PRIVACY_POLICY.TEXT_02_02')}</li>
          <li>{t('terms:PRIVACY_POLICY.TEXT_02_03')}</li>
        </ul>
      </p>
      <p>{t('terms:PRIVACY_POLICY.TEXT_03')}</p>
      <p>{t('terms:PRIVACY_POLICY.TEXT_04')}</p>
      <p>
        {t('terms:PRIVACY_POLICY.TEXT_05')}
        <ul className="list-inside list-disc indent-6">
          <li>{t('terms:PRIVACY_POLICY.TEXT_05_01')}</li>
          <li>{t('terms:PRIVACY_POLICY.TEXT_05_02')}</li>
        </ul>
      </p>
      <p>{t('terms:PRIVACY_POLICY.TEXT_06')}</p>
      <p>{t('terms:PRIVACY_POLICY.TEXT_07')}</p>
      <p>{t('terms:PRIVACY_POLICY.TEXT_08')}</p>
      <p>{t('terms:PRIVACY_POLICY.TEXT_09')}</p>
      <p>{t('terms:PRIVACY_POLICY.TEXT_10')}</p>
      <p>{t('terms:PRIVACY_POLICY.TEXT_11')}</p>
      <p>{t('terms:PRIVACY_POLICY.TEXT_12')}</p>
    </main>
  );
};

export default PrivacyPolicy;
