export const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;
export const ONE_WEEK_IN_MS = 7 * ONE_DAY_IN_MS;
export const ONE_MONTH_IN_MS = 30 * ONE_DAY_IN_MS;
export const ONE_YEAR_IN_MS = 365 * ONE_DAY_IN_MS;
export const ONE_HOUR_IN_MS = 60 * 60 * 1000;
export const ONE_MINUTE_IN_MS = 60 * 1000;
export const ONE_SECOND_IN_MS = 1000;
export const ONE_DAY_IN_S = 24 * 60 * 60;
export const ONE_WEEK_IN_S = 7 * ONE_DAY_IN_S;
export const ONE_MONTH_IN_S = 30 * ONE_DAY_IN_S;
export const ONE_YEAR_IN_S = 365 * ONE_DAY_IN_S;
export const ONE_HOUR_IN_S = 60 * 60;
export const ONE_MINUTE_IN_S = 60;
export const ONE_SECOND_IN_S = 1;
export const THREE_DAYS_IN_MS = 3 * ONE_DAY_IN_MS;

export const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  // Info: (20241230 - Liz) 組合成 YYYY/MM/DD 格式
  return `${year}/${month}/${day}`;
};
