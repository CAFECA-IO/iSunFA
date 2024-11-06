import React from 'react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import Head from 'next/head';
import Layout from '@/components/beta/layout/layout';
import UserSettings from '@/components/user_settings/user_settings';
import NoticeSettings from '@/components/notice_settings/notice_settings';
import CompanySettings from '@/components/company_settiings/company_settings';
import AccountSettings from '@/components/account_settings/account_settings';

const NormalSettingsPage: React.FC = () => {
  const { t } = useTranslation(['setting', 'common']);

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('setting:NORMAL.TITLE')} - iSunFA</title>
      </Head>

      <Layout isDashboard={false} pageTitle={t('setting:NORMAL.TITLE')}>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-lv-7 p-lv-4">
          <UserSettings />
          <NoticeSettings />
          <CompanySettings />
          <AccountSettings />
        </div>
      </Layout>
    </>
  );
};

export const getServerSideProps = async ({ locale }: ILocale) => {
  return {
    props: {
      ...(await serverSideTranslations(locale as string, ['common', 'setting'])),
    },
  };
};

export default NormalSettingsPage;
