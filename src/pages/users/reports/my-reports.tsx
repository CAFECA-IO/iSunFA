/* eslint-disable */
import Head from 'next/head';
import React from 'react';
import NavBar from '../../../components/nav_bar/nav_bar';
import ReportsSidebar from '../../../components/reports_sidebar/reports_sidebar';
import FinancialReportSection from '../../../components/financial_report_section/financial_report_section';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '../../../interfaces/locale';
import AnalysisReportSection from '../../../components/analysis_reports_section/analysis_reports_section';
import MyReportsSection from '../../../components/my_reports_section/my_reports_section';

const AnalysesReportsPage = () => {
  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        {/* TODO: i18n (20240409 - Shirley) */}
        <title>My Reports - iSunFA</title>
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

      <div className="-mt-4 font-barlow">
        <div className="">
          <NavBar />
        </div>

        <div className="flex w-full flex-1 flex-col overflow-x-hidden">
          <ReportsSidebar />
        </div>

        <div className="h-1300px overflow-x-hidden bg-surface-neutral-main-background md:h-1300px">
          <MyReportsSection />
          {/* <AnalysisReportSection /> */}
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

export default AnalysesReportsPage;
