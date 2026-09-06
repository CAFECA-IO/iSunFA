import { describe, it, expect } from "@jest/globals";
import {
  countMissingEmail,
  filterEmployees,
  hasNoEmail,
} from "@/lib/utils/salary_employee_filter";

/**
 * Info: (20260904 - Julian) 員工名單的過濾與「誰缺信箱」。
 *
 * 這些判斷決定的是「這個人寄不寄得出薪資單」，而它們的錯誤形態都很安靜：
 * 空白信箱被當成有效、搜尋大小寫不合、「只看缺信箱」與關鍵字互相蓋掉。
 * 本專案的測試不 render React，所以它們抽成純函式才守得住。
 */

const employee = (
  name: string,
  number: string,
  email: string,
): { name: string; number: string; email: string } => ({
  name,
  number,
  email,
});

const ROSTER = [
  employee("王小明", "A001", "ming@example.com"),
  employee("Lin Ada", "A002", ""),
  employee("陳大文", "B010", "   "),
  employee("李小美", "b011", "mei@example.com"),
];

const NO_FILTER = { keyword: "", onlyMissingEmail: false };

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
      keyword: "",
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
      keyword: "陳",
      onlyMissingEmail: true,
    });
    expect(result.map((e) => e.number)).toEqual(["B010"]);
  });

  it("關鍵字命中但信箱已填，就不留", () => {
    expect(
      filterEmployees(ROSTER, { keyword: "王小明", onlyMissingEmail: true }),
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
    filterEmployees(roster, { keyword: "王", onlyMissingEmail: false });
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
