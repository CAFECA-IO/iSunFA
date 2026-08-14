import { MINUTES_PER_DAY } from "@/constants/attendance";
import { IShiftWindow } from "@/interfaces/attendance";

/**
 * Info: (20260813 - Julian) 簽到系統的時區換算。純函數，不碰資料庫。
 * 判定引擎（`@/lib/attendance_rules`）只做整數運算，完全不知道時區是什麼；
 * 所有 `Date` → 分鐘數的換算集中在這個檔案，不要散到別處。
 *
 * 用 `Intl.DateTimeFormat` 而非自己算偏移：時區偏移不是常數（日光節約、歷史調整）。
 * `hourCycle: "h23"` 而非 `hour12: false`：後者在某些環境會把午夜報成 24 時。
 *
 * 「當地 00:00 起算的分鐘數」算的是**牆上時鐘**，不是實際經過的分鐘數——
 * DST 當天可能只有 23 小時，但班別的「09:00 上班」講的就是牆上時鐘。
 */

interface IZonedParts {
  isoDate: string;
  minuteOfDay: number;
}

const zonedFormatter = (timeZone: string): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

// Info: (20260813 - Julian) 取某個時間點在指定時區的日期與當日分鐘數
export function toZonedParts(date: Date, timeZone: string): IZonedParts {
  const parts = zonedFormatter(timeZone).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "0";

  return {
    isoDate: `${pick("year")}-${pick("month")}-${pick("day")}`,
    minuteOfDay: Number(pick("hour")) * 60 + Number(pick("minute")),
  };
}

// Info: (20260813 - Julian) 把 "YYYY-MM-DD" 當成純日曆日處理，不牽涉任何時區
const toDayNumber = (isoDate: string): number => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
};

const fromDayNumber = (dayNumber: number): string =>
  new Date(dayNumber * 86_400_000).toISOString().slice(0, 10);

// Info: (20260813 - Julian) 日曆日加減天數。純日曆運算，不牽涉時區
export function addIsoDays(isoDate: string, delta: number): string {
  return fromDayNumber(toDayNumber(isoDate) + delta);
}

// Info: (20260813 - Julian) 指定日曆日的前一天
export function previousIsoDate(isoDate: string): string {
  return addIsoDays(isoDate, -1);
}

/**
 * Info: (20260813 - Julian) 期間的日曆日數（含頭含尾）。`to` 早於 `from` 時回 0。
 * 用它擋過大的查詢區間，而不是先展開陣列再看長度——後者自己就是它要防的那個成本。
 */
export function isoDaySpan(from: string, to: string): number {
  return Math.max(0, toDayNumber(to) - toDayNumber(from) + 1);
}

/**
 * Info: (20260813 - Julian) 展開成連續的日曆日。判定矩陣的欄由它決定，而非由「資料庫裡有哪幾天」——
 * 若讓資料決定欄位，沒有排班也沒有打卡的一天會整欄消失，看起來像那天不存在。
 */
export function enumerateIsoDates(from: string, to: string): string[] {
  const start = toDayNumber(from);
  const span = isoDaySpan(from, to);
  return Array.from({ length: span }, (unused, index) =>
    fromDayNumber(start + index),
  );
}

/**
 * Info: (20260813 - Julian) 某時間點相對於指定工作日當地 00:00 的分鐘數。
 * 跨日班會得到 >= 1440 的值（例如夜班 8/12 上班、8/13 02:30 下班以 workDate="2026-08-12"
 * 算得 1590），這正是判定引擎期待的表示法。
 */
export function minutesFromWorkDateStart(
  date: Date,
  workDate: string,
  timeZone: string,
): number {
  const zoned = toZonedParts(date, timeZone);
  const dayOffset = toDayNumber(zoned.isoDate) - toDayNumber(workDate);
  return dayOffset * MINUTES_PER_DAY + zoned.minuteOfDay;
}

export interface IWorkDateCandidate {
  workDate: string;
  /** Info: (20260813 - Julian) 該日的班別；非上班日或無排班時為 null */
  shift: IShiftWindow | null;
}

export interface IResolvedWorkDate {
  workDate: string;
  minuteOfDay: number;
}

// Info: (20260814 - Julian) 打卡時刻離班別窗的距離；窗內為 0。用來在多個候選都沾到邊時分辨誰才是本尊
function distanceToWindow(minuteOfDay: number, shift: IShiftWindow): number {
  if (minuteOfDay < shift.windowStartMinute) {
    return shift.windowStartMinute - minuteOfDay;
  }
  if (minuteOfDay > shift.windowEndMinute) {
    return minuteOfDay - shift.windowEndMinute;
  }
  return 0;
}

/**
 * Info: (20260813 - Julian) 決定一筆打卡屬於哪一個工作日。不能只看日曆日：夜班 20:00 上班、
 * 次日 05:00 下班的兩筆打卡分屬兩個日曆日，卻屬於同一個工作日。
 *
 * 候選日由呼叫端依「當地今日、當地昨日」順序給進來。**容差不是寬限**：它只影響打卡歸屬
 * 哪一天，不影響遲到早退判定。都不命中時歸到第一個候選（當地今日），交由引擎回 `NO_SCHEDULE`。
 *
 * Info: (20260814 - Julian) 比對分兩輪，不可合併成一輪「加了容差後取第一個命中」：
 *
 * 1. **窗內直接命中（不加容差）**——精確落在某一天的班別窗內，那一天就是答案；
 * 2. 全部落空才用容差，且取**離窗最近**的候選，不是陣列第一個。
 *
 * 合併成一輪的後果：輪班同仁打不了下班卡。8/12 夜班（1200–1740）+ 8/13 早班（450–1020），
 * 台北 8/13 05:00 的下班卡在 8/12 是**窗內**（1740），在 8/13 是 300、靠 450−180 的容差
 * 也搆得到——取陣列第一個就會判給 8/13。接著 `assertPunchableState` 只看 8/13 沒有上班卡，
 * `CLOCK_OUT` 被 `VA_PUNCH_INVALID_STATE` 直接拒絕，而 8/12 永遠停在 `MISSING_CLOCK_OUT`，
 * 現場名單把他永遠釘成 `STALE`。**歸屬錯只是第一層，真正的症狀是他根本下不了班。**
 */
export function resolveWorkDate(params: {
  punchedAt: Date;
  timeZone: string;
  candidates: IWorkDateCandidate[];
  toleranceMinutes: number;
}): IResolvedWorkDate {
  const { punchedAt, timeZone, candidates, toleranceMinutes } = params;

  const scored = candidates.flatMap((candidate, order) => {
    const { shift } = candidate;
    if (!shift) return [];
    const minuteOfDay = minutesFromWorkDateStart(
      punchedAt,
      candidate.workDate,
      timeZone,
    );
    return [
      {
        workDate: candidate.workDate,
        minuteOfDay,
        distance: distanceToWindow(minuteOfDay, shift),
        order,
      },
    ];
  });

  // Info: (20260814 - Julian) 兩個候選同時窗內代表排班本身重疊，取呼叫端給的順序（當地今日優先）
  const exact = scored.filter((entry) => entry.distance === 0);
  const withinTolerance = scored.filter(
    (entry) => entry.distance <= toleranceMinutes,
  );
  const pool = exact.length > 0 ? exact : withinTolerance;

  const matched = pool.reduce<(typeof pool)[number] | null>(
    (best, entry) =>
      best === null ||
      entry.distance < best.distance ||
      (entry.distance === best.distance && entry.order < best.order)
        ? entry
        : best,
    null,
  );

  if (matched) {
    return { workDate: matched.workDate, minuteOfDay: matched.minuteOfDay };
  }

  const fallback =
    candidates[0]?.workDate ?? toZonedParts(punchedAt, timeZone).isoDate;
  return {
    workDate: fallback,
    minuteOfDay: minutesFromWorkDateStart(punchedAt, fallback, timeZone),
  };
}
