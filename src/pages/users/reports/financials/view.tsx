/* eslint-disable */
// TODO: developing，需要將 route 改為 `users/reports/financials/view/{report_id}`，透過 report_id 去 fetch report 資料 (20240515 - Shirley)
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';
import React from 'react';
import NavBar from '../../../../components/nav_bar/nav_bar';
import ReportsSidebar from '../../../../components/reports_sidebar/reports_sidebar';
import ViewFinancialSection from '../../../../components/view_financial_section/view_financial_section';
import {
  FinancialReportTypesKey,
  FinancialReportTypesMap,
} from '../../../../interfaces/report_type';
import { ReportLanguagesKey } from '../../../../interfaces/report_language';

interface IServerSideProps {
  reportId: string;
  // reportType: FinancialReportTypesKey;
  // reportLanguage: ReportLanguagesKey;
  // startTimestamp: string;
  // endTimestamp: string;
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

const View = ({ reportId }: IServerSideProps) => {
  // TODO: Fetch report data with `reportType`, `reportLanguage` and `startTimestamp` and `endTimestamp` (20240429 - Shirley)

  const dummyReportData = {
    tokenContract: '0x00000000219ab540356cBB839Cbe05303d7705Fa',
    tokenId: '37002036',
    reportLink:
      'https://baifa.io/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007/balance',
    // reportLink: ReportLink[reportType],
  };

  return (
    <div>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        {/* TODO: i18n (20240409 - Shirley) */}
        {/* <title>{FinancialReportTypesMap[reportType].name} - iSunFA</title> */}
        <title> - iSunFA</title>

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
          <ViewFinancialSection
            reportTypesName={FinancialReportTypesMap.balance_sheet as { id: string; name: string }}
            // reportTypesName={FinancialReportTypesMap[reportType] as { id: string; name: string }}
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
  // const { report_type, report_language, start_timestamp, end_timestamp } = query;

  // if (!report_type || !report_language || !start_timestamp || !end_timestamp) {
  //   return {
  //     notFound: true,
  //   };
  // }

  const { report_id } = query;
  if (!report_id) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      reportId: report_id as string,
      // reportType: report_type as string,
      // reportLanguage: report_language as string,
      // startTimestamp: start_timestamp as string,
      // endTimestamp: end_timestamp as string,
      ...(await serverSideTranslations(locale as string, ['common'])),
    },
  };
};
