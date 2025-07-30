import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GetServerSideProps } from 'next';
import { useUserCtx } from '@/contexts/user_context';
import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import { SkeletonList } from '@/components/skeleton/skeleton';
import BalanceSheetReportBodyAll from '@/components/balance_sheet_report_body/balance_sheet_report_body_all';

interface IBalanceSheetPageProps {
  reportId: string;
}

const BalanceSheetPage = ({ reportId }: IBalanceSheetPageProps) => {
  const { isAuthLoading } = useUserCtx();

  const displayedBody = isAuthLoading ? (
    <div className="flex h-screen w-full items-center justify-center bg-surface-neutral-main-background">
      <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
    </div>
  ) : (
    <div className="flex w-full flex-1 flex-col">
      <BalanceSheetReportBodyAll reportId={reportId} />
    </div>
  );

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>Balance Sheet - iSunFA</title>
      </Head>

      <div className="h-full bg-white font-barlow">{displayedBody}</div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ params, locale }) => {
  if (!params || !params.reportId || typeof params.reportId !== 'string') {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      reportId: params.reportId,
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

export default BalanceSheetPage;
