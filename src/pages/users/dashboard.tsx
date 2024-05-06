import { useRouter } from 'next/router';
import Head from 'next/head';
import React, { useEffect } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { IAuditReports } from '@/interfaces/audit_reports';
import useAPI from '@/lib/hooks/use_api';
import { APIName } from '@/constants/api_connection';
import NavBar from '../../components/nav_bar/nav_bar';
import { ILocale } from '../../interfaces/locale';
import { useUserCtx } from '../../contexts/user_context';
import { ISUNFA_ROUTE } from '../../constants/url';
import DashboardPageBody from '../../components/dashboard_page_body/dashboard_page_body';

const DashboardPage = () => {
  const router = useRouter();
  const {
    isLoading: listLoading,
    data: auditReports,
    error: listError,
    success: listSuccess,
  } = useAPI<IAuditReports[]>(APIName.LIST_AUDIT_REPORTS, {}, false, true);

  const { signedIn } = useUserCtx();

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

      <div className="h-screen font-barlow">
        <div className="">
          <NavBar />
        </div>
        <div className="pt-16">
          <DashboardPageBody />
        </div>
        {listLoading === false && listSuccess === true ? (
          auditReports?.map((auditReport) => <div key={auditReport.code}>{auditReport.link}</div>)
        ) : (
          <p>{JSON.stringify(listError)}</p>
        )}
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
