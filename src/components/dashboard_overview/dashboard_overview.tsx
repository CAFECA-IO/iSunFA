import React from 'react';
import { cn } from '@/lib/utils/common';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { useModalContext } from '@/contexts/modal_context';
import { ToastType } from '@/interfaces/toastify';
import { useUserCtx } from '@/contexts/user_context';
import { IProfitInsight } from '@/interfaces/project_insight';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';

const DashboardOverview = () => {
  const { t } = useTranslation('common');
  const [dashboardOverview, setDashboardOverview] = React.useState<IProfitInsight>(
    {} as IProfitInsight
  );
  const { toastHandler } = useModalContext();
  const { isAuthLoading, selectedCompany } = useUserCtx();
  const hasCompanyId = isAuthLoading === false && !!selectedCompany?.id;
  const {
    data: profitInsight,
    success: getSuccess,
    code: getCode,
    error: getError,
  } = APIHandler<IProfitInsight>(
    APIName.PROFIT_GET_INSIGHT,
    {
      params: {
        companyId: selectedCompany?.id,
      },
    },
    hasCompanyId
  );

  const displayedProfitChangeRate =
    dashboardOverview.emptyProfitChange ||
    (!dashboardOverview.profitChange && dashboardOverview.profitChange !== 0)
      ? t('common:COMMON.NO_DATA')
      : `${dashboardOverview.profitChange > 0 ? `+${dashboardOverview.profitChange.toFixed(0)}` : dashboardOverview.profitChange.toFixed(0)}`;

  const displayedTopProjectRoi =
    dashboardOverview.emptyTopProjectRoi ||
    (!dashboardOverview.topProjectRoi && dashboardOverview.topProjectRoi !== 0)
      ? t('common:COMMON.NO_DATA')
      : `${dashboardOverview.topProjectRoi > 0 ? `+${dashboardOverview.topProjectRoi.toFixed(0)}` : dashboardOverview.topProjectRoi.toFixed(0)}`;

  const displayedPreLaunchProjects =
    dashboardOverview.emptyPreLaunchProject ||
    (!dashboardOverview.preLaunchProject && dashboardOverview.preLaunchProject !== 0)
      ? t('common:COMMON.NO_DATA')
      : dashboardOverview.preLaunchProject;

  React.useEffect(() => {
    if (getSuccess && profitInsight) {
      setDashboardOverview({
        profitChange: profitInsight.profitChange * 100,
        topProjectRoi: profitInsight.topProjectRoi * 100,
        preLaunchProject: profitInsight.preLaunchProject,
        emptyProfitChange: profitInsight.emptyProfitChange,
        emptyTopProjectRoi: profitInsight.emptyTopProjectRoi,
        emptyPreLaunchProject: profitInsight.emptyPreLaunchProject,
      });
    } else if (getSuccess === false) {
      toastHandler({
        id: `profit_insight-${getCode}`,
        content: `${t('common:DASHBOARD.FAILED_TO_GET_PROFIT_INSIGHT')} ${getCode}`,
        type: ToastType.ERROR,
        closeable: true,
      });
    }
  }, [getSuccess, getCode, getError, profitInsight]);

  return (
    <div className="grid grid-cols-3 gap-5 px-0 max-md:max-w-full max-md:grid-cols-1 max-md:gap-0">
      {/* Info: (20240523 - Shirley) 區塊一 */}
      <div className="flex flex-col max-md:ml-0 max-md:w-full">
        <div className="flex max-h-70px justify-between gap-2 rounded-3xl bg-surface-support-soft-maple py-4 pl-5 pr-2 max-md:mt-4 md:max-h-84px lg:min-h-180px lg:flex-col lg:space-x-2 lg:px-5">
          <div className="flex items-center gap-2">
            <Image
              src="/icons/profit_change.svg"
              width={46}
              height={46}
              alt={'profit_change'}
            ></Image>

            <div className="text-base font-semibold leading-6 tracking-normal text-text-neutral-solid-dark">
              {t('common:DASHBOARD.PROFIT_CHANGE')}
            </div>
          </div>
          <div
            className={cn(
              'flex items-center justify-center gap-1 whitespace-nowrap text-center font-semibold max-md:px-5 lg:justify-center lg:px-11 lg:text-center',
              dashboardOverview.emptyProfitChange || !dashboardOverview.profitChange
                ? 'lg:mb-5'
                : 'lg:mb-3'
            )}
          >
            <div
              className={cn(
                '',
                dashboardOverview.profitChange > 0
                  ? 'text-4xl text-text-state-success-solid lg:text-5xl lg:leading-52px'
                  : dashboardOverview.profitChange < 0
                    ? 'text-4xl text-text-state-error-solid lg:text-5xl lg:leading-52px'
                    : 'text-base text-text-neutral-mute lg:text-xl'
              )}
            >
              {displayedProfitChangeRate}
            </div>
            <div className="self-center text-base leading-6 tracking-normal text-text-neutral-primary md:mb-0 lg:mt-0 lg:self-end">
              %
            </div>
          </div>
        </div>
      </div>

      {/* Info: (20240523 - Shirley) 區塊二 */}
      <div className="flex flex-col max-md:ml-0 max-md:w-full">
        <div className="flex max-h-70px justify-between gap-2 rounded-3xl bg-surface-support-soft-rose py-4 pl-5 pr-2 max-md:mt-4 md:max-h-84px lg:min-h-180px lg:flex-col lg:space-x-2 lg:px-5">
          <div className="flex items-center gap-2 lg:items-center">
            <Image
              src="/icons/top_project_roi.svg"
              width={46}
              height={46}
              alt={'top_project_roi'}
            ></Image>

            <div className="text-base font-semibold leading-6 tracking-normal text-text-neutral-solid-dark">
              {t('common:DASHBOARD.TOP_PROJECT_ROI')}
            </div>
          </div>
          <div
            className={cn(
              'flex items-center justify-center gap-1 whitespace-nowrap text-center font-semibold max-md:px-5 lg:justify-center lg:px-11 lg:text-center',
              dashboardOverview.emptyTopProjectRoi || !dashboardOverview.topProjectRoi
                ? 'lg:mb-5'
                : 'lg:mb-3'
            )}
          >
            <div
              className={cn(
                '',
                +dashboardOverview.topProjectRoi > 0
                  ? 'text-4xl text-text-state-success-solid lg:text-5xl lg:leading-52px'
                  : +dashboardOverview.topProjectRoi < 0
                    ? 'text-end text-4xl text-text-state-error-solid lg:text-5xl lg:leading-52px'
                    : 'text-base text-text-neutral-mute lg:text-xl'
              )}
            >
              <span className="">{displayedTopProjectRoi}</span>
            </div>
            <div className="self-center text-base leading-6 tracking-normal text-text-neutral-primary lg:self-end">
              %
            </div>
          </div>
        </div>
      </div>

      {/* Info: (20240523 - Shirley) 區塊三 */}
      <div className="flex flex-col max-md:ml-0 max-md:w-full">
        <div className="flex max-h-70px justify-between gap-2 rounded-3xl bg-surface-support-soft-indigo px-5 py-4 max-md:mt-4 md:max-h-84px lg:min-h-180px lg:flex-col lg:space-x-2">
          <div className="flex items-center gap-1 lg:items-center">
            <Image
              src="/icons/pre_launch_project.svg"
              width={46}
              height={46}
              alt={'pre_launch_project'}
            ></Image>

            <div className="text-base font-semibold leading-6 tracking-normal text-text-neutral-solid-dark">
              {t('common:DASHBOARD.PRE_LAUNCH_PROJECTS')}
            </div>
          </div>
          <div
            className={cn(
              'mb-0 mr-2 space-y-0 self-center text-center text-4xl font-semibold text-text-neutral-solid-dark md:mr-0 lg:mb-3 lg:leading-52px',
              dashboardOverview.preLaunchProject
                ? 'text-4xl font-semibold text-text-neutral-solid-dark lg:text-5xl lg:leading-52px'
                : 'text-base text-text-neutral-mute lg:text-xl'
            )}
          >
            {displayedPreLaunchProjects}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
