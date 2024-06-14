import { ONE_SECOND_IN_MS } from '@/constants/time';

export function isDateFormatYYYYMMDD(date: string): date is string {
  // Info: 正則表達式來檢查格式是否為 yyyy-mm-dd (20240612 - Gibbs)
  const regex = /^\d{4}-\d{2}-\d{2}$/;

  // Info: 檢查基本格式 (20240612 - Gibbs)
  if (!regex.test(date)) {
    return false;
  }

  // Info: 嘗試解析日期以確保其有效性 (20240612 - Gibbs)
  const parsedDate = new Date(date);
  const parsedDateYear = parsedDate.getFullYear().toString();
  const parsedDateMonth = (parsedDate.getMonth() + 1).toString().padStart(2, '0'); // Info: getMonth() 從 0 開始，因此需要 +1 (20240612 - Gibbs)
  const parsedDateDay = parsedDate.getDate().toString().padStart(2, '0');

  // Info: 檢查解析後的日期是否與原日期相符 (20240612 - Gibbs)
  return date === `${parsedDateYear}-${parsedDateMonth}-${parsedDateDay}`;
}

export function isTimestamp(timestampOfDate: string): boolean {
  if (typeof timestampOfDate === 'string') {
    const num = Number(timestampOfDate) * ONE_SECOND_IN_MS;
    const timeNum = new Date(num).getTime();
    const result = num === timeNum;
    return result;
  }
  return false;
}
