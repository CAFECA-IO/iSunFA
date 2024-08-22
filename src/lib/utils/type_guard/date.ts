import { ONE_SECOND_IN_MS } from '@/constants/time';

export function isDateFormatYYYYMMDD(date: string): date is string {
  // Info: (20240612 - Gibbs) 正規表達式來檢查格式是否為 yyyy-mm-dd
  const regex = /^\d{4}-\d{2}-\d{2}$/;

  // Info: (20240612 - Gibbs) 檢查基本格式
  if (!regex.test(date)) {
    return false;
  }

  // Info: (20240612 - Gibbs) 嘗試解析日期以確保其有效性
  const parsedDate = new Date(date);
  const parsedDateYear = parsedDate.getFullYear().toString();
  const parsedDateMonth = (parsedDate.getMonth() + 1).toString().padStart(2, '0'); // Info: (20240612 - Gibbs) getMonth() 從 0 開始，因此需要 +1
  const parsedDateDay = parsedDate.getDate().toString().padStart(2, '0');

  // Info: (20240612 - Gibbs) 檢查解析後的日期是否與原日期相符
  return date === `${parsedDateYear}-${parsedDateMonth}-${parsedDateDay}`;
}

export function isTimestamp(timestampOfDate: string): boolean {
  const num = Number(timestampOfDate) * ONE_SECOND_IN_MS;
  const timeNum = new Date(num).getTime();
  const result = num === timeNum;
  return result;
}
