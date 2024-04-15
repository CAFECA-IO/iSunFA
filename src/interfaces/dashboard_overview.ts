export interface IDashboardOverview {
  assetsGrowthRate: number;
  projectROI: string;
  preLaunchProjects: number;
}

// generate dummy data for `DashboardOverview`
export function generateDashboardOverview(): IDashboardOverview {
  // generate assetsGrowthRate negative or positive
  const isGrowthPositive = Math.random() > 0.5;
  const assetsGrowthRate = isGrowthPositive
    ? Math.floor(Math.random() * 100)
    : -Math.floor(Math.random() * 100);

  const unitForROI = ['K', 'M', 'B'];
  const randomUnitIndex = Math.floor(Math.random() * unitForROI.length);
  const projectROI = `${Math.floor(Math.random() * 100)} ${unitForROI[randomUnitIndex]}`;

  const preLaunchProjects = Math.floor(Math.random() * 100);
  return {
    assetsGrowthRate,
    projectROI,
    preLaunchProjects,
  };
}
