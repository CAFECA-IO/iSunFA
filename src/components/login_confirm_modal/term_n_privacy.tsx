import React from 'react';
import { useTranslation } from 'react-i18next';

const TermsOfServiceAndPrivacyPolicy: React.FC = () => {
  const { t } = useTranslation('common');
  return (
    <div className="p-6 space-y-4 text-navyBlue">
      <p className="font-semibold">{t('TOS_N_PP.DEAR_USER')}</p>
      <p>{t('TOS_N_PP.WELCOME')}</p>

      <p className="font-semibold">{t('TOS_N_PP.TERMS_OF_SERVICE')}</p>

      <p className="font-semibold">{t('TOS_N_PP.SERVICE_CONTENT_TITLE')}</p>
      <p>{t('TOS_N_PP.SERVICE_CONTENT')}</p>

      <p className="font-semibold">{t('TOS_N_PP.ELIGIBILITY_TITLE')}</p>
      <p>{t('TOS_N_PP.ELIGIBILITY')}</p>

      <p className="font-semibold">{t('TOS_N_PP.ACCOUNT_MANAGEMENT_TITLE')}</p>
      <p>{t('TOS_N_PP.ACCOUNT_MANAGEMENT')}</p>

      <p className="font-semibold">{t('TOS_N_PP.SERVICE_FEES_TITLE')}</p>
      <p>{t('TOS_N_PP.SERVICE_FEES')}</p>

      <p className="font-semibold">{t('TOS_N_PP.LIABILITY_TITLE')}</p>
      <p>{t('TOS_N_PP.LIABILITY')}</p>

      <p className="font-semibold">{t('TOS_N_PP.TERMINATION_TITLE')}</p>
      <p>{t('TOS_N_PP.TERMINATION')}</p>

      <p className="font-semibold">{t('TOS_N_PP.PRIVACY_POLICY')}</p>

      <p className="font-semibold">{t('TOS_N_PP.INFO_COLLECTION_TITLE')}</p>
      <p>{t('TOS_N_PP.INFO_COLLECTION')}</p>

      <p className="font-semibold">{t('TOS_N_PP.USE_OF_INFO_TITLE')}</p>
      <p>{t('TOS_N_PP.USE_OF_INFO')}</p>

      <p className="font-semibold">{t('TOS_N_PP.PROTECTION_TITLE')}</p>
      <p>{t('TOS_N_PP.PROTECTION')}</p>

      <p className="font-semibold">{t('TOS_N_PP.SHARING_TITLE')}</p>
      <p>{t('TOS_N_PP.SHARING')}</p>

      <p className="font-semibold">{t('TOS_N_PP.YOUR_RIGHTS_TITLE')}</p>
      <p>{t('TOS_N_PP.YOUR_RIGHTS')}</p>
      <p>{t('TOS_N_PP.EMAIL')}</p>
      <p>{t('TOS_N_PP.PHONE')}</p>
      <p>{t('TOS_N_PP.RESPONSE_TIME')}</p>

      <p className="font-semibold">{t('TOS_N_PP.CHANGES_TITLE')}</p>
      <p>{t('TOS_N_PP.CHANGES')}</p>

      <p>{t('TOS_N_PP.THANK_YOU')}</p>
      <p className="font-semibold">{t('TOS_N_PP.SIGN_OFF')}</p>
    </div>
  );
};

export default TermsOfServiceAndPrivacyPolicy;
