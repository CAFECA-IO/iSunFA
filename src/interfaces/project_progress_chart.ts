export interface IProjectProgressChartData {
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
