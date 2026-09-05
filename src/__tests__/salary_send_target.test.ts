import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import { ISalaryCalculatorEmployee } from "@/interfaces/salary_record";
import { resolveSendTarget } from "@/lib/utils/salary_send_target";

/**
 * Info: (20260905 - Luphia) 「薪資單要寄到哪」的四個分支（#6775）。
 *
 * 這支函式是從 `salary_records_page_body.tsx` 抽出來的 —— 它原本住在元件裡，
 * 而本專案的測試不 render React，所以那四個分支裡有兩個（名單載入中、名單掛掉）
 * 從來沒有被測過，也很難手動重現。
 *
 * 缺陷本身是**計算機頁另有一套推導**：讀 `linkEmployee()` 在選人那一刻抄下的
 * email 副本，而沒有任何東西會更新它。使用者在挑人彈窗裡補完信箱回來按寄出，
 * 看到的還是「請先到員工列表補上」。
 */

const employeeOf = (
  overrides: Partial<ISalaryCalculatorEmployee> = {},
): ISalaryCalculatorEmployee =>
  ({
    id: "e-1",
    name: "王小明",
    number: "A012",
    email: "wang@example.com",
    ...overrides,
  }) as ISalaryCalculatorEmployee;

const listOf = (employees: ISalaryCalculatorEmployee[]) => ({
  employees,
  isLoading: false,
  hasError: false,
});

describe("resolveSendTarget 的四個分支", () => {
  it("有信箱 → 回信箱，不擋", () => {
    const result = resolveSendTarget("e-1", listOf([employeeOf()]));

    expect(result.email).toBe("wang@example.com");
    expect(result.blockedReason).toBeUndefined();
  });

  /**
   * Info: (20260905 - Luphia) 全空白的信箱要算「沒有」。
   * 送進 SMTP 只會換來一個看起來像故障的連線層錯誤，而成因是資料。
   */
  it.each([
    ["", "空字串"],
    ["   ", "全空白"],
  ])("信箱是 %s（%s）→ 擋下並說「沒有電子郵件」", (email) => {
    const result = resolveSendTarget("e-1", listOf([employeeOf({ email })]));

    expect(result.email).toBeUndefined();
    expect(result.blockedReason).toBe(
      "calculator.button.send_disabled_no_email",
    );
  });

  it("名單裡沒有這個人 → 擋下並說「已從名單移除」", () => {
    const result = resolveSendTarget("e-9", listOf([employeeOf()]));

    expect(result.blockedReason).toBe(
      "calculator.button.send_disabled_employee_gone",
    );
  });

  /**
   * Info: (20260905 - Luphia) 這兩條是抽出來之前測不到的。
   *
   * 名單還沒問完時**每個人都查不到** —— 若不先擋在這裡，畫面會說
   * 「這個人已被移除」，而那是一句它沒有依據說的話。
   * 「還在確認」與「他不在了」是完全不同的事，不該塌成同一個答案。
   */
  it.each([
    [{ isLoading: true, hasError: false }, "載入中"],
    [{ isLoading: false, hasError: true }, "名單掛了"],
  ])("%s 時不下結論也不放行", (state) => {
    const result = resolveSendTarget("e-1", {
      employees: [],
      ...state,
    });

    expect(result.email).toBeUndefined();
    expect(result.blockedReason).toBe(
      "calculator.button.send_disabled_loading",
    );
  });

  it("還沒選人 → 擋下", () => {
    expect(
      resolveSendTarget(null, listOf([employeeOf()])).email,
    ).toBeUndefined();
  });
});

/**
 * Info: (20260905 - Luphia) **兩頁必須讀同一支函式**（#6775 的核心）。
 *
 * 上面那些行為斷言證明的是「這支函式對」，不是「兩頁都在用它」——
 * 而缺陷正是後者（§1.7：測到了零件，沒測到裝配）。
 *
 * 反面斷言尤其重要：計算機頁一旦退回讀 `employeeEmail` 的副本，
 * 上面每一條都照樣綠，而缺陷原樣復活。
 */
describe("兩頁的接線", () => {
  /**
   * Info: (20260905 - Luphia) **先剝掉註解再比對。**
   *
   * 初版直接對整份原始碼做 `not.toMatch` —— 而那條當場就紅了，
   * 原因是被修掉的那一行**被引用在說明它為什麼被修掉的註解裡**。
   *
   * 反面斷言要驗的是「程式碼裡沒有這個寫法」，不是「檔案裡沒有這串字」。
   * 兩者差一個剝註解的動作，而少了它，這條會逼下一個人為了過測試
   * 去刪掉解釋成因的那段話 —— 正好把最該留下的東西刪掉。
   */
  const codeOf = (relative: string): string =>
    readFileSync(join(process.cwd(), relative), "utf-8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

  const sourceOf = (relative: string): string =>
    readFileSync(join(process.cwd(), relative), "utf-8");

  const PAGES = [
    "src/components/salary_calculator/salary_records_page_body.tsx",
    "src/components/salary_calculator/salary_result_section.tsx",
  ];

  it.each(PAGES)("%s 呼叫 resolveSendTarget", (page) => {
    expect(sourceOf(page)).toContain("resolveSendTarget(");
  });

  it("計算機頁不得再以 employeeEmail 判斷寄不寄得出去", () => {
    expect(codeOf(PAGES[1])).not.toMatch(/employeeEmail\.trim\(\)\s*===\s*""/);
  });
});
