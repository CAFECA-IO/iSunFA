import Head from 'next/head';
import React from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import NavBar from '@/components/nav_bar/nav_bar';
import LoginPageBody from '@/components/login_page_body/login_page_body.beta';
import { GetServerSideProps } from 'next';
// import { useUserCtx } from '@/contexts/user_context';
// import { SkeletonList } from '@/components/skeleton/skeleton';
// import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import { useTranslation } from 'next-i18next';
import { ISUNFA_ROUTE } from '@/constants/url';

const LoginPage = () => {
  const { t } = useTranslation('common');
  // const { isAuthLoading } = useUserCtx();

  const displayedBody = (
    // isAuthLoading ? (
    //   <div className="flex h-screen w-full items-center justify-center">
    //     <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
    //   </div>
    // ) :
    <div className="pt-60px">
      <LoginPageBody />
    </div>
  );

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('NAV_BAR.LOGIN')} - iSunFA</title>
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
        <NavBar />
        {displayedBody}
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ locale, query }) => {
  try {
    // const session = await getSession({ req });
    const { invitation = '', action = '' } = query;

    // 如果没有 session，重定向到登录页面
    // if (!session) {
    //   return {
    //     props: {
    //       invitation: invitation as string,
    //       action: action as string,
    //       ...(await serverSideTranslations(locale as string, ['common'])),
    //     },
    //     redirect: {
    //       destination: ISUNFA_ROUTE.LOGIN_BETA,
    //       permanent: false,
    //     },
    //   };
    // }

    return {
      props: {
        // session,
        invitation: invitation as string,
        action: action as string,
        ...(await serverSideTranslations(locale as string, ['common'])),
      },
    };
  } catch (error) {
    // Deprecate: (20240820-Tzuhan) dev
    // eslint-disable-next-line no-console
    console.error('Error in getServerSideProps:', error);

    return {
      redirect: {
        destination: ISUNFA_ROUTE.LOGIN_BETA,
        permanent: false,
      },
    };
  }
};

export default LoginPage;
