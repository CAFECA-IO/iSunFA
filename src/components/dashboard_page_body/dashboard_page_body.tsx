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
    <div className="my-auto flex-1 text-2xl font-semibold text-tertiaryBlue max-md:max-w-full lg:text-5xl lg:leading-52px">
      Hello! Welcome to <span className="text-primaryYellow">{companyName}</span>
    </div>
  );
  // TODO: Loading -> get data from API -> display data or no data (20240603 - Shirley)
  const displayedPageBody = NO_DATA_FOR_DEMO ? <DashboardWithoutData /> : <DashboardWithData />;

  return (
    <div className="bg-surface-neutral-main-background px-5 pb-32 pt-5 max-md:pt-10 lg:px-10">
      <div className="mt-6 flex w-full flex-col justify-between gap-5 lg:flex-row">
        <div className="my-auto flex flex-col px-0 max-md:max-w-full">{pageHeader} </div>
        <div className="border-b border-gray-300 lg:hidden"></div>
        {/* Info: 決定 bookmark component 的寬度，沒有書籤的話就是 min width ，書籤數量超過 min width 的話就是 max width (20240603 - Shirley) */}
        <div className="my-auto lg:min-w-1/3 lg:max-w-3/5">
          <DashboardBookmark />
        </div>
      </div>

      <div className="">{displayedPageBody}</div>
    </div>
  );
};

export default DashboardPageBody;
