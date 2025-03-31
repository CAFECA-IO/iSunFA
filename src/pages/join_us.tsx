import React from 'react';
import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { useTranslation } from 'next-i18next';
import JoinUsPageBody from '@/components/join_us/join_us_body';

const JoinUsPage: React.FC = () => {
  const { t } = useTranslation(['landing_page']);

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>iSunFA - {t('Join Us')}</title>
      </Head>

      <JoinUsPageBody />
    </>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, ['landing_page_v2', 'terms', 'common'])),
  },
});

export const getStaticProps = getStaticPropsFunction;

export default JoinUsPage;
