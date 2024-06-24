import { timestampInSeconds } from '@/lib/utils/common';

export interface ILaborCostChartData {
  date: number;
  categories: string[];
  series: number[];
  empty: boolean;
}

export function generateRandomLaborCostData(items: number): ILaborCostChartData {
  const date = timestampInSeconds(new Date('2024-04-01').getTime());
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
  const empty = false;

  return {
    date,
    categories,
    series,
    empty,
  };
}

export const DUMMY_LABOR_COST_CHART_DATA: ILaborCostChartData = generateRandomLaborCostData(6);
