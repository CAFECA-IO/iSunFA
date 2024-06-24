import Head from 'next/head';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import { FaArrowLeft } from 'react-icons/fa';
import { FiPlus, FiPlusCircle } from 'react-icons/fi';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import NavBar from '@/components/nav_bar/nav_bar';
import ProjectSidebar from '@/components/project_sidebar/project_sidebar';
import { Button } from '@/components/button/button';
import JournalListBody from '@/components/journal_list_body/journal_list_body';
import { IDummyJournal } from '@/interfaces/journal';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useUserCtx } from '@/contexts/user_context';
import { SkeletonList } from '@/components/skeleton/skeleton';
import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';

interface IProjectJournalListPageProps {
  projectId: string;
}

const ProjectJournalListPage = ({ projectId }: IProjectJournalListPageProps) => {
  const { isAuthLoading } = useUserCtx();

  // ToDo: (20240621 - Julian) Replace with api data
  const projectName = 'BAIFA';
  const journals = [] as IDummyJournal[];
  const success = true;
  const isLoading = false;
  const code = '200';

  const backClickHandler = () => window.history.back();

  const displayedBody = isAuthLoading ? (
    <div className="flex h-screen w-full items-center justify-center">
      <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
    </div>
  ) : (
    <div className="flex w-full flex-1 flex-col overflow-x-hidden">
      <ProjectSidebar projectId={projectId} />
      <div className="flex min-h-screen bg-gray-100">
        <div className="my-120px flex-1 md:ml-80px">
          <div className="flex flex-col px-16px md:px-60px">
            <div className="flex w-full items-center justify-between">
              {/* Info: (2024621 - Julian) Title */}
              <div className="flex items-center gap-24px">
                <button
                  type="button"
                  onClick={backClickHandler}
                  className="rounded border border-navyBlue p-12px text-navyBlue hover:border-primaryYellow hover:text-primaryYellow"
                >
                  <FaArrowLeft />
                </button>

                <h1 className="text-base font-semibold text-text-neutral-secondary md:text-4xl">
                  {projectName} - Journal List
                </h1>
              </div>
              {/* Info: (20240621 - Julian) Add new contract button (desktop) */}

              <Link href={`${ISUNFA_ROUTE.PROJECT_LIST}/${projectId}/journal`}>
                <Button
                  type="button"
                  variant="tertiary"
                  className="hidden items-center gap-4px px-4 py-8px md:flex"
                >
                  <FiPlusCircle size={24} />
                  Add new journal
                </Button>
              </Link>
              {/* Info: (20240621 - Julian) Add new contract button (mobile) */}
              <Button
                type="button"
                variant="tertiary"
                className="flex h-46px w-46px items-center justify-center p-0 md:hidden"
              >
                <FiPlus size={24} />
              </Button>
            </div>
            {/* Info: (20240621 - Julian) Divider */}
            <hr className="my-24px border border-divider-stroke-lv-4" />
            {/* Info: (2024621 - Julian) Content */}
            <JournalListBody
              journals={journals}
              isLoading={isLoading}
              errorCode={code}
              success={success}
            />
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
        {/* TODO: (20240621 - Julian) i18n */}
        <title>{projectName} Journal List - iSunFA</title>
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

export default ProjectJournalListPage;
