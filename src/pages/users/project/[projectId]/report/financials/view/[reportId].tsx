import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GetServerSideProps } from 'next';
import NavBar from '@/components/nav_bar/nav_bar';
import ProjectSidebar from '@/components/project_sidebar/project_sidebar';
import { useTranslation } from 'next-i18next';

interface IProjectFinancialsReportDetailPageProps {
  projectId: string;
  reportId: string;
}

const ProjectFinancialsReportDetailPage = ({
  projectId,
  reportId,
}: IProjectFinancialsReportDetailPageProps) => {
  const { t } = useTranslation(['common', 'project']);
  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>
          {t('project:PROJECT.PROJECT_REPORT')} {reportId} - iSunFA
        </title>
      </Head>

      <div className="h-screen font-barlow">
        <div className="">
          <NavBar />
        </div>

        <div className="flex w-full flex-1 flex-col overflow-x-hidden">
          {/* Info: (20240701 - Julian) Sidebar */}
          <ProjectSidebar projectId={projectId} />
          {/* Info: (20240701- Julian) Main */}
          <div className="flex min-h-screen bg-gray-100">
            {/* Info: (20240701 - Julian) Body */}
            <div></div>
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
  if (!params || !params.reportId || typeof params.reportId !== 'string') {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      projectId: params.projectId,
      reportId: params.reportId,
      ...(await serverSideTranslations(locale as string, [
        'common',
        'reports',
        'journal',
        'kyc',
        'project',
        'settings',
        'terms',
        'salary',
        'asset',
      ])),
    },
  };
};

export default ProjectFinancialsReportDetailPage;
