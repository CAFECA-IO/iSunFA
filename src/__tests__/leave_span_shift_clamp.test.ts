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

/**
 * Info: (20260820 - Julian) **seed 裡真的存在的夜班**（review 第 8 輪）。
 *
 * `SITE-NIGHT` 的核心區間是 1200–1740，即 20:00 → **次日** 05:00 ——
 * 終點超過 1440。第一版的 fixture 只有日班，於是「使用者填的時刻（0–1439）」
 * 與「班別區間（可超過 1440）」兩個值域被混在一起夾這件事，
 * 在整個測試檔裡沒有任何一條碰得到（checklist §1.4：fixture 不是真實資料的形狀）。
 */
const NIGHT_SHIFT: ILeaveSpanShift = { startMinute: 1200, endMinute: 1740 };

const expand = (startAt: string, endAt: string) =>
  expandLeaveSpan({ startAt, endAt, shiftOf: () => SHIFT });

const expandNight = (startAt: string, endAt: string) =>
  expandLeaveSpan({ startAt, endAt, shiftOf: () => NIGHT_SHIFT });

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

/**
 * Info: (20260820 - Julian) 跨夜班：午夜之後的那一段屬於**前一天**的工作日
 * （review 第 8 輪）。
 *
 * ## 被修掉的東西
 *
 * `parseLocalDateTime` 回的 `minuteOfDay` 值域是 0–1439（牆上時鐘），
 * 而 `ILeaveSpanShift` 用的是「距該工作日 00:00 的分鐘數」——
 * 跨夜班大於 1440。把兩者直接拿去夾，午夜後的每一個時刻都被
 * `Math.max(x, 1200)` 夾成 1200，而終點 ≤ 1439，於是
 * `startMinute >= endMinute` 必然成立、整天被丟掉，`buildPlan` 回
 * **「非上班日」**—— 而他明明就在上班。
 *
 * 單日 15 分格 4560 組裡有 3240 組因此由可用變成被拒；
 * 也就是說「夜班工人想請下半夜那段假」曾經**沒有任何可表達的形式**。
 *
 * ## 修完之後的判準
 *
 * 使用者填的是「日曆日 + 牆上時鐘」，而 `LeaveDay` 記的是「工作日 + 該工作日的
 * 第幾分鐘」。兩者在跨夜班上不是同一個東西，因此換算一次：
 * 落在午夜後的時刻，工作日退一天、分鐘數加 1440。
 */
describe("跨夜班：午夜後的時段屬於前一天的工作日", () => {
  it.each([
    // Info: (20260820 - Julian) [說明, 起, 迄, 期望的工作日, 起分, 迄分]
    ["純午夜後（缺陷下整天被丟掉）", "2026-08-20T02:00", "2026-08-20T05:00", "2026-08-19", 1560, 1740],
    ["從午夜整點起", "2026-08-20T00:00", "2026-08-20T05:00", "2026-08-19", 1440, 1740],
    ["午夜後的一小段", "2026-08-20T03:00", "2026-08-20T04:00", "2026-08-19", 1620, 1680],
    ["午夜前（同一個值域，本來就對）", "2026-08-19T21:00", "2026-08-19T23:00", "2026-08-19", 1260, 1380],
    ["整班", "2026-08-19T20:00", "2026-08-20T05:00", "2026-08-19", 1200, 1740],
    ["跨過午夜的一段", "2026-08-19T22:00", "2026-08-20T03:00", "2026-08-19", 1320, 1620],
  ] as readonly [string, string, string, string, number, number][])(
    "%s",
    (_label, startAt, endAt, workDate, startMinute, endMinute) => {
      expect(expandNight(startAt, endAt)).toEqual([
        {
          workDate,
          segment: LeaveDaySegment.CUSTOM,
          startMinute,
          endMinute,
        },
      ]);
    },
  );

  /**
   * Info: (20260820 - Julian) 一個日曆日可能碰到**兩個**工作日的班。
   *
   * 8/20 02:00–23:00 涵蓋 8/19 那一班的尾巴（02:00–05:00）與 8/20 那一班的
   * 開頭（20:00–23:00），中間那段白天他本來就不在班上。
   * 這一條是「日曆日 ≠ 工作日」最直接的證據 —— 舊的單日捷徑連這個形狀
   * 都表達不出來。
   */
  it("一個日曆日橫跨兩個工作日的班時，切成兩格", () => {
    expect(expandNight("2026-08-20T02:00", "2026-08-20T23:00")).toEqual([
      {
        workDate: "2026-08-19",
        segment: LeaveDaySegment.CUSTOM,
        startMinute: 1560,
        endMinute: 1740,
      },
      {
        workDate: "2026-08-20",
        segment: LeaveDaySegment.CUSTOM,
        startMinute: 1200,
        endMinute: 1380,
      },
    ]);
  });

  /**
   * Info: (20260820 - Julian) 多日：末日的迄若落在它自己的班開始之前，
   * 那個時刻屬於**前一天**那一班 —— 末日自己一分鐘都不貢獻。
   *
   * 8/19 20:00 → 8/22 05:00 的意思是「今晚上班到後天早上收工都不在」，
   * 而 8/22 05:00 正是 8/21 那一班的終點。若 8/22 也生出一格，
   * 那一天的夜班（8/22 20:00 起）會被誤扣掉。
   */
  it("多日區間的末日若只到清晨，末日不再貢獻一格", () => {
    expect(expandNight("2026-08-19T20:00", "2026-08-22T05:00")).toEqual([
      {
        workDate: "2026-08-19",
        segment: LeaveDaySegment.CUSTOM,
        startMinute: 1200,
        endMinute: 1740,
      },
      { workDate: "2026-08-20", segment: LeaveDaySegment.FULL },
      { workDate: "2026-08-21", segment: LeaveDaySegment.FULL },
    ]);
  });

  /**
   * Info: (20260820 - Julian) 反面：白天那段對夜班的人來說仍然不是上班時間。
   * 少了這一條，一個「一律往前一天挪」的實作也會通過。
   */
  it.each([
    ["整段落在白天", "2026-08-20T08:00", "2026-08-20T12:00"],
    ["清晨收工之後到晚班之前", "2026-08-20T06:00", "2026-08-20T19:00"],
  ])("%s：整天丟掉", (_label, startAt, endAt) => {
    expect(expandNight(startAt, endAt)).toEqual([]);
  });

  /**
   * Info: (20260820 - Julian) 前一天沒有夜班時**不得**往前挪。
   *
   * 判準只看班別的形狀：前一天有班、那一班跨午夜、且起點換算過去真的落在
   * 核心區間內，三者同時成立才接。少了這一條，一個排日班的人請
   * 「明天凌晨兩點到五點」會被記到前一天的日班上。
   */
  it("前一天是日班時，午夜後的時段仍然不算", () => {
    expect(
      expandLeaveSpan({
        startAt: "2026-08-20T02:00",
        endAt: "2026-08-20T05:00",
        shiftOf: () => SHIFT,
      }),
    ).toEqual([]);
  });

  /**
   * Info: (20260820 - Julian) 日班的行為完全不受影響。
   *
   * 這一條是整組改動的回歸線：`crossesMidnight` 為偽時，
   * 每一條路徑都必須與修改前逐字相同。
   */
  it("日班不受跨夜處理影響", () => {
    expect(expand("2026-08-19T06:00", "2026-08-19T12:00")).toEqual([
      {
        workDate: "2026-08-19",
        segment: LeaveDaySegment.CUSTOM,
        startMinute: 480,
        endMinute: 720,
      },
    ]);
    expect(expand("2026-08-19T17:00", "2026-08-19T23:00")).toEqual([]);
  });
});
