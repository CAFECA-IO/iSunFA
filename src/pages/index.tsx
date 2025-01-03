import React from 'react';
import Head from 'next/head';
import LandingPageBody from '@/components/landing_page_v2/landing_page_body';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';

const LandingPage: React.FC = () => {
  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>iSunFA</title>
      </Head>

      <LandingPageBody />
    </>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, ['landing_page_v2'])),
    locale,
  },
});

export const getStaticProps = getStaticPropsFunction;

export default LandingPage;
