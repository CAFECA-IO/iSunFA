import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import React from 'react';
import LandingNavBar from '@/components/landing_nav_bar/landing_nav_bar';
import { ILocale } from '@/interfaces/locale';
import LandingPageBody from '@/components/landing_page_body/landing_page_body';
import { useTranslation } from 'next-i18next';

interface ILandingPageProps {
  locale: string;
}

function LandingPage({ locale }: ILandingPageProps) {
  const { t } = useTranslation('common');
  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('META.TITLE')}</title>
        <meta name="description" content={t('META.DESCRIPTION')} />
        <meta name="author" content="CAFECA" />
        <meta name="keywords" content={t('META.KEYWORDS')} />

        <meta property="og:title" content="iSunFA" />
        <meta property="og:description" content={t('META.DESCRIPTION')} />
        {/* TODO: [Beta] i18n for image (20240807 - Shirley) */}
        <meta property="og:image" content={`https://isunfa.com/meta/isunfa_preview.png`} />
        <meta property="og:url" content={`https://isunfa.com/${locale}`} />
        <meta property="og:type" content="website" />
      </Head>

      {/*  Info: (20230712 - Shirley) Navbar */}
      <nav className="">
        <LandingNavBar transparentInitially />
      </nav>

      <main className="w-screen overflow-hidden text-white">
        <LandingPageBody />
      </main>
    </>
  );
}

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common'])),
    locale,
  },
});

export const getStaticProps = getStaticPropsFunction;

export default LandingPage;
