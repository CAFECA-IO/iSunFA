import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';
import React from 'react';
import NavBar from '../../../../components/nav_bar/nav_bar';
import ReportsSidebar from '../../../../components/reports_sidebar/reports_sidebar';
import { AnalysisReportTypesKey, AnalysisReportTypesMap } from '../../../../interfaces/report_type';

interface IServerSideProps {
  reportType: AnalysisReportTypesKey;
}

// TODO: Fetch report data with `reportType`, `reportLanguage` and `startTimestamp` and `endTimestamp` (20240429 - Shirley)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const AnalysisReportViewPage = ({ reportType }: IServerSideProps) => {
  return (
    <div>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        {/* TODO: i18n (20240409 - Shirley) */}
        <title>{AnalysisReportTypesMap[reportType].name} - iSunFA</title>
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

      <div className="font-barlow">
        <div className="">
          <NavBar />
        </div>

        <div className="flex w-full flex-1 flex-col overflow-x-hidden">
          <ReportsSidebar />
        </div>

        {/* TODO: Analysis Report View section (20240508 - Shirley) */}
        <div className="h-screen bg-surface-neutral-main-background">
          <p className="pl-40 pt-32 text-3xl">{AnalysisReportTypesMap[reportType].name}</p>
        </div>
      </div>
    </div>
  );
};

export default AnalysisReportViewPage;

export const getServerSideProps: GetServerSideProps = async ({ locale, query }) => {
  // Info: variable from URL query (20240429 - Shirley)
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { report_type, report_language, start_timestamp, end_timestamp } = query;

  if (!report_type || !report_language || !start_timestamp || !end_timestamp) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      reportType: report_type as string,
      reportLanguage: report_language as string,
      startTimestamp: start_timestamp as string,
      endTimestamp: end_timestamp as string,
      ...(await serverSideTranslations(locale as string, ['common'])),
    },
  };
};
