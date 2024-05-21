import React from 'react';
import DashboardOverview from '@/components/dashboard_overview/dashboard_overview';
// import ProfitTrendChart from '@/components/profit_trend_chart/profit_trend_chart';
import IncomeExpenseTrendChart from '@/components/income_expense_trend_chart/income_expense_trend_chart';
import ProjectProgressChart from '@/components/project_progress_chart/project_progress_chart';
import ProjectRoiComparisonChart from '@/components/project_roi_comparison_chart/project_roi_comparison_chart';
import LaborCostChart from '@/components/labor_cost_chart/labor_cost_chart';

const DashboardWithData = () => {
  const displayedDataSection = (
    <div className="mt-10">
      <div className="grid grid-cols-1 gap-14 lg:grid-cols-2">
        <div>
          <div className="">
            <DashboardOverview />
          </div>

          <div className="mt-10">
            {/* <ProfitTrendChart /> */}
            <LaborCostChart />
          </div>

          <div className="mt-10">
            <IncomeExpenseTrendChart />
          </div>
        </div>

        <div>
          <div className="">
            <ProjectProgressChart />
          </div>
          <div className="mt-10">
            <ProjectRoiComparisonChart />
          </div>
        </div>
      </div>
    </div>
  );

  return <div>{displayedDataSection}</div>;
};

export default DashboardWithData;
