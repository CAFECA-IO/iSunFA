import { describe, it, expect } from "@jest/globals";
import { buildPaySlipHtml } from "@/lib/utils/pay_slip_html";
import {
  defaultSalaryCalculatorResult,
  type ISalaryCalculatorUI,
} from "@/interfaces/salary_calculator";
import { PDF_FONT_STACK } from "@/constants/pdf_font";
import { calculator as zhTw } from "@/i18n/locales/zh_tw/calculator";

/**
 * Info: (20260902 - Julian) 薪資單列印 HTML（`buildPaySlipHtml`）。
 *
 * 這支函式的產物會**離開本站**：它變成 PDF，寄進員工的私人信箱。
 * 一旦寄出就收不回來，沒有「重新整理就好」這種補救。所以要釘死的是四件事：
 *
 * 1. 姓名的 HTML 逃逸 —— 員工姓名是使用者打進來的，直接插進 HTML
 *    等於把信件版面交給對方擺佈
 * 2. 33 個欄位一個不缺 —— 少一欄的薪資單看起來完全正常，而它是錯的
 * 3. 職災行業別費率不能走千分位 —— 那一欄是比率，`numberWithCommas`
 *    會把 0.002 印成「0」
 * 4. 文案與畫面上的字典逐字相同 —— 印出來的欄位名跟員工在畫面上看到的
 *    不一樣，他無法把兩者對起來
 */

const makeResult = (
  overrides: Partial<{
    monthlySalary: Partial<ISalaryCalculatorUI["monthlySalary"]>;
    employeeContribution: Partial<ISalaryCalculatorUI["employeeContribution"]>;
    insuredSalary: Partial<ISalaryCalculatorUI["insuredSalary"]>;
    employerContribution: Partial<ISalaryCalculatorUI["employerContribution"]>;
    totalPayment: number;
    totalSalaryTaxable: number;
  }> = {},
): ISalaryCalculatorUI => ({
  ...defaultSalaryCalculatorResult,
  monthlySalary: {
    ...defaultSalaryCalculatorResult.monthlySalary,
    ...overrides.monthlySalary,
  },
  employeeContribution: {
    ...defaultSalaryCalculatorResult.employeeContribution,
    ...overrides.employeeContribution,
  },
  insuredSalary: {
    ...defaultSalaryCalculatorResult.insuredSalary,
    ...overrides.insuredSalary,
  },
  employerContribution: {
    ...defaultSalaryCalculatorResult.employerContribution,
    ...overrides.employerContribution,
  },
  totalPayment:
    overrides.totalPayment ?? defaultSalaryCalculatorResult.totalPayment,
  totalSalaryTaxable:
    overrides.totalSalaryTaxable ??
    defaultSalaryCalculatorResult.totalSalaryTaxable,
});

const buildWith = (
  overrides: Partial<{
    employeeName: string;
    employeeNumber: string;
    year: number;
    month: number;
    result: ISalaryCalculatorUI;
  }> = {},
) =>
  buildPaySlipHtml({
    employeeName: "王小明",
    employeeNumber: "E-001",
    year: 2026,
    month: 9,
    result: makeResult(),
    ...overrides,
  });

describe("buildPaySlipHtml — 姓名與編號的 HTML 逃逸", () => {
  /**
   * Info: (20260902 - Julian) 員工姓名走的是「使用者輸入 → 我們的 HTML → 別人的信箱」。
   * 中間沒有任何一層 React 幫忙逃逸 —— 這支是字串拼接。
   */
  it("把姓名裡的角括號逃逸掉，不讓標籤成形", () => {
    const html = buildWith({ employeeName: "<script>alert(1)</script>" });

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("把姓名裡的引號逃逸掉，不讓它跳出屬性值", () => {
    const html = buildWith({ employeeName: `張"三'李` });

    expect(html).toContain("&quot;");
    expect(html).toContain("&#39;");
    expect(html).not.toContain(`張"三'李`);
  });

  it("把編號裡的 & 逃逸掉（先逃 & 才不會把後續逃逸結果二次轉義）", () => {
    const html = buildWith({ employeeNumber: "A&B" });

    expect(html).toContain("A&amp;B");
    // Info: (20260902 - Julian) 若順序寫反，&lt; 會被改寫成 &amp;lt;，畫面上就看得到 "&lt;"
    expect(html).not.toContain("&amp;lt;");
    expect(html).not.toContain("&amp;quot;");
  });

  it("一般中文姓名原樣輸出，不被消毒器吃掉", () => {
    const html = buildWith({ employeeName: "王小明", employeeNumber: "E-001" });

    expect(html).toContain("王小明");
    expect(html).toContain("E-001");
  });
});

describe("buildPaySlipHtml — 期間", () => {
  it("標題與表頭都帶年月", () => {
    const html = buildWith({ year: 2026, month: 9 });

    expect(html).toContain("<title>王小明 2026 年 9 月 薪資單</title>");
    expect(html).toContain(`<p class="period">2026 年 9 月</p>`);
  });

  it("十二月不被補零或截斷", () => {
    const html = buildWith({ year: 2025, month: 12 });

    expect(html).toContain("2025 年 12 月");
  });
});

describe("buildPaySlipHtml — 金額格式", () => {
  it("七位數金額帶千分位", () => {
    const html = buildWith({
      result: makeResult({ monthlySalary: { baseSalaryWithTax: 1234567 } }),
    });

    expect(html).toContain("1,234,567");
  });

  it("扣繳憑單金額與實際發放金額都出現在表頭", () => {
    const html = buildWith({
      result: makeResult({ totalSalaryTaxable: 987654, totalPayment: 123456 }),
    });

    expect(html).toContain("987,654");
    expect(html).toContain("123,456");
  });

  /**
   * Info: (20260902 - Julian) 33 欄裡唯一的比率欄。
   *
   * 0.002 走 `numberWithCommas`（預設兩位小數）會印成「0」——
   * 而一份寫著「職災行業別費率 0」的薪資單看起來完全正常。
   * 這是本檔最容易被順手「統一格式」改壞的一行。
   */
  it("職災行業別費率印成百分比，不是被四捨五入掉的 0", () => {
    const html = buildWith({
      result: makeResult({
        insuredSalary: { occupationalInjuryIndustryRate: 0.002 },
      }),
    });

    expect(html).toContain("0.200%");
    expect(html).not.toContain(
      `<td class="label">${zhTw.result.occupational_injury_industry_rate}</td>
          <td class="value">0</td>`,
    );
  });
});

describe("buildPaySlipHtml — 欄位齊全", () => {
  /**
   * Info: (20260902 - Julian) 手寫這張清單，**不從 LABELS 推導**。
   *
   * 從被測程式碼推導出期望值的測試，在欄位被刪掉時會跟著少一項而依然全綠 ——
   * 它驗的是「程式碼等於它自己」。這張表要能在有人刪掉一欄時變紅，
   * 就只能是另一份獨立寫下的事實。
   */
  const REQUIRED_LABELS = [
    // Info: (20260902 - Julian) 月薪資項目（10）
    "本薪（應稅）",
    "加班費（應稅）",
    "其他加給（應稅）",
    "總應稅薪資",
    "伙食費（免稅）",
    "加班費（免稅）",
    "其他津貼（免稅）",
    "休假折抵薪資（免稅）",
    "總免稅薪資",
    "月薪資合計",
    // Info: (20260902 - Julian) 員工負擔（9）
    "自行負擔勞保費",
    "自行負擔健保費",
    "自提勞退",
    "代扣所得稅款",
    "代扣二代健保",
    "請假扣薪（應稅）",
    "請假扣薪（免稅）",
    "其他溢扣/ 補收",
    "扣項總計",
    // Info: (20260902 - Julian) 投保薪資（7）
    "健保投保級距",
    "勞保投保級距",
    "就業保險級距",
    "職災保險級距",
    "勞退級距",
    "職災行業別費率",
    "投保薪資",
    // Info: (20260902 - Julian) 雇主負擔（6）
    "公司負擔勞保費",
    "公司負擔健保費",
    "公司負擔退休金",
    "公司負擔職保費",
    "本月薪資",
    "公司總負擔",
    // Info: (20260902 - Julian) 表頭（2）
    "扣繳憑單金額",
    "實際發放金額",
  ];

  it.each(REQUIRED_LABELS)("印出「%s」", (label) => {
    expect(buildWith()).toContain(label);
  });

  it("應稅與免稅兩組分項都在，沒有只印一半", () => {
    const html = buildWith();
    const taxable = [
      "本薪（應稅）",
      "加班費（應稅）",
      "其他加給（應稅）",
      "總應稅薪資",
    ];
    const taxFree = [
      "伙食費（免稅）",
      "加班費（免稅）",
      "其他津貼（免稅）",
      "休假折抵薪資（免稅）",
      "總免稅薪資",
    ];

    taxable.forEach((label) => expect(html).toContain(label));
    taxFree.forEach((label) => expect(html).toContain(label));
  });

  const SECTION_TITLES = [
    "月薪資項目",
    "員工負擔項目",
    "投保級距與費率",
    "雇主負擔項目",
  ];

  it.each(SECTION_TITLES)("區塊標題「%s」在", (title) => {
    expect(buildWith()).toContain(`class="section-title">${title}<`);
  });

  /**
   * Info: (20260902 - Julian) 區塊標題不得與任何一列的欄位名相同。
   *
   * 初版寫成「月薪資合計」與「投保薪資」——兩者都恰好是該區塊裡某一列的名字。
   * 印在紙上的結果是同一個詞出現兩次而值不同（一個是區塊名、一個是那一列的數字），
   * 讀的人無從分辨哪個才是總計。畫面上有顏色與框線分隔，紙上沒有。
   */
  it("區塊標題不與任何欄位同名", () => {
    SECTION_TITLES.forEach((title) => {
      expect(REQUIRED_LABELS).not.toContain(title);
    });
  });
});

describe("buildPaySlipHtml — 與畫面字典對拍", () => {
  /**
   * Info: (20260902 - Julian) 本檔刻意**不 import** 前端字典（見 `pay_slip_html.ts` 檔頭）。
   * 相同性由這裡對拍：字典改了而列印版沒跟上，這幾條會紅，
   * 而不是等到員工拿著一張欄位名跟畫面對不起來的薪資單來問。
   */
  const PAIRS: [string, string][] = [
    ["本薪（應稅）", zhTw.result.base_salary_with_tax],
    ["伙食費（免稅）", zhTw.result.meal_allowance_without_tax],
    ["月薪資合計", zhTw.result.total_monthly_salary],
    ["扣項總計", zhTw.result.total_deductions],
    ["就業保險級距", zhTw.result.employment_insurance_salary_bracket],
    ["職災行業別費率", zhTw.result.occupational_injury_industry_rate],
    ["投保薪資", zhTw.result.insured_salary],
    ["本月薪資", zhTw.result.monthly_pay],
    ["公司總負擔", zhTw.result.total_employer_cost],
    ["扣繳憑單金額", zhTw.result.reported],
    ["實際發放金額", zhTw.result.paid],
  ];

  it.each(PAIRS)(
    "列印用的「%s」與 zh_tw 字典逐字相同",
    (printed, dictionary) => {
      expect(printed).toBe(dictionary);
      expect(buildWith()).toContain(dictionary);
    },
  );
});

describe("buildPaySlipHtml — 列印環境自足", () => {
  /**
   * Info: (20260902 - Julian) 這份 HTML 餵給 `page.setContent`，那裡沒有 Tailwind 產物、
   * 也沒有 globals.css。任何外部樣式表或 class-only 的排版都會變成沒有樣式的一長串文字。
   */
  it("自帶 <style>，不引用任何外部樣式或腳本", () => {
    const html = buildWith();

    expect(html).toContain("<style>");
    expect(html).not.toContain("<link");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("globals.css");
  });

  it("用共用的字型堆疊常數，缺 CJK 時才擋得住", () => {
    expect(buildWith()).toContain(PDF_FONT_STACK);
  });

  it("宣告 zh-Hant 與 utf-8", () => {
    const html = buildWith();

    expect(html).toContain(`<html lang="zh-Hant">`);
    expect(html).toContain(`<meta charset="utf-8" />`);
  });
});
