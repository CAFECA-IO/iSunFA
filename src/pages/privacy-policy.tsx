import Head from 'next/head';
import React from 'react';
import { useTranslation } from 'next-i18next';
import LandingNavBar from '@/components/landing_page/landing_nav_bar';
import LandingFooter from '@/components/landing_page/landing_footer';
import PrivacyPolicyPageBody from '@/components/landing_page/policy_body';

const PrivacyPolicy = () => {
  const { t } = useTranslation(['common']);

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('common:LANDING_FOOTER.PRIVACY_POLICY')}</title>
      </Head>

      <nav>
        <LandingNavBar transparentInitially />
      </nav>

      <main className="w-screen overflow-hidden bg-navy-blue-600 pt-100px text-text-neutral-invert">
        <PrivacyPolicyPageBody />
      </main>

      <LandingFooter />
    </>
  );
};

export default PrivacyPolicy;
