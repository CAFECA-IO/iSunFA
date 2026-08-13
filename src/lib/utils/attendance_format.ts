import { MINUTES_PER_DAY } from "@/constants/attendance";
import { addIsoDays } from "@/lib/utils/attendance_time";

/**
 * Info: (20260813 - Julian) 出勤數值的顯示格式。純函數，不碰任何狀態。
 *
 * 判定引擎與 API 一律以「工作日當地 00:00 起算的分鐘數」表示時刻 ——
 * 那個表示法讓跨夜班不必分成兩個日曆日處理，代價是**它不能直接印給人看**：
 * 印 1743 沒有人看得懂，印 05:03 又會讓人以為是今天早上。
 * 換算集中在這裡，兩個頁面各寫一份的話，遲早有一份會忘記處理 >= 1440 的情況。
 */

// Info: (20260813 - Julian) 無值時回 em dash 而不是空字串：空白會讓人以為是還沒載入
export const EMPTY_VALUE = "—";

/**
 * Info: (20260813 - Julian) 分鐘數轉 HH:mm；>= 1440 表次日，前綴由呼叫端以 i18n 提供。
 *
 * `nextDayLabel` 由呼叫端傳而不是在這裡查字典：這一層是純函數，
 * 把 i18n context 拉進來會讓它從「可單獨測試的換算」變成「只能在 React 裡跑的東西」。
 */
export function formatMinuteOfDay(
  minute: number | null,
  nextDayLabel: string,
): string {
  if (minute === null) return EMPTY_VALUE;

  const isNextDay = minute >= MINUTES_PER_DAY;
  const normalised =
    ((minute % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const text = `${String(Math.floor(normalised / 60)).padStart(2, "0")}:${String(
    normalised % 60,
  ).padStart(2, "0")}`;

  return isNextDay ? `${nextDayLabel} ${text}` : text;
}

// Info: (20260813 - Julian) 工時分鐘拆成時與分，好讓呼叫端用自己語系的量詞組句
export function toHourMinute(minutes: number): {
  hours: number;
  minutes: number;
} {
  const safe = Math.max(0, Math.round(minutes));
  return { hours: Math.floor(safe / 60), minutes: safe % 60 };
}

// Info: (20260813 - Julian) "2026-08-13" → 13。日曆日字串的字尾即日，不必建 Date
export function dayOfIsoDate(isoDate: string): number {
  return Number(isoDate.slice(8, 10));
}

/**
 * Info: (20260813 - Julian) 工作日 + 當日分鐘數 → "YYYY-MM-DD HH:mm"。
 *
 * 與 `formatMinuteOfDay` 的差別是**它把日期算出來**：跨夜班的 1743 分
 * 在畫面上顯示「次日 05:03」就夠了（旁邊有工作日欄），但匯出的 CSV
 * 會被單獨帶走、貼進事故調查報告裡 —— 那份檔案上的每一個時間
 * 都必須自己說得出是哪一天，不能依賴另一欄。
 */
export function isoDateTimeLabel(
  workDate: string,
  minuteOfDay: number,
): string {
  const dayOffset = Math.floor(minuteOfDay / MINUTES_PER_DAY);
  const withinDay = minuteOfDay - dayOffset * MINUTES_PER_DAY;
  const date = addIsoDays(workDate, dayOffset);
  const time = `${String(Math.floor(withinDay / 60)).padStart(2, "0")}:${String(
    withinDay % 60,
  ).padStart(2, "0")}`;
  return `${date} ${time}`;
}
