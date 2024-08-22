import { Period } from '@/interfaces/chart_unit';

export interface IIncomeExpenseTrendChartData {
  categories: string[];
  series: {
    name: string;
    data: number[]; // Info: (20240521 - Shirley) absolute
  }[];
  annotations: {
    name: string;
    data: {
      absolute: number;
    }[];
  }[];
  empty: boolean;
}

export const DUMMY_INCOME_EXPENSE_TREND_CHART_DATA: Record<Period, IIncomeExpenseTrendChartData> = {
  week: {
    categories: ['4/1', '4/2', '4/3', '4/4', '4/5', '4/6', '4/7'],
    series: [
      {
        name: 'Income',
        data: [1012, 523, 4078, 3523, 23, 4901, 6004],
      },
      {
        name: 'Expense',
        data: [2045, 1523, 13098, 2502, 1034, 3512, 5001],
      },
      {
        name: 'Profit Status',
        data: [1012, 5501, 6612, 245, 3312, 3123, 934],
      },
    ],
    annotations: [
      {
        name: 'Income',
        data: [
          { absolute: 1012 },
          { absolute: 523 },
          { absolute: 4078 },
          { absolute: 3523 },
          { absolute: 23 },
          { absolute: 4901 },
          { absolute: 6004 },
        ],
      },
      {
        name: 'Expense',
        data: [
          { absolute: 2045 },
          { absolute: 1523 },
          { absolute: 13098 },
          { absolute: 2502 },
          { absolute: 1034 },
          { absolute: 3512 },
          { absolute: 5001 },
        ],
      },
      {
        name: 'Profit Status',
        data: [
          { absolute: 1012 },
          { absolute: 5501 },
          { absolute: 6612 },
          { absolute: 245 },
          { absolute: 3312 },
          { absolute: 3123 },
          { absolute: 934 },
        ],
      },
    ],
    empty: false,
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
        data: [1012, 534, 1098, 1501, 501, 1902, 812, 1012, 512, 4034, 3512, 6004],
      },
      {
        name: 'Expense',
        data: [1503, 1034, 2012, 2501, 1502, 3023, 2012, 2512, 1503, 3512, 3012, 4512],
      },
      {
        name: 'Profit Status',
        data: [1012, 5501, 2501, 234, 3312, 3123, 912, 1512, 4701, 501, 1001, 1501],
      },
    ],
    annotations: [
      {
        name: 'Income',
        data: [
          { absolute: 1012 },
          { absolute: 534 },
          { absolute: 1098 },
          { absolute: 1501 },
          { absolute: 501 },
          { absolute: 1902 },
          { absolute: 812 },
          { absolute: 1012 },
          { absolute: 512 },
          { absolute: 4034 },
          { absolute: 3512 },
          { absolute: 6004 },
        ],
      },
      {
        name: 'Expense',
        data: [
          { absolute: 1503 },
          { absolute: 1034 },
          { absolute: 2012 },
          { absolute: 2501 },
          { absolute: 1502 },
          { absolute: 3023 },
          { absolute: 2012 },
          { absolute: 2512 },
          { absolute: 1503 },
          { absolute: 3512 },
          { absolute: 3012 },
          { absolute: 4512 },
        ],
      },
      {
        name: 'Profit Status',
        data: [
          { absolute: 1012 },
          { absolute: 5501 },
          { absolute: 2501 },
          { absolute: 234 },
          { absolute: 3312 },
          { absolute: 3123 },
          { absolute: 912 },
          { absolute: 1512 },
          { absolute: 4701 },
          { absolute: 501 },
          { absolute: 1001 },
          { absolute: 1501 },
        ],
      },
    ],
    empty: false,
  },
  year: {
    categories: ['2020', '2021', '2022', '2023', '2024'],
    series: [
      {
        name: 'Income',
        data: [812, 523, 4078, 4901, 6004],
      },
      {
        name: 'Expense',
        data: [1523, 1034, 3012, 2501, 3501],
      },
      {
        name: 'Profit Status',
        data: [501, 201, 3301, 1001, 1501],
      },
    ],
    annotations: [
      {
        name: 'Income',
        data: [
          { absolute: 812 },
          { absolute: 523 },
          { absolute: 4078 },
          { absolute: 4901 },
          { absolute: 6004 },
        ],
      },
      {
        name: 'Expense',
        data: [
          { absolute: 1523 },
          { absolute: 1034 },
          { absolute: 3012 },
          { absolute: 2501 },
          { absolute: 3501 },
        ],
      },
      {
        name: 'Profit Status',
        data: [
          { absolute: 501 },
          { absolute: 201 },
          { absolute: 3301 },
          { absolute: 1001 },
          { absolute: 1501 },
        ],
      },
    ],
    empty: false,
  },
};
