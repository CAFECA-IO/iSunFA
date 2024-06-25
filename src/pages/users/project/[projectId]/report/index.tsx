import Head from 'next/head';
import Link from 'next/link';
import NavBar from '@/components/nav_bar/nav_bar';
import { GetServerSideProps } from 'next';
import ProjectSidebar from '@/components/project_sidebar/project_sidebar';
import { Button } from '@/components/button/button';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { BsClipboardPlus } from 'react-icons/bs';
import ProjectReportPageBody from '@/components/project_report_page_body/project_report_page_body';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useUserCtx } from '@/contexts/user_context';
import { SkeletonList } from '@/components/skeleton/skeleton';
import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';

interface IProjectReportPageProps {
  projectId: string;
}

const ProjectReportPage = ({ projectId }: IProjectReportPageProps) => {
  const { isAuthLoading } = useUserCtx();
  // ToDo: (20240624 - Julian) Replace with api data
  const projectName = 'BAIFA';

  const displayedBody = isAuthLoading ? (
    <div className="flex h-screen w-full items-center justify-center">
      <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
    </div>
  ) : (
    <div className="flex w-full flex-1 flex-col overflow-x-hidden">
      <ProjectSidebar projectId={projectId} />
      <div className="flex min-h-screen bg-gray-100">
        <div className="my-120px flex-1 md:ml-80px">
          <div className="flex flex-col px-60px">
            {/* Info: (20240624 - Julian) Title */}
            <div className="flex items-center justify-between">
              {/* ToDo: (20240624 - Julian) Project Name */}
              <h1 className="text-4xl font-semibold text-text-neutral-secondary">
                {projectName} - Analysis Report
              </h1>

              {/* ToDo: (20240624 - Julian) Generate Report link */}
              <Link href={`${ISUNFA_ROUTE.PROJECT_LIST}`}>
                <Button type="button" variant="tertiary" className="flex items-center">
                  <BsClipboardPlus size={24} />
                  <p>Generate Report</p>
                </Button>
              </Link>
            </div>

            {/* Info: (20240624 - Julian) Divider */}
            <hr className="my-24px border border-divider-stroke-lv-4" />

            <ProjectReportPageBody projectId={projectId} />
          </div>
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
        {/* TODO: (20240606 - Julian) i18n */}
        <title>{projectName} Analysis Report - iSunFA</title>
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
      ...(await serverSideTranslations(locale as string, ['common'])),
    },
  };
};

export default ProjectReportPage;
