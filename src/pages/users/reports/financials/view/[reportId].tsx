import NavBar from '@/components/nav_bar/nav_bar';
import ReportsSidebar from '@/components/reports_sidebar/reports_sidebar';
import ViewFinancialSection from '@/components/view_financial_section/view_financial_section';
import {
  BaifaReportTypeToReportType,
  FinancialReportTypesKey,
  FinancialReportTypesMap,
} from '@/interfaces/report_type';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';
import React, { useEffect } from 'react';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useModalContext } from '@/contexts/modal_context';
import { ToastType } from '@/interfaces/toastify';
import { useUserCtx } from '@/contexts/user_context';
import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import { FinancialReport, IReportOld } from '@/interfaces/report';
import { SkeletonList } from '@/components/skeleton/skeleton';
import { useTranslation } from 'next-i18next';
import { ReportUrlMap } from '@/constants/report';

interface IServerSideProps {
  reportId: string;
  reportType: keyof typeof BaifaReportTypeToReportType;
}

const ViewFinancialReportPage = ({ reportId, reportType }: IServerSideProps) => {
  const { t } = useTranslation('common');
  const { toastHandler } = useModalContext();
  const { selectedCompany, isAuthLoading } = useUserCtx();
  const hasCompanyId = isAuthLoading === false && !!selectedCompany?.id;
  const [reportData] = React.useState<IReportOld>({
    reportTypesName: FinancialReportTypesMap[
      BaifaReportTypeToReportType[reportType as keyof typeof BaifaReportTypeToReportType]
    ] as { id: FinancialReportTypesKey; name: string },
    tokenContract: '',
    tokenId: '',
    reportLink: '',
  });
  const {
    data: reportFinancial,
    code: getFRCode,
    success: getFRSuccess,
  } = APIHandler<FinancialReport>(
    APIName.REPORT_GET_BY_ID,
    {
      params: { companyId: selectedCompany?.id, reportId },
    },
    hasCompanyId
  );

  useEffect(() => {
    if (getFRSuccess === false) {
      toastHandler({
        id: `getFR-${getFRCode}_${reportId}`,
        content: `${t('common:DASHBOARD.FAILED_TO_GET')} ${reportType}${t('common:DASHBOARD.REPORT')}${getFRCode}`,
        type: ToastType.ERROR,
        closeable: true,
      });
    }
  }, [getFRSuccess, getFRCode, reportFinancial]);

  const displayedBody =
    isAuthLoading || !getFRSuccess ? (
      <div className="flex h-screen w-full items-center justify-center bg-surface-neutral-main-background">
        <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
      </div>
    ) : (
      <div>
        <div className="flex w-full flex-1 flex-col overflow-x-hidden">
          <ReportsSidebar />
        </div>

        <div className="h-1400px bg-surface-neutral-main-background">
          <ViewFinancialSection
            reportTypesName={
              reportData.reportTypesName as {
                id: keyof typeof FinancialReportTypesMap;
                name: string;
              }
            }
            tokenContract={reportData.tokenContract}
            tokenId={reportData.tokenId}
            reportLink={`/users/reports/${reportId}/${ReportUrlMap[reportFinancial?.reportType as keyof typeof ReportUrlMap]}`}
            reportId={reportId}
          />
        </div>
      </div>
    );

  return (
    <div>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>
          {t(`common:PLUGIN.${reportData.reportTypesName?.name.toUpperCase().replace(/ /g, '_')}`)}-
          iSunFA
        </title>

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

export default ViewFinancialReportPage;

export const getServerSideProps: GetServerSideProps = async ({ locale, query }) => {
  // Info: (20240429 - Shirley) variable from URL query
  const { reportId = '', report_type: reportType = '' } = query;

  return {
    props: {
      reportId: reportId as string,
      reportType: reportType as string,
      ...(await serverSideTranslations(locale as string, [
        'common',
        'report_401',
        'journal',
        'kyc',
        'project',
        'setting',
        'terms',
        'salary',
        'asset',
      ])),
    },
  };
};
