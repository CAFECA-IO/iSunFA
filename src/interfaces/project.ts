export interface IProject {
  id: number;
  companyId: number;
  name: string;
  completedPercent: number;
  stage: string;
  members: IMember[];
}

export interface IMilestone {
  id: number;
  projectId: number;
  startDate: number; // timestamp
  endDate: number;
  status: string;
}

export interface IValue {
  id: number;
  projectId: number;
  totalRevenue: number;
  totalRevenueGrowthIn30d: number;
  totalExpense: number;
  netProfit: number;
  netProfitGrowthIn30d: number;
  netProfitGrowthInYear: number;
}

export interface ISale {
  id: number;
  projectId: number;
  date: string;
  totalSales: number;
  comparison: number;
}

export interface IWorkRate {
  id: number;
  projectId: number;
  name: string;
  avatar: string;
  involvementRate: number;
  hours: number;
}

interface IMember {
  name: string;
  imageId: string;
}
