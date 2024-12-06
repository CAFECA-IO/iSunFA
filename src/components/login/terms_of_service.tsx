import React from 'react';
import { useTranslation } from 'next-i18next';
import { TELEPHONE, EMAIL } from '@/constants/common';

// Info: (20241206 - Liz) 這是已經結合隱私權政策的服務條款，專門用於登入頁面的服務條款彈窗
const TermsOfService = () => {
  const { t } = useTranslation(['terms']);

  return (
    <main className="flex flex-col text-left text-lg font-semibold text-text-brand-secondary-lv1">
      <h2>{t('terms:TERMS_OF_SERVICE.DEAR_USER')}</h2>
      <h2>{t('terms:TERMS_OF_SERVICE.TEXT0')}</h2>
      <br />

      <h2>{t('terms:TERMS_OF_SERVICE.TEXT1_TITLE')}</h2>
      <p className="text-base">{t('terms:TERMS_OF_SERVICE.TEXT1_P')}</p>
      <ul className="list-inside list-disc indent-2 text-base">
        <li>{t('terms:TERMS_OF_SERVICE.TEXT1_1')}</li>
        <li>{t('terms:TERMS_OF_SERVICE.TEXT1_2')}</li>
        <li>{t('terms:TERMS_OF_SERVICE.TEXT1_3')}</li>
      </ul>
      <br />

      <h2>{t('terms:TERMS_OF_SERVICE.TEXT2_TITLE')}</h2>
      <p className="text-base">{t('terms:TERMS_OF_SERVICE.TEXT2_P')}</p>
      <ul className="list-inside list-disc indent-2 text-base">
        <li>{t('terms:TERMS_OF_SERVICE.TEXT2_1')}</li>
        <li>{t('terms:TERMS_OF_SERVICE.TEXT2_2')}</li>
        <li>{t('terms:TERMS_OF_SERVICE.TEXT2_3')}</li>
        <li>{t('terms:TERMS_OF_SERVICE.TEXT2_4')}</li>
        <li>{t('terms:TERMS_OF_SERVICE.TEXT2_5')}</li>
      </ul>
      <br />

      <h2>{t('terms:TERMS_OF_SERVICE.TEXT3_TITLE')}</h2>
      <p className="text-base">{t('terms:TERMS_OF_SERVICE.TEXT3_P')}</p>
      <ul className="list-inside list-disc indent-2 text-base">
        <li>{t('terms:TERMS_OF_SERVICE.TEXT3_1')}</li>
        <li>{t('terms:TERMS_OF_SERVICE.TEXT3_2')}</li>
        <li>{t('terms:TERMS_OF_SERVICE.TEXT3_3')}</li>
      </ul>
      <br />

      <h2>{t('terms:TERMS_OF_SERVICE.TEXT4_TITLE')}</h2>
      <p className="text-base">{t('terms:TERMS_OF_SERVICE.TEXT4_P')}</p>
      <ul className="list-inside list-disc indent-2 text-base">
        <li>{t('terms:TERMS_OF_SERVICE.TEXT4_1')}</li>
        <li>{t('terms:TERMS_OF_SERVICE.TEXT4_2')}</li>
        <li>{t('terms:TERMS_OF_SERVICE.TEXT4_3')}</li>
      </ul>
      <br />

      <h2>{t('terms:TERMS_OF_SERVICE.TEXT5_TITLE')}</h2>
      <p className="text-base">{t('terms:TERMS_OF_SERVICE.TEXT5_P')}</p>
      <ul className="list-inside list-disc indent-2 text-base">
        <li>
          {t('terms:TERMS_OF_SERVICE.TEXT5_1')}
          {EMAIL}
        </li>
        <li>
          {t('terms:TERMS_OF_SERVICE.TEXT5_2')}
          {TELEPHONE}
        </li>
        <li>{t('terms:TERMS_OF_SERVICE.TEXT5_3')}</li>
      </ul>
      <br />

      <h2>{t('terms:TERMS_OF_SERVICE.TEXT6_TITLE')}</h2>
      <p className="text-base">{t('terms:TERMS_OF_SERVICE.TEXT6_P')}</p>
      <br />

      <p className="text-base">{t('terms:TERMS_OF_SERVICE.TEXT_END')}</p>
      <br />

      <p className="text-base font-normal italic">{t('terms:TERMS_OF_SERVICE.TEXT_BY')}</p>
    </main>
  );
};

export default TermsOfService;
