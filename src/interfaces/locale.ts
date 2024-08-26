export type ILocale = { locale: string };
export type TranslateFunction = (s: string) => string;

export interface ROCDate {
  year: number; // Info: (20240808 - Jacky) 民國年
  month: number;
  day: number;
}
