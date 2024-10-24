import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { STATUS_CODE, STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { ALLOWED_ORIGINS, DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_START_AT } from '@/constants/config';
import {
  MILLISECONDS_IN_A_SECOND,
  MONTH_LIST,
  MONTH_SHORT_NAME,
  MONTH_FULL_NAME,
} from '@/constants/display';
import version from '@/lib/version';
import { EVENT_TYPE_TO_VOUCHER_TYPE_MAP, EventType, VoucherType } from '@/constants/account';
import { FileFolder } from '@/constants/file';
import { KYCFiles, UploadDocumentKeys } from '@/constants/kyc';
import { ROCDate } from '@/interfaces/locale';

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

export const getDomains = () => {
  return ALLOWED_ORIGINS;
};

// Info: (20240926 - Julian) 將時間戳轉換成年月日
export const timestampToYMD = (timestamp: number) => {
  const years = Math.floor(timestamp / (60 * 60 * 24 * 365));
  const months = Math.floor((timestamp % (60 * 60 * 24 * 365)) / (60 * 60 * 24 * 30));
  const days = Math.floor(
    ((timestamp % (60 * 60 * 24 * 365)) % (60 * 60 * 24 * 30)) / (60 * 60 * 24)
  );

  return {
    years: years < 0 ? 0 : years,
    months: months < 0 ? 0 : months,
    days: days < 0 ? 0 : days,
  };
};

export const numberWithCommas = (x: number | string) => {
  return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ',');
};

// Info: (20240416 - Shirley) truncate the string to the given length
export const truncateString = (str: string, length: number) => {
  const result = str.length > length ? str.slice(0, length) + '...' : str;
  return result;
};

export const timestampToString = (timestamp: number | undefined, separator: string = '-') => {
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
  // Info: (20240417 - Jacky) 設定時區
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');
  const second = `${date.getSeconds()}`.padStart(2, '0');

  const monthIndex = date.getMonth();

  const monthNameShort = MONTH_SHORT_NAME[monthIndex];
  const monthName = MONTH_FULL_NAME[monthIndex];
  const dateOfLastYearString = `${year - 1}${separator}${month.toString().padStart(2, '0')}${separator}${day
    .toString()
    .padStart(2, '0')}`;
  const dateString = `${year}${separator}${month.toString().padStart(2, '0')}${separator}${day
    .toString()
    .padStart(2, '0')}`;
  const dayString = `${day.toString().padStart(2, '0')}`;
  const tomorrowString = `${year}${separator}${(month + 1)
    .toString()
    .padStart(2, '0')}${separator}${(day + 1).toString().padStart(2, '0')}`;
  const monthString = MONTH_LIST[monthIndex];

  return {
    date: dateString, // e.g. 2021-01-01
    dateOfLastYear: dateOfLastYearString, // e.g. 2020-01-01
    day: `${dayString}`, // e.g. 01
    tomorrow: tomorrowString, // e.g. 2021-01-02
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

/** Info: (20240419 - Shirley) 回傳這個月第一天跟今天的 timestamp in seconds
 *
 * @returns {startTimeStamp: number, endTimeStamp: number} - The start and present time of the current month in seconds
 */
export const getPeriodOfThisMonthInSec = (): { startTimeStamp: number; endTimeStamp: number } => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  // Info: (20240419 - Shirley) 取得當前月份第一天的 00:00:00
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const startTimeStamp = Math.floor(firstDayOfMonth.getTime() / MILLISECONDS_IN_A_SECOND);

  // Info: (20240419 - Shirley) 取得今天的 23:59:59
  const endOfToday = new Date(currentYear, currentMonth, today.getDate(), 23, 59, 59);
  const endTimeStamp = Math.floor(endOfToday.getTime() / MILLISECONDS_IN_A_SECOND);

  return {
    startTimeStamp,
    endTimeStamp,
  };
};

function rocYearToAD(rocYear: string, sperator: string): string {
  let modifiedRocYear = rocYear;
  if (rocYear.split(sperator)[0].length < 4) {
    // Info 民國年
    const year = parseInt(rocYear.split(sperator)[0], 10) + 1911;
    modifiedRocYear = `${year}-${rocYear.split(sperator)[1]}-${rocYear.split(sperator)[2]}`;
  }
  return modifiedRocYear;
}
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
    code = STATUS_CODE[STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_PRISMA_ERROR];
    message = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_PRISMA_ERROR;
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

export const convertTimestampToROCDate = (timestampInSecond: number): ROCDate => {
  const milliSecondTimestamp = timestampInMilliSeconds(timestampInSecond);
  const date = new Date(milliSecondTimestamp);
  const year = date.getUTCFullYear() - 1911;
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return { year, month, day };
};

export function eventTypeToVoucherType(eventType: EventType): VoucherType {
  return EVENT_TYPE_TO_VOUCHER_TYPE_MAP[eventType];
}

// Info Murky (20240505): type guards can input any type and return a boolean
export function isStringNumber(value: unknown): value is string {
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
  fileFolder: FileFolder,
  companyId: number,
  imageId: string | number
): string {
  return `/api/v1/company/${companyId}/image/${imageId}?fileType=${fileFolder}`;
}

export function transformBytesToFileSizeString(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / k ** i).toFixed(2));
  return `${size} ${sizes[i]}`;
}

/**
 * Info: (20240816 Murky): Transform file size string to bytes, file size string format should be like '1.00 MB'
 * @param sizeString
 * @returns
 */
export function transformFileSizeStringToBytes(sizeString: string): number {
  const regex = /^\d+(\.\d+)? (Bytes|KB|MB|GB|TB|PB|EB|ZB|YB)$/;

  let bytes = 0;
  if (regex.test(sizeString)) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const [size, unit] = sizeString.split(' ');

    const sizeIndex = sizes.indexOf(unit);
    if (sizeIndex === -1) {
      throw new Error('Invalid file size unit');
    }

    bytes = parseFloat(size) * 1024 ** sizeIndex;
  }

  return Math.round(bytes);
}

// page, limit to offset
export function pageToOffset(
  page: number = DEFAULT_PAGE_START_AT,
  limit: number = DEFAULT_PAGE_LIMIT
): number {
  return (page - 1) * limit;
}

export function calculateTotalPages(totalCount: number, pageSize: number): number {
  return Math.ceil(totalCount / pageSize);
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

export function getTimestampOfFirstDateOfThisYear(currentDateInSecond?: number) {
  const dateToGetYear = currentDateInSecond
    ? new Date(timestampInMilliSeconds(currentDateInSecond))
    : new Date();
  const year = dateToGetYear.getFullYear();
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
  let dateObject: Date;
  if (typeof date === 'number') {
    // Info: (20230829 - Anna) 移除no-param-reassign註解，改將參數date的處理結果存在新變數，而不是直接重新賦值給date
    dateObject = new Date(timestampInMilliSeconds(date));
  } else {
    dateObject = date;
  }

  const timestamp = dateObject.setHours(23, 59, 59, 999);
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
  const formattedNumber = formatter.format(Math.abs(num));

  // Info: (20240716 - Murky) 如果 num 是負數，則將結果包裹在括號內
  return num < 0 ? `(${formattedNumber})` : formattedNumber;
}

export const loadFileFromLocalStorage = (
  fileType: UploadDocumentKeys,
  localStorageFilesKey: string = 'KYCFiles'
) => {
  try {
    const data = JSON.parse(localStorage.getItem(localStorageFilesKey) || '{}');

    let fileObject: {
      id: string | undefined;
      file: File | undefined;
    } = {
      id: undefined,
      file: undefined,
    };

    if (data[fileType]) {
      const {
        id,
        name,
        file: fileData,
      } = data[fileType] as {
        id: string | undefined;
        file: string | undefined;
        name: string;
        type: string;
      };

      if (fileData) {
        const byteString = atob(fileData.split(',')[1]);
        const mimeString = fileData.split(',')[0].split(':')[1].split(';')[0];

        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i += 1) {
          ia[i] = byteString.charCodeAt(i);
        }

        const blob = new Blob([ab], { type: mimeString });
        fileObject = { id, file: new File([blob], name, { type: mimeString }) };
      } else {
        fileObject = { id, file: undefined };
      }
    }

    return fileObject;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
  }
};

export const deleteFileFromLocalStorage = (
  fileType: UploadDocumentKeys,
  loacalStorageFilesKey: string = KYCFiles,
  fileId?: number
) => {
  const currentData = JSON.parse(localStorage.getItem(loacalStorageFilesKey) || '{}');
  const data = currentData;
  let newData = {
    ...data,
  };
  if (fileType) {
    newData = {
      ...data,
      [fileType]: {
        id: undefined,
        file: undefined,
      },
    };
  } else {
    // Info: (20240909 - Anna) 在這裡使用 for...in 遍歷物件的所有屬性是必要的，因此保留 no-restricted-syntax 註解來避免 ESLint 報錯。
    // eslint-disable-next-line no-restricted-syntax
    for (const key in data) {
      if (data[key].id === fileId) {
        newData = {
          ...data,
          [key]: {
            id: undefined,
            file: undefined,
          },
        };
        break;
      }
    }
  }
  localStorage.setItem(loacalStorageFilesKey, JSON.stringify(newData));
};

export function getEnumValue<T extends object>(enumObj: T, value: string): T[keyof T] | undefined {
  return (Object.values(enumObj) as unknown as string[]).includes(value)
    ? (value as unknown as T[keyof T])
    : undefined;
}

// Info: (20240808 - Shirley) 節流函數
// Info: (20240830 - Anna) 為了拿掉next-line function-paren-newline註解所以改寫，再加上prettier-ignore，請Prettier不要格式化
// prettier-ignore
export function throttle<F extends (
...args: unknown[]) => unknown>(
  func: F,
  limit: number
): (...args: Parameters<F>) => void {
  let lastFunc: NodeJS.Timeout | null;
  let lastRan: number | null = null;

  function returnFunc(this: unknown, ...args: Parameters<F>) {
    const context = this as unknown as F;
    if (lastRan === null) {
      func.apply(context, args);
      lastRan = Date.now();
    } else {
      if (lastFunc) clearTimeout(lastFunc);
      lastFunc = setTimeout(
        () => {
          if (Date.now() - lastRan! >= limit) {
            func.apply(context, args);
            lastRan = Date.now();
          }
        },
        limit - (Date.now() - lastRan)
      );
    }
  }

  return returnFunc;
}

export function generateUUID(): string {
  const randomUUID = Math.random().toString(36).substring(2, 12);
  return randomUUID;
}

/**
 * Info: (20241007 - Murky)
 * Return String version of number, comma will be added, add bracket if num is negative
 * Return '-' if num is undefined, null or too small (-0.1~0.1)
 * @param num - {number | null | undefined | string}
 * number that be transform into string,
 * if already string, than it will only be add comma than return
 * @returns - {string} return number with comma and bracket
 */
export function numberBeDashIfFalsy(num: number | null | undefined | string) {
  if (typeof num === 'string') {
    return numberWithCommas(num);
  }

  if (num === null || num === undefined || (num < 0.1 && num > -0.1)) {
    return '-';
  }

  const formattedNumber = numberWithCommas(Math.abs(num));

  return num < 0 ? `(${formattedNumber})` : formattedNumber;
}
