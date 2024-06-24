import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GetServerSideProps } from 'next';
import NavBar from '@/components/nav_bar/nav_bar';
import AccountingSidebar from '@/components/accounting_sidebar/accounting_sidebar';
import JournalDetail from '@/components/journal_detail/journal_detail';

interface IJournalDetailPageProps {
  journalId: string;
}

const JournalDetailPage = ({ journalId }: IJournalDetailPageProps) => {
  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        {/* TODO: (20240503 - Julian) i18n */}
        <title>Journal {journalId} - iSunFA</title>
      </Head>

      <div className="h-screen font-barlow">
        <div className="">
          <NavBar />
        </div>

        <div className="flex w-full flex-1 flex-col overflow-x-hidden">
          {/* Info: (20240503 - Julian) Sidebar */}
          <AccountingSidebar />
          {/* Info: (20240503 - Julian) Overview */}
          <div className="flex h-full w-full bg-gray-100">
            <div className="mt-100px flex-1 md:ml-80px">
              <JournalDetail journalId={journalId} />
            </div>
          </div>
        </div>
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
