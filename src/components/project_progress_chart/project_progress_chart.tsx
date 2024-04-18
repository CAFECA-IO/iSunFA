/* eslint-disable */
import React, { useState } from 'react';
// import DatePicker from '../date_picker/date_picker';
import DatePicker from '../date_picker/date_picker';
import { default30DayPeriod } from '../../constants/display';

const ProjectProgressChart = () => {
  const [period, setPeriod] = useState(default30DayPeriod);

  console.log(
    'period in ProjectProgressChart',
    new Date(period.startTimeStamp * 1000).getDate(),
    new Date(period.endTimeStamp * 1000).getDate()
  );

  const displayedDataSection = (
    <div className="dashboardCardShadow flex h-400px flex-col rounded-3xl bg-white px-5 pb-9 pt-5 max-md:max-w-full">
      <div>
        <div className="flex justify-start gap-2 pb-2 text-2xl font-bold leading-8 text-navyBlue2 max-md:max-w-full max-md:flex-wrap">
          <div>Project Progress Chart</div>
        </div>
      </div>

      <div className="flex w-full items-start justify-start">
        <DatePicker period={period} setFilteredPeriod={setPeriod} />
      </div>
    </div>
  );
  return <div>{displayedDataSection}</div>;
};

export default ProjectProgressChart;
