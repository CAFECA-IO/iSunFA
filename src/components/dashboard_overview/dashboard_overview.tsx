import React from 'react';
import { cn } from '@/lib/utils/common';
import { DUMMY_DASHBOARD_OVERVIEW, IDashboardOverview } from '@/interfaces/dashboard_overview';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { useGlobalCtx } from '@/contexts/global_context';
import { ToastType } from '@/interfaces/toastify';
import { IProfitInsight } from '@/interfaces/project_insight';

const DashboardOverview = () => {
  const [dashboardOverview, setDashboardOverview] =
    React.useState<IDashboardOverview>(DUMMY_DASHBOARD_OVERVIEW);
  const { toastHandler } = useGlobalCtx();
  const { companyId } = useAccountingCtx();
  const {
    data: profitInsight,
    success: getSuccess,
    code: getCode,
    error: getError,
  } = APIHandler<IProfitInsight>(APIName.PROFIT_GET_INSIGHT, {
    params: {
      companyId,
    },
  });

  const displayedAssetsGrowthRate = `${dashboardOverview.profitGrowthRate ?? `-`} %`;
  const displayedProjectROI = dashboardOverview.projectROI ?? `-`;
  const displayedPreLaunchProjects = dashboardOverview.preLaunchProjects ?? `-`;

  React.useEffect(() => {
    if (getSuccess && profitInsight) {
      setDashboardOverview({
        profitGrowthRate: profitInsight.profitGrowthRate * 100,
        projectROI: (profitInsight.topProjectRoi * 100).toString(),
        preLaunchProjects: profitInsight.preLaunchProject,
      });
    } else if (getSuccess === false) {
      toastHandler({
        id: `profit_insight-${getCode}`,
        content: `Failed to get profit inside. Error code: ${getCode}`,
        type: ToastType.ERROR,
        closeable: true,
      });
    }
  }, [getSuccess, getCode, getError, profitInsight]);

  return (
    <div>
      <div className="dashboardCardShadow flex w-full justify-between gap-5 rounded-2xl bg-white px-5 py-4 text-start text-navyBlue2 max-md:max-w-full max-md:flex-col max-md:flex-wrap">
        <div className="flex items-center justify-between gap-4">
          {/* TODO: i18n (20240415 - Shirley) */}
          <div className="text-base font-semibold leading-6 tracking-normal">
            Profit Growth Rate
          </div>
          <div
            className={cn(
              'my-auto text-xl font-bold leading-8',
              dashboardOverview.profitGrowthRate > 0
                ? 'text-lightGreen'
                : dashboardOverview.profitGrowthRate < 0
                  ? 'text-lightRed'
                  : 'text-navyBlue2'
            )}
          >
            {displayedAssetsGrowthRate}
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="text-base font-semibold leading-6 tracking-normal">Top project ROI</div>
          <div className="my-auto text-xl font-bold leading-8">{displayedProjectROI}</div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="text-base font-semibold leading-6 tracking-normal">
            Pre-launch Project
          </div>
          <div className="my-auto text-xl font-bold leading-8">{displayedPreLaunchProjects}</div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
