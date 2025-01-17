import React from 'react';
import Head from 'next/head';
import PricingPageBody from '@/components/pricing/pricing_page_body';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';

const PriceingPage: React.FC = () => {
  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>iSunFA</title>
      </Head>

      <PricingPageBody />
    </>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, ['pricing'])),
    locale,
  },
});

export const getStaticProps = getStaticPropsFunction;

export default PriceingPage;
