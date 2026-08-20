import { describe, it, expect } from "@jest/globals";
import { LeaveDaySegment } from "@/constants/leave_policy";
import { expandLeaveSpan, ILeaveSpanShift } from "@/lib/leave_span";

/**
 * Info: (20260820 - Julian) 起訖區間夾進班別核心區間（review 第 3 輪第 3 條）。
 *
 * ## 被修掉的東西
 *
 * `expandLeaveSpan` 原本有一支 `isFirst && isLast` 的捷徑，排在 `shiftOf`
 * **之前**就直接回 `CUSTOM(start, end)` —— 於是同一支函式對「單日」與
 * 「首日」說了兩種話：多日的首末日會夾，單日完全不夾。差的方向對勞工不利。
 *
 * | 使用者填的（單日） | 舊的分支 | 實際與班別的重疊 |
 * |---|---|---|
 * | 06:00 – 08:00 | 120 分 | 0 分 |
 * | 16:00 – 23:00 | 420 分 | 60 分 |
 *
 * 而本輪把輸入從「逐日勾選」改成「連續時段」之後，單日正是最常被走到的
 * 那一條路徑 —— 缺陷的曝光面剛好變成最大。
 *
 * ## 為什麼要對照多日
 *
 * 單獨驗單日只證明「單日現在會夾」，不證明**兩條路徑的答案相同**。
 * 分岔正是這一條缺陷的形狀，所以下面每一組單日案例都與同一個時刻在
 * 多日情境下的首日／末日互相對照。
 */

// Info: (20260820 - Julian) 08:00–17:00 的核心區間（分鐘）
const SHIFT: ILeaveSpanShift = { startMinute: 480, endMinute: 1020 };

const expand = (startAt: string, endAt: string) =>
  expandLeaveSpan({ startAt, endAt, shiftOf: () => SHIFT });

/**
 * Info: (20260820 - Julian) [說明, 起, 迄, 夾完的起, 夾完的迄]。
 * 顯式標註成 tuple 陣列 —— 不標的話 TS 會把 string 與 number 推成聯集。
 */
const CLAMP_CASES: readonly [string, string, string, number, number][] = [
  ["班中整段", "09:00", "12:00", 540, 720],
  ["比班早到（06:00 起）", "06:00", "12:00", 480, 720],
  ["比班晚走（到 23:00）", "09:00", "23:00", 540, 1020],
  ["兩頭都超出", "06:00", "23:00", 480, 1020],
  ["剛好整班", "08:00", "17:00", 480, 1020],
];

describe("單日：起訖要夾進班別核心區間", () => {
  it.each(CLAMP_CASES)("%s", (_label, from, to, startMinute, endMinute) => {
    expect(expand(`2026-08-19T${from}`, `2026-08-19T${to}`)).toEqual([
      {
        workDate: "2026-08-19",
        segment: LeaveDaySegment.CUSTOM,
        startMinute,
        endMinute,
      },
    ]);
  });

  /**
   * Info: (20260820 - Julian) 整段落在班外時把那一天丟掉。
   *
   * 舊碼在這兩組分別扣 120 分與 420 分，而實際重疊是 0 —— 使用者為一段
   * 他本來就不在班上的時間付了額度。回空陣列之後，`buildPlan` 會以
   * `VA_LEAVE_ON_NON_WORKING_DAY` 回覆，而它的註解已經寫下這個情形：
   * 「整段區間一天工時都沒有（整段落在連假裡、**或下班後才起算**）」。
   */
  it.each([
    ["上班之前就結束", "06:00", "08:00"],
    ["下班之後才開始", "17:00", "23:00"],
    ["剛好貼著班的邊界（零長度）", "17:00", "17:30"],
  ])("%s：整天丟掉", (_label, from, to) => {
    expect(expand(`2026-08-19T${from}`, `2026-08-19T${to}`)).toEqual([]);
  });
});

/**
 * Info: (20260820 - Julian) 單日與多日必須給出同一個答案。
 *
 * 每一組都是「同一個時刻」在兩種情境下的比對 —— 缺陷的形狀是兩條路徑分岔，
 * 而只驗其中一條的話，把單日改回不夾也不會有測試變紅。
 */
describe("單日的答案與多日的首末日一致", () => {
  it("首日：單日的起與三日區間的首日算出同一個起", () => {
    const multi = expandLeaveSpan({
      startAt: "2026-08-19T06:00",
      endAt: "2026-08-21T12:00",
      shiftOf: () => SHIFT,
    });
    const single = expand("2026-08-19T06:00", "2026-08-19T23:00");

    expect(multi[0]).toEqual({
      workDate: "2026-08-19",
      segment: LeaveDaySegment.CUSTOM,
      startMinute: 480,
      endMinute: 1020,
    });
    expect(single[0]).toEqual(multi[0]);
  });

  it("末日：單日的迄與三日區間的末日算出同一個迄", () => {
    const multi = expandLeaveSpan({
      startAt: "2026-08-19T09:00",
      endAt: "2026-08-21T23:00",
      shiftOf: () => SHIFT,
    });
    const single = expand("2026-08-21T06:00", "2026-08-21T23:00");

    expect(multi[multi.length - 1]).toEqual({
      workDate: "2026-08-21",
      segment: LeaveDaySegment.CUSTOM,
      startMinute: 480,
      endMinute: 1020,
    });
    expect(single[0]).toEqual(multi[multi.length - 1]);
  });

  // Info: (20260820 - Julian) 中間日仍然是整天，不受夾的影響
  it("中間日仍是 FULL，且不需要班別", () => {
    const days = expandLeaveSpan({
      startAt: "2026-08-19T09:00",
      endAt: "2026-08-21T12:00",
      shiftOf: (workDate) => (workDate === "2026-08-20" ? null : SHIFT),
    });
    expect(days[1]).toEqual({
      workDate: "2026-08-20",
      segment: LeaveDaySegment.FULL,
    });
  });

  /**
   * Info: (20260820 - Julian) 查無班別時回 FULL 而不是夾 ——
   * 那一天是不是該請假由 `buildPlan` 的 `workingDays` 過濾決定，
   * 這支函式不認識「非上班日」這個概念（同它不認識 `AppError` 的理由）。
   */
  it("單日查無班別時回 FULL，交給呼叫端過濾", () => {
    expect(
      expandLeaveSpan({
        startAt: "2026-08-19T09:00",
        endAt: "2026-08-19T12:00",
        shiftOf: () => null,
      }),
    ).toEqual([{ workDate: "2026-08-19", segment: LeaveDaySegment.FULL }]);
  });
});
