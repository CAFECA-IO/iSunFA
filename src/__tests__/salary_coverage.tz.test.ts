import { describe, it, expect } from "@jest/globals";
import { SALARY_COVERAGE_MAX_SCAN_MONTHS } from "@/constants/salary_coverage";
import {
  missingSalaryPeriods,
  type ISalaryPeriod,
} from "@/lib/utils/salary_coverage";

/**
 * Info: (20260905 - Luphia) 薪資紀錄缺漏月份的計算（#6774）。
 *
 * ## 為什麼釘在 `America/New_York`（`.tz.test.ts`）
 *
 * 到職日存的是 `Date.UTC(y, m, d)`，而這支要判斷「那是哪一個月」。
 * 用 `getFullYear()` / `getMonth()`（本地時間）讀回來，在 UTC 以西的時區
 * 會退一天 —— 而**月初到職的人會因此差一整個月**：
 * 8/1 到職在紐約會被讀成 7/31，於是七月被算進範圍、標成缺漏。
 *
 * 這個錯誤在 UTC 與 UTC+08:00 都測不出來（台北是東八區，退一天仍在同月，
 * 除非剛好是月初）。專案在這兩個時區開發，所以它只能靠這一檔抓。
 * 樣板是 #6751 的 `salary_employee_profile.tz.test.ts`。
 */

const utc = (year: number, month: number, day: number): number =>
  Date.UTC(year, month - 1, day) / 1000;

const NOW = Date.UTC(2026, 8, 5); // Info: (20260905 - Luphia) 2026-09-05 → 上個月是 8 月

const periodsOf = (...pairs: [number, number][]): ISalaryPeriod[] =>
  pairs.map(([year, month]) => ({ year, month }));

const base = {
  resignDate: null,
  leaveStartDate: null,
  leaveEndDate: null,
  nowMs: NOW,
};

describe("範圍：到職日 → 上個月", () => {
  it("找出中間漏掉的那一個月", () => {
    const missing = missingSalaryPeriods({
      ...base,
      hireDate: utc(2026, 3, 1),
      existing: periodsOf(
        [2026, 3],
        [2026, 4],
        [2026, 5],
        [2026, 7],
        [2026, 8],
      ),
    });

    expect(missing).toEqual(periodsOf([2026, 6]));
  });

  /**
   * Info: (20260905 - Luphia) 終點是**上個月**，不是這個月。
   *
   * 用「這個月」的話，每一位員工在每個月月初都會被標成缺漏 ——
   * 一個每月固定誤報一次的提示，使用者很快就學會忽略它。
   */
  it("當月不算 —— 8 月有紀錄就是完整的（現在是 9 月）", () => {
    expect(
      missingSalaryPeriods({
        ...base,
        hireDate: utc(2026, 8, 1),
        existing: periodsOf([2026, 8]),
      }),
    ).toEqual([]);
  });

  it("這個月才到職 → 還沒有任何月份該有紀錄", () => {
    expect(
      missingSalaryPeriods({
        ...base,
        hireDate: utc(2026, 9, 1),
        existing: [],
      }),
    ).toEqual([]);
  });

  it("跨年也對", () => {
    const missing = missingSalaryPeriods({
      ...base,
      hireDate: utc(2025, 11, 15),
      existing: periodsOf([2025, 11], [2026, 1]),
    });

    expect(missing.slice(0, 2)).toEqual(periodsOf([2025, 12], [2026, 2]));
    expect(missing).toHaveLength(8);
  });
});

describe("三種「本來就不該有」要扣掉", () => {
  it("離職之後不算，離職當月仍要算", () => {
    const missing = missingSalaryPeriods({
      ...base,
      hireDate: utc(2026, 3, 1),
      resignDate: utc(2026, 5, 20),
      existing: periodsOf([2026, 3]),
    });

    // Info: (20260905 - Luphia) 4、5 缺；6 月之後他已經不在了
    expect(missing).toEqual(periodsOf([2026, 4], [2026, 5]));
  });

  it("留職停薪的期間不算", () => {
    const missing = missingSalaryPeriods({
      ...base,
      hireDate: utc(2026, 3, 1),
      // Info: (20260905 - Luphia) 5/1 起留停、8/1 復職 → 5、6、7 三個整月都沒有上班日
      leaveStartDate: utc(2026, 5, 1),
      leaveEndDate: utc(2026, 8, 1),
      existing: periodsOf([2026, 3], [2026, 4], [2026, 8]),
    });

    expect(missing).toEqual([]);
  });

  /**
   * Info: (20260905 - Luphia) **起訖當月照算**（review 阻-1）。
   *
   * 判準與到職月、離職月是同一條：那個月有沒有上班日。
   * 8/20 起留停的人八月上了 19 天班、10/5 復職的人十月上了 27 天班，
   * 兩個月都該有薪資單。
   *
   * 這一條與下面兩條是**唯一**能區分兩種語意的判準：前一版的實作把
   * 起訖兩個月整月扣掉，而所有留停測試都用月初／月底對齊的日期，
   * 於是把實作改成哪一種都不會紅（tz 99 條 + service 22 條全綠）。
   */
  it("月中起留停 → 那個月仍要算（他上了 19 天班）", () => {
    expect(
      missingSalaryPeriods({
        ...base,
        hireDate: utc(2026, 3, 1),
        leaveStartDate: utc(2026, 8, 20),
        existing: periodsOf(
          [2026, 3],
          [2026, 4],
          [2026, 5],
          [2026, 6],
          [2026, 7],
        ),
      }),
    ).toEqual(periodsOf([2026, 8]));
  });

  /**
   * Info: (20260905 - Luphia) 復職月同理。`leaveEndDate` 是**回來上班的第一天**
   *（欄位標籤就是「復職日」），所以那個月一定有上班日 —— 一律扣到前一個月為止。
   */
  it("月中復職 → 那個月仍要算", () => {
    expect(
      missingSalaryPeriods({
        ...base,
        hireDate: utc(2026, 3, 1),
        leaveStartDate: utc(2026, 5, 1),
        leaveEndDate: utc(2026, 8, 5),
        existing: periodsOf([2026, 3], [2026, 4]),
      }),
    ).toEqual(periodsOf([2026, 8]));
  });

  /**
   * Info: (20260905 - Luphia) 整段留停落在同一個月裡 —— 那個月照樣要有薪資單。
   *
   * 這是上面兩條相減之後 `leaveStart > leaveEnd` 的情況，而它是正常狀態
   * 不是壞掉：8/5 留停、8/20 復職的人，八月前 4 天與後 12 天都在上班。
   */
  it("留停與復職在同一個月內 → 那個月不被扣掉", () => {
    expect(
      missingSalaryPeriods({
        ...base,
        hireDate: utc(2026, 3, 1),
        leaveStartDate: utc(2026, 8, 5),
        leaveEndDate: utc(2026, 8, 20),
        existing: periodsOf(
          [2026, 3],
          [2026, 4],
          [2026, 5],
          [2026, 6],
          [2026, 7],
        ),
      }),
    ).toEqual(periodsOf([2026, 8]));
  });

  /**
   * Info: (20260905 - Luphia) 對照組：同一個 8/20，換成離職日與到職日。
   *
   * 三者的答案必須一致 —— 不一致就是規則分岔了，而分岔的那一邊會是靜默的。
   */
  it("8/20 起留停、8/20 離職、8/20 到職：八月都要算", () => {
    const august = periodsOf([2026, 8]);
    const before = periodsOf(
      [2026, 3],
      [2026, 4],
      [2026, 5],
      [2026, 6],
      [2026, 7],
    );

    expect(
      missingSalaryPeriods({
        ...base,
        hireDate: utc(2026, 3, 1),
        leaveStartDate: utc(2026, 8, 20),
        existing: before,
      }),
    ).toEqual(august);

    expect(
      missingSalaryPeriods({
        ...base,
        hireDate: utc(2026, 3, 1),
        resignDate: utc(2026, 8, 20),
        existing: before,
      }),
    ).toEqual(august);

    expect(
      missingSalaryPeriods({
        ...base,
        hireDate: utc(2026, 8, 20),
        existing: [],
      }),
    ).toEqual(august);
  });

  /**
   * Info: (20260905 - Luphia) `leaveEndDate` 為 null = 還沒復職。
   * 扣到範圍終點為止，否則「留職停薪中」的人每個月都會多一筆缺漏。
   *
   * 這與「復職日填在未來」不同 —— 後者有日期，照樣是「復職月的前一個月」為止。
   */
  it("還沒復職 → 從留停起算到最後都不算", () => {
    expect(
      missingSalaryPeriods({
        ...base,
        hireDate: utc(2026, 3, 1),
        leaveStartDate: utc(2026, 5, 1),
        existing: periodsOf([2026, 3], [2026, 4]),
      }),
    ).toEqual([]);
  });

  it("沒有到職日 → 不下結論，不是猜一個起點", () => {
    expect(
      missingSalaryPeriods({ ...base, hireDate: null, existing: [] }),
    ).toEqual([]);
  });
});

describe("上限", () => {
  /**
   * Info: (20260905 - Luphia) 超過上限**回空**，不是回一個截斷的清單。
   * 「缺這 120 個月」既沒用也不對，而那多半代表到職日填錯了。
   */
  it("到職日離譜地早 → 不下結論", () => {
    expect(
      missingSalaryPeriods({
        ...base,
        hireDate: utc(1990, 1, 1),
        existing: [],
      }),
    ).toEqual([]);
  });

  it("剛好在上限內仍然算得出來", () => {
    const months = SALARY_COVERAGE_MAX_SCAN_MONTHS;
    const start = new Date(NOW);
    start.setUTCMonth(start.getUTCMonth() - months);

    const missing = missingSalaryPeriods({
      ...base,
      hireDate: start.getTime() / 1000,
      existing: [],
    });

    expect(missing).toHaveLength(months);
  });
});

/**
 * Info: (20260905 - Luphia) **這一組是這個檔案釘在紐約的理由。**
 *
 * 把 `getUTCFullYear()` / `getUTCMonth()` 改成本地時間版本之後，
 * 上面每一條在 UTC 與 UTC+08:00 都照樣綠 —— 只有這裡會紅。
 */
describe("時區：月初的日期不得因為本地時區而退一個月", () => {
  it("8/1 到職，在西半球時區仍然是 8 月而不是 7 月", () => {
    const missing = missingSalaryPeriods({
      ...base,
      hireDate: utc(2026, 8, 1),
      existing: [],
    });

    // Info: (20260905 - Luphia) 讀成 7/31 的話這裡會多出 2026-07
    expect(missing).toEqual(periodsOf([2026, 8]));
  });

  it("1/1 到職，不得退成前一年的 12 月", () => {
    const missing = missingSalaryPeriods({
      ...base,
      hireDate: utc(2026, 1, 1),
      existing: periodsOf([2026, 1], [2026, 2], [2026, 3], [2026, 4]),
      resignDate: utc(2026, 4, 30),
    });

    expect(missing).toEqual([]);
  });
});
