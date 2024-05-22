import React from 'react';
import DashboardBookmark from '@/components/dashboard_bookmark/dashboard_bookmark';
import { NO_DATA_FOR_DEMO } from '@/constants/display';
import DashboardWithoutData from '@/components/dashboard_without_data/dashboard_without_data';
import DashboardWithData from '@/components/dashboard_with_data/dashboard_with_data';
import { useUserCtx } from '@/contexts/user_context';

const DashboardPageBody = () => {
  const { selectedCompany } = useUserCtx();
  const companyName = selectedCompany?.name ?? 'iSunFA';

  const pageHeader = (
    // TODO: i18n (20240415 - Shirley)
    <div className="inline-flex gap-x-2 whitespace-nowrap text-5xl font-semibold leading-52px text-tertiaryBlue max-md:max-w-full">
      Hello! Welcome to <span className="text-primaryYellow">{companyName}</span>
      <p className={selectedCompany?.name ? 'hidden' : 'block'}>world</p>
    </div>
  );
  const displayedPageBody = NO_DATA_FOR_DEMO ? <DashboardWithoutData /> : <DashboardWithData />;

  return (
    <div className="bg-surface-neutral-main-background px-10 pb-20 pt-5 max-md:pt-10">
      <div className="mt-10 flex w-full items-center justify-between gap-x-40px px-3 max-md:max-w-full max-md:px-5">
        {pageHeader} <DashboardBookmark />
      </div>
      <div className="">{displayedPageBody}</div>
    </div>
  );
};

export default DashboardPageBody;
