export const IS_BUTTON_DISABLED_TEMP = true;
export const INTERVAL_NUMBER_ANIMATION_MOBILE = 1000;
export const INTERVAL_NUMBER_ANIMATION_DESKTOP = 10;
export const DEFAULT_DISPLAYED_USER_NAME = 'User';
export const NO_DATA_FOR_DEMO = false;
export const LAYOUT_BREAKPOINT = 1440;

export const MONTH_LIST = [
  'DATE_PICKER.JAN',
  'DATE_PICKER.FEB',
  'DATE_PICKER.MAR',
  'DATE_PICKER.APR',
  'DATE_PICKER.MAY',
  'DATE_PICKER.JUN',
  'DATE_PICKER.JUL',
  'DATE_PICKER.AUG',
  'DATE_PICKER.SEP',
  'DATE_PICKER.OCT',
  'DATE_PICKER.NOV',
  'DATE_PICKER.DEC',
];

export const MONTH_ABR_LIST = [
  'DATE_PICKER.JAN_ABR',
  'DATE_PICKER.FEB_ABR',
  'DATE_PICKER.MAR_ABR',
  'DATE_PICKER.APR_ABR',
  'DATE_PICKER.MAY_ABR',
  'DATE_PICKER.JUN_ABR',
  'DATE_PICKER.JUL_ABR',
  'DATE_PICKER.AUG_ABR',
  'DATE_PICKER.SEP_ABR',
  'DATE_PICKER.OCT_ABR',
  'DATE_PICKER.NOV_ABR',
  'DATE_PICKER.DEC_ABR',
];

export const WEEK_LIST = [
  'DATE_PICKER.SUN',
  'DATE_PICKER.MON',
  'DATE_PICKER.TUE',
  'DATE_PICKER.WED',
  'DATE_PICKER.THU',
  'DATE_PICKER.FRI',
  'DATE_PICKER.SAT',
];

export const default30DayPeriodInSec = {
  startTimeStamp: 0,
  endTimeStamp: 0,
};

export const MILLISECONDS_IN_A_SECOND = 1000;

export const reportTypes = {
  balance_sheet: { id: 'balance_sheet', name: 'Balance Sheet' },
  comprehensive_income_statement: {
    id: 'comprehensive_income_statement',
    name: 'Comprehensive Income Statement',
  },
  cash_flow_statement: { id: 'cash_flow_statement', name: 'Cash Flow Statement' },
};

export const reportLanguages = {
  en: { id: 'en', name: 'English', icon: '/icons/en.svg' },
  tw: { id: 'tw', name: '繁體中文', icon: '/icons/tw.svg' },
  cn: { id: 'cn', name: '简体中文', icon: '/icons/cn.svg' },
};

export enum ReportTypes {
  balance_sheet = 'balance_sheet',
  comprehensive_income_statement = 'comprehensive_income_statement',
  cash_flow_statement = 'cash_flow_statement',
}

export enum ReportLanguages {
  en = 'en',
  tw = 'tw',
  cn = 'cn',
}
