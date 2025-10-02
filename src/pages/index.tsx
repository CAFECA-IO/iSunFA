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
        <meta content="企業觀測站" property="og:title" />
        <meta
          content="提供上市、上櫃及興櫃公司之重要資訊，涵蓋財務報告、重大訊息與股東會資料，協助投資人快速掌握公司動態與市場趨勢，同時亦揭露未公開發行公司的相關資訊。"
          property="og:description"
        />
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
