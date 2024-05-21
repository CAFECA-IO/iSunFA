export interface IProfitPercent {
  income: number;
  expenses: number;
  date: Date;
  profit: number;
}

export interface IProfitComparison {
  startDate: Date;
  endDate: Date;
  comparisons: IProfitProject[];
}

export interface IProfitValue {
  income: number;
  expenses: number;
  date: Date;
  profit: number;
}

export interface IProfitProject {
  projectName: string;
  income: number;
  expenses: number;
  profit: number;
}
