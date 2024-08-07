export const IS_BUTTON_DISABLED_TEMP = true;
export const INTERVAL_NUMBER_ANIMATION = 500;
export const DEFAULT_DISPLAYED_USER_NAME = 'User';
export const NO_DATA_FOR_DEMO = false;
export const LAYOUT_BREAKPOINT = 1024;

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

export const MONTH_FULL_LIST_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
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

// Info: (20240429 - Julian) checkbox CSS style
export const checkboxStyle =
  'relative h-16px w-16px appearance-none rounded-xxs border border-navyBlue2 bg-white outline-none after:absolute after:top-0 after:-mt-3px after:ml-px after:hidden after:text-sm after:text-white after:content-checked checked:bg-navyBlue2 checked:after:block';

// Info: (20240425 - Julian) radio button CSS style
export const radioButtonStyle =
  'relative h-16px w-16px appearance-none outline-none rounded-full border border-navyBlue2 bg-white after:absolute after:left-1/2 after:top-1/2 after:-ml-5px after:-mt-5px after:hidden after:h-10px after:w-10px after:rounded-full after:bg-navyBlue2 checked:after:block';

export const ITEMS_PER_PAGE_ON_DASHBOARD = 6;

export enum SortOptions {
  newest = 'COMMON.NEWEST',
  oldest = 'COMMON.OLDEST',
}

export const DEFAULT_AVATAR_URL = '/elements/avatar.png';
export const DEFAULT_COMPANY_IMAGE_URL = '/elements/example_company_image.png';

export enum DatePickerAlign {
  LEFT = 'left',
  RIGHT = 'right',
  CENTER = 'center',
}

export const LIMIT_NOTIFICATION_TITLE = 100;

export enum ActionType {
  login = 'login',
  register = 'register',
}

export const DEFAULT_SKELETON_COUNT_FOR_PAGE = 5;
export const LIMIT_FOR_REPORT_PAGE = 5;
export const DEFAULT_PAGE_NUMBER = 1;

export const DEFAULT_THROTTLE_TIME = 100;
export const WAIT_FOR_REPORT_DATA = 2000;
