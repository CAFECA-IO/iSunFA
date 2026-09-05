import { describe, it, expect } from "@jest/globals";
import {
  countMissingEmail,
  countMissingRecords,
  filterEmployees,
  formatMissingPeriods,
  hasMissingPeriods,
  hasNoEmail,
} from "@/lib/utils/salary_employee_filter";
import { ISalaryPeriod } from "@/lib/utils/salary_coverage";

/**
 * Info: (20260904 - Julian) 員工名單的過濾與「誰缺信箱」。
 *
 * 這些判斷決定的是「這個人寄不寄得出薪資單」，而它們的錯誤形態都很安靜：
 * 空白信箱被當成有效、搜尋大小寫不合、「只看缺信箱」與關鍵字互相蓋掉。
 * 本專案的測試不 render React，所以它們抽成純函式才守得住。
 */

interface IRosterEntry {
  name: string;
  number: string;
  email: string;
  missingPeriods: ISalaryPeriod[];
}

const employee = (
  name: string,
  number: string,
  email: string,
  // Info: (20260905 - Luphia) 預設沒有缺漏；要驗警示的名單自己帶（#6774）
  missingPeriods: ISalaryPeriod[] = [],
): IRosterEntry => ({
  name,
  number,
  email,
  missingPeriods,
});

const ROSTER = [
  employee("王小明", "A001", "ming@example.com", [{ year: 2026, month: 6 }]),
  employee("Lin Ada", "A002", ""),
  employee("陳大文", "B010", "   ", [
    { year: 2025, month: 11 },
    { year: 2026, month: 1 },
  ]),
  employee("李小美", "b011", "mei@example.com"),
];

const NO_FILTER = {
  keyword: "",
  onlyMissingEmail: false,
  onlyMissingRecords: false,
};

describe("hasNoEmail", () => {
  it("空字串算沒有信箱", () => {
    expect(hasNoEmail({ email: "" })).toBe(true);
  });

  /**
   * Info: (20260904 - Julian) **全空白也算沒有。**
   *
   * `!email` 對 `"   "` 是 false —— 於是畫面顯示「已填寫」、寄出鈕是亮的，
   * 而失敗發生在 nodemailer 那一層，使用者收到的是一句技術性的寄送失敗。
   * 這是這支函式存在的主要理由。
   */
  it("只有空白也算沒有信箱", () => {
    expect(hasNoEmail({ email: "   " })).toBe(true);
    expect(hasNoEmail({ email: "\t\n" })).toBe(true);
  });

  it("有值就是有", () => {
    expect(hasNoEmail({ email: "a@b.co" })).toBe(false);
  });

  /**
   * Info: (20260904 - Julian) 前後有空白但中間有字 —— 算有信箱。
   * 寄送那一側自己會 trim，這裡不該把它判成缺漏。
   */
  it("前後有空白但有內容，算有信箱", () => {
    expect(hasNoEmail({ email: "  a@b.co  " })).toBe(false);
  });
});

describe("countMissingEmail", () => {
  it("數出缺信箱的人數", () => {
    expect(countMissingEmail(ROSTER)).toBe(2);
  });

  it("全部都填了就是 0", () => {
    expect(countMissingEmail([ROSTER[0], ROSTER[3]])).toBe(0);
  });

  it("空名單是 0", () => {
    expect(countMissingEmail([])).toBe(0);
  });
});

describe("關鍵字過濾", () => {
  it("沒有關鍵字時全部留下", () => {
    expect(filterEmployees(ROSTER, NO_FILTER)).toHaveLength(4);
  });

  it("比對姓名", () => {
    const result = filterEmployees(ROSTER, { ...NO_FILTER, keyword: "小" });
    expect(result.map((e) => e.number)).toEqual(["A001", "b011"]);
  });

  it("比對編號", () => {
    const result = filterEmployees(ROSTER, { ...NO_FILTER, keyword: "A00" });
    expect(result.map((e) => e.number)).toEqual(["A001", "A002"]);
  });

  /**
   * Info: (20260904 - Julian) 編號的大小寫不該影響搜尋。
   * 員工編號是人打進去的，`A001` 與 `a001` 在使用者眼裡是同一組編碼規則。
   */
  it("編號比對不分大小寫", () => {
    expect(
      filterEmployees(ROSTER, { ...NO_FILTER, keyword: "B01" }),
    ).toHaveLength(2);
  });

  it("關鍵字前後的空白不算在內", () => {
    expect(
      filterEmployees(ROSTER, { ...NO_FILTER, keyword: "  A001  " }),
    ).toHaveLength(1);
  });

  /**
   * Info: (20260904 - Julian) **不比對信箱。**
   *
   * 整頁版看得到信箱欄，很自然會有人「順手」把 email 加進比對 ——
   * 但同一個元件也是計算機 Step 1 的挑人彈窗，在那裡搜信箱沒有意義。
   * 這一條把選擇釘住：要改的話得先想清楚兩個情境都說得通。
   */
  it("不比對信箱", () => {
    expect(
      filterEmployees(ROSTER, { ...NO_FILTER, keyword: "example.com" }),
    ).toHaveLength(0);
  });

  it("查無結果就是空陣列，不是全部", () => {
    expect(
      filterEmployees(ROSTER, { ...NO_FILTER, keyword: "查無此人" }),
    ).toHaveLength(0);
  });
});

describe("只看缺信箱", () => {
  it("只留下缺信箱的那些", () => {
    const result = filterEmployees(ROSTER, {
      ...NO_FILTER,
      onlyMissingEmail: true,
    });
    expect(result.map((e) => e.number)).toEqual(["A002", "B010"]);
  });

  /**
   * Info: (20260904 - Julian) 兩個條件是**且**，不是互相取代。
   *
   * 寫成擇一的話，開著「只看缺信箱」再打字，畫面會跳回全部人 ——
   * 而使用者以為自己在缺信箱的那一批裡搜尋，然後點開一個其實已經填好的人。
   */
  it("與關鍵字同時生效", () => {
    const result = filterEmployees(ROSTER, {
      ...NO_FILTER,
      keyword: "陳",
      onlyMissingEmail: true,
    });
    expect(result.map((e) => e.number)).toEqual(["B010"]);
  });

  it("關鍵字命中但信箱已填，就不留", () => {
    expect(
      filterEmployees(ROSTER, {
        ...NO_FILTER,
        keyword: "王小明",
        onlyMissingEmail: true,
      }),
    ).toHaveLength(0);
  });
});

describe("回傳的形狀", () => {
  /**
   * Info: (20260904 - Julian) 回傳新陣列，不改原本那個 —— 元件持有的是
   * hook 的 state，就地過濾會讓「清除搜尋」再也找不回其他人。
   */
  it("不就地修改傳進來的陣列", () => {
    const roster = [...ROSTER];
    filterEmployees(roster, { ...NO_FILTER, keyword: "王" });
    expect(roster).toHaveLength(4);
  });

  it("保留原本的順序", () => {
    const result = filterEmployees(ROSTER, NO_FILTER);
    expect(result.map((e) => e.number)).toEqual([
      "A001",
      "A002",
      "B010",
      "b011",
    ]);
  });
});

/**
 * Info: (20260905 - Luphia) 薪資紀錄缺漏的標示與過濾（#6774）。
 *
 * 這一組回答的是與缺信箱**不同**的問題：缺信箱是「寄不出去」（按下寄送
 * 當場失敗，看得見），缺薪資單是「什麼都沒發生」—— 直到那位員工來問
 * 為什麼六月沒領到錢。
 */
describe("hasMissingPeriods", () => {
  it("有缺漏就是有", () => {
    expect(
      hasMissingPeriods({ missingPeriods: [{ year: 2026, month: 6 }] }),
    ).toBe(true);
  });

  /**
   * Info: (20260905 - Luphia) 空陣列同時是「完整」與「算不出來」（沒有到職日、
   * 超過掃描上限）。兩者都不標示 —— 不知道就不要說，而一個假的缺漏提示
   * 會讓使用者去補一張本來就不該有的薪資單。
   */
  it("空陣列不標示", () => {
    expect(hasMissingPeriods({ missingPeriods: [] })).toBe(false);
  });
});

describe("countMissingRecords", () => {
  it("數的是**人數**，不是缺漏的月份數", () => {
    // Info: (20260905 - Luphia) 名單上共 3 個缺漏月份，但分佈在 2 個人身上
    expect(countMissingRecords(ROSTER)).toBe(2);
  });

  it("全部完整就是 0", () => {
    expect(countMissingRecords([ROSTER[1], ROSTER[3]])).toBe(0);
  });

  it("空名單是 0", () => {
    expect(countMissingRecords([])).toBe(0);
  });
});

describe("只看缺薪資單", () => {
  it("只留下有缺漏的那些", () => {
    const result = filterEmployees(ROSTER, {
      ...NO_FILTER,
      onlyMissingRecords: true,
    });
    expect(result.map((e) => e.number)).toEqual(["A001", "B010"]);
  });

  /**
   * Info: (20260905 - Luphia) 與「只看缺信箱」是**且**，不是擇一。
   *
   * 兩個都打開時剩下的是「既收不到、也沒東西可收」的那幾位 ——
   * 那正是最該先處理的人。寫成擇一的話，打開第二個會讓第一個靜靜失效。
   */
  it("與只看缺信箱同時生效", () => {
    const result = filterEmployees(ROSTER, {
      ...NO_FILTER,
      onlyMissingEmail: true,
      onlyMissingRecords: true,
    });
    expect(result.map((e) => e.number)).toEqual(["B010"]);
  });

  it("與關鍵字同時生效", () => {
    const result = filterEmployees(ROSTER, {
      ...NO_FILTER,
      keyword: "王",
      onlyMissingRecords: true,
    });
    expect(result.map((e) => e.number)).toEqual(["A001"]);
  });
});

describe("formatMissingPeriods", () => {
  it("年份不省略，月份補零", () => {
    expect(
      formatMissingPeriods([
        { year: 2025, month: 11 },
        { year: 2026, month: 3 },
      ]),
    ).toEqual({ text: "2025/11、2026/03", restCount: 0 });
  });

  /**
   * Info: (20260905 - Luphia) 缺漏經常跨年（去年 11 月到職、今年才開始建）。
   * 省略年份的話 `11、03` 讀起來像今年的兩個月。
   */
  it("跨年的兩個月不會被誤讀成同一年", () => {
    const { text } = formatMissingPeriods([
      { year: 2025, month: 12 },
      { year: 2026, month: 1 },
    ]);
    expect(text).toContain("2025/12");
    expect(text).toContain("2026/01");
  });

  /**
   * Info: (20260905 - Luphia) 超過上限就截斷並回報剩幾個。
   * 一個到職三年沒建過薪資單的人有 36 個月份，那串字會把整列擠爆。
   */
  it("超過上限時截斷，並算出剩下幾個", () => {
    const many = Array.from({ length: 10 }, (unused, index) => ({
      year: 2026,
      month: index + 1,
    }));
    const { text, restCount } = formatMissingPeriods(many);
    expect(text.split("、")).toHaveLength(6);
    expect(restCount).toBe(4);
  });

  it("剛好等於上限時不算截斷", () => {
    const six = Array.from({ length: 6 }, (unused, index) => ({
      year: 2026,
      month: index + 1,
    }));
    expect(formatMissingPeriods(six).restCount).toBe(0);
  });

  it("空陣列給空字串", () => {
    expect(formatMissingPeriods([])).toEqual({ text: "", restCount: 0 });
  });
});
