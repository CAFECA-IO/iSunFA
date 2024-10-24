import Head from 'next/head';
import React from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import LoginPageBody from '@/components/beta/login/login_page_body';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';

const LoginPage = () => {
  const { t } = useTranslation('common');

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('common:NAV_BAR.LOGIN')} - iSunFA</title>
        <meta
          name="description"
          content="iSunFA: Blockchain AI Forensic Accounting and Auditing is where simplicity meets accuracy in the realm of financial investigations."
        />
        <meta name="author" content="CAFECA" />
        <meta name="keywords" content="區塊鏈,人工智慧,會計" />
        <meta property="og:title" content="iSunFA" />
        <meta
          property="og:description"
          content="iSunFA: Blockchain AI Forensic Accounting and Auditing is where simplicity meets accuracy in the realm of financial investigations."
        />
      </Head>

      <div className="h-screen">
        <LoginPageBody />
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ locale, query }) => {
  const { invitation = '', action = '' } = query;

  return {
    props: {
      invitation: invitation as string,
      action: action as string,
      ...(await serverSideTranslations(locale as string, [
        'common',
        'report_401',
        'journal',
        'kyc',
        'project',
        'setting',
        'terms',
        'salary',
      ])),
    },
  };
};

export default LoginPage;
