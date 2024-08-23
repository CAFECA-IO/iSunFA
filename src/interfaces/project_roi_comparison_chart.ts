import { timestampInSeconds } from '@/lib/utils/common';

export interface IProjectROIComparisonChartData {
  categories: string[];
  series: number[][];
  startDate: number;
  endDate: number;
  empty: boolean;
}

export interface IProjectROIComparisonChartDataWithPagination
  extends IProjectROIComparisonChartData {
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

export function generateRandomData(): IProjectROIComparisonChartData {
  const newSeries = [
    Array.from({ length: DUMMY_CATEGORIES.length }, () => Math.floor(Math.random() * 150) + 100),
    Array.from({ length: DUMMY_CATEGORIES.length }, () => Math.floor(Math.random() * 150) + 100),
  ];
  const startDate = timestampInSeconds(new Date('2024-04-01').getTime());
  const endDate = timestampInSeconds(new Date('2024-05-01').getTime());
  return {
    startDate,
    endDate,
    categories: DUMMY_CATEGORIES,
    series: newSeries,
    empty: false,
  };
}

export function generateRandomPaginatedData(
  currentPage: number,
  itemsPerPage: number
): IProjectROIComparisonChartDataWithPagination {
  const totalItems = DUMMY_CATEGORIES.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCategories = DUMMY_CATEGORIES.slice(startIndex, endIndex);

  const newSeries = [
    Array.from({ length: totalItems }, () => Math.floor(Math.random() * 150) + 100),
    Array.from({ length: totalItems }, () => Math.floor(Math.random() * 150) + 100),
  ];

  const paginatedSeriesData = newSeries.map(
    (series: number[]) =>
      // TODO: (20240513 - Shirley) [Beta] eslint disable for workaround
      // eslint-disable-next-line implicit-arrow-linebreak
      series.slice(startIndex, endIndex)
    // eslint-disable-next-line function-paren-newline
  );

  const startDate = timestampInSeconds(new Date('2024-04-01').getTime());
  const endDate = timestampInSeconds(new Date('2024-05-01').getTime());

  return {
    startDate,
    endDate,
    categories: paginatedCategories,
    series: paginatedSeriesData,
    currentPage,
    totalPages,
    empty: false,
  };
}

// Info: (20240513 - Shirley) 註冊日期或第一個專案的日期
export const DUMMY_START_DATE = '2024/02/12';
