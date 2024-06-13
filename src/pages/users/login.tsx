import { useRouter } from 'next/router';
import Head from 'next/head';
import React, { useEffect } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import NavBar from '@/components/nav_bar/nav_bar';
import LoginPageBody from '@/components/login_page_body/login_page_body';
import { useUserCtx } from '@/contexts/user_context';
import { ISUNFA_ROUTE } from '@/constants/url';
import { GetServerSideProps } from 'next';

interface ILoginPageProps {
  invitation: string;
}

const LoginPage = ({ invitation }: ILoginPageProps) => {
  // eslint-disable-next-line no-console
  console.log('invitation', invitation);
  const router = useRouter();
  const { signedIn } = useUserCtx();

  useEffect(() => {
    if (signedIn) {
      router.push(ISUNFA_ROUTE.SELECT_COMPANY);
    }
  }, [signedIn]);

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        {/* TODO: i18n (20240409 - Shirley) */}
        <title>Login - iSunFA</title>
        <meta
          name="description"
          content="iSunFA: BOLT AI Forensic Accounting and Auditing is where simplicity meets accuracy in the realm of financial investigations."
        />
        <meta name="author" content="CAFECA" />
        <meta name="keywords" content="區塊鏈,人工智慧,會計" />

        <meta property="og:title" content="iSunFA" />
        <meta
          property="og:description"
          content="iSunFA: BOLT AI Forensic Accounting and Auditing is where simplicity meets accuracy in the realm of financial investigations."
        />
      </Head>

      <div className="h-screen bg-white">
        <div className="">
          <NavBar />
        </div>
        <div className="pt-16">
          <LoginPageBody invitation={invitation} />
        </div>
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ locale, query }) => {
  const { invitation = '' } = query;
  return {
    props: {
      invitation: invitation as string,
      ...(await serverSideTranslations(locale as string, ['common'])),
    },
  };
};

export default LoginPage;
