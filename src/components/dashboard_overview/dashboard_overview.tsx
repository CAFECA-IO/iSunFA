import React from 'react';
import { useDashboard } from '../../contexts/dashboard_context';

const DashboardOverview = () => {
  const { dashboardOverview } = useDashboard();
  const isGrowthPositive = dashboardOverview.assetsGrowthRate > 0;

  const displayedAssetsGrowthRate = `${dashboardOverview.assetsGrowthRate ?? `- -`} %`;
  const displayedProjectROI = dashboardOverview.projectROI ?? `- -`;
  const displayedPreLaunchProjects = dashboardOverview.preLaunchProjects ?? `- -`;

  return (
    <div>
      <div className="flex w-full justify-between gap-5 rounded-2xl bg-white px-5 py-4 text-start text-navyBlue2 shadow-xl max-md:max-w-full max-md:flex-col max-md:flex-wrap">
        <div className="flex items-center justify-between gap-4">
          {/* TODO: i18n (20240415 - Shirley) */}
          <div className="text-base font-semibold leading-6 tracking-normal">
            Assets Growth Rate
          </div>
          <div
            className={`my-auto text-xl font-bold leading-8 ${isGrowthPositive ? 'text-lightGreen' : 'text-lightRed'}`}
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
