import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { STATUS_CODE, STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { ALLOWED_ORIGINS } from '../../constants/config';
import { MILLISECONDS_IN_A_SECOND, MONTH_LIST } from '../../constants/display';
import version from '../version';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getDomains() {
  return ALLOWED_ORIGINS;
}

// Info: truncate the string to the given length (20240416 - Shirley)
export function truncateString(str: string, length: number) {
  const result = str.length > length ? str.slice(0, length) + '...' : str;
  return result;
}

export const timestampToString = (timestamp: number | undefined) => {
  if (timestamp === 0 || timestamp === undefined || timestamp === null) {
    return {
      date: '-',
      dateOfLastYear: '-',
      day: '-',
      tomorrow: '-',
      month: '-',
      monthAndDay: '-',
      monthFullName: '-',
      year: '-',
      lastYear: '-',
      lastYearDate: '-',
      dateFormatInUS: '-',
      dateFormatForForm: '-',
      time: '-',
    };
  }

  const date = new Date(timestamp * 1000);
  // 設定時區
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');
  const second = `${date.getSeconds()}`.padStart(2, '0');

  const monthIndex = date.getMonth();
  const monthNamesInShort = [
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

  const monthFullName = [
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

  const monthNameShort = monthNamesInShort[monthIndex];
  const monthName = monthFullName[monthIndex];
  const dateString = `${year}-${month.toString().padStart(2, '0')}-${day
    .toString()
    .padStart(2, '0')}`;
  const dayString = `${day.toString().padStart(2, '0')}`;
  const monthString = MONTH_LIST[monthIndex];

  return {
    date: dateString, // e.g. 2021-01-01
    dateOfLastYear: `${year - 1}-${month.toString().padStart(2, '0')}-${day
      .toString()
      .padStart(2, '0')}`, // e.g. 2020-01-01
    day: `${dayString}`, // e.g. 01
    tomorrow: `${year}-${month.toString().padStart(2, '0')}-${(day + 1)
      .toString()
      .padStart(2, '0')}`, // e.g. 2021-01-02
    month: `${monthString}`, // e.g. January (with i18n)
    monthFullName: `${monthName}`, // e.g. January
    monthAndDay: `${monthNameShort} ${day}`, // e.g. Jan. 01
    year: `${year}`, // e.g. 2021
    lastYear: `${year - 1}`, // e.g. 2020
    lastYearDate: `${monthName} ${day}, ${year - 1}`, // e.g. Jan. 01, 2020
    dateFormatInUS: `${monthName} ${day}, ${year}`, // e.g. Jan. 01, 2021
    dateFormatForForm: `${monthNameShort} ${day}, ${year}`, // e.g. Jan. 01, 2021
    time: `${hour}:${minute}:${second}`, // e.g. 00:00:00
  };
};

/** Info: 回傳這個月第一天跟今天的 timestamp in seconds (20240419 - Shirley)
 *
 * @returns {startTimeStamp: number, endTimeStamp: number} - The start and present time of the current month in seconds
 */
export const getPeriodOfThisMonthInSec = (): { startTimeStamp: number; endTimeStamp: number } => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  // Info: 取得當前月份第一天的 00:00:00 (20240419 - Shirley)
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const startTimeStamp = Math.floor(firstDayOfMonth.getTime() / MILLISECONDS_IN_A_SECOND);

  // Info: 取得今天的 23:59:59 (20240419 - Shirley)
  const endOfToday = new Date(currentYear, currentMonth, today.getDate(), 23, 59, 59);
  const endTimeStamp = Math.floor(endOfToday.getTime() / MILLISECONDS_IN_A_SECOND);

  return {
    startTimeStamp,
    endTimeStamp,
  };
};

// Info Murky (20240425) - Helper function to convert date strings to timestamps
// will return timestamp of current if input is not valid
export function convertDateToTimestamp(dateStr: string | number): number {
  // 檢查是否為有效的日期字串
  const defaultDateTimestamp = new Date().getTime();
  if (!dateStr) {
    return defaultDateTimestamp;
  }

  if (typeof dateStr === 'number') {
    return dateStr as number;
  }

  function rocYearToAD(rocYear: string, sperator: string): string {
    let modifiedRocYear = rocYear;
    if (rocYear.split(sperator)[0].length < 4) {
      // Info 民國年
      const year = parseInt(rocYear.split(sperator)[0], 10) + 1911;
      modifiedRocYear = `${year}-${rocYear.split(sperator)[1]}-${rocYear.split(sperator)[2]}`;
    }
    return modifiedRocYear;
  }

  let modifiedDateStr = dateStr;
  if (dateStr.includes('/')) {
    modifiedDateStr = rocYearToAD(dateStr, '/');
  } else if (dateStr.includes('-')) {
    modifiedDateStr = rocYearToAD(dateStr, '-');
  }

  const date = new Date(modifiedDateStr);
  const timestamp = date.getTime();

  // 檢查生成的日期是否有效
  if (Number.isNaN(timestamp)) {
    return defaultDateTimestamp;
  }

  return timestamp;
}

// Info Murky (20240425) - Helper function to remove special char from numbers and convert to number type
export function cleanNumber(numberStr: unknown): number {
  if (!numberStr) {
    return 0;
  }

  if (typeof numberStr === 'number') {
    return numberStr;
  }

  if (typeof numberStr !== 'string') {
    return 0;
  }

  return parseFloat(numberStr.replace(/[^\w\s]/gi, ''));
}

export function cleanBoolean(booleanStr: unknown): boolean {
  if (!booleanStr || ['string', 'number'].includes(typeof booleanStr)) {
    return false;
  }

  if (typeof booleanStr === 'boolean') {
    return booleanStr;
  }

  if (booleanStr === 'true') {
    return true;
  }

  if (booleanStr === 'false') {
    return false;
  }

  return false;
}

export function formatApiResponse<T>(
  status_code: string,
  payload: T
): { httpCode: number; result: IResponseData<T> } {
  // TODO: Implement the logic to format the API response
  let httpCodeStr: string;
  if (status_code in STATUS_MESSAGE) {
    httpCodeStr = status_code.slice(0, 3);
  } else {
    httpCodeStr = STATUS_CODE.INVALID_STATUS_CODE_ERROR.slice(0, 3);
  }
  const success = !!httpCodeStr.startsWith('2');
  const message = STATUS_MESSAGE[status_code as keyof typeof STATUS_MESSAGE];
  const httpCode = Number(httpCodeStr);
  const result: IResponseData<T> = {
    powerby: 'ISunFa api ' + version,
    success,
    code: status_code,
    message,
    payload,
  };
  return { httpCode, result };
}
