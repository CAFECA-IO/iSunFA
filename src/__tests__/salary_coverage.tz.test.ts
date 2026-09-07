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
  /**
   * Info: (20260907 - Julian) `null` = 沒有帳本下限，讓其他維度單獨測得到。
   *
   * 生產環境不會是 null（`AccountBook.createdAt` 是 `@default(now())`），
   * 所以下限本身另有一組用真實值的測試（見「起算下限：帳本引入使用的月份」）。
   * 這裡放 null 是為了讓「到職日 → 上個月」「留停扣除」那些判斷不被下限夾住
   * 而變得測不到 —— 而不是因為它是常見的值。
   */
  bookCreatedAt: null,
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

/**
 * Info: (20260907 - Julian) 起算的下限：帳本引入使用的月份（產品決策 20260907）。
 *
 * ## 這一組守的是什麼
 *
 * 一位 2015 年到職的同仁，在一本 2026 年才建立的帳裡，只要有人替他補上
 * 到職日就會被算成缺一百三十幾個月 —— 而那些月份的薪水發生在這個系統之外，
 * 那份清單一個都補不了。使用者對一個補不完的清單只會學會忽略它，
 * 連同真正該補的那一個月一起。
 *
 * ## 為什麼不是「帳本最早的一筆薪資紀錄」
 *
 * 那個會**藏起真實的缺漏**：一本 2025 全年都忘了建的帳，起點會落在 2026，
 * 於是 2025 整年靜靜消失。帳本的建立時間不會有這個問題 ——
 * 帳本不存在的月份是**不可能**有薪資單，不是「可能有但我們沒看到」。
 */
describe("起算下限：帳本引入使用的月份", () => {
  it("到職日遠早於帳本 → 只從帳本建立的那個月起算", () => {
    const missing = missingSalaryPeriods({
      ...base,
      hireDate: utc(2015, 3, 10),
      bookCreatedAt: utc(2026, 6, 18),
      existing: [],
    });

    // Info: (20260907 - Julian) 2026/06、07、08（NOW 是 2026/09/05，終點是上個月）
    expect(missing).toEqual(periodsOf([2026, 6], [2026, 7], [2026, 8]));
  });

  /**
   * Info: (20260907 - Julian) 帳本建立的**當月照算**，與到職月同一條規則：
   * 那個月這本帳已經存在，建得出薪資單。用「下個月才算」的話，
   * 一本月初建立的帳會有一整個月的缺漏永遠不被標示 —— 那是漏報。
   */
  it("帳本建立當月照算，不是從下個月開始", () => {
    const missing = missingSalaryPeriods({
      ...base,
      hireDate: utc(2020, 1, 1),
      bookCreatedAt: utc(2026, 8, 31),
      existing: [],
    });

    expect(missing).toEqual(periodsOf([2026, 8]));
  });

  /**
   * Info: (20260907 - Julian) 反方向：帳本比到職日早時，下限不得把新人往前拉。
   * 取的是兩者中**較晚**的那一個，不是無條件用帳本。
   */
  it("帳本早於到職日 → 以到職日為準", () => {
    const missing = missingSalaryPeriods({
      ...base,
      hireDate: utc(2026, 7, 1),
      bookCreatedAt: utc(2024, 1, 1),
      existing: [],
    });

    expect(missing).toEqual(periodsOf([2026, 7], [2026, 8]));
  });

  it("帳本比上個月還晚建立 → 沒有任何月份該有紀錄", () => {
    expect(
      missingSalaryPeriods({
        ...base,
        hireDate: utc(2020, 1, 1),
        bookCreatedAt: utc(2026, 9, 1),
        existing: [],
      }),
    ).toEqual([]);
  });

  /**
   * Info: (20260907 - Julian) 讀不到帳本時退回只看到職日，**不猜一個下限**。
   * 猜錯的方向會是漏報：下限猜得太晚，該補的月份就不會被標示。
   */
  it("沒有帳本下限時，行為與加上這道下限之前相同", () => {
    const missing = missingSalaryPeriods({
      ...base,
      hireDate: utc(2026, 6, 1),
      bookCreatedAt: null,
      existing: [],
    });

    expect(missing).toEqual(periodsOf([2026, 6], [2026, 7], [2026, 8]));
  });

  /**
   * Info: (20260907 - Julian) **回填的月份不得被下限藏起來**（review 阻擋-1）。
   *
   * ## 為什麼這一條是必要的
   *
   * 初版的下限只看 `bookCreatedAt`，而註解斷言「帳本不存在的月份**不可能**
   * 有薪資單」。那句話在輸入空間裡是假的：薪資紀錄的 `year` / `month` 是
   * 使用者自己選的（`salaryCalculatorOptionsSchema` 只夾在 2020–2100），
   * 沒有任何一處把它綁在建帳日之後。
   *
   * 而「九月建帳、把今年 1–8 月補進來」不是邊角，是**導入時的正常路徑**。
   * 那時 6 月漏建會回空陣列 —— 完全不標示，方向是漏報，
   * 而抓漏建正是這個功能存在的唯一理由。
   */
  it("回填到建帳日之前的月份 → 那一段的漏建仍然標得出來", () => {
    const missing = missingSalaryPeriods({
      ...base,
      hireDate: utc(2020, 1, 1),
      bookCreatedAt: utc(2026, 9, 1),
      // Info: (20260907 - Julian) 導入時回填了今年，唯獨 6 月漏了
      existing: periodsOf(
        [2026, 1],
        [2026, 2],
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
   * Info: (20260907 - Julian) 起點取「最早的既有紀錄」與建帳日的**較早**者，
   * 而不是無條件用最早的紀錄。
   *
   * 檢查表當初否決「用帳本最早的一筆紀錄當起點」的反例是
   * 「2025 整年都忘了建」—— 在 `min()` 之下那個反例**行為不變**：
   * 沒有紀錄時 `min()` 自然退回建帳日。這一條就是釘住那件事。
   */
  it("完全沒有紀錄時，下限仍然是建帳日（與加這道之前相同）", () => {
    const missing = missingSalaryPeriods({
      ...base,
      hireDate: utc(2015, 1, 1),
      bookCreatedAt: utc(2026, 6, 1),
      existing: [],
    });

    expect(missing).toEqual(periodsOf([2026, 6], [2026, 7], [2026, 8]));
  });

  /**
   * Info: (20260907 - Julian) 回填的下限仍然不得早於**到職日**。
   *
   * 兩道下限的合成方式不同：`min` 用在「這本帳的資料從哪裡開始」
   *（建帳日與最早紀錄取較早），`max` 用在「這個人從哪個月開始有薪水」。
   * 把它寫成一路 `min` 的話，一筆年月填錯的紀錄會把起點拉到到職日之前，
   * 於是這個人還沒來上班的月份被標成缺薪資單。
   */
  it("既有紀錄早於到職日時，起點仍然是到職日", () => {
    const missing = missingSalaryPeriods({
      ...base,
      hireDate: utc(2026, 7, 1),
      bookCreatedAt: utc(2026, 9, 1),
      // Info: (20260907 - Julian) 2026/02 那筆是填錯年月的資料
      existing: periodsOf([2026, 2], [2026, 8]),
    });

    expect(missing).toEqual(periodsOf([2026, 7]));
  });

  /**
   * Info: (20260907 - Julian) 下限只夾**起點**，不影響離職與留停的扣除。
   * 三者疊在一起時各自仍然生效 —— 少驗這一條，把下限寫成「先算完再截掉前面」
   * 也會通過，而那樣留停的扣除會落在錯的位置上。
   */
  it("下限與離職、留停同時生效", () => {
    const missing = missingSalaryPeriods({
      ...base,
      hireDate: utc(2015, 1, 1),
      bookCreatedAt: utc(2026, 3, 5),
      // Info: (20260907 - Julian) 5/1 起留停、6/1 復職 → 五月整月扣掉
      leaveStartDate: utc(2026, 5, 1),
      leaveEndDate: utc(2026, 6, 1),
      resignDate: utc(2026, 7, 20),
      existing: periodsOf([2026, 4]),
    });

    // Info: (20260907 - Julian) 3 月（4 月有紀錄、5 月留停）、6 月、7 月（離職當月照算）
    expect(missing).toEqual(periodsOf([2026, 3], [2026, 6], [2026, 7]));
  });
});

describe("上限", () => {
  /**
   * Info: (20260905 - Luphia) 超過上限**回空**，不是回一個截斷的清單。
   * 「缺這 600 個月」既沒用也不對，而那多半代表到職日填錯了。
   *
   * Info: (20260906 - Luphia) 上限從 120（十年）放寬到 600（五十年）。
   * 十年年資在台灣一點都不罕見，而超過上限的人是**完全不標示**的 ——
   * 所以這裡拿來當「離譜」的樣本改成 1900 年，那才是真的填錯。
   */
  it("到職日離譜地早 → 不下結論", () => {
    expect(
      missingSalaryPeriods({
        ...base,
        hireDate: utc(1900, 1, 1),
        existing: [],
      }),
    ).toEqual([]);
  });

  /**
   * Info: (20260906 - Luphia) **十年年資的人算得出來**（review #6777 應修-2）。
   *
   * 這一條釘住的是那次放寬本身：上限退回 120 的話，一位十五年前到職的
   * 資深同仁會回空陣列 —— 畫面完全不標示，而且沒有任何地方說得出為什麼。
   * 那是一個以「什麼都沒發生」表現的失效。
   */
  it("十五年年資的員工仍然算得出來", () => {
    const hire = new Date(NOW);
    hire.setUTCFullYear(hire.getUTCFullYear() - 15);

    expect(
      missingSalaryPeriods({
        ...base,
        hireDate: hire.getTime() / 1000,
        existing: [],
      }).length,
    ).toBeGreaterThan(120);
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

  /**
   * Info: (20260906 - Luphia) 上限外一個月就不下結論 —— 邊界兩側各釘一條。
   * 只釘「剛好在內」的話，把判斷寫成 `>=` 或 `>` 都不會紅。
   */
  it("超出上限一個月就回空", () => {
    const start = new Date(NOW);
    start.setUTCMonth(
      start.getUTCMonth() - SALARY_COVERAGE_MAX_SCAN_MONTHS - 1,
    );

    expect(
      missingSalaryPeriods({
        ...base,
        hireDate: start.getTime() / 1000,
        existing: [],
      }),
    ).toEqual([]);
  });

  /**
   * Info: (20260907 - Julian) 加上帳本下限之後，上限守的**主詞換了**。
   *
   * 生產環境的 `AccountBook.createdAt` 是 `@default(now())`，所以離譜的到職日
   * 會先被下限夾住 —— 上面那幾條走的是 `bookCreatedAt: null` 的路。
   * 真正還會讓範圍爆掉的是「帳本的建立時間本身很早」（種子資料、匯入），
   * 而那條路也必須不下結論，不是吐出一份幾百個月的清單。
   *
   * 少了這一條，上限就只剩一個測得到但生產環境走不到的分支在守它。
   */
  it("帳本建立時間離譜地早 → 一樣不下結論", () => {
    expect(
      missingSalaryPeriods({
        ...base,
        hireDate: utc(1900, 1, 1),
        bookCreatedAt: utc(1900, 1, 1),
        existing: [],
      }),
    ).toEqual([]);
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
