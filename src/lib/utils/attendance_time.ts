import { MINUTES_PER_DAY } from "@/constants/attendance";
import { IShiftWindow } from "@/interfaces/attendance";

/**
 * Info: (20260813 - Julian) 簽到系統的時區換算。純函數，不碰資料庫。
 *
 * ## 這一層存在的理由
 *
 * 判定引擎（`@/lib/attendance_rules`）只做整數運算 —— 它收到的是
 * 「當地當日 00:00 起算的分鐘數」，完全不知道時區是什麼。
 * 所有 `Date` → 分鐘數的換算集中在這個檔案，換到兩件事：
 * 引擎的測試不需要任何時區設定，而時區的測試只需要針對這裡。
 *
 * ## 為什麼用 Intl 而不是自己算偏移
 *
 * 時區偏移不是常數（日光節約、歷史上的時區調整）。`Intl.DateTimeFormat`
 * 帶 `timeZone` 是唯一不必自己維護一份 tz 資料庫的做法。
 * `hourCycle: "h23"` 而不是 `hour12: false`：後者在某些執行環境會把午夜報成 24 時。
 *
 * ## 日光節約日的語意
 *
 * 「當地 00:00 起算的分鐘數」是**牆上時鐘**的分鐘數，不是實際經過的分鐘數。
 * DST 當天的一天可能只有 23 小時，但班別的「09:00 上班」講的就是牆上時鐘，
 * 因此牆上時鐘的算法才是對的。`hr_date.ts` 的檔頭記錄了同一類陷阱的另一面。
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

// Info: (20260813 - Julian) 指定日曆日的前一天
export function previousIsoDate(isoDate: string): string {
  return fromDayNumber(toDayNumber(isoDate) - 1);
}

/**
 * Info: (20260813 - Julian) 某時間點相對於指定工作日當地 00:00 的分鐘數。
 *
 * 跨日班會得到 >= 1440 的值：夜班 8/12 上班、8/13 02:30 下班，
 * 以 workDate = "2026-08-12" 計算即為 1590。這正是判定引擎期待的表示法。
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

/**
 * Info: (20260813 - Julian) 決定一筆打卡屬於哪一個工作日。
 *
 * ## 為什麼這件事不能只看日曆日
 *
 * 夜間施工班 20:00 上班、次日 05:00 下班 —— 兩筆打卡分屬兩個日曆日，
 * 卻屬於同一個工作日。若以日曆日分組，每個夜班同仁每天都會被判成
 * 「上班沒下班」加「下班沒上班」兩筆異常。
 *
 * ## 判定方式
 *
 * 候選日由呼叫端依「當地今日、當地昨日」的順序給進來（跨日班最多只會跨一天）。
 * 逐一比對：打卡時刻落在該日班別的 `[窗起 − 容差, 窗迄 + 容差]` 內即屬於它。
 *
 * **容差不是寬限。** 它只影響「這筆打卡算哪一天」，不影響遲到早退的判定 ——
 * 提早 20 分鐘到工地的人，這一筆仍該歸屬今天，而不是變成沒有歸屬的孤兒。
 *
 * 都不命中時歸到第一個候選（當地今日）：那是「無排班」的正常情況，
 * 此時判定引擎會回 `NO_SCHEDULE` 而不是曠職，沒有比較基準就不會有錯誤結論。
 */
export function resolveWorkDate(params: {
  punchedAt: Date;
  timeZone: string;
  candidates: IWorkDateCandidate[];
  toleranceMinutes: number;
}): IResolvedWorkDate {
  const { punchedAt, timeZone, candidates, toleranceMinutes } = params;

  const matched = candidates
    .map((candidate) => ({
      candidate,
      minuteOfDay: minutesFromWorkDateStart(
        punchedAt,
        candidate.workDate,
        timeZone,
      ),
    }))
    .find(({ candidate, minuteOfDay }) => {
      if (!candidate.shift) return false;
      return (
        minuteOfDay >= candidate.shift.windowStartMinute - toleranceMinutes &&
        minuteOfDay <= candidate.shift.windowEndMinute + toleranceMinutes
      );
    });

  if (matched) {
    return {
      workDate: matched.candidate.workDate,
      minuteOfDay: matched.minuteOfDay,
    };
  }

  const fallback =
    candidates[0]?.workDate ?? toZonedParts(punchedAt, timeZone).isoDate;
  return {
    workDate: fallback,
    minuteOfDay: minutesFromWorkDateStart(punchedAt, fallback, timeZone),
  };
}
