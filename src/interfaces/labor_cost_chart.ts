import { timestampInSeconds } from '@/lib/utils/common';

export interface ILaborCostChartData {
  startDate: number;
  endDate: number;
  categories: string[];
  series: number[];
}

export function generateRandomLaborCostData(items: number): ILaborCostChartData {
  const startDate = timestampInSeconds(new Date('2024-04-01').getTime());
  const endDate = timestampInSeconds(new Date('2024-05-01').getTime());
  const categories = [
    'Project A',
    'Project B',
    'Project C',
    'Project D',
    'Project E',
    'Project F',
    'Project G',
    'Project H',
    'Project I',
    'Project J',
    'Project K',
    'Project L',
    'Project M',
    'Project N',
    'Project O',
    'Project P',
    'Project Q',
    'Project R',
    'Project S',
    'Project T',
    'Project U',
    'Project V',
    'Project W',
    'Project X',
    'Project Y',
    'Project Z',
  ].slice(0, items);
  const series = Array.from({ length: items }, () => Math.floor(Math.random() * 100));

  return {
    startDate, // Info: 畫圖表不會用到 date，但為了後續 debug，將前端給的時間參數都放進去 (20240521 - Shirley)
    endDate,
    categories,
    series,
  };
}

export const DUMMY_LABOR_COST_CHART_DATA: ILaborCostChartData = generateRandomLaborCostData(6);
