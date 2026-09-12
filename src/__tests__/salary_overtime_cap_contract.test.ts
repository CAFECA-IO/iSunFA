import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import path from "path";
import { MAX_OVERWORK_HOURS } from "@/constants/salary_calculator";

/**
 * Info: (20260909 - Julian) 每月延長工時上限只能有一個來源。
 *
 * ## 這一支守什麼
 *
 * `MAX_OVERWORK_HOURS`（勞基法 §32 II 的 46 小時）在 20260909 之前
 * **沒有任何人用** —— 三處判斷全部寫死 `46`。那個缺陷的形狀是：
 * 常數存在、看起來被尊重，而改它不會改變任何行為。
 * 法規一改（那是會改的數字），要找的是三個散落的字面值。
 *
 * 沒有任何既有測試接得住它：三處的行為當時都是對的，
 * 錯的是「這個值只有一個來源」這件事不成立。
 *
 * ## 為什麼連 `>` / `>=` 也一起釘
 *
 * 兩種比較不是筆誤，是分工（見常數的註解）：擋門用 `>`（46 合法），
 * 分區提示用 `>=`（打到上限先變色）。把它寫成測試，是因為
 * 「這兩個不一樣」看起來就很像手滑，而下一個人「順手統一」的話：
 * 統一成 `>=` 會擋掉合法的 46 小時，統一成 `>` 會讓提示晚一小時才出現。
 */
const componentSource = (relativePath: string): string =>
  readFileSync(path.join(process.cwd(), "src", relativePath), "utf-8");

/**
 * Info: (20260909 - Julian) 剝掉註解再掃字面值。
 *
 * 要禁的是**程式碼裡**的第二個來源；註解正是 `46` 該出現的地方
 * （「不得超過四十六小時，所以 46 本身合法」那段說明少了數字就講不清）。
 * 不剝的話這條護欄會對著自己的說明文字報紅 —— 而一條會誤報的護欄，
 * 下一個人的處置多半是刪掉它，不是修準它。
 *
 * `//` 的比對刻意排除前面是 `:` 的情況，免得把 `https://…` 之後的整行吃掉：
 * 那會讓掃描變寬鬆（漏掉真的字面值），比誤報更難發現。
 */
const withoutComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const workHoursForm = componentSource(
  "components/salary_calculator/work_hours_form.tsx",
);
const formSection = componentSource(
  "components/salary_calculator/salary_form_section.tsx",
);

describe("每月延長工時上限", () => {
  it("常數就是勞基法 §32 II 的 46", () => {
    expect(MAX_OVERWORK_HOURS).toBe(46);
  });

  /**
   * Info: (20260909 - Julian) 判準是「沒有字面值」而不是「有引用常數」。
   *
   * 只檢查有沒有 `MAX_OVERWORK_HOURS` 的話，一個既引用常數、又在別處
   * 留一個 `46` 的檔案會是綠的 —— 而那正是要防的狀態（兩個來源）。
   */
  it("兩個元件的程式碼裡不留 46 這個字面值", () => {
    const literal = /\b46\b/;

    expect(withoutComments(workHoursForm)).not.toMatch(literal);
    expect(withoutComments(formSection)).not.toMatch(literal);
  });

  it("兩個元件都引用常數", () => {
    expect(workHoursForm).toContain("MAX_OVERWORK_HOURS");
    expect(formSection).toContain("MAX_OVERWORK_HOURS");
  });

  it("擋門用 > （46 小時本身合法）", () => {
    expect(formSection).toMatch(
      /totalTaxableHours \+ totalNonTaxableHours >\s*MAX_OVERWORK_HOURS/,
    );
    expect(formSection).not.toMatch(/>=\s*MAX_OVERWORK_HOURS/);
  });

  it("擋門比的是免稅＋應稅的合計，不是單一稅別", () => {
    expect(formSection).toContain("totalTaxableHours + totalNonTaxableHours");
  });

  it("分區提示用 >=（打到上限就變色），而且兩區都有", () => {
    const hints = workHoursForm.match(/>=\s*MAX_OVERWORK_HOURS/g) ?? [];

    expect(hints).toHaveLength(2);
    expect(workHoursForm).toMatch(
      /totalNonTaxableHours >=\s*MAX_OVERWORK_HOURS/,
    );
    expect(workHoursForm).toMatch(/totalTaxableHours >=\s*MAX_OVERWORK_HOURS/);
  });
});

/**
 * Info: (20260909 - Julian) 請假區塊刻意沒有總時數 —— 守的是那個理由還在。
 *
 * 加班兩區有 `0 HRS`、請假區沒有，看起來像漏掉，所以它會反覆被「修好」。
 * 而三格加起來是沒有意義的數字：病假算 0.5、事假算 1.0、
 * 休假折抵是**反號**（它加錢，不扣時數）。
 *
 * 這一條不去斷言畫面上沒有那個數字（那要 render），而是斷言**理由還寫在那裡**。
 * 註解被刪掉的時候紅一次，比補上一個假總數之後才發現要早。
 */
describe("請假區塊沒有總時數", () => {
  it("理由寫在元件裡", () => {
    expect(workHoursForm).toContain("刻意沒有");
    expect(workHoursForm).toContain(
      "sickLeaveHours * 0.5 + personalLeaveHours",
    );
  });

  it("引擎的權重與註解說的一致", () => {
    const engine = readFileSync(
      path.join(process.cwd(), "src", "lib/utils/salary_calculator.ts"),
      "utf-8",
    );

    // Info: (20260909 - Julian) 註解引用的是這一行；它改了，上面那條註解就過期了
    expect(engine).toContain(
      "const totalLeaveHours = sickLeaveHours * 0.5 + personalLeaveHours;",
    );

    /**
     * Info: (20260909 - Julian) 休假折抵走的是**給付**，不是扣薪時數。
     *
     * 它若哪天被加進 `totalLeaveHours`，那句「反方向」就不成立了。
     */
    expect(engine).toContain(
      "const vacationToPay = Math.round(baseSalaryPerHour * vacationToPayHours);",
    );
  });
});
