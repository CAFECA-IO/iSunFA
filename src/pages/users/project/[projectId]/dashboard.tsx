import Head from 'next/head';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { FaArrowLeft } from 'react-icons/fa';
import { FaChevronDown } from 'react-icons/fa6';
import NavBar from '@/components/nav_bar/nav_bar';
import ProjectSidebar from '@/components/project_sidebar/project_sidebar';
import { ISUNFA_ROUTE } from '@/constants/url';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { ProjectStage, stageList } from '@/constants/project';
import ProjectValueBlock from '@/components/project_value_block/project_value_block';
import ProjectProgressBlock from '@/components/project_progress_block/project_progress_block';
import ProjectMilestoneBlock from '@/components/project_milestone_block/project_milestone_block';

interface IProjectDashboardPageProps {
  projectId: string;
}

const ProjectDashboardPage = ({ projectId }: IProjectDashboardPageProps) => {
  // ToDo: (20240612 - Julian) replace with actual data
  const projectName = 'BAIFA';
  const currentStage = ProjectStage.DESIGNING;

  const {
    targetRef: stageOptionsRef,
    componentVisible: isStageOptionsVisible,
    setComponentVisible: setStageOptionsVisible,
  } = useOuterClick<HTMLDivElement>(false);

  const stageMenuClickHandler = () => setStageOptionsVisible(!isStageOptionsVisible);

  const displayedStageOptions = (
    <div
      ref={stageOptionsRef}
      className={`absolute right-0 top-12 z-10 flex w-full flex-col items-start rounded-sm border border-input-stroke-input
      ${isStageOptionsVisible ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-10 opacity-0'}
      bg-input-surface-input-background px-12px py-8px text-sm shadow-md transition-all duration-300 ease-in-out`}
    >
      {stageList.map((stage) => {
        const clickHandler = () => {
          // ToDo: (20240612 - Julian) update stage api call
          setStageOptionsVisible(false);
        };
        return (
          <button
            key={stage}
            type="button"
            className="w-full p-8px text-left hover:bg-dropdown-surface-item-hover"
            onClick={clickHandler}
          >
            {stage}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        {/* TODO: (2024606 - Julian) i18n */}
        <title>{projectName} Dashboard - iSunFA</title>
      </Head>

      <div className="h-screen font-barlow">
        <div className="">
          <NavBar />
        </div>

        <div className="flex w-full flex-1 flex-col overflow-x-hidden">
          <ProjectSidebar projectId={projectId} />
          <div className="flex min-h-screen bg-gray-100">
            <div className="mb-60px mt-120px flex-1 md:ml-80px">
              <div className="flex flex-col px-16px md:px-60px">
                <div className="flex w-full items-center justify-between">
                  {/* Info: (20240611 - Julian) Title */}
                  <div className="flex items-center gap-24px">
                    <Link
                      href={ISUNFA_ROUTE.PROJECT_LIST}
                      className="rounded border border-navyBlue p-12px text-navyBlue hover:border-primaryYellow hover:text-primaryYellow"
                    >
                      <FaArrowLeft />
                    </Link>

                    <h1 className="text-base font-semibold text-text-neutral-secondary md:text-4xl">
                      {projectName}
                    </h1>
                  </div>
                  {/* Info: (20240612 - Julian) stage selection (desktop) */}
                  <div className="hidden flex-col items-start gap-y-8px md:flex">
                    <p className="font-semibold">Stage</p>
                    <div
                      onClick={stageMenuClickHandler}
                      className={`relative flex h-46px w-full items-center justify-between rounded-sm border bg-input-surface-input-background 
            ${isStageOptionsVisible ? 'border-input-stroke-selected' : 'border-input-stroke-input'}
            px-12px hover:cursor-pointer md:w-200px`}
                    >
                      {currentStage}
                      <FaChevronDown />
                      {displayedStageOptions}
                    </div>
                  </div>
                </div>
                {/* Info: (20240612 - Julian) Divider */}
                <hr className="border-px my-24px border-divider-stroke-lv-4" />
                {/* Info: (20240612 - Julian) stage selection (mobile) */}
                <div className="my-24px flex flex-col items-start gap-y-8px md:hidden">
                  <p className="font-semibold">Stage</p>
                  <div
                    onClick={stageMenuClickHandler}
                    className={`relative flex h-46px w-full items-center justify-between rounded-sm border bg-input-surface-input-background 
            ${isStageOptionsVisible ? 'border-input-stroke-selected' : 'border-input-stroke-input'}
            px-12px hover:cursor-pointer md:w-200px`}
                  >
                    {currentStage}
                    <FaChevronDown />
                    {displayedStageOptions}
                  </div>
                </div>
                {/* Info: (20240612 - Julian) Content */}
                <div className="grid grid-flow-row grid-cols-1 gap-24px md:grid-cols-3">
                  {/* Info: (20240612 - Julian) Project Value Block */}
                  <div className="md:col-span-2">
                    <ProjectValueBlock />
                  </div>

                  {/* Info: (20240612 - Julian) Project Progress Block */}
                  <div className="">
                    <ProjectProgressBlock />
                  </div>
                  <div className="md:col-span-3">
                    <ProjectMilestoneBlock />
                  </div>
                  <div className="border p-20px md:col-span-2">Monthly Sales Block</div>
                  <div className="border p-20px">Working Time Ratio Sales Block</div>
                </div>
              </div>
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

  return {
    props: {
      projectId: params.projectId,
      ...(await serverSideTranslations(locale as string, ['common'])),
    },
  };
};

export default ProjectDashboardPage;
