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
          { percentage: -10, absolute: -1012 },
          { percentage: -5, absolute: -523 },
          { percentage: 40, absolute: 4078 },
          { percentage: 35, absolute: 3523 },
          { percentage: 1, absolute: 23 },
          { percentage: 49, absolute: 4901 },
          { percentage: 60, absolute: 6004 },
        ],
      },
      {
        name: 'Expense',
        data: [
          { percentage: 20, absolute: 2045 },
          { percentage: 15, absolute: 1523 },
          { percentage: 50, absolute: 13098 },
          { percentage: 25, absolute: 2502 },
          { percentage: 10, absolute: 1034 },
          { percentage: 35, absolute: 3512 },
          { percentage: 50, absolute: 5001 },
        ],
      },
      {
        name: 'Profit Status',
        data: [
          { percentage: 10, absolute: 1012 },
          { percentage: 55, absolute: 5501 },
          { percentage: 66, absolute: 6612 },
          { percentage: 2, absolute: 245 },
          { percentage: 33, absolute: 3312 },
          { percentage: 31, absolute: 3123 },
          { percentage: 9, absolute: 934 },
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
          { percentage: 10, absolute: 1012 },
          { percentage: 5, absolute: 534 },
          { percentage: -10, absolute: -1098 },
          { percentage: 15, absolute: 1501 },
          { percentage: 5, absolute: 501 },
          { percentage: 19, absolute: 1902 },
          { percentage: 8, absolute: 812 },
          { percentage: 10, absolute: 1012 },
          { percentage: 5, absolute: 512 },
          { percentage: 40, absolute: 4034 },
          { percentage: 35, absolute: 3512 },
          { percentage: 60, absolute: 6004 },
        ],
      },
      {
        name: 'Expense',
        data: [
          { percentage: 15, absolute: 1503 },
          { percentage: 10, absolute: 1034 },
          { percentage: 20, absolute: 2012 },
          { percentage: 25, absolute: 2501 },
          { percentage: 15, absolute: 1502 },
          { percentage: 30, absolute: 3023 },
          { percentage: 20, absolute: 2012 },
          { percentage: 25, absolute: 2512 },
          { percentage: 15, absolute: 1503 },
          { percentage: 35, absolute: 3512 },
          { percentage: 30, absolute: 3012 },
          { percentage: 45, absolute: 4512 },
        ],
      },
      {
        name: 'Profit Status',
        data: [
          { percentage: 10, absolute: 1012 },
          { percentage: 55, absolute: 5501 },
          { percentage: 25, absolute: 2501 },
          { percentage: 2, absolute: 234 },
          { percentage: 33, absolute: 3312 },
          { percentage: 31, absolute: 3123 },
          { percentage: 9, absolute: 912 },
          { percentage: 15, absolute: 1512 },
          { percentage: 47, absolute: 4701 },
          { percentage: 5, absolute: 501 },
          { percentage: 10, absolute: 1001 },
          { percentage: 15, absolute: 1501 },
        ],
      },
    ],
  },
  year: {
    categories: ['2020', '2021', '2022', '2023', '2024'],
    series: [
      {
        name: 'Income',
        data: [-10, -5, 40, 49, 60],
      },
      {
        name: 'Expense',
        data: [15, 10, 30, 25, 35],
      },
      {
        name: 'Profit Status',
        data: [5, 2, 33, 10, 15],
      },
    ],
    annotations: [
      {
        name: 'Income',
        data: [
          { percentage: -10, absolute: -1012 },
          { percentage: -5, absolute: -523 },
          { percentage: 40, absolute: 4078 },
          { percentage: 49, absolute: 4901 },
          { percentage: 60, absolute: 6004 },
        ],
      },
      {
        name: 'Expense',
        data: [
          { percentage: 15, absolute: 1523 },
          { percentage: 10, absolute: 1034 },
          { percentage: 30, absolute: 3012 },
          { percentage: 25, absolute: 2501 },
          { percentage: 35, absolute: 3501 },
        ],
      },
      {
        name: 'Profit Status',
        data: [
          { percentage: 5, absolute: 501 },
          { percentage: 2, absolute: 201 },
          { percentage: 33, absolute: 3301 },
          { percentage: 10, absolute: 1001 },
          { percentage: 15, absolute: 1501 },
        ],
      },
    ],
  },
};
