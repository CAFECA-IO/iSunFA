/* eslint-disable */
import React from 'react';
import Tooltip from '../tooltip/tooltip';

const ProfitTrendChart = () => {
  const displayedDataSection = (
    <div className="flex h-400px flex-col rounded-3xl bg-white px-5 pb-9 pt-5 shadow-xl max-md:max-w-full">
      <div className="flex justify-start gap-2 pb-2 text-2xl font-bold leading-8 text-navyBlue2 max-md:max-w-full max-md:flex-wrap">
        <div>Profit Status Trend Chart</div>
        <Tooltip>
          <p>
            A message which appears when a cursor is positioned over an icon, image, hyperlink, or
            other element in a graphical user interface.
          </p>
        </Tooltip>
      </div>
    </div>
  );
  return <div>{displayedDataSection}</div>;
};

export default ProfitTrendChart;
