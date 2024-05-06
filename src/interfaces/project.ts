export interface IProject {
  id: string;
  name: string;
  value: IProjectValue;
  completionPercent: number;
  milestones: IMilestone[];
  salesData: ISalesData[];
  workerRate: IWorkerRate[];
  members: string[];
}

interface IMilestone {
  id: string;
  startDate: number; // timestamp
  endDate: number;
  status: string;
}

interface IProjectValue {
  totalRevenue: number;
  totalRevenueGrowthIn30d: number;
  totalExpense: number;
  netProfit: number;
  netProfitGrowthIn30d: number;
  netProfitGrowthInYear: number;
}

interface ISalesData {
  date: string;
  totalSales: number;
  comparison: number;
}

interface IWorkerRate {
  id: string;
  name: string;
  avatar: string;
  involvementRate: number;
  hours: number;
}

export interface IStatus {
  status: string;
  names: string[];
}

export interface IValue {
  name: string;
  income: number;
  expenses: number;
}
