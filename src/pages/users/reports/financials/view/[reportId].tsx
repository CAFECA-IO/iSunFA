import NavBar from '@/components/nav_bar/nav_bar';
import ReportsSidebar from '@/components/reports_sidebar/reports_sidebar';
import ViewFinancialSection from '@/components/view_financial_section/view_financial_section';
// import { FinancialReportType } from '@/interfaces/report';
import {
  BaifaReportTypeToReportType,
  FinancialReportTypesKey,
  FinancialReportTypesMap,
  // ReportTypeToBaifaReportType,
} from '@/interfaces/report_type';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';
import React, { useEffect } from 'react';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useGlobalCtx } from '@/contexts/global_context';
import { ToastType } from '@/interfaces/toastify';
import { useUserCtx } from '@/contexts/user_context';
import { DEFAULT_DISPLAYED_COMPANY_ID } from '@/constants/display';

interface IServerSideProps {
  reportId: string;
  reportType: keyof typeof BaifaReportTypeToReportType;
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

const DUMMY_DATA_FOR_REPORT = {
  reportType: 'balance_sheet',
  reportLanguage: 'en',
  startTimestamp: '1711961114',
  endTimestamp: '1714553114',

  tokenContract: '0x00000000219ab540356cBB839Cbe05303d7705Fa',
  tokenId: '37002036',
  reportLink:
    'https://baifa.io/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007/balance',
};

const ViewFinancialReportPage = ({ reportId, reportType }: IServerSideProps) => {
  const { toastHandler } = useGlobalCtx();
  const { selectedCompany } = useUserCtx();
  const [reportData, setReportData] = React.useState<{
    reportTypesName: {
      name: string;
      id: string;
    };
    tokenContract: string;
    tokenId: string;
    reportLink: string;
  }>({
    reportTypesName: FinancialReportTypesMap[
      BaifaReportTypeToReportType[reportType as keyof typeof BaifaReportTypeToReportType]
    ] as { id: FinancialReportTypesKey; name: string },
    tokenContract: DUMMY_DATA_FOR_REPORT.tokenContract,
    tokenId: DUMMY_DATA_FOR_REPORT.tokenId,
    reportLink:
      ReportLink[
        BaifaReportTypeToReportType[reportType as keyof typeof BaifaReportTypeToReportType]
      ],
  });
  const {
    data: reportFinancial,
    code: getFRCode,
    success: getFRSuccess,
  } = APIHandler<{
    reportTypesName: {
      name: string;
      id: string;
    };
    tokenContract: string;
    tokenId: string;
    reportLink: string;
  }>(APIName.REPORT_FINANCIAL_GET_BY_ID, {
    params: { companyId: selectedCompany?.id ?? DEFAULT_DISPLAYED_COMPANY_ID, reportId },
  });

  useEffect(() => {
    if (getFRSuccess === false) {
      toastHandler({
        id: `getFR-${getFRCode}_${reportId}`,
        content: `Failed to get ${reportType} report: ${getFRCode}`,
        type: ToastType.ERROR,
        closeable: true,
      });
    }
    if (getFRSuccess && reportFinancial) {
      setReportData(reportFinancial);
    }
  }, [getFRSuccess, getFRCode, reportFinancial]);

  // TODO: replace ALL dummy data after api calling (20240517 - Shirley)
  return (
    <div>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        {/* TODO: i18n (20240409 - Shirley) */}
        {/* <title>{FinancialReportTypesMap[reportType].name} - iSunFA</title> */}
        <title>
          {
            FinancialReportTypesMap[
              BaifaReportTypeToReportType[reportType as keyof typeof BaifaReportTypeToReportType]
            ].name
          }
          - iSunFA
        </title>

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
            reportTypesName={
              reportData.reportTypesName as {
                id: keyof typeof FinancialReportTypesMap;
                name: string;
              }
            }
            // reportTypesName={FinancialReportTypesMap.balance_sheet as { id: string; name: string }}
            tokenContract={reportData.tokenContract}
            tokenId={reportData.tokenId}
            // reportLink={DUMMY_DATA_FOR_REPORT.reportLink}
            reportLink={reportData.reportLink}
          />
        </div>
      </div>
    </div>
  );
};

export default ViewFinancialReportPage;

export const getServerSideProps: GetServerSideProps = async ({ locale, query }) => {
  // Info: variable from URL query (20240429 - Shirley)
  // eslint-disable-next-line @typescript-eslint/naming-convention
  // const { report_type, report_language, start_timestamp, end_timestamp } = query;

  // if (!report_type || !report_language || !start_timestamp || !end_timestamp) {
  //   return {
  //     notFound: true,
  //   };
  // }

  // Info: variable from URL query (20240429 - Shirley)
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { reportId = '', report_type = '' } = query;
  // if (!report_id || !report_type) {
  //   return {
  //     notFound: true,
  //   };
  // }

  return {
    props: {
      reportId: reportId as string,
      reportType: report_type as string,
      // reportLanguage: report_language as string,
      // startTimestamp: start_timestamp as string,
      // endTimestamp: end_timestamp as string,
      ...(await serverSideTranslations(locale as string, ['common'])),
    },
  };
};
