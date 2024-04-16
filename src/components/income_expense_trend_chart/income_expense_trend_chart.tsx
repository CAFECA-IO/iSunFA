/* eslint-disable */
import React from 'react';

const IncomeExpenseTrendChart = () => {
  const displayedDataSection = (
    <div className="flex h-400px flex-col rounded-3xl bg-white px-5 pb-9 pt-5 shadow-xl max-md:max-w-full">
      <div className="flex justify-start gap-2 pb-2 text-2xl font-bold leading-8 text-navyBlue2 max-md:max-w-full max-md:flex-wrap">
        <div>Income vs. Expense Trend Chart</div>
      </div>
    </div>
  );
  return <div>{displayedDataSection}</div>;
};

export default IncomeExpenseTrendChart;
