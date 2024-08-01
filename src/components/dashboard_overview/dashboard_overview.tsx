import React from 'react';
import { cn } from '@/lib/utils/common';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { useGlobalCtx } from '@/contexts/global_context';
import { ToastType } from '@/interfaces/toastify';
import { useUserCtx } from '@/contexts/user_context';
import { IProfitInsight } from '@/interfaces/project_insight';
import { useTranslation } from 'next-i18next';
import { FREE_COMPANY_ID } from '@/constants/config';

const DashboardOverview = () => {
  const { t } = useTranslation('common');
  const [dashboardOverview, setDashboardOverview] = React.useState<IProfitInsight>(
    {} as IProfitInsight
  );
  const { toastHandler } = useGlobalCtx();
  const { selectedCompany } = useUserCtx();
  const {
    data: profitInsight,
    success: getSuccess,
    code: getCode,
    error: getError,
  } = APIHandler<IProfitInsight>(
    APIName.PROFIT_GET_INSIGHT,
    {
      params: {
        companyId: selectedCompany?.id ?? FREE_COMPANY_ID,
      },
    },
    true
  );

  // TODO: i18n (20240620 - Shirley)
  const displayedProfitChangeRate =
    dashboardOverview.emptyProfitChange ||
    (!dashboardOverview.profitChange && dashboardOverview.profitChange !== 0)
      ? t('PROJECT.NO_DATA')
      : `${dashboardOverview.profitChange > 0 ? `+${dashboardOverview.profitChange.toFixed(0)}` : dashboardOverview.profitChange.toFixed(0)}`;

  const displayedTopProjectRoi =
    dashboardOverview.emptyTopProjectRoi ||
    (!dashboardOverview.topProjectRoi && dashboardOverview.topProjectRoi !== 0)
      ? t('PROJECT.NO_DATA')
      : `${dashboardOverview.topProjectRoi > 0 ? `+${dashboardOverview.topProjectRoi.toFixed(0)}` : dashboardOverview.topProjectRoi.toFixed(0)}`;

  const displayedPreLaunchProjects =
    dashboardOverview.emptyPreLaunchProject ||
    (!dashboardOverview.preLaunchProject && dashboardOverview.preLaunchProject !== 0)
      ? t('PROJECT.NO_DATA')
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
        content: `${t('DASHBOARD.FAILED_TO_GET_PROFIT_INSIGHT')} ${getCode}`,
        type: ToastType.ERROR,
        closeable: true,
      });
    }
  }, [getSuccess, getCode, getError, profitInsight]);

  return (
    <div className="grid grid-cols-3 gap-5 px-0 max-md:max-w-full max-md:grid-cols-1 max-md:gap-0">
      {/* Info: 區塊一 (20240523 - Shirley) */}
      <div className="flex flex-col max-md:ml-0 max-md:w-full">
        <div className="flex max-h-70px justify-between gap-2 rounded-3xl bg-surface-support-soft-maple py-4 pl-5 pr-2 max-md:mt-4 md:max-h-84px lg:min-h-180px lg:flex-col lg:space-x-2 lg:px-5">
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="46"
              height="46"
              fill="none"
              viewBox="0 0 46 46"
            >
              <path
                fill="#FD853A"
                d="M0 23C0 10.297 10.297 0 23 0s23 10.297 23 23-10.297 23-23 23S0 35.703 0 23z"
              ></path>
              <path
                fill="#FCFDFF"
                d="M22.447 13.342L14.13 21.66A.786.786 0 0014.685 23h2.818v9.429c0 .434.351.785.785.785h9.429a.786.786 0 00.786-.785V23h2.817c.7 0 1.05-.846.556-1.341l-8.318-8.318a.786.786 0 00-1.11 0z"
              ></path>
            </svg>
            <div className="text-base font-semibold leading-6 tracking-normal text-text-neutral-solid-dark">
              {t('DASHBOARD.PROFIT_CHANGE')}
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

      {/* Info: 區塊二 (20240523 - Shirley) */}
      <div className="flex flex-col max-md:ml-0 max-md:w-full">
        <div className="flex max-h-70px justify-between gap-2 rounded-3xl bg-surface-support-soft-rose py-4 pl-5 pr-2 max-md:mt-4 md:max-h-84px lg:min-h-180px lg:flex-col lg:space-x-2 lg:px-5">
          <div className="flex items-center gap-2 lg:items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="46"
              height="46"
              fill="none"
              viewBox="0 0 46 46"
            >
              <path
                fill="#FD6F8E"
                d="M0 23C0 10.297 10.297 0 23 0s23 10.297 23 23-10.297 23-23 23S0 35.703 0 23z"
              ></path>
              <path
                fill="#FCFDFF"
                fillRule="evenodd"
                d="M12.003 13.18c0-.651.528-1.179 1.178-1.179h5.32c.028 0 .057.001.085.003h8.835c.028-.002.056-.003.085-.003h5.318c.651 0 1.179.528 1.179 1.179v4.352a5.894 5.894 0 01-5.016 5.828 6.296 6.296 0 01-4.805 4.245v4.039h4.11a1.179 1.179 0 110 2.357h-5.248a1.124 1.124 0 01-.082 0h-5.247a1.179 1.179 0 010-2.357h4.11v-4.039a6.296 6.296 0 01-4.806-4.245 5.894 5.894 0 01-5.016-5.828V13.18zm4.714 1.178v6.509a3.537 3.537 0 01-2.357-3.335v-3.174h2.357zm12.572 6.508a3.537 3.537 0 002.357-3.334v-3.174h-2.357v6.508z"
                clipRule="evenodd"
              ></path>
            </svg>
            <div className="text-base font-semibold leading-6 tracking-normal text-text-neutral-solid-dark">
              {t('DASHBOARD.TOP_PROJECT_ROI')}
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

      {/* Info: 區塊三 (20240523 - Shirley) */}
      <div className="flex flex-col max-md:ml-0 max-md:w-full">
        <div className="flex max-h-70px justify-between gap-2 rounded-3xl bg-surface-support-soft-indigo px-5 py-4 max-md:mt-4 md:max-h-84px lg:min-h-180px lg:flex-col lg:space-x-2">
          <div className="flex items-center gap-1 lg:items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="46"
              height="46"
              fill="none"
              viewBox="0 0 46 46"
            >
              <path
                fill="#8098F9"
                d="M0 23C0 10.297 10.297 0 23 0s23 10.297 23 23-10.297 23-23 23S0 35.703 0 23z"
              ></path>
              <path
                fill="#FCFDFF"
                fillRule="evenodd"
                d="M21.014 18.34c-2.898-1.97-5.618-.784-7.962 1.366-.373.342-.295.94.139 1.202l4.684 2.822.006-.01 4.404 4.403-.01.006 2.821 4.684c.261.434.86.512 1.202.139 2.15-2.344 3.337-5.065 1.365-7.963 1.657-1.006 3.102-1.984 4.01-2.926 3.967-3.966 1.667-9.399 1.667-9.399s-5.433-2.3-9.4 1.667c-.94.907-1.92 2.353-2.926 4.009zm-4.89 8.343a3.143 3.143 0 012.202 5.437c-.348.334-.894.595-1.4.796-.538.214-1.153.405-1.728.562-.576.157-1.126.284-1.542.366a9.256 9.256 0 01-.528.092c-.067.01-.14.018-.209.02a1.057 1.057 0 01-.15-.002.797.797 0 01-.712-.623h-.001a.866.866 0 01-.018-.275c.004-.065.013-.136.023-.203.02-.138.052-.319.094-.524.084-.414.212-.962.37-1.536.157-.572.35-1.184.564-1.72.2-.505.462-1.047.795-1.395a3.142 3.142 0 012.24-.995z"
                clipRule="evenodd"
              ></path>
            </svg>
            <div className="text-base font-semibold leading-6 tracking-normal text-text-neutral-solid-dark">
              {t('DASHBOARD.PRE_LAUNCH_PROJECTS')}
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
