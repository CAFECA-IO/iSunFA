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
   *
   * Info: (20260820 - Julian) ⚠️ **這一條的迄選在缺陷為 0 的那一點**
   * （review 第 9 輪第 2 條）。
   *
   * `05:00` 恰好是 8/21 那一班的終點，因此「涵蓋整班」與「錯誤地整天算」
   * 給出同一個分鐘數 —— 於是跨三日以上的末班只涵蓋前半段時多扣的那一段，
   * 這條測試看不見。下面 `it.each` 那一組補的就是 `05:00` 以外的時刻。
   *
   * 8/21 由 `FULL` 改為 `CUSTOM(1200, 1740)`：兩者**扣的分鐘數相同**
   * （實測 `resolveLeaveMinutes` 對夜班兩種形狀都給 450 —— 進位之後由
   * `Math.min(rounded, dayEquivalentMinutes)` 夾回來），而 `CUSTOM` 多說了
   * 一件事：涵蓋的是哪一段窗。首日一直都是這個形狀。
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
      {
        workDate: "2026-08-21",
        segment: LeaveDaySegment.CUSTOM,
        startMinute: 1200,
        endMinute: 1740,
      },
    ]);
  });

  /**
   * Info: (20260820 - Julian) 跨三日以上，末班**只涵蓋前半段**
   * （review 第 9 輪第 2 條）。
   *
   * ## 被修掉的死條件
   *
   * `expandLeaveSpan` 原本靠迴圈裡的
   * `index === dates.length - 2` 判斷「迄落在這一天的夜班上」，
   * 而 `dates.length >= 3` 時那個 index 指的是**中間日** ——
   * 中間日在上一個 `if (!isFirst && !isLast)` 就已經回傳了。
   * 那一行永遠求值不到，於是倒數第二天恆為 `FULL`：
   * 實測「末日 00:00 收工」與「末日 05:00 收工」算出**完全一樣**的答案。
   *
   * ## 為什麼是這幾個時刻
   *
   * 曝光窗是「末日凌晨收工」，也就是夜班最常見的形狀。`04:00` 之後
   * 由 `min(span, requiredWorkMinutes)` 吸收掉，因此挑在它之前；
   * `05:00`（班別終點）刻意留在上面那一條，兩者一起才說得出
   * 「終點正確」與「終點之前也正確」是兩件事。
   */
  it.each([
    ["00:00 收工", "2026-08-21T00:00", 1440],
    ["02:00 收工", "2026-08-21T02:00", 1560],
    ["03:30 收工", "2026-08-21T03:30", 1650],
  ])("跨三日、末班 %s：倒數第二天只到那個時刻", (_label, endAt, endMinute) => {
    expect(expandNight("2026-08-19T20:00", endAt)).toEqual([
      {
        workDate: "2026-08-19",
        segment: LeaveDaySegment.CUSTOM,
        startMinute: 1200,
        endMinute: 1740,
      },
      {
        workDate: "2026-08-20",
        segment: LeaveDaySegment.CUSTOM,
        startMinute: 1200,
        endMinute,
      },
    ]);
  });

  /**
   * Info: (20260820 - Julian) 同一件事的另一個說法：**迄越晚，扣得不得越少**。
   *
   * 上面三條釘的是具體數字，這一條釘的是關係 —— 而缺陷的形狀正是
   * 「整段區間的答案與迄無關」，那會讓相鄰兩個迄算出同一個值。
   * 逐分鐘掃過整個凌晨，任何一處退回「恆為 FULL」都會讓它紅。
   */
  it("跨三日、末班凌晨逐分鐘：涵蓋的分鐘數隨迄單調遞增", () => {
    const coveredMinutes = (endAt: string): number =>
      expandNight("2026-08-19T20:00", endAt).reduce(
        (total, day) =>
          total +
          (day.segment === LeaveDaySegment.FULL
            ? NIGHT_SHIFT.endMinute - NIGHT_SHIFT.startMinute
            : (day.endMinute ?? 0) - (day.startMinute ?? 0)),
        0,
      );

    let previous = -1;
    let distinct = 0;
    for (let minute = 1; minute <= 300; minute += 1) {
      const hh = String(Math.floor(minute / 60)).padStart(2, "0");
      const mm = String(minute % 60).padStart(2, "0");
      const covered = coveredMinutes(`2026-08-21T${hh}:${mm}`);
      expect(covered).toBeGreaterThanOrEqual(previous);
      if (covered !== previous) distinct += 1;
      previous = covered;
    }

    /**
     * Info: (20260820 - Julian) 而且要**真的隨迄變動**。
     * 只驗單調的話，一個恆回同一個值的實作（正是那個缺陷）也會通過。
     */
    expect(distinct).toBe(300);
  });

  /**
   * Info: (20260820 - Julian) 反面：白天那段對夜班的人來說仍然不是上班時間。
   * 少了這一條，一個「一律往前一天挪」的實作也會通過。
   *
   * Info: (20260820 - Julian) ⚠️ **這兩條釘的是「零長度守衛」，不是跨夜處理**
   * （review 第 11 輪第 4 條）。
   *
   * 兩者曾經混為一談：舊版有一條「末日的班跨午夜、而迄落在它開始之前就丟掉」
   * 的分支，而它是死碼 —— 那種情形夾出來的區間本來就是零長度，
   * 上面那個 `startMinute >= endMinute` 已經先攔下了。於是唯一「點名」跨夜
   * 行為的測試，證明的其實是零長度守衛在做的事，**把那個分支刪掉照樣是綠的**。
   *
   * 現在分開了，2026-08-20 以突變測試逐一確認過：
   *
   * | 拿掉哪一行 | 哪些斷言會紅 |
   * |---|---|
   * | `if (workDate > endOwnerDate) return;` | 「末日只到清晨」與跨三日那三條 |
   * | `if (startMinute >= endMinute) return;` | **只有**下面這兩條 |
   * | `endOwnerDate` 恆取 `end.workDate` | 「末日只到清晨」與跨三日那三條 |
   *
   * 兩組不重疊 —— 那才是「各自有人守」的意思。合併它們之前先想清楚
   * 合併之後哪一行還有人釘。
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
