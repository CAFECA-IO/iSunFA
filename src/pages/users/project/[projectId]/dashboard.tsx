import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { FaArrowLeft } from 'react-icons/fa';
import { FaChevronDown } from 'react-icons/fa6';
import NavBar from '@/components/nav_bar/nav_bar';
import ProjectSidebar from '@/components/project_sidebar/project_sidebar';
import { ISUNFA_ROUTE } from '@/constants/url';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { stageList } from '@/constants/project';
import ProjectValueBlock from '@/components/project_value_block/project_value_block';
import ProjectProgressBlock from '@/components/project_progress_block/project_progress_block';
import ProjectMilestoneBlock from '@/components/project_milestone_block/project_milestone_block';
import WorkingTimeRatioBlock from '@/components/working_time_ratio_block/working_time_ratio_block';
import ProjectMonthlySalesBlock from '@/components/project_monthly_sales_block/project_monthly_sales_block';
import { useUserCtx } from '@/contexts/user_context';
import { useGlobalCtx } from '@/contexts/global_context';
import { SkeletonList } from '@/components/skeleton/skeleton';
import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import { useTranslation } from 'next-i18next';
import { APIName } from '@/constants/api_connection';
import { IProject } from '@/interfaces/project';
import APIHandler from '@/lib/utils/api_handler';
import { ToastId } from '@/constants/toast_id';
import { ToastType } from '@/interfaces/toastify';

// Info: (2024704 - Anna) For list
// Info: (2024704 - Anna) 定義階段名稱到翻譯鍵值的映射
interface StageNameMap {
  [key: string]: string;
}

const stageNameMap: StageNameMap = {
  Designing: 'project:STAGE_NAME_MAP.DESIGNING',
  Developing: 'project:STAGE_NAME_MAP.DEVELOPING',
  'Beta Testing': 'project:STAGE_NAME_MAP.BETA_TESTING',
  Selling: 'project:STAGE_NAME_MAP.SELLING',
  Sold: 'project:STAGE_NAME_MAP.SOLD',
  Archived: 'project:STAGE_NAME_MAP.ARCHIVED',
};
interface IProjectDashboardPageProps {
  projectId: string;
}

const ProjectDashboardPage = ({ projectId }: IProjectDashboardPageProps) => {
  const { t } = useTranslation(['common', 'project']);
  const { isAuthLoading, selectedCompany } = useUserCtx();
  const { toastHandler } = useGlobalCtx();
  const hasCompanyId = isAuthLoading === false && !!selectedCompany?.id;

  const [stageHolder, setStageHolder] = useState('-');

  // Info: (20240821 - Julian) 取得專案資料
  const { data: projectData } = APIHandler<IProject>(
    APIName.GET_PROJECT_BY_ID,
    {
      params: { companyId: selectedCompany?.id, projectId },
    },
    hasCompanyId
  );

  // Info: (20240821 - Julian) 更新專案資料
  const {
    trigger: updateProject,
    data: updateResult,
    success: updateSuccess,
    code: updateCode,
  } = APIHandler<IProject>(APIName.UPDATE_PROJECT_BY_ID);

  useEffect(() => {
    if (projectData) {
      setStageHolder(projectData.stage);
    }
  }, [projectData]);

  useEffect(() => {
    if (updateSuccess && updateResult) {
      // Info: (20240821 - Julian) 顯示 stage 更新成功的訊息
      toastHandler({
        id: ToastId.PROJECT_STAGE_UPDATE,
        type: ToastType.SUCCESS,
        content: 'update success',
        closeable: true,
      });
    } else if (updateSuccess === false && updateCode) {
      // Info: (20240821 - Julian) 顯示 stage 更新失敗的訊息
      toastHandler({
        id: ToastId.PROJECT_STAGE_UPDATE,
        type: ToastType.ERROR,
        content: 'update failed',
        closeable: true,
      });
    }
  }, [updateResult, updateSuccess, updateCode]);

  const projectName = projectData?.name ?? '-';
  const currentStage = projectData?.stage ?? '-';
  const memberList = projectData?.members ?? [];
  const imageId = projectData?.imageId ?? '';

  const {
    targetRef: stageOptionsRef,
    componentVisible: isStageOptionsVisible,
    setComponentVisible: setStageOptionsVisible,
  } = useOuterClick<HTMLDivElement>(false);

  const stageMenuClickHandler = () => setStageOptionsVisible(!isStageOptionsVisible);

  const displayedStageOptions = (
    <div
      ref={stageOptionsRef}
      className={`absolute right-0 top-12 z-10 flex w-full flex-col items-start rounded-sm border border-input-stroke-input ${isStageOptionsVisible ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-10 opacity-0'} bg-input-surface-input-background px-12px py-8px text-sm shadow-md transition-all duration-300 ease-in-out`}
    >
      {stageList.map((stage) => {
        const clickHandler = () => {
          // Info: (20240821 - Julian) update stage api call
          updateProject({
            params: { companyId: hasCompanyId, projectId },
            body: {
              name: projectName,
              stage,
              memberIdList: memberList,
              imageId,
            },
          });
          // Info: (20240821 - Julian) update stage holder && close menu
          setStageHolder(stage);
          setStageOptionsVisible(false);
        };
        return (
          <button
            key={stage}
            type="button"
            className="w-full p-8px text-left hover:bg-dropdown-surface-item-hover"
            onClick={clickHandler}
          >
            {t(stageNameMap[stage])}
          </button>
        );
      })}
    </div>
  );

  const displayedBody = isAuthLoading ? (
    <div className="flex h-screen w-full items-center justify-center">
      <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
    </div>
  ) : (
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
                <p className="font-semibold">{t('project:PROJECT.STAGE')}</p>
                <div
                  onClick={stageMenuClickHandler}
                  className={`relative flex h-46px w-full items-center justify-between rounded-sm border bg-input-surface-input-background ${isStageOptionsVisible ? 'border-input-stroke-selected' : 'border-input-stroke-input'} px-12px hover:cursor-pointer md:w-200px`}
                >
                  {t(stageNameMap[stageHolder])}
                  <FaChevronDown />
                  {displayedStageOptions}
                </div>
              </div>
            </div>
            {/* Info: (20240612 - Julian) Divider */}
            <hr className="my-24px border border-divider-stroke-lv-4" />
            {/* Info: (20240612 - Julian) stage selection (mobile) */}
            <div className="my-24px flex flex-col items-start gap-y-8px md:hidden">
              <p className="font-semibold">{t('project:PROJECT.STAGE')}</p>
              <div
                onClick={stageMenuClickHandler}
                className={`relative flex h-46px w-full items-center justify-between rounded-sm border bg-input-surface-input-background ${isStageOptionsVisible ? 'border-input-stroke-selected' : 'border-input-stroke-input'} px-12px hover:cursor-pointer md:w-200px`}
              >
                {t(stageNameMap[currentStage])}
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
              {/* Info: (20240614 - Julian) Project Milestone Block */}
              <div className="md:col-span-3">
                <ProjectMilestoneBlock />
              </div>
              {/* Info: (20240614 - Julian) Project Monthly Sales Block */}
              <div className="md:col-span-2">
                <ProjectMonthlySalesBlock />
              </div>
              {/* Info: (20240614 - Julian) Working Time Ratio Block */}
              <div className="">
                <WorkingTimeRatioBlock />
              </div>
            </div>
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
        <title>
          {projectName} {t('NAV_BAR.DASHBOARD')} - iSunFA
        </title>
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

export default ProjectDashboardPage;
