import React from 'react';
import DashboardBookmark from '../dashboard_bookmark/dashboard_bookmark';
import { NO_DATA_FOR_DEMO } from '../../constants/display';
import DashboardWithoutData from '../dashboard_without_data/dashboard_without_data';
import DashboardWithData from '../dashboard_with_data/dashboard_with_data';

const DashboardPageBody = () => {
  const pageHeader = (
    // TODO: i18n (20240415 - Shirley)
    <div className="text-5xl font-semibold leading-52px text-tertiaryBlue max-md:max-w-full">
      Hello! Welcome to <span className="text-primaryYellow">iSunFA</span> world{' '}
    </div>
  );
  const displayedPageBody = (
    <div>
      <DashboardBookmark />

      {NO_DATA_FOR_DEMO ? <DashboardWithoutData /> : <DashboardWithData />}
    </div>
  );

  return (
    <div className="mx-10 pb-20 pt-5 max-md:pt-10">
      {' '}
      <div className="mt-14 flex w-full flex-col px-3 max-md:mt-10 max-md:max-w-full max-md:px-5">
        {pageHeader}
      </div>
      <div className="">{displayedPageBody}</div>
    </div>
  );
};

export default DashboardPageBody;
