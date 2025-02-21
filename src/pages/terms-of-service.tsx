import Head from 'next/head';
import React from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { useTranslation } from 'next-i18next';
import TermsOfServicePageBody from '@/components/landing_page/terms_body';

const TermsOfService = () => {
  const { t } = useTranslation(['landing_page']);

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>iSunFA -{t('terms:TERMS_OF_SERVICE_PAGE.MAIN_TITLE')}</title>
      </Head>

      <TermsOfServicePageBody />
    </>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, ['landing_page_v2', 'terms', 'common'])),
  },
});

export const getStaticProps = getStaticPropsFunction;

export default TermsOfService;
