import { timestampInSeconds } from '@/lib/utils/common';

export interface IProjectProgressChartData {
  date: number;
  categories: string[];
  series: {
    name: string;
    data: number[];
  }[];
}

export const DUMMY_CATEGORIES = [
  'Designing',
  'Beta Testing',
  'Develop',
  'Sold',
  'Selling',
  'Archived',
];

export function generateRandomData(): IProjectProgressChartData {
  return {
    date: timestampInSeconds(new Date('2024-04-01').getTime()),
    categories: DUMMY_CATEGORIES,
    series: [
      {
        name: 'Projects',
        data: [
          Math.floor(Math.random() * 200),
          Math.floor(Math.random() * 200),
          Math.floor(Math.random() * 200),
          Math.floor(Math.random() * 200),
          Math.floor(Math.random() * 200),
          Math.floor(Math.random() * 200),
        ],
      },
    ],
  };
}

// Info: 註冊日期或第一個專案的日期 (20240513 - Shirley)
export const DUMMY_START_DATE = '2024/02/12';
