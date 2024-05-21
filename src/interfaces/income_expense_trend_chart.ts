import { Period } from '@/interfaces/chart_unit';

export interface IIncomeExpenseTrendChartData {
  categories: string[];
  series: {
    name: string;
    data: number[]; // Info: percentage (20240521 - Shirley)
  }[];
  annotations: {
    name: string;
    data: {
      percentage: number;
      absolute: number;
    }[];
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
      {
        name: 'Profit Status',
        data: [10, 55, 66, 2, 33, 31, 9],
      },
    ],
    annotations: [
      {
        name: 'Income',
        data: [
          { percentage: -10, absolute: -1012.34 },
          { percentage: -5, absolute: -523.45 },
          { percentage: 40, absolute: 4078.56 },
          { percentage: 35, absolute: 3523.67 },
          { percentage: 0, absolute: 23.45 },
          { percentage: 49, absolute: 4901.56 },
          { percentage: 60, absolute: 6004.78 },
        ],
      },
      {
        name: 'Expense',
        data: [
          { percentage: 20, absolute: 2045.12 },
          { percentage: 15, absolute: 1523.34 },
          { percentage: 50, absolute: 13098.45 },
          { percentage: 25, absolute: 2502.56 },
          { percentage: 10, absolute: 1034.67 },
          { percentage: 35, absolute: 3512.78 },
          { percentage: 50, absolute: 5001.89 },
        ],
      },
      {
        name: 'Profit Status',
        data: [
          { percentage: 10, absolute: 1012.34 },
          { percentage: 55, absolute: 5501.45 },
          { percentage: 66, absolute: 6612.56 },
          { percentage: 2, absolute: 245.67 },
          { percentage: 33, absolute: 3312.78 },
          { percentage: 31, absolute: 3123.89 },
          { percentage: 9, absolute: 934.56 },
        ],
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
      {
        name: 'Profit Status',
        data: [10, 55, 25, 2, 33, 31, 9, 15, 47, 5, 10, 15],
      },
    ],
    annotations: [
      {
        name: 'Income',
        data: [
          { percentage: 10, absolute: 1012.34 },
          { percentage: 5, absolute: 534.56 },
          { percentage: -10, absolute: -1098.45 },
          { percentage: 15, absolute: 1501.23 },
          { percentage: 5, absolute: 501.34 },
          { percentage: 19, absolute: 1902.45 },
          { percentage: 8, absolute: 812.56 },
          { percentage: 10, absolute: 1012.34 },
          { percentage: 5, absolute: 512.45 },
          { percentage: 40, absolute: 4034.56 },
          { percentage: 35, absolute: 3512.67 },
          { percentage: 60, absolute: 6004.78 },
        ],
      },
      {
        name: 'Expense',
        data: [
          { percentage: 15, absolute: 1503.45 },
          { percentage: 10, absolute: 1034.56 },
          { percentage: 20, absolute: 2012.67 },
          { percentage: 25, absolute: 2501.78 },
          { percentage: 15, absolute: 1502.89 },
          { percentage: 30, absolute: 3023.45 },
          { percentage: 20, absolute: 2012.34 },
          { percentage: 25, absolute: 2512.45 },
          { percentage: 15, absolute: 1503.56 },
          { percentage: 35, absolute: 3512.67 },
          { percentage: 30, absolute: 3012.78 },
          { percentage: 45, absolute: 4512.89 },
        ],
      },
      {
        name: 'Profit Status',
        data: [
          { percentage: 10, absolute: 1012.34 },
          { percentage: 55, absolute: 5501.45 },
          { percentage: 25, absolute: 2501.56 },
          { percentage: 2, absolute: 234.67 },
          { percentage: 33, absolute: 3312.78 },
          { percentage: 31, absolute: 3123.89 },
          { percentage: 9, absolute: 912.56 },
          { percentage: 15, absolute: 1512.67 },
          { percentage: 47, absolute: 4701.78 },
          { percentage: 5, absolute: 501.89 },
          { percentage: 10, absolute: 1001.23 },
          { percentage: 15, absolute: 1501.34 },
        ],
      },
    ],
  },
  year: {
    categories: ['2020', '2021', '2022', '2023', '2024'],
    series: [
      {
        name: 'Income',
        data: [-10, -5, 40, 35, 0, 49, 60],
      },
      {
        name: 'Expense',
        data: [22, 10, 30, 25, 35, 40, 50],
      },
      {
        name: 'Profit Status',
        data: [35, 21, 10, 19, 15, 66],
      },
    ],
    annotations: [
      {
        name: 'Income',
        data: [
          { percentage: -10, absolute: -1012.34 },
          { percentage: -5, absolute: -523.45 },
          { percentage: 40, absolute: 4078.56 },
          { percentage: 35, absolute: 3523.67 },
          { percentage: 20, absolute: 2001.78 },
        ],
      },
      {
        name: 'Expense',
        data: [
          { percentage: 15, absolute: 1523.45 },
          { percentage: 10, absolute: 1034.56 },
          { percentage: 30, absolute: 3012.67 },
          { percentage: 25, absolute: 2501.78 },
          { percentage: 35, absolute: 3501.89 },
        ],
      },
      {
        name: 'Profit Status',
        data: [
          { percentage: 5, absolute: 501.23 },
          { percentage: 5, absolute: 501.34 },
          { percentage: 10, absolute: 1001.45 },
          { percentage: 10, absolute: 1001.56 },
          { percentage: 15, absolute: 1501.67 },
        ],
      },
    ],
  },
};
