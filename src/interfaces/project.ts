export interface IProject {
  id: number;
  companyId: number;
  imageId: string | null;
  name: string;
  income: number;
  expense: number;
  profit: number;
  contractAmount: number;
  stage: string;
  members: IMember[];
  createdAt: number;
  updatedAt: number;
}

export interface IMilestone {
  id: number;
  projectId: number;
  startDate: number | null;
  endDate: number | null;
  status: string;
  createdAt: number;
  updatedAt: number;
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
  createdAt: number;
  updatedAt: number;
}

export interface IWorkRate {
  id: number;
  employeeProjectId: number;
  involvementRate: number;
  expected_hours: number;
  actual_hours: number;
  createdAt: number;
  updatedAt: number;
}

interface IMember {
  name: string;
  imageId: string;
}
