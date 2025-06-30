import Head from 'next/head';
import React from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import NavBar from '@/components/nav_bar/nav_bar';
import FinancialReportSection from '@/components/financial_report_section/financial_report_section';
import { useUserCtx } from '@/contexts/user_context';
import { SkeletonList } from '@/components/skeleton/skeleton';
import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import { useTranslation } from 'next-i18next';
import { GetServerSideProps } from 'next';
import { FinancialReportTypesKey } from '@/interfaces/report_type';

interface IFinancialsReportsPageProps {
  reportType?: string;
}

const FinancialsReportsPage = ({ reportType }: IFinancialsReportsPageProps) => {
  const { t } = useTranslation(['common', 'reports']);
  const { isAuthLoading } = useUserCtx();
  const displayedBody = isAuthLoading ? (
    <div className="flex h-screen w-full items-center justify-center bg-surface-neutral-main-background">
      <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
    </div>
  ) : (
    <>
      <div className="h-1200px overflow-x-hidden bg-surface-neutral-main-background lg:h-1200px">
        <FinancialReportSection reportType={reportType as FinancialReportTypesKey} />
      </div>{' '}
    </>
  );

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('reports:REPORTS_SIDEBAR.FINANCIAL_REPORT')}</title>
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

export const getServerSideProps: GetServerSideProps = async ({ locale, query }) => {
  const { report_type: reportType } = query;
  return {
    props: {
      reportType,
      ...(await serverSideTranslations(locale as string, [
        'common',
        'reports',
        'journal',
        'kyc',
        'project',
        'settings',
        'terms',
        'asset',
      ])),
    },
  };
};

export default FinancialsReportsPage;
