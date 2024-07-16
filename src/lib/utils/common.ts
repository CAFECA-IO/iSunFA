import { promises as fs } from 'fs';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { STATUS_CODE, STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import {
  ALLOWED_ORIGINS,
  DEFAULT_PAGE_LIMIT,
  DEFAULT_PAGE_START_AT,
  FORMIDABLE_CONFIG,
} from '@/constants/config';
import { MILLISECONDS_IN_A_SECOND, MONTH_LIST } from '@/constants/display';
import version from '@/lib/version';
import { EVENT_TYPE_TO_VOUCHER_TYPE_MAP, EventType, VoucherType } from '@/constants/account';
import path from 'path';

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

export const getDomains = () => {
  return ALLOWED_ORIGINS;
};

export const numberWithCommas = (x: number | string) => {
  return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ',');
};

// Info: truncate the string to the given length (20240416 - Shirley)
export const truncateString = (str: string, length: number) => {
  const result = str.length > length ? str.slice(0, length) + '...' : str;
  return result;
};

export const timestampToString = (timestamp: number | undefined) => {
  if (timestamp === 0 || timestamp === undefined || timestamp === null) {
    return {
      date: '-',
      dateOfLastYear: '-',
      day: '-',
      tomorrow: '-',
      month: '-',
      monthString: '-',
      monthShortName: '-',
      monthFullName: '-',
      monthAndDay: '-',
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
    month: `${month}`.padStart(2, '0'), // e.g. 01
    monthString: `${monthString}`, // e.g. January (with i18n)
    monthShortName: `${monthNameShort}`, // e.g. Jan.
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
export const convertDateToTimestamp = (dateStr: string | number): number => {
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
};

// Info Murky (20240425) - Helper function to remove special char from numbers and convert to number type
export const cleanNumber = (numberStr: unknown): number => {
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
};

export const cleanBoolean = (booleanStr: unknown): boolean => {
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
};

const getCodeByMessage = (statusMessage: string) => {
  let code: string;
  let message: string;
  if (statusMessage in STATUS_CODE) {
    code = STATUS_CODE[statusMessage as keyof typeof STATUS_CODE];
    message = statusMessage;
  } else if (/prisma/i.test(statusMessage)) {
    code = STATUS_CODE[STATUS_MESSAGE.BAD_GATEWAY_PRISMA_ERROR];
    message = STATUS_MESSAGE.BAD_GATEWAY_PRISMA_ERROR;
  } else {
    code = STATUS_CODE[STATUS_MESSAGE.INTERNAL_SERVICE_ERROR];
    message = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  }
  return { code, message };
};

export const formatApiResponse = <T>(
  statusMessage: string,
  payload: T
): { httpCode: number; result: IResponseData<T> } => {
  const { code, message } = getCodeByMessage(statusMessage);
  const success = !!code.startsWith('2');
  const httpCodeStr = code.slice(0, 3);
  const httpCode = Number(httpCodeStr);
  const result: IResponseData<T> = {
    powerby: 'iSunFA v' + version,
    success,
    code,
    message,
    payload,
  };

  return { httpCode, result };
};

export const getValueByKey = <T extends string>(
  obj: Record<string, T>,
  key: keyof typeof obj
): T | null => {
  return obj[key] || null;
};

export const firstCharToUpperCase = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/** Info: (20240521 - Shirley)
 * Convert timestamp in milliseconds to timestamp in seconds
 * @param timestamp in milliseconds
 * @returns timestamp in seconds
 */
export const timestampInSeconds = (timestamp: number): number => {
  if (timestamp > 10000000000) {
    return Math.floor(timestamp / 1000);
  }
  return timestamp;
};

export const timestampInMilliSeconds = (timestamp: number): number => {
  if (timestamp < 10000000000) {
    return Math.floor(timestamp * 1000);
  }
  return timestamp;
};

export const countdown = (remainingSeconds: number) => {
  const days = Math.floor(remainingSeconds / 86400);
  const hours = Math.floor((remainingSeconds % 86400) / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  const remainingTimeStr = `${days ? `${days} D` : ''} ${hours ? `${hours} H` : ''} ${minutes ? `${minutes} M` : ''} ${seconds ? `${seconds}S` : ''}`;

  return {
    days: `${days}`,
    hours: `${hours}`,
    minutes: `${minutes}`,
    seconds: `${seconds}`,
    remainingTimeStr,
  };
};

export function eventTypeToVoucherType(eventType: EventType): VoucherType {
  return EVENT_TYPE_TO_VOUCHER_TYPE_MAP[eventType];
}

// Info Murky (20240505): type guards can input any type and return a boolean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isStringNumber(value: any): value is string {
  return typeof value === 'string' && !Number.isNaN(Number(value));
}

// is {[key: string]: number}
export function isStringNumberPair(value: unknown): value is { [key: string]: string } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return Object.values(value).every((v) => typeof v === 'number');
}

export function transformOCRImageIDToURL(
  documentType: string,
  companyId: number,
  imageID: string
): string {
  return `/api/v1/company/${companyId}/${documentType}/${imageID}/image`;
}

export function transformBytesToFileSizeString(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / k ** i).toFixed(2));
  return `${size} ${sizes[i]}`;
}

// page, limit to offset
export function pageToOffset(
  page: number = DEFAULT_PAGE_START_AT,
  limit: number = DEFAULT_PAGE_LIMIT
): number {
  return (page - 1) * limit;
}

export const getTodayPeriodInSec = () => {
  const today = new Date();
  const startTimeStamp = timestampInSeconds(
    new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  );
  const endTimeStamp = timestampInSeconds(
    new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).getTime()
  );
  return { startTimeStamp, endTimeStamp };
};

// Info Murky (20240531): This function can only be used in the server side
export async function mkUploadFolder() {
  const uploadFolder =
    process.env.VERCEL === '1'
      ? FORMIDABLE_CONFIG.uploadDir
      : path.join(process.cwd(), FORMIDABLE_CONFIG.uploadDir);

  try {
    await fs.mkdir(uploadFolder, { recursive: false });
  } catch (error) {
    // Info: (20240329) Murky: Do nothing if /tmp already exist
  }
}

export function isParamNumeric(param: string | string[] | undefined): param is string {
  if (!param || Array.isArray(param)) {
    return false;
  }

  const regex = /^-?\d+$/;
  return regex.test(param);
}

export function convertStringToNumber(param: string | string[] | undefined): number {
  if (typeof param !== 'string' || param.trim() === '') {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_TYPE);
  }

  const num = +param;
  if (Number.isNaN(num)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  return num;
}

export function isParamString(param: string | string[] | undefined): param is string {
  if (!param || Array.isArray(param)) {
    return false;
  }

  return true;
}

export function changeDateToTimeStampOfDayEnd(date: string) {
  const dateToTimeStamp = timestampInSeconds(new Date(date + 'T23:59:59+08:00').getTime());
  return dateToTimeStamp;
}

export function changeDateToTimeStampOfDayStart(date: string) {
  const dateToTimeStamp = timestampInSeconds(new Date(date + 'T00:00:00+08:00').getTime());
  return dateToTimeStamp;
}

export function transformYYYYMMDDToTimeStampInSecond(str: string) {
  if (!/^(\d){8}$/.test(str)) return -1;
  const year = Number(str.slice(0, 4));
  const month = Number(str.slice(4, 6));
  const day = Number(str.slice(6, 8));
  const date = new Date(year, month - 1, day);
  const timestamp = date.getTime();
  const timestampInSecond = timestampInSeconds(timestamp);
  return timestampInSecond;
}

export function setTimestampToDayEnd(timestamp: number) {
  const timestampMilliSeconds = timestampInMilliSeconds(timestamp);
  const date = new Date(timestampMilliSeconds);
  date.setHours(23, 59, 59, 999);
  return timestampInSeconds(date.getTime());
}

export function setTimestampToDayStart(timestamp: number) {
  const timestampMilliSeconds = timestampInMilliSeconds(timestamp);
  const date = new Date(timestampMilliSeconds);
  date.setHours(0, 0, 0, 0);
  return timestampInSeconds(date.getTime());
}

export function getTimestampOfFirstDateOfThisYear() {
  const year = new Date().getFullYear();
  const date = new Date(year, 0, 1);
  const timestamp = date.getTime();
  const timestampInSecond = setTimestampToDayStart(timestamp);
  return timestampInSecond;
}

export function getTimestampOfSameDateOfLastYear(todayInSecond: number) {
  const milliseconds = timestampInMilliSeconds(todayInSecond);
  const date = new Date(milliseconds);
  date.setFullYear(date.getFullYear() - 1);
  return timestampInSeconds(date.getTime());
}

export function getTimestampOfLastSecondOfDate(date: Date | number) {
  if (typeof date === 'number') {
    // eslint-disable-next-line no-param-reassign
    date = new Date(timestampInMilliSeconds(date));
  }

  const timestamp = date.setHours(23, 59, 59, 999);
  return timestampInSeconds(timestamp);
}

export function getTimestampNow() {
  return timestampInSeconds(new Date().getTime());
}

export function calculateWorkingHours(startDate: number, endDate: number) {
  // 將秒轉換為毫秒
  const start = new Date(startDate * 1000);
  const end = new Date(endDate * 1000);
  let totalWorkingHours = 0;

  // 遍歷每一天
  // 使用 let date = new Date(start) 創建一個新的 Date 物件，在迴圈中不會影響到原始的 start
  // date.setDate(date.getDate() + 1) 會將日期增加一天
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const day = date.getDay();
    // 如果是工作日（週一到週五）
    if (day >= 1 && day <= 5) {
      totalWorkingHours += 8;
    }
  }
  return totalWorkingHours;
}

export function formatNumberSeparateByComma(num: number) {
  const formatter = new Intl.NumberFormat('en-US');
  const formattedNumber = formatter.format(num);
  return formattedNumber;
}
