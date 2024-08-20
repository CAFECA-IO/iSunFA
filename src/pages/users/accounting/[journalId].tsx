import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GetServerSideProps } from 'next';
import NavBar from '@/components/nav_bar/nav_bar';
import AccountingSidebar from '@/components/accounting_sidebar/accounting_sidebar';
import { useUserCtx } from '@/contexts/user_context';
import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import { SkeletonList } from '@/components/skeleton/skeleton';
import JournalDetail from '@/components/journal_detail/journal_detail';
import { useTranslation } from 'next-i18next';

interface IJournalDetailPageProps {
  journalId: string;
}

const JournalDetailPage = ({ journalId }: IJournalDetailPageProps) => {
  const { t } = useTranslation('common');
  const { isAuthLoading } = useUserCtx();

  const displayedBody = isAuthLoading ? (
    <div className="flex h-screen w-full items-center justify-center bg-surface-neutral-main-background">
      <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
    </div>
  ) : (
    <div className="flex w-full flex-1 flex-col overflow-x-hidden">
      {/* Info: (20240503 - Julian) Sidebar */}
      <AccountingSidebar />
      {/* Info: (20240503 - Julian) Overview */}
      <div className="flex h-full w-full bg-gray-100">
        <div className="mt-100px w-screen flex-1 md:ml-80px">
          <JournalDetail journalId={journalId} />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        {/* TODO: (20240503 - Julian) i18n */}
        <title>{`${t('JOURNAL.JOURNAL')} ${journalId} - iSunFA`}</title>
      </Head>

      <div className="h-screen font-barlow">
        <div className="">
          <NavBar />
        </div>

        {displayedBody}
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ params, locale }) => {
  if (!params || !params.journalId || typeof params.journalId !== 'string') {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      journalId: params.journalId,
      ...(await serverSideTranslations(locale as string, ['common'])),
    },
  };
};

export default JournalDetailPage;
