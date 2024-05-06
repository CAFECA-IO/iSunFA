export interface IProject {
  id: string;
  name: string;
  Value: IProjectValue;
  completionPercent: number;
  milestones: IMilestone[];
  salesData: ISalesData[];
  workerRate: IWorkerRate[];
  members: string[];
}

interface IMilestone {
  startDate: string;
  endDate: string;
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
