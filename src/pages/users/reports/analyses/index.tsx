import Head from 'next/head';
import React from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import NavBar from '@/components/nav_bar/nav_bar';
import ReportsSidebar from '@/components/reports_sidebar/reports_sidebar';
import { ILocale } from '@/interfaces/locale';
import AnalysisReportSection from '@/components/analysis_reports_section/analysis_reports_section';
import { SkeletonList } from '@/components/skeleton/skeleton';
import { useUserCtx } from '@/contexts/user_context';
import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import { useTranslation } from 'next-i18next';

const AnalysesReportsPage = () => {
  const { t } = useTranslation(['common', 'report_401']);
  const { isAuthLoading } = useUserCtx();
  const displayedBody = isAuthLoading ? (
    <div className="flex h-screen w-full items-center justify-center bg-surface-neutral-main-background">
      <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
    </div>
  ) : (
    <>
      <div className="flex w-full flex-1 flex-col overflow-x-hidden">
        <ReportsSidebar />
      </div>

      <div className="h-1200px overflow-x-hidden bg-surface-neutral-main-background lg:h-1200px">
        <AnalysisReportSection />
      </div>
    </>
  );

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('report_401:REPORTS_SIDEBAR.ANALYSIS_REPORT')} - iSunFA</title>
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

      <div className="-mt-4 font-barlow">
        <div className="">
          <NavBar />
        </div>

        {displayedBody}
      </div>
    </>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, [
      'common',
      'journal',
      'kyc',
      'project',
      'report_401',
      'salary',
      'setting',
      'terms',
      'asset',
    ])),
  },
});

export const getStaticProps = getStaticPropsFunction;

export default AnalysesReportsPage;
