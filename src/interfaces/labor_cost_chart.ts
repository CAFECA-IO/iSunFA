import { timestampInSeconds } from '@/lib/utils/common';

export interface ILaborCostChartData {
  date: number;
  categories: string[];
  series: number[];
}

export function generateRandomLaborCostData(items: number): ILaborCostChartData {
  const nowInSec = timestampInSeconds(Date.now());
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
  const series = Array.from({ length: items }, (_, i) => (i + 1) * 10);

  return {
    date: nowInSec, // Info: 畫圖表不會用到 date，但為了後續 debug，將前端給的時間參數都放進去 (20240521 - Shirley)
    categories,
    series,
  };
}

export const DUMMY_LABOR_COST_CHART_DATA: ILaborCostChartData = generateRandomLaborCostData(6);
