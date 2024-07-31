import Head from 'next/head';
import React, { useEffect } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import NavBar from '@/components/nav_bar/nav_bar';
import LoginPageBody from '@/components/login_page_body/login_page_body';
import { useUserCtx } from '@/contexts/user_context';
import { GetServerSideProps } from 'next';
import { ILoginPageProps } from '@/interfaces/page_props';
import { SkeletonList } from '@/components/skeleton/skeleton';
import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import { useRouter } from 'next/router';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useTranslation } from 'next-i18next';

const LoginPage = ({ invitation, action }: ILoginPageProps) => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { signedIn, isAuthLoading, selectedCompany, returnUrl, clearReturnUrl } = useUserCtx();

  useEffect(() => {
    if (signedIn) {
      if (selectedCompany && returnUrl) {
        const urlString = decodeURIComponent(returnUrl);
        clearReturnUrl();
        router.push(urlString);
      } else {
        router.push(ISUNFA_ROUTE.SELECT_COMPANY);
      }
    }
  }, [signedIn, router]);

  const displayedBody = isAuthLoading ? (
    <div className="flex h-screen w-full items-center justify-center">
      <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
    </div>
  ) : (
    <div className="pt-10">
      <LoginPageBody invitation={invitation} action={action} />
    </div>
  );

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        {/* TODO: i18n (20240409 - Shirley) */}
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

      <div className="h-screen bg-white">
        <div className="">
          <NavBar />
        </div>
        {displayedBody}
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
      ...(await serverSideTranslations(locale as string, ['common'])),
    },
  };
};

export default LoginPage;
