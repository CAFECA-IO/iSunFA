/* eslint-disable */
import React from 'react';
import DashboardBookmark from '../dashboard_bookmark/dashboard_bookmark';

const NO_DATA_FOR_DEMO = true;

const DashboardPageBody = () => {
  const pageHeader = (
    <div className="text-5xl font-semibold leading-[52px] text-tertiaryBlue max-md:max-w-full">
      Hello! Welcome to <span className="text-primaryYellow">iSunFA</span> world{' '}
    </div>
  );
  const displayedPageBody = NO_DATA_FOR_DEMO ? <DashboardBookmark /> : <div>DashboardPageBody</div>;

  return (
    <div>
      <div className="mt-14 flex w-full flex-col px-10 max-md:mt-10 max-md:max-w-full max-md:px-5">
        {pageHeader}
      </div>

      <div className="mt-14 flex w-full flex-col px-10 max-md:mt-10 max-md:max-w-full max-md:px-5">
        {displayedPageBody}
      </div>
    </div>
  );
};

export default DashboardPageBody;
