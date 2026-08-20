import { LeaveDaySegment } from "@/constants/leave_policy";
import { MINUTES_PER_DAY } from "@/constants/attendance";
import {
  enumerateIsoDates,
  isoDaySpan,
  isRealCalendarDate,
} from "@/lib/utils/attendance_time";

/**
 * Info: (20260819 - Julian) 把一段「日期＋時刻」的區間展開成逐日的請假計畫。
 *
 * ## 為什麼是伺服器展開，而不是前端送逐日
 *
 * 先前的 payload 是 `days: [{ workDate, segment, startMinute, endMinute }]`，
 * 註解寫著「逐日展開由前端送上來…哪幾天要請是使用者的決定」。那在
 * 「每天都請上午半天」的用法下成立，但需求改成**連續時段**
 * （「起 8/19 08:00、迄 8/21 17:00」）之後就不成立了 —— 首日要請到
 * **當天班別結束為止**，而前端不知道那個人那一天的班到幾點。
 *
 * 硬讓前端猜的話，症狀是首日多扣或少扣半小時，而畫面上看起來完全正常。
 * 班表在伺服器手上，展開就該在伺服器。
 *
 * ## 展開規則
 *
 * | 位置 | 區間 |
 * |---|---|
 * | 單日 | 使用者給的起 → 迄 |
 * | 首日 | 使用者給的起 → 該日班別的**核心結束時刻** |
 * | 中間日 | 整天（`FULL`） |
 * | 末日 | 該日班別的**核心開始時刻** → 使用者給的迄 |
 *
 * 取 `coreStartMinute` / `coreEndMinute` 而不是 `windowStart/End`：
 * 後者是「最早可認列的上班時刻」與「最晚可認列的下班時刻」，涵蓋提早到、
 * 加班留守；請假要對的是**應該在場的那一段**，那正是遲到／早退的判定基準。
 *
 * ## 不在這裡做的事
 *
 * **不判斷哪一天是上班日** —— 這支函式只認得日期與時刻，不認得班表。
 * 非上班日（例假、國定假日、停工）由 `buildPlan` 依排班跳過：
 * 「我 8/20 到 8/28 不在」是一句話，中間夾著的週六週日不是使用者選的，
 * 是區間推導出來的，為它們擋下整張單等於要求他自己把假拆成好幾張。
 *
 * 這裡只做一件相關的事：首末日若**一分鐘班別時間都不涵蓋**（下班後才起算、
 * 或隔天上班前就結束）就丟掉那一天 —— 那需要班別的核心區間，而呼叫端
 * 已經把它從班表撈出來透過 `shiftOf` 傳進來了。
 */

export interface ILeaveSpanDay {
  workDate: string;
  segment: LeaveDaySegment;
  startMinute?: number;
  endMinute?: number;
}

/**
 * Info: (20260819 - Julian) 班別的**核心區間**（遲到／早退的判定基準）。
 *
 * 欄位不叫 `coreStartMinute` —— 它是 `ILeaveDaySchedule.core` 的內容，
 * 前綴由外層的屬性名承擔。名字裡再帶一次 `core`，讀起來會是 `core.coreStart`。
 */
export interface ILeaveSpanShift {
  startMinute: number;
  endMinute: number;
}

export class LeaveSpanError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "LeaveSpanError";
  }
}

const ISO_LOCAL = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/;

export interface ILocalDateTime {
  workDate: string;
  minuteOfDay: number;
}

/**
 * Info: (20260819 - Julian) 拆 `"2026-08-19T08:00"`。**不經過 `Date`** ——
 * 那會把它當某個時區解讀，而使用者填的是牆上時鐘。
 *
 * 回 `null` 而不是丟：呼叫端有兩種，而它們要的東西不同。表單在使用者
 * 還沒填完時每一次按鍵都會問一次（丟例外等於用例外表達「還沒填完」），
 * service 則要把它轉成 400。回 null 讓兩邊各自決定，
 * 而 `mustParseLocalDateTime` 給後者一個不必自己判斷的入口。
 */
export const parseLocalDateTime = (value: string): ILocalDateTime | null => {
  const matched = ISO_LOCAL.exec(value);
  if (matched === null) return null;
  const hour = Number(matched[2]);
  const minute = Number(matched[3]);
  if (hour > 23 || minute > 59) return null;
  /**
   * Info: (20260819 - Julian) 曆日檢查在這裡再做一次，不只在 zod（review 第 1 條）。
   *
   * `localDateTimeSchema` 擋得住 API 進來的 `2026-04-31`，但 **seed、
   * 資料遷移與日後的批次匯入都不經過 zod** —— 而它們正是最可能餵進
   * 手工組出來的日期字串的路徑。判準與 validator 共用同一支。
   */
  if (!isRealCalendarDate(matched[1])) return null;
  return { workDate: matched[1], minuteOfDay: hour * 60 + minute };
};

export const mustParseLocalDateTime = (value: string): ILocalDateTime => {
  const parsed = parseLocalDateTime(value);
  if (parsed === null) {
    throw new LeaveSpanError(`expected "YYYY-MM-DDTHH:mm", got ${value}`);
  }
  return parsed;
};

/**
 * Info: (20260819 - Julian) 兩個 "YYYY-MM-DD" 相差幾天。格式錯回 null。
 *
 * 加班單用它把「起 8/19 18:00、迄 8/20 02:00」換算成
 * `requestedEndMinute = 1 × 1440 + 120`（>= 1440 表次日，
 * 與 `ShiftPattern` 同型別同語意）。
 */
export const daysBetweenIso = (
  fromIso: string,
  toIso: string,
): number | null => {
  // Info: (20260819 - Julian) 不是真實曆日就回 null，不要靜默正規化成別的一天
  if (!isRealCalendarDate(fromIso) || !isRealCalendarDate(toIso)) return null;
  return isoDaySpan(fromIso, toIso) - 1;
};

/**
 * Info: (20260819 - Julian) 展開連續的日曆日。**改用既有的 `enumerateIsoDates`**
 * （review 第 1 條）。
 *
 * 先前這裡自己寫了一份 `datesBetween`：用字串比較推進、用 `Date` 加日。
 * 那個組合對一個不存在的日期會**跳過中間整整一天** ——
 * `datesBetween("2026-04-31", "2026-05-02")` 回的是
 * `["2026-04-31", "2026-05-02"]`，因為 `Date` 把 04-31 正規化成 05-01，
 * 加一天就直接到了 05-02，而迴圈的字串比較看不出來。
 *
 * `attendance_time.ts` 的 `enumerateIsoDates` 用日數算術，本來就沒有這個問題
 * ——「日曆日怎麼展開」也不該有第二份實作。
 *
 * 上限檢查留在這裡：`enumerateIsoDates` 是通用工具，62 天是**請假**的規則。
 */
export const datesBetween = (fromIso: string, toIso: string): string[] => {
  if (!isRealCalendarDate(fromIso) || !isRealCalendarDate(toIso)) {
    throw new LeaveSpanError(
      `not a real calendar date: ${fromIso} .. ${toIso}`,
    );
  }
  if (isoDaySpan(fromIso, toIso) > MAX_SPAN_DAYS) {
    throw new LeaveSpanError(`span exceeds ${MAX_SPAN_DAYS} days`);
  }
  return enumerateIsoDates(fromIso, toIso);
};

/**
 * Info: (20260819 - Julian) 與 `leaveDayInputSchema` 原本的 `.max(62)` 相同。
 * 62 天是兩個月，足夠涵蓋產假；再長的請假是另一種東西（留停），
 * 不該由同一張表單產生 62 筆以上的 `LeaveDay`。
 */
export const MAX_SPAN_DAYS = 62;

export const expandLeaveSpan = (params: {
  startAt: string;
  endAt: string;
  /** Info: (20260819 - Julian) 逐日的班別核心區間。查無該日時以 null 表示（由呼叫端擋） */
  shiftOf: (workDate: string) => ILeaveSpanShift | null;
}): ILeaveSpanDay[] => {
  const start = mustParseLocalDateTime(params.startAt);
  const end = mustParseLocalDateTime(params.endAt);

  if (
    end.workDate < start.workDate ||
    (end.workDate === start.workDate && end.minuteOfDay <= start.minuteOfDay)
  ) {
    throw new LeaveSpanError("endAt must be after startAt");
  }

  const dates = datesBetween(start.workDate, end.workDate);

  const expanded = dates.map((workDate, index): ILeaveSpanDay | null => {
    const isFirst = index === 0;
    const isLast = index === dates.length - 1;

    /**
     * Info: (20260819 - Julian) 中間日整天請，不需要知道班別長什麼樣。
     * 首末日（含只有一天的情形）要班別才切得出區間 —— 查無班別時交給呼叫端擋，
     * 這支函式不認識 `AppError`，也不該認識（同引擎不知道 HTTP 的理由）。
     */
    if (!isFirst && !isLast) {
      return { workDate, segment: LeaveDaySegment.FULL };
    }

    const shift = params.shiftOf(workDate);
    if (shift === null) {
      return { workDate, segment: LeaveDaySegment.FULL };
    }

    /**
     * Info: (20260820 - Julian) **單日也要夾進班別區間**（review 第 3 條）。
     *
     * 這裡原本有一支 `isFirst && isLast` 的捷徑，排在 `shiftOf` **之前**就
     * 直接回 `CUSTOM(start, end)` —— 於是同一支函式對「單日」與「首日」
     * 說了兩種話，而差的方向對勞工不利：480 分班（08:00–17:00）下
     *
     * | 使用者填的 | 舊的單日分支 | 實際與班別的重疊 |
     * |---|---|---|
     * | 06:00 – 08:00 | 120 分 | 0 分 |
     * | 16:00 – 23:00 | 420 分 | 60 分 |
     *
     * 而本輪把輸入改成連續時段之後，「單日」正是最常被走到的那一條路徑。
     *
     * 現在三種情形共用同一個式子：有界的那一側用使用者填的時刻，
     * 沒界的那一側用班別的邊界，兩側再一起夾進班別區間。
     * `isFirst && isLast` 自然落在「兩側都有界」，不需要自己的分支 ——
     * **一個不需要特例的規則就不該有特例**，特例正是兩邊分岔的地方。
     */
    const startMinute = isFirst
      ? Math.max(start.minuteOfDay, shift.startMinute)
      : shift.startMinute;
    const endMinute = isLast
      ? Math.min(end.minuteOfDay, shift.endMinute)
      : shift.endMinute;

    /**
     * Info: (20260819 - Julian) 首末日**可能一分鐘都不涵蓋**，那時候把它整天丟掉。
     *
     * 下班之後才開始請（起 18:17、班到 17:00），或隔天上班之前就結束
     * （迄 07:00、班從 08:00 開始）—— 那一天他本來就不在班上，
     * 沒有任何工時需要請假。
     *
     * 先前這裡用 `Math.min` / `Math.max` 夾完就直接回，結果夾出一個
     * **零長度**的區間（`1020 → 1020`），而 `resolveLeaveMinutes` 對 CUSTOM
     * 要求區間必須往前走，於是丟出結構性錯誤 —— 再被 `buildPlan` 轉成
     * 「請假時間不符合這個假別的最小單位」。使用者看到的是一句與成因無關的話，
     * 而他選的時間其實完全合理，只是第一天沒有班。
     *
     * 整段都落在班外時（單日的 06:00–08:00）這裡會把唯一的一天也丟掉，
     * 於是 `buildPlan` 回「非上班日」—— 那正是它註解裡寫的
     * 「整段區間一天工時都沒有」，訊息與成因對得上。
     */
    if (startMinute >= endMinute) return null;

    return {
      workDate,
      segment: LeaveDaySegment.CUSTOM,
      startMinute,
      endMinute,
    };
  });

  return expanded.filter((day): day is ILeaveSpanDay => day !== null);
};

/** Info: (20260819 - Julian) 給畫面用的總時數（分鐘）。真正的認列由 L17 試算回答 */
export const rawSpanMinutes = (startAt: string, endAt: string): number => {
  const start = parseLocalDateTime(startAt);
  const end = parseLocalDateTime(endAt);
  if (start === null || end === null) return 0;
  const days = daysBetweenIso(start.workDate, end.workDate) ?? 0;
  return days * MINUTES_PER_DAY + end.minuteOfDay - start.minuteOfDay;
};

/**
 * Info: (20260819 - Julian) 把一個 `"YYYY-MM-DDTHH:mm"` 前後平移若干分鐘。
 *
 * 給表單用：使用者選了「起」，「迄」就跟著跳到一小時後，而不是留白等他
 * 自己算。格式錯回 null —— 那代表使用者還在打字，不是錯誤。
 *
 * 走 `Date` 的 UTC 分支再切回字串：這裡**只做算術**，不做時區換算，
 * 而 `T00:00:00.000Z` 讓執行環境的時區完全不參與（同本檔其餘函式的作法）。
 */
export const shiftLocalDateTime = (
  value: string,
  minutes: number,
): string | null => {
  const parsed = parseLocalDateTime(value);
  if (parsed === null) return null;

  const base = new Date(`${parsed.workDate}T00:00:00.000Z`).getTime();
  const moved = new Date(base + (parsed.minuteOfDay + minutes) * 60_000);
  if (Number.isNaN(moved.getTime())) return null;

  return `${moved.toISOString().slice(0, 10)}T${moved
    .toISOString()
    .slice(11, 16)}`;
};

/** Info: (20260819 - Julian) 表單的預設區間長度。一小時是最常見的最小請假／加班單位 */
export const DEFAULT_SPAN_MINUTES = 60;
