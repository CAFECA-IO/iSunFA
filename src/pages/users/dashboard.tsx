import { useRouter } from 'next/router';
import Head from 'next/head';
import React, { useEffect } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useGlobalCtx } from '@/contexts/global_context';
import { ToastType } from '@/interfaces/toastify';
import Link from 'next/link';
import { ToastId } from '@/constants/toast_id';
import NavBar from '@/components/nav_bar/nav_bar';
import { ILocale } from '@/interfaces/locale';
import { useUserCtx } from '@/contexts/user_context';
import { ISUNFA_ROUTE } from '@/constants/url';
import DashboardPageBody from '@/components/dashboard_page_body/dashboard_page_body';

const DashboardPage = () => {
  const router = useRouter();

  const { signedIn, selectedCompany } = useUserCtx();
  const { toastHandler, eliminateToast } = useGlobalCtx();

  useEffect(() => {
    if (!signedIn) {
      router.push(ISUNFA_ROUTE.LOGIN);
    }
  }, [signedIn]);

  useEffect(() => {
    if (!selectedCompany) {
      // Info: (20240513 - Julian) 在使用者選擇公司前，不可以關閉這個 Toast
      toastHandler({
        id: ToastId.TRIAL,
        type: ToastType.INFO,
        closeable: false,
        content: (
          <div className="flex items-center justify-between">
            <p className="text-sm">iSunFA Trial Version</p>
            <Link
              href={ISUNFA_ROUTE.SELECT_COMPANY}
              className="text-base font-semibold text-darkBlue"
            >
              End of trial
            </Link>
          </div>
        ),
      });
    } else {
      eliminateToast(ToastId.TRIAL);
    }
  }, [selectedCompany]);

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

      <div className="h-screen font-barlow">
        <div className="">
          <NavBar />
        </div>
        <div className="pt-14">
          <DashboardPageBody />
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
