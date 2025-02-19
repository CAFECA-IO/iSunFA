import Head from 'next/head';
import React from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { useTranslation } from 'next-i18next';
import PrivacyPolicyPageBody from '@/components/landing_page/policy_body';

const PrivacyPolicy = () => {
  const { t } = useTranslation(['landing_page']);

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>iSunFA - {t('terms:PRIVACY_POLICY.MAIN_TITLE')}</title>
      </Head>

      <PrivacyPolicyPageBody />
    </>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, ['landing_page_v2', 'terms', 'common'])),
  },
});

export const getStaticProps = getStaticPropsFunction;

export default PrivacyPolicy;
