import { describe, it, expect } from "@jest/globals";
import { deriveJoinLeave } from "@/lib/utils/salary_employee_profile";

/**
 * Info: (20260902 - Julian) 員工檔上的到職／離職日 → 計算機的「這個月第幾號」。
 *
 * ## 檔名為什麼帶 `.tz`
 *
 * 員工檔存的是完整日期（`2026-08-15`），寫入端組的是 `new Date("2026-08-15")`
 * —— 那個字串被當成 **UTC 午夜**解析。讀回來若用 `getDate()`／`getMonth()`，
 * 在 UTC 以西的時區會退一天：8/1 到職的人會被讀成 7/31，
 * 於是「這個月中途到職」變成 false，八月的薪水按整月算 —— 多發半個月。
 *
 * 而這個錯**在 UTC 與 UTC+8 都測不出來**：兩者取出的日期相同，
 * 判準完全分不出成功與失敗（checklist §1.3「本機測不出來」）。
 * `scripts/jest_tz.mjs` 會把 `*.tz.test.ts` 釘在 `America/New_York`
 * （UTC-5/-4，且有日光節約）再跑一次，`jest.config.mjs` 把同一組排除在
 * 預設執行之外 —— 不會重跑也不會漏跑，`npm run test` 依然走得到。
 *
 * 實測：把 `dayInMonth` 的三個 `getUTC*` 改成 `getDate` / `getMonth` /
 * `getFullYear` → `TZ=UTC` 全綠、`TZ=America/New_York` 紅。
 *
 * ## 這一支同時修掉一個既有問題
 *
 * 今天 `isJoined` / `dayOfJoining` 是純 UI 狀態、沒有來源，使用者換一個月份
 * 它們原封不動 —— 八月中途到職的人切到九月照樣被算成九月中途到職。
 * 有了真實日期就是一次推導，切月份時答案自己會對，
 * 所以下面「換一個月份就不再是中途到職」那一條也在守這件事。
 */

// Info: (20260902 - Julian) 一律用 UTC 組時間戳，與寫入端 `new Date("YYYY-MM-DD")` 同源
const at = (iso: string): number => Date.parse(`${iso}T00:00:00.000Z`) / 1000;

const AUG_2026 = { year: 2026, month: 8 };

describe("到職日落在選定的年月裡", () => {
  /**
   * Info: (20260902 - Julian) 每月 1 號是最容易被時區咬到的那一天。
   *
   * `getDate()` 在 UTC-5 會把 2026-08-01T00:00:00Z 讀成 7/31 ——
   * 月份也跟著退，於是 `isJoined` 直接變 false。
   */
  it("8/1 到職，在八月是中途到職的第 01 天", () => {
    expect(deriveJoinLeave({ hireDate: at("2026-08-01"), resignDate: null }, AUG_2026))
      .toMatchObject({ isJoined: true, dayOfJoining: "01" });
  });

  it("8/15 到職，日是 15", () => {
    expect(deriveJoinLeave({ hireDate: at("2026-08-15"), resignDate: null }, AUG_2026))
      .toMatchObject({ isJoined: true, dayOfJoining: "15" });
  });

  // Info: (20260902 - Julian) 月底那一天在 UTC 以東的時區會被讀成下個月的 1 號
  it("8/31 到職，日是 31", () => {
    expect(deriveJoinLeave({ hireDate: at("2026-08-31"), resignDate: null }, AUG_2026))
      .toMatchObject({ isJoined: true, dayOfJoining: "31" });
  });

  it("日一律補零成兩位數（計算機的下拉選項是 '01' 不是 '1'）", () => {
    const { dayOfJoining } = deriveJoinLeave(
      { hireDate: at("2026-08-05"), resignDate: null },
      AUG_2026,
    );

    expect(dayOfJoining).toBe("05");
  });
});

describe("到職日不在選定的年月裡", () => {
  /**
   * Info: (20260902 - Julian) 這一條就是那個既有問題的判準。
   *
   * 八月中途到職的人，切到九月**不是**中途到職 —— 九月要按整月算。
   * 今天那兩個欄位不會自己變，所以九月會被少算半個月。
   */
  it("8/15 到職，切到九月就不再是中途到職", () => {
    expect(
      deriveJoinLeave({ hireDate: at("2026-08-15"), resignDate: null }, { year: 2026, month: 9 }),
    ).toMatchObject({ isJoined: false, dayOfJoining: "01" });
  });

  it("同月不同年也不算（2025-08 ≠ 2026-08）", () => {
    expect(
      deriveJoinLeave({ hireDate: at("2025-08-15"), resignDate: null }, AUG_2026),
    ).toMatchObject({ isJoined: false });
  });

  // Info: (20260902 - Julian) 沒有到職日 → 回預設的 "01"，不是 undefined（會讓下拉變非受控元件）
  it("沒有到職日時回 false 與 '01'", () => {
    expect(deriveJoinLeave({ hireDate: null, resignDate: null }, AUG_2026)).toEqual({
      isJoined: false,
      dayOfJoining: "01",
      isLeft: false,
      dayOfLeaving: "01",
    });
  });
});

describe("離職日走同一條路", () => {
  it("8/20 離職，在八月是 20", () => {
    expect(deriveJoinLeave({ hireDate: null, resignDate: at("2026-08-20") }, AUG_2026))
      .toMatchObject({ isLeft: true, dayOfLeaving: "20" });
  });

  it("到職與離職同一個月時兩邊都成立", () => {
    expect(
      deriveJoinLeave(
        { hireDate: at("2026-08-01"), resignDate: at("2026-08-31") },
        AUG_2026,
      ),
    ).toEqual({
      isJoined: true,
      dayOfJoining: "01",
      isLeft: true,
      dayOfLeaving: "31",
    });
  });

  /**
   * Info: (20260902 - Julian) 兩個日期彼此獨立。
   *
   * 常見的實作偷懶是「有到職日才看離職日」—— 那樣「三年前到職、這個月離職」
   * 的人會被算成沒有離職，最後一個月的薪水按整月發。
   */
  it("到職日不在這個月，不影響離職日的判斷", () => {
    expect(
      deriveJoinLeave(
        { hireDate: at("2023-01-10"), resignDate: at("2026-08-20") },
        AUG_2026,
      ),
    ).toMatchObject({ isJoined: false, isLeft: true, dayOfLeaving: "20" });
  });
});

describe("壞資料不讓表單變成非受控元件", () => {
  it("NaN 時間戳當作沒有日期", () => {
    expect(
      deriveJoinLeave({ hireDate: Number.NaN, resignDate: null }, AUG_2026),
    ).toMatchObject({ isJoined: false, dayOfJoining: "01" });
  });
});
