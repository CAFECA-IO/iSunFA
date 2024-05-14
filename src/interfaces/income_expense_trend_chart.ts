import { Period } from './chart_unit';

export interface IIncomeExpenseTrendChartData {
  categories: string[];
  series: {
    name: string;
    data: number[];
  }[];
}

export const DUMMY_INCOME_EXPENSE_TREND_CHART_DATA: Record<Period, IIncomeExpenseTrendChartData> = {
  week: {
    categories: ['4/1', '4/2', '4/3', '4/4', '4/5', '4/6', '4/7'],
    series: [
      {
        name: 'Income',
        data: [-10, -5, 40, 35, 0, 49, 60],
      },
      {
        name: 'Expense',
        data: [20, 15, 30, 25, 10, 35, 50],
      },
    ],
  },
  month: {
    categories: [
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
      'Jan',
      'Feb',
      'Mar',
      'Apr',
    ],
    series: [
      {
        name: 'Income',
        data: [10, 5, -10, 15, 5, 19, 8, 10, 5, 40, 35, 60],
      },
      {
        name: 'Expense',
        data: [15, 10, 20, 25, 15, 30, 20, 25, 15, 35, 30, 45],
      },
    ],
  },
  year: {
    categories: ['2020', '2021', '2022', '2023', '2024'],
    series: [
      {
        name: 'Income',
        data: [-10, -5, 40, 35, 20],
      },
      {
        name: 'Expense',
        data: [15, 10, 30, 25, 35],
      },
    ],
  },
};
