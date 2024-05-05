import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';
import React from 'react';
import NavBar from '../../../../components/nav_bar/nav_bar';
import ReportsSidebar from '../../../../components/reports_sidebar/reports_sidebar';
import ViewReportSection from '../../../../components/view_report_section/view_report_section';
import { ReportTypesKey, ReportTypesMap } from '../../../../interfaces/report_type';
import { ReportLanguagesKey } from '../../../../interfaces/report_language';

interface IServerSideProps {
  reportType: ReportTypesKey;
  reportLanguage: ReportLanguagesKey;
  startTimestamp: string;
  endTimestamp: string;
}

// TODO: dummy data to be replaced (20240429 - Shirley)
const getBaseUrl = (): string => {
  return 'https://baifa.io';
};

// TODO: dummy data to be replaced (20240429 - Shirley)
const ReportLink = {
  balance_sheet: `${getBaseUrl()}/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007/balance`,
  comprehensive_income_statement: `${getBaseUrl()}/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007/comprehensive-income`,
  cash_flow_statement: `${getBaseUrl()}/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007/cash-flow`,
} as const;

// TODO: Fetch report data with `reportType`, `reportLanguage` and `startTimestamp` and `endTimestamp` (20240429 - Shirley)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const View = ({ reportType, reportLanguage, startTimestamp, endTimestamp }: IServerSideProps) => {
  const dummyReportData = {
    tokenContract: '0x00000000219ab540356cBB839Cbe05303d7705Fa',
    tokenId: '37002036',
    reportLink: ReportLink[reportType],
  };

  return (
    <div>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        {/* TODO: i18n (20240409 - Shirley) */}
        <title>{ReportTypesMap[reportType].name} - iSunFA</title>
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

        <div className="h-screen bg-surface-neutral-main-background">
          <ViewReportSection
            reportTypesName={ReportTypesMap[reportType] as { id: string; name: string }}
            tokenContract={dummyReportData.tokenContract}
            tokenId={dummyReportData.tokenId}
            reportLink={dummyReportData.reportLink}
          />
        </div>
      </div>
    </div>
  );
};

export default View;

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
