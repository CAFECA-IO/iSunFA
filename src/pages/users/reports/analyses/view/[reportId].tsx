import NavBar from '@/components/nav_bar/nav_bar';
import ReportsSidebar from '@/components/reports_sidebar/reports_sidebar';
import { AnalysisReportTypesKey, AnalysisReportTypesMap } from '@/interfaces/report_type';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';
import React, { useEffect } from 'react';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useGlobalCtx } from '@/contexts/global_context';
import { ToastType } from '@/interfaces/toastify';
import ViewAnalysisSection from '@/components/view_analysis_section/view_analysis_section';
import { ReportLanguagesKey } from '@/interfaces/report_language';
import { useUserCtx } from '@/contexts/user_context';
import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import { IReportOld } from '@/interfaces/report';
import { SkeletonList } from '@/components/skeleton/skeleton';
import { useTranslation } from 'next-i18next';

interface IServerSideProps {
  reportType: AnalysisReportTypesKey;
  reportLanguage: ReportLanguagesKey;
  startTimestamp: string;
  endTimestamp: string;
}

// TODO: (20240429 - Shirley) [Beta] dummy data to be replaced
const ReportLink = {
  [AnalysisReportTypesKey.financial_performance]: ``,
  [AnalysisReportTypesKey.cost_analysis]: ``,
  [AnalysisReportTypesKey.hr_utilization]: ``,
  [AnalysisReportTypesKey.forecast_report]: ``,
} as const;

const ViewAnalysisReportPage = ({
  reportType,
  reportLanguage,
  startTimestamp,
  endTimestamp,
}: IServerSideProps) => {
  const { t } = useTranslation('common');
  const { toastHandler } = useGlobalCtx();
  const { selectedCompany, isAuthLoading } = useUserCtx();
  const hasCompanyId = isAuthLoading === false && !!selectedCompany?.id;
  const [reportData, setReportData] = React.useState<IReportOld>({
    reportTypesName: AnalysisReportTypesMap[reportType],
    tokenContract: '0x00000000219ab540356cBB839Cbe05303d7705Fa',
    tokenId: '37002036',
    reportLink: ReportLink[reportType],
  });

  // TODO: (20240429 - Shirley) [Beta] Fetch report data with `reportType`, `reportLanguage` and `startTimestamp` and `endTimestamp`
  const {
    data: reportAnalysis,
    code: getARCode,
    success: getARSuccess,
  } = APIHandler<IReportOld>(
    APIName.REPORT_GET_BY_ID,
    {
      params: {
        params: { companyId: selectedCompany?.id, reportId: '1' },
      },
      query: { reportType, reportLanguage, startTimestamp, endTimestamp },
    },
    hasCompanyId
  );

  useEffect(() => {
    if (getARSuccess === false) {
      toastHandler({
        id: `getAR-${getARCode}}`,
        content: `${t('DASHBOARD.FAILED_TO_GET')} ${reportType}${t('DASHBOARD.REPORT')}${getARCode}`,
        type: ToastType.ERROR,
        closeable: true,
      });
    }
    if (getARSuccess && reportAnalysis) {
      setReportData(reportAnalysis);
    }
  }, [getARSuccess, getARCode, reportAnalysis]);

  const displayedBody = isAuthLoading ? (
    <div className="flex h-screen w-full items-center justify-center bg-surface-neutral-main-background">
      <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
    </div>
  ) : (
    <>
      <div className="flex w-full flex-1 flex-col overflow-x-hidden">
        <ReportsSidebar />
      </div>

      <div className="h-screen bg-surface-neutral-main-background">
        <ViewAnalysisSection
          reportTypesName={reportData.reportTypesName}
          tokenContract={reportData.tokenContract}
          tokenId={reportData.tokenId}
          reportLink={reportData.reportLink}
        />
      </div>
    </>
  );

  // TODO: (20240517 - Shirley) [Beta] replace ALL dummy data after api calling
  return (
    <div>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{`${AnalysisReportTypesMap[reportType].name} - iSunFA`}</title>

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

      <div className="font-barlow">
        <div className="">
          <NavBar />
        </div>

        {displayedBody}
      </div>
    </div>
  );
};

export default ViewAnalysisReportPage;

export const getServerSideProps: GetServerSideProps = async ({ locale, query }) => {
  // Info: (20240429 - Shirley) variable from URL query
  // eslint-disable-next-line @typescript-eslint/naming-convention
  // const { reportType, report_language, start_timestamp, end_timestamp } = query;

  // if (!reportType || !report_language || !start_timestamp || !end_timestamp) {
  //   return {
  //     notFound: true,
  //   };
  // }

  // Info: (20240429 - Shirley) variable from URL query
  const { reportId = '', report_type: reportType = '' } = query;
  // if (!reportId || !reportType) {
  //   return {
  //     notFound: true,
  //   };
  // }

  return {
    props: {
      reportId: reportId as string,
      reportType: reportType as string,
      // Info: (20240524 - Shirley)
      // reportLanguage: report_language as string,
      // startTimestamp: start_timestamp as string,
      // endTimestamp: end_timestamp as string,
      ...(await serverSideTranslations(locale as string, ['common'])),
    },
  };
};
