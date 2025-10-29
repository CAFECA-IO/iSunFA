// import NavBar from '@/components/nav_bar/nav_bar'; // ToDo: (20241129 - Liz) 使用新版的 Layout
import ViewFinancialSection from '@/components/view_financial_section/view_financial_section';
import {
  BaifaReportTypeToReportType,
  FinancialReportTypesKey,
  FinancialReportTypesMap,
} from '@/interfaces/report_type';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';
import React, { useEffect, useState } from 'react';
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
  const { t } = useTranslation(['reports']);
  const { toastHandler } = useModalContext();
  const { connectedAccountBook, isAuthLoading } = useUserCtx();
  const [reportData] = React.useState<IReportOld>({
    reportTypesName: FinancialReportTypesMap[
      BaifaReportTypeToReportType[reportType as keyof typeof BaifaReportTypeToReportType]
    ] as { id: FinancialReportTypesKey; name: string },
    tokenContract: '',
    tokenId: '',
    reportLink: '',
  });

  const [financialReport, setFinancialReport] = useState<FinancialReport | null>(null);
  const [isGetFinancialReportSuccess, setIsGetFinancialReportSuccess] = useState<boolean>(false);

  const { trigger: getFinancialReportAPI } = APIHandler<FinancialReport>(APIName.REPORT_GET_BY_ID);

  useEffect(() => {
    if (isAuthLoading || !connectedAccountBook) return;

    const getFinancialReport = async () => {
      try {
        const {
          data: reportFinancial,
          code: getFRCode,
          success: getFRSuccess,
        } = await getFinancialReportAPI({
          params: { companyId: connectedAccountBook.id, reportId },
        });

        if (!getFRSuccess) {
          toastHandler({
            id: `getFR-${getFRCode}_${reportId}`,
            content: `${t('alpha:DASHBOARD.FAILED_TO_GET')} ${reportType}${t('alpha:DASHBOARD.REPORT')}${getFRCode}`,
            type: ToastType.ERROR,
            closeable: true,
          });
          return;
        }

        setFinancialReport(reportFinancial);
        setIsGetFinancialReportSuccess(getFRSuccess);
      } catch (error) {
        // console.log('error:', error);
        (error as Error).message += ' - getFinancialReport failed';
      }
    };

    getFinancialReport();
  }, [isAuthLoading, reportId, reportType, connectedAccountBook, t, toastHandler]);

  const displayedBody =
    isAuthLoading || !isGetFinancialReportSuccess ? (
      <div className="flex h-screen w-full items-center justify-center bg-surface-neutral-main-background">
        <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
      </div>
    ) : (
      <div>
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
            reportLink={`/users/reports/${reportId}/${ReportUrlMap[financialReport?.reportType as keyof typeof ReportUrlMap]}`}
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
          {t(`reports:PLUGIN.${reportData.reportTypesName?.name.toUpperCase().replace(/ /g, '_')}`)}
          - iSunFA
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
        <div className="">{/* <NavBar /> */}</div>

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
      ...(await serverSideTranslations(locale as string, ['reports', 'common'])),
    },
  };
};
