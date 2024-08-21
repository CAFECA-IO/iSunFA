import React from 'react';
import { useTranslation } from 'next-i18next';

const InformationStatement: React.FC = () => {
  const { t } = useTranslation('common');
  return (
    <div className="space-y-4 p-6 text-navyBlue">
      <p className="font-semibold">{t('INFO_COLLECTION.DEAR_USER')}</p>
      <p>{t('INFO_COLLECTION.THANK_YOU')}</p>

      <p className="font-semibold">{t('INFO_COLLECTION.TYPES_OF_INFO')}</p>
      <p>{t('INFO_COLLECTION.COLLECT_INFO')}</p>
      <ul className="list-disc space-y-2 pl-6">
        <li>
          <strong>{t('INFO_COLLECTION.PERSONAL_INFO')}</strong>
        </li>
        <li>
          <strong>{t('INFO_COLLECTION.USAGE_DATA')}</strong>
        </li>
        <li>
          <strong>{t('INFO_COLLECTION.TECH_INFO')}</strong>
        </li>
      </ul>

      <p className="font-semibold">{t('INFO_COLLECTION.USE_OF_INFO')}</p>
      <p>{t('INFO_COLLECTION.USE_OF_INFO_DESC')}</p>
      <ul className="list-disc space-y-2 pl-6">
        <li>
          <strong>{t('INFO_COLLECTION.SERVICES')}</strong>
        </li>
        <li>
          <strong>{t('INFO_COLLECTION.PERSONALIZED_SERVICES')}</strong>
        </li>
        <li>
          <strong>{t('INFO_COLLECTION.SUPPORT')}</strong>
        </li>
        <li>
          <strong>{t('INFO_COLLECTION.SECURITY')}</strong>
        </li>
        <li>
          <strong>{t('INFO_COLLECTION.ANALYSIS')}</strong>
        </li>
      </ul>

      <p className="font-semibold">{t('INFO_COLLECTION.PROTECTION_OF_INFO')}</p>
      <p>{t('INFO_COLLECTION.PROTECTION_DESC')}</p>
      <ul className="list-disc space-y-2 pl-6">
        <li>
          <strong>{t('INFO_COLLECTION.ENCRYPTION')}</strong>
        </li>
        <li>
          <strong>{t('INFO_COLLECTION.ACCESS_CONTROL')}</strong>
        </li>
        <li>
          <strong>{t('INFO_COLLECTION.AUDITS')}</strong>
        </li>
      </ul>

      <p className="font-semibold">{t('INFO_COLLECTION.SHARING_OF_INFO')}</p>
      <p>{t('INFO_COLLECTION.SHARING_DESC')}</p>
      <ul className="list-disc space-y-2 pl-6">
        <li>
          <strong>{t('INFO_COLLECTION.LEGAL')}</strong>
        </li>
        <li>
          <strong>{t('INFO_COLLECTION.PROVIDERS')}</strong>
        </li>
        <li>
          <strong>{t('INFO_COLLECTION.BUSINESS_TRANSFERS')}</strong>
        </li>
      </ul>

      <p className="font-semibold">{t('INFO_COLLECTION.YOUR_RIGHTS')}</p>
      <p>{t('INFO_COLLECTION.RIGHTS_DESC')}</p>
      <p>{t('INFO_COLLECTION.EMAIL')}</p>
      <p>{t('INFO_COLLECTION.PHONE')}</p>
      <p>{t('INFO_COLLECTION.RESPONSE_TIME')}</p>

      <p className="font-semibold">{t('INFO_COLLECTION.CHANGES')}</p>
      <p>{t('INFO_COLLECTION.CHANGES_DESC')}</p>

      <p>{t('INFO_COLLECTION.THANK_YOU_END')}</p>
      <p className="font-semibold">{t('INFO_COLLECTION.SIGN_OFF')}</p>
    </div>
  );
};

export default InformationStatement;
