import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import NavBar from '@/components/nav_bar/nav_bar';
import { GetServerSideProps } from 'next';
import ProjectSidebar from '@/components/project_sidebar/project_sidebar';
import JournalDetail from '@/components/journal_detail/journal_detail';
import { useTranslation } from 'next-i18next';

interface IProjectJournalPageProps {
  projectId: string;
  journalId: string;
}

const ProjectJournalDetailPage = ({ projectId, journalId }: IProjectJournalPageProps) => {
  const { t } = useTranslation([
    'common',
    'project',
    'journal',
    'kyc',
    'report_401',
    'salary',
    'setting',
    'terms',
  ]);
  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('journal:JOURNAL.PROJECT_ADD_JOURNAL_ISUNFA')}</title>
      </Head>

      <div className="h-screen font-barlow">
        <div className="">
          <NavBar />
        </div>

        <div className="flex w-full flex-1 flex-col overflow-x-hidden">
          {/* Info: (20240621 - Julian) Sidebar */}
          <ProjectSidebar projectId={projectId} />
          {/* Info: (20240621- Julian) Main */}
          <div className="flex min-h-screen bg-gray-100">
            <div className="my-120px flex-1 md:ml-80px">
              <JournalDetail journalId={journalId} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ params, locale }) => {
  if (!params || !params.projectId || typeof params.projectId !== 'string') {
    return {
      notFound: true,
    };
  }
  if (!params || !params.journalId || typeof params.journalId !== 'string') {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      projectId: params.projectId,
      journalId: params.journalId,
      ...(await serverSideTranslations(locale as string, [
        'common',
        'report_401',
        'journal',
        'kyc',
        'project',
        'setting',
        'terms',
        'salary',
      ])),
    },
  };
};

export default ProjectJournalDetailPage;
