import React from 'react';
import DashboardBookmark from '@/components/dashboard_bookmark/dashboard_bookmark';
import { NO_DATA_FOR_DEMO } from '@/constants/display';
import DashboardWithoutData from '@/components/dashboard_without_data/dashboard_without_data';
import DashboardWithData from '@/components/dashboard_with_data/dashboard_with_data';
import { useUserCtx } from '@/contexts/user_context';
import { useTranslation } from 'next-i18next';

const DashboardPageBody = () => {
  const { t } = useTranslation('common');
  const { selectedCompany } = useUserCtx();
  const companyName = selectedCompany?.name ?? 'iSunFA';

  const pageHeader = (
    <div className="my-auto flex-1 text-2xl font-semibold text-text-brand-secondary-lv2 max-md:max-w-full lg:text-5xl lg:leading-52px">
      {t('common:DASHBOARD.HELLO_WELCOME_TO')}
      <span className="break-all text-text-brand-primary-lv2">{companyName}</span>
    </div>
  );
  // TODO: (20240603 - Shirley) [Beta] Loading -> get data from API -> display data or no data
  const displayedPageBody = NO_DATA_FOR_DEMO ? <DashboardWithoutData /> : <DashboardWithData />;

  return (
    <div className="bg-surface-neutral-main-background px-5 pb-10 pt-5 max-md:pt-10 lg:px-10 lg:pb-56">
      <div className="mt-6 flex w-full flex-col justify-between gap-5 lg:flex-row">
        <div className="my-auto flex flex-col px-0 max-md:max-w-full">{pageHeader}</div>
        <div className="border-b border-divider-stroke-lv-4 lg:hidden"></div>
        {/* Info: (20240603 - Shirley) 決定 bookmark component 的寬度，沒有書籤的話就是 min width ，書籤數量超過 min width 的話就是 max width */}
        <div className="my-auto lg:min-w-1/3 lg:max-w-3/5">
          <DashboardBookmark />
        </div>
      </div>

      <div className="">{displayedPageBody}</div>
    </div>
  );
};

export default DashboardPageBody;
