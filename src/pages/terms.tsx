import Head from 'next/head';
import React from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { useTranslation } from 'next-i18next';
import LandingNavBar from '@/components/landing_page/landing_nav_bar';
import LandingFooter from '@/components/landing_page/landing_footer';
import UserTermsPageBody from '@/components/landing_page/terms_body';

const UserTerms = () => {
  const { t } = useTranslation(['common']);

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('common:LANDING_FOOTER.USER_TERMS')}</title>
      </Head>
      <nav>
        <LandingNavBar transparentInitially />
      </nav>
      <main className="w-screen overflow-hidden bg-navy-blue-600 pt-100px text-text-neutral-invert">
        <UserTermsPageBody />
      </main>

      <LandingFooter />
    </>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, [
      'common',
      'journal',
      'kyc',
      'project',
      'report_401',
      'salary',
      'setting',
      'terms',
    ])),
  },
});

export const getStaticProps = getStaticPropsFunction;

export default UserTerms;
