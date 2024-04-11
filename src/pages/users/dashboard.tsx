import { useRouter } from 'next/router';
import Head from 'next/head';
import React, { useEffect } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import NavBar from '../../components/nav_bar/nav_bar';
import { ILocale } from '../../interfaces/locale';
import { useUser } from '../../contexts/user_context';
import { ISUNFA_ROUTE } from '../../constants/url';

const DashboardPage = () => {
  const router = useRouter();

  const { signedIn } = useUser();

  useEffect(() => {
    if (!signedIn) {
      router.push(ISUNFA_ROUTE.LOGIN);
    }
  }, [signedIn]);

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        {/* TODO: i18n (20240409 - Shirley) */}
        <title>Dashboard - iSunFA</title>
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

        <div className="flex h-screen w-screen items-center justify-center bg-white text-xl text-black">
          Dashboard
        </div>
      </div>
    </>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common'])),
  },
});

export const getStaticProps = getStaticPropsFunction;

export default DashboardPage;
