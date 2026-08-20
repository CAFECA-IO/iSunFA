import { describe, it, expect } from "@jest/globals";
import {
  datesBetween,
  daysBetweenIso,
  expandLeaveSpan,
  LeaveSpanError,
  parseLocalDateTime,
} from "@/lib/leave_span";
import { isRealCalendarDate } from "@/lib/utils/attendance_time";
import {
  leaveRequestCreateSchema,
  localDateTimeSchema,
} from "@/validators/leave_request";
import { isoDateSchema } from "@/validators/attendance";

/**
 * Info: (20260819 - Julian) 起訖的日期部分必須是**真實存在的日曆日**。
 *
 * ## 這條缺陷長什麼樣
 *
 * 把逐日清單改成連續時段時，新寫的 `localDateTimeSchema` 只有一個正則，
 * 沒有曆日檢查 —— 而它取代的 `isoDateSchema` **有**，且該處的註解正好寫著
 * 「匯出供假勤共用：**日期字串的定義只該有一份**」。新 schema 就是那句話
 * 說的第二份，而它掉了檢查。
 *
 * ## 為什麼後果不是 400 而是「一整天的假消失」
 *
 * `2026-04-31` 不存在。`Date` 不會報錯，它會**靜默正規化**成 `2026-05-01`。
 * 於是先前那份自己寫的 `datesBetween`（字串比較推進、`Date` 加日）在
 * `2026-04-31 → 2026-05-02` 上回的是 `["2026-04-31", "2026-05-02"]`：
 *
 * - `2026-04-31` 查無排班，被當成非上班日跳過
 * - `2026-05-01` **從來沒有進到清單裡**
 *
 * 結果那一天完全沒有被記為請假：額度不扣、`EmployeeShiftDay` 不投影成
 * `LEAVE`、判定引擎把它算成無故缺勤。而 API 回 200，畫面上看不出異常。
 *
 * ## 修法的三個落點
 *
 * 判準抽成 `isRealCalendarDate`（`attendance_time.ts`，那個檔案已經擁有
 * 日曆日的算術），由 `isoDateSchema`、`localDateTimeSchema` 與
 * `leave_span.ts` 共用。展開改用既有的 `enumerateIsoDates` ——
 * 「日曆日怎麼展開」同樣不該有第二份實作。
 */

const FAKE_DATES = [
  "2026-04-31", // Info: (20260819 - Julian) 四月只有 30 天
  "2026-02-30",
  "2026-02-29", // Info: (20260819 - Julian) 2026 不是閏年
  "2026-13-01", // Info: (20260819 - Julian) 沒有第 13 個月
  "2026-00-10",
  "2026-01-32",
];

const REAL_DATES = ["2026-08-19", "2026-04-30", "2026-12-31", "2028-02-29"];

describe("判準只有一份：isRealCalendarDate", () => {
  it.each(FAKE_DATES)("%s 不是真實曆日", (value) => {
    expect(isRealCalendarDate(value)).toBe(false);
  });

  it.each(REAL_DATES)("%s 是真實曆日", (value) => {
    expect(isRealCalendarDate(value)).toBe(true);
  });

  /**
   * Info: (20260819 - Julian) 兩支 schema 必須給出**同一個**答案。
   *
   * 它們分歧的那一刻就是這條缺陷本身 —— 一支擋得住、另一支放行，
   * 而放行的那一支剛好是新路徑在用的。
   */
  it.each([...FAKE_DATES, ...REAL_DATES])(
    "%s：isoDateSchema 與 localDateTimeSchema 對日期部分的判斷一致",
    (date) => {
      expect(localDateTimeSchema.safeParse(`${date}T08:00`).success).toBe(
        isoDateSchema.safeParse(date).success,
      );
    },
  );
});

describe("localDateTimeSchema 擋得住不存在的日期", () => {
  it.each(FAKE_DATES)("%sT08:00 被拒", (date) => {
    expect(localDateTimeSchema.safeParse(`${date}T08:00`).success).toBe(false);
  });

  it("時刻的邊界照舊", () => {
    expect(localDateTimeSchema.safeParse("2026-08-19T00:00").success).toBe(true);
    expect(localDateTimeSchema.safeParse("2026-08-19T23:59").success).toBe(true);
    expect(localDateTimeSchema.safeParse("2026-08-19T24:00").success).toBe(false);
    expect(localDateTimeSchema.safeParse("2026-08-19T08:60").success).toBe(false);
    // Info: (20260819 - Julian) 帶時區的完整 ISO 8601 刻意不收（見 schema 的說明）
    expect(
      localDateTimeSchema.safeParse("2026-08-19T08:00:00+08:00").success,
    ).toBe(false);
  });

  /**
   * Info: (20260819 - Julian) 接到真的送出 payload 上 —— schema 對了但沒接上，
   * 與沒有那道檢查是同一件事（同 review B9 對限流的觀察）。
   */
  it("送出假單的 payload 也擋得住", () => {
    const base = {
      leavePolicyId: "policy-annual",
      reason: "家中有事",
      endAt: "2026-05-02T17:00",
    };
    expect(
      leaveRequestCreateSchema.safeParse({
        ...base,
        startAt: "2026-04-31T08:00",
      }).success,
    ).toBe(false);
    expect(
      leaveRequestCreateSchema.safeParse({
        ...base,
        startAt: "2026-04-30T08:00",
      }).success,
    ).toBe(true);
  });
});

/**
 * Info: (20260819 - Julian) seed、資料遷移與批次匯入**不經過 zod**，
 * 而它們正是最可能餵進手工組出來的日期字串的路徑。
 */
describe("leave_span 自己也要擋（不倚賴 zod）", () => {
  it.each(FAKE_DATES)("parseLocalDateTime(%sT08:00) 回 null", (date) => {
    expect(parseLocalDateTime(`${date}T08:00`)).toBeNull();
  });

  it("daysBetweenIso 對不存在的日期回 null，而不是靜默正規化", () => {
    expect(daysBetweenIso("2026-04-31", "2026-05-02")).toBeNull();
    expect(daysBetweenIso("2026-08-19", "2026-08-21")).toBe(2);
  });

  it("datesBetween 對不存在的日期直接丟", () => {
    expect(() => datesBetween("2026-04-31", "2026-05-02")).toThrow(
      LeaveSpanError,
    );
  });

  it("expandLeaveSpan 對不存在的日期直接丟", () => {
    expect(() =>
      expandLeaveSpan({
        startAt: "2026-04-31T08:00",
        endAt: "2026-05-02T17:00",
        shiftOf: () => ({ startMinute: 450, endMinute: 1020 }),
      }),
    ).toThrow(LeaveSpanError);
  });
});

describe("展開不得漏掉中間的任何一天", () => {
  /**
   * Info: (20260819 - Julian) **這一條是本檔的核心。**
   *
   * 缺陷的症狀不是「多一天」或「少一天」，是**中間某一天憑空消失**，
   * 而總天數看起來仍然合理。逐日比對，不比長度。
   */
  it.each([
    ["2026-04-29", "2026-05-02", ["2026-04-29", "2026-04-30", "2026-05-01", "2026-05-02"]],
    ["2026-01-30", "2026-02-02", ["2026-01-30", "2026-01-31", "2026-02-01", "2026-02-02"]],
    ["2026-12-30", "2027-01-02", ["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]],
    ["2028-02-27", "2028-03-01", ["2028-02-27", "2028-02-28", "2028-02-29", "2028-03-01"]],
    ["2026-08-19", "2026-08-19", ["2026-08-19"]],
  ])("%s → %s", (from, to, expected) => {
    expect(datesBetween(from, to)).toEqual(expected);
  });

  it("上限仍然擋得住（62 天）", () => {
    expect(() => datesBetween("2026-01-01", "2026-12-31")).toThrow(
      /62/,
    );
    // Info: (20260819 - Julian) 剛好 62 天要放行 —— 邊界成對，否則只證明了「會擋」
    expect(datesBetween("2026-01-01", "2026-03-03")).toHaveLength(62);
  });
});
