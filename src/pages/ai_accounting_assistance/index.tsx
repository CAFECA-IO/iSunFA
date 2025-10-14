import React from 'react';
import Head from 'next/head';
// import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import AAAHomePageBody from '@/components/ai_accounting_assistance/home_page_body';

const AAAHomePage: React.FC = () => {
  //   const { t } = useTranslation('calculator');

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta content="AI 會計小幫手" property="og:title" />
        <meta content="" property="og:description" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>iSunFA - AI 會計小幫手</title>
      </Head>

      <AAAHomePageBody />
    </>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common', 'calculator', 'date_picker'])),
  },
});

export const getStaticProps = getStaticPropsFunction;

export default AAAHomePage;
