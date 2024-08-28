import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import NavBar from '@/components/nav_bar/nav_bar';
import { GetServerSideProps } from 'next';
import ProjectSidebar from '@/components/project_sidebar/project_sidebar';
import AddJournalBody from '@/components/add_journal_body/add_journal_body';
import { SkeletonList } from '@/components/skeleton/skeleton';
import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import { useUserCtx } from '@/contexts/user_context';
import { useTranslation } from 'next-i18next';

interface IProjectJournalPageProps {
  projectId: string;
}

const ProjectJournalPage = ({ projectId }: IProjectJournalPageProps) => {
  const { t } = useTranslation('common');
  const { isAuthLoading } = useUserCtx();

  const displayedBody = isAuthLoading ? (
    <div className="flex h-screen w-full items-center justify-center">
      <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
    </div>
  ) : (
    <div className="flex w-full flex-1 flex-col overflow-x-hidden">
      {/* Info: (20240621 - Julian) Sidebar */}
      <ProjectSidebar projectId={projectId} />
      {/* Info: (20240621- Julian) Main */}
      <AddJournalBody />
    </div>
  );

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

        {displayedBody}
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

  return {
    props: {
      projectId: params.projectId,
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

export default ProjectJournalPage;
