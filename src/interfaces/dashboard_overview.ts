export interface IDashboardOverview {
  profitGrowthRate: number;
  projectROI: string;
  preLaunchProjects: number;
}

export function generateDashboardOverview(): IDashboardOverview {
  const isGrowthPositive = Math.random() > 0.5;
  const profitGrowthRate = isGrowthPositive
    ? Math.floor(Math.random() * 100)
    : -Math.floor(Math.random() * 100);

  const unitForROI = ['K', 'M', 'B'];
  const randomUnitIndex = Math.floor(Math.random() * unitForROI.length);
  const projectROI = `${Math.floor(Math.random() * 100)} ${unitForROI[randomUnitIndex]}`;

  const preLaunchProjects = Math.floor(Math.random() * 100);
  return {
    profitGrowthRate,
    projectROI,
    preLaunchProjects,
  };
}

export const DUMMY_DASHBOARD_OVERVIEW: IDashboardOverview = {
  profitGrowthRate: -8,
  projectROI: '22',
  preLaunchProjects: 10,
};
