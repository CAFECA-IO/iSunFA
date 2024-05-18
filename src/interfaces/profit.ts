export interface IProfit {
  income: number;
  expenses: number;
  date: Date;
  profit: number;
}

export interface IProfitComparison {
  name: string;
  profit: IProfit[];
}
