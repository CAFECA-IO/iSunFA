import React from 'react';
import { cn } from '@/lib/utils/common';
import { DUMMY_DASHBOARD_OVERVIEW } from '@/interfaces/dashboard_overview';

const DashboardOverview = () => {
  const dashboardOverview = DUMMY_DASHBOARD_OVERVIEW;

  const displayedAssetsGrowthRate = `${dashboardOverview.profitGrowthRate ?? `-`} %`;
  const displayedProjectROI = dashboardOverview.projectROI ?? `-`;
  const displayedPreLaunchProjects = dashboardOverview.preLaunchProjects ?? `-`;

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
