export const IS_BUTTON_DISABLED_TEMP = true;
export const INTERVAL_NUMBER_ANIMATION = 500;
export const DEFAULT_DISPLAYED_USER_NAME = 'User';
export const NO_DATA_FOR_DEMO = false;
export const LAYOUT_BREAKPOINT = 1024;

/**
 * Info: (20241024 - Murky)
 * @description Is the list is display by grid with icon or list with words,
 * used on voucher display or certificate display ...etc
 */
export enum DISPLAY_LIST_VIEW_TYPE {
  /**
   * Info: (20241024 - Murky)
   * @description Display by grid with icon
   */
  GRID = 'grid',
  /**
   * Info: (20241024 - Murky)
   * @description Display by list with words
   */
  LIST = 'list',
}

export const MONTH_LIST = [
  'date_picker:DATE_PICKER.JAN',
  'date_picker:DATE_PICKER.FEB',
  'date_picker:DATE_PICKER.MAR',
  'date_picker:DATE_PICKER.APR',
  'date_picker:DATE_PICKER.MAY',
  'date_picker:DATE_PICKER.JUN',
  'date_picker:DATE_PICKER.JUL',
  'date_picker:DATE_PICKER.AUG',
  'date_picker:DATE_PICKER.SEP',
  'date_picker:DATE_PICKER.OCT',
  'date_picker:DATE_PICKER.NOV',
  'date_picker:DATE_PICKER.DEC',
];

export const MONTH_FULL_NAME = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const MONTH_SHORT_NAME = [
  'Jan.',
  'Feb.',
  'Mar.',
  'Apr.',
  'May',
  'Jun.',
  'Jul.',
  'Aug.',
  'Sep.',
  'Oct.',
  'Nov.',
  'Dec.',
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
  'date_picker:DATE_PICKER.JAN_ABR',
  'date_picker:DATE_PICKER.FEB_ABR',
  'date_picker:DATE_PICKER.MAR_ABR',
  'date_picker:DATE_PICKER.APR_ABR',
  'date_picker:DATE_PICKER.MAY_ABR',
  'date_picker:DATE_PICKER.JUN_ABR',
  'date_picker:DATE_PICKER.JUL_ABR',
  'date_picker:DATE_PICKER.AUG_ABR',
  'date_picker:DATE_PICKER.SEP_ABR',
  'date_picker:DATE_PICKER.OCT_ABR',
  'date_picker:DATE_PICKER.NOV_ABR',
  'date_picker:DATE_PICKER.DEC_ABR',
];

export const WEEK_LIST = [
  'date_picker:DATE_PICKER.SUN',
  'date_picker:DATE_PICKER.MON',
  'date_picker:DATE_PICKER.TUE',
  'date_picker:DATE_PICKER.WED',
  'date_picker:DATE_PICKER.THU',
  'date_picker:DATE_PICKER.FRI',
  'date_picker:DATE_PICKER.SAT',
];

export const WEEK_FULL_LIST = [
  'date_picker:DATE_PICKER.SUNDAY',
  'date_picker:DATE_PICKER.MONDAY',
  'date_picker:DATE_PICKER.TUESDAY',
  'date_picker:DATE_PICKER.WEDNESDAY',
  'date_picker:DATE_PICKER.THURSDAY',
  'date_picker:DATE_PICKER.FRIDAY',
  'date_picker:DATE_PICKER.SATURDAY',
];

export const default30DayPeriodInSec = {
  startTimeStamp: 0,
  endTimeStamp: 0,
};

export const MILLISECONDS_IN_A_SECOND = 1000;

// Info: (20241009 - Julian) input CSS style
export const inputStyle = {
  NORMAL:
    'border-input-stroke-input divide-input-stroke-input text-input-text-input-filled placeholder:text-input-text-input-placeholder disabled:text-input-text-input-placeholder',
  ERROR:
    'border-input-text-error divide-input-text-error text-input-text-error placeholder:text-input-text-error disabled:text-input-text-error',
  PREVIEW: 'text-text-brand-primary-lv1 placeholder:text-text-brand-primary-lv1',
};

// Info: (20240429 - Julian) checkbox CSS style
export const checkboxStyle =
  'relative h-16px w-16px appearance-none rounded-xxs border border-checkbox-stroke-unselected bg-white outline-none after:absolute after:top-0 after:-mt-3px after:ml-px after:hidden after:text-sm after:text-checkbox-stroke-check-mark after:content-checked checked:bg-checkbox-surface-selected checked:after:block';

// Info: (20240425 - Julian) radio button CSS style
export const radioButtonStyle =
  'relative h-16px w-16px appearance-none outline-none rounded-full border border-checkbox-stroke-unselected bg-white after:absolute after:left-1/2 after:top-1/2 after:-ml-5px after:-mt-5px after:hidden after:h-10px after:w-10px after:rounded-full after:bg-checkbox-stroke-unselected checked:after:block';

export const ITEMS_PER_PAGE_ON_DASHBOARD = 6;

export enum SortOptions {
  newest = 'common:COMMON.NEWEST',
  oldest = 'common:COMMON.OLDEST',
}

export const DEFAULT_AVATAR_URL = '/elements/avatar.png';
export const DEFAULT_COMPANY_IMAGE_URL = '/elements/example_company_image.png';
export const DEFAULT_CERTIFICATE_IMAGE_URL = '/elements/avatar_default.svg';

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
