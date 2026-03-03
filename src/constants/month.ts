export enum MonthEnum {
  JAN = 'January',
  FEB = 'February',
  MAR = 'March',
  APR = 'April',
  MAY = 'May',
  JUN = 'June',
  JUL = 'July',
  AUG = 'August',
  SEP = 'September',
  OCT = 'October',
  NOV = 'November',
  DEC = 'December',
}

export type MonthEnumType = keyof typeof MonthEnum;

export type MonthType = {
  name: string;
  days: number;
};

export const MONTHS: MonthType[] = [
  {
    name: MonthEnum.JAN,
    days: 31,
  },
  {
    name: MonthEnum.FEB,
    days: 28, // Info: (20250710 - Julian) 不考慮閏年
  },
  {
    name: MonthEnum.MAR,
    days: 31,
  },
  {
    name: MonthEnum.APR,
    days: 30,
  },
  {
    name: MonthEnum.MAY,
    days: 31,
  },
  {
    name: MonthEnum.JUN,
    days: 30,
  },
  {
    name: MonthEnum.JUL,
    days: 31,
  },
  {
    name: MonthEnum.AUG,
    days: 31,
  },
  {
    name: MonthEnum.SEP,
    days: 30,
  },
  {
    name: MonthEnum.OCT,
    days: 31,
  },
  {
    name: MonthEnum.NOV,
    days: 30,
  },
  {
    name: MonthEnum.DEC,
    days: 31,
  },
];
