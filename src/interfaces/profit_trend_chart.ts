import { Period } from './chart_unit';

export interface IProfitTrendChartData {
  categories: string[];
  series: {
    name: string;
    data: number[];
  }[];
}

export const DUMMY_PROFIT_TREND_CHART_DATA: Record<Period, IProfitTrendChartData> = {
  week: {
    categories: ['4/1', '4/2', '4/3', '4/4', '4/5', '4/6', '4/7'],
    series: [
      {
        name: 'Profit Status',
        data: [-10, -5, 40, 35, 0, 49, 60],
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
        name: 'Profit Status',
        data: [10, 5, -10, 15, 5, 19, 8, 10, 5, 40, 35, 60],
      },
    ],
  },
  year: {
    categories: ['2020', '2021', '2022', '2023', '2024'],
    series: [
      {
        name: 'Profit Status',
        data: [-10, -5, 40, 35, 20],
      },
    ],
  },
};
