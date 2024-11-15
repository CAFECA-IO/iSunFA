import React from 'react';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import Layout from '@/components/beta/layout/layout';
import AccountingSettingPageBody from '@/components/account_settings/accounting_setting_page_body';

const AccountingSettingPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('setting:ACCOUNTING.TITLE')} - iSunFA</title>
      </Head>

      <Layout isDashboard={false} pageTitle={t('setting:ACCOUNTING.TITLE')}>
        <AccountingSettingPageBody />
      </Layout>
    </>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, [
      'common',
      'journal',
      'setting',
      'asset',
      'dashboard',
    ])),
    locale,
  },
});

export const getStaticProps = getStaticPropsFunction;

export default AccountingSettingPage;
