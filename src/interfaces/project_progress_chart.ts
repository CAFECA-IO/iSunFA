export interface IProjectProgressChartData {
  categories: string[];
  series: number[][];
}

export interface IProjectProgressChartDataWithPagination extends IProjectProgressChartData {
  currentPage: number;
  totalPages: number;
}

export const DUMMY_CATEGORIES = [
  'iSunFA',
  'BAIFA',
  'iSunOne',
  'TideBit',
  'ProjectE',
  'ProjectF',
  'ProjectG',
  'ProjectH',
  'ProjectI',
  'ProjectJ',
];

export function generateRandomData(): IProjectProgressChartData {
  const newSeries = [
    Array.from({ length: DUMMY_CATEGORIES.length }, () => Math.floor(Math.random() * 150) + 100),
    Array.from({ length: DUMMY_CATEGORIES.length }, () => Math.floor(Math.random() * 150) + 100),
  ];

  return {
    categories: DUMMY_CATEGORIES,
    series: newSeries,
  };
}

// Info: 註冊日期或第一個專案的日期 (20240513 - Shirley)
export const DUMMY_START_DATE = '2024/02/12';
