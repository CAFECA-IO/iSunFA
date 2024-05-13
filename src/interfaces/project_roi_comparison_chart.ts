export interface IProjectROIComparisonChartData {
  categories: string[];
  series: number[][];
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

  return {
    categories: DUMMY_CATEGORIES,
    series: newSeries,
  };
}

// export function generateRandomData(
//   currentPage: number,
//   itemsPerPage: number
// ): IProjectProgressChartDataWithPagination {
//   const totalItems = DUMMY_CATEGORIES.length;
//   const totalPages = Math.ceil(totalItems / itemsPerPage);

//   const startIndex = (currentPage - 1) * itemsPerPage;
//   const endIndex = startIndex + itemsPerPage;
//   const paginatedCategories = DUMMY_CATEGORIES.slice(startIndex, endIndex);

//   const newSeries = [
//     Array.from({ length: totalItems }, () => Math.floor(Math.random() * 150) + 100),
//     Array.from({ length: totalItems }, () => Math.floor(Math.random() * 150) + 100),
//   ];

//   const paginatedSeriesData = newSeries.map(
//     (series: number[]) =>
//       // eslint-disable-next-line implicit-arrow-linebreak
//       series.slice(startIndex, endIndex)
//     // eslint-disable-next-line function-paren-newline
//   );

//   return {
//     categories: paginatedCategories,
//     series: paginatedSeriesData,
//     currentPage,
//     totalPages,
//   };
// }

// Info: 註冊日期或第一個專案的日期 (20240513 - Shirley)
export const DUMMY_START_DATE = '2024/02/12';
