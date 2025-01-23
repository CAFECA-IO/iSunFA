import Head from 'next/head';
import React from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import LoginPageBody from '@/components/login/login_page_body';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { ILoginPageProps } from '@/interfaces/page_props';

const LoginPage = ({ invitation, action }: ILoginPageProps) => {
  const { t } = useTranslation('dashboard');

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('dashboard:HEADER.LOGIN')} - iSunFA</title>
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
        <LoginPageBody invitation={invitation} action={action} />
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
      ...(await serverSideTranslations(locale as string, ['dashboard', 'terms'])),
    },
  };
};

export default LoginPage;
