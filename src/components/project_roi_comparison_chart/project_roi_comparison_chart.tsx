/* eslint-disable */
import React from 'react';

const ProjectRoiComparisonChart = () => {
  const displayedDataSection = (
    <div className="flex h-550px flex-col rounded-3xl bg-white px-5 pb-9 pt-5 shadow-xl max-md:max-w-full">
      <div className="flex justify-start gap-2 pb-2 text-2xl font-bold leading-8 text-navyBlue2 max-md:max-w-full max-md:flex-wrap">
        <div>Project ROI Comparison Graph</div>
      </div>
    </div>
  );
  return <div>{displayedDataSection}</div>;
};

export default ProjectRoiComparisonChart;
