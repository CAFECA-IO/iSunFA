import Head from 'next/head';
import React from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { useTranslation } from 'next-i18next';
import LandingNavBar from '@/components/landing_page/landing_nav_bar';
import LandingPageBody from '@/components/landing_page/landing_page_body';
import LandingFooter from '@/components/landing_page/landing_footer';

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
        <title>{t('common:META.TITLE')}</title>
        <meta name="description" content={t('common:META.DESCRIPTION')} />
        <meta name="author" content="CAFECA" />
        <meta name="keywords" content={t('common:META.KEYWORDS')} />

        <meta property="og:title" content="iSunFA" />
        <meta property="og:description" content={t('common:META.DESCRIPTION')} />
        {/* TODO: (20240807 - Shirley) [Beta] i18n for image */}
        <meta property="og:image" content={`https://isunfa.com/meta/isunfa_preview.png`} />
        <meta property="og:url" content={`https://isunfa.com/${locale}`} />
        <meta property="og:type" content="website" />
      </Head>

      {/* Info: (20230712 - Shirley) Navbar */}
      <nav>
        <LandingNavBar transparentInitially />
      </nav>

      <main className="w-screen overflow-hidden text-white">
        <LandingPageBody />
      </main>

      {/* Info: (20240912 - Liz) Footer */}
      <div>
        <LandingFooter />
      </div>
    </>
  );
}

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, 'common')),
    locale,
  },
});

export const getStaticProps = getStaticPropsFunction;

export default LandingPage;
