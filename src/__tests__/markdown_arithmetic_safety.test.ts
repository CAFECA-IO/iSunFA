import { describe, it, expect } from "@jest/globals";
import { escapeArithmeticEmphasis } from "@/lib/utils/markdown_arithmetic_safety";
import { buildCarbonReportHtml } from "@/lib/utils/carbon_report_html";

/**
 * Info: (20260810 - Emily) 這支測試守的是一份查證文件裡的**數字不被改寫**。
 *
 * UAT 實測:化糞池 CH4 排放係數的九條公式在 PDF 裡都被 markdown 的強調語法吃掉乘號,
 * `248*9*15.625` 印成 `248915.625` —— 兩個數字合併成一個,而讀的人看不出異常。
 */
const SEPTIC_FORMULA =
  "0.6*200/1000000000*248*9*15.625*(85/100)=0.00355725(總公司常日班)";

describe("escapeArithmeticEmphasis", () => {
  it("should escape the multiplication signs in a transcribed formula", () => {
    const escaped = escapeArithmeticEmphasis(SEPTIC_FORMULA);
    expect(escaped).toBe(
      "0.6\\*200/1000000000\\*248\\*9\\*15.625\\*(85/100)=0.00355725(總公司常日班)",
    );
  });

  /**
   * Info: (20260810 - Emily) 報告刻意使用 markdown:表號是粗體、擋下的圖說是斜體。
   * 全部轉義會把那些一起打壞,所以判準取「兩側都是算式字元」。
   */
  it("should leave deliberate markdown alone", () => {
    const deliberate =
      "**表2.1 重大性間接溫室氣體排放準則評估表**（原文照錄 p.10）";
    expect(escapeArithmeticEmphasis(deliberate)).toBe(deliberate);
    expect(escapeArithmeticEmphasis("> _節點太少,故不繪製_")).toBe(
      "> _節點太少,故不繪製_",
    );
  });

  /**
   * Info: (20260810 - Emily) 圍籬內 markdown 不處理強調,加反斜線不是防護而是污染 ——
   * mermaid 的定義若含算式,轉義後圖上會多出一個反斜線。
   */
  it("should not touch fenced code", () => {
    const fenced = ["```mermaid", "flowchart LR", "A[2*3] --> B", "```"].join(
      "\n",
    );
    expect(escapeArithmeticEmphasis(fenced)).toBe(fenced);
  });

  /**
   * Info: (20260810 - Emily) 冪等性是必要的:這支函式套用在三個地方
   * (組裝段落、預覽、列印),既有草稿的內容會經過不只一次。
   * 二次轉義會印出一個字面反斜線 —— 那是另一種形式的同一個 bug。
   */
  it("should be idempotent", () => {
    const once = escapeArithmeticEmphasis(SEPTIC_FORMULA);
    expect(escapeArithmeticEmphasis(once)).toBe(once);
    expect(escapeArithmeticEmphasis(escapeArithmeticEmphasis(once))).toBe(once);
  });

  it("should leave text without asterisks untouched", () => {
    const plain = "本公司透過 ISO 14064：2018 溫室氣體盤查的標準及要求";
    expect(escapeArithmeticEmphasis(plain)).toBe(plain);
  });
});

describe("buildCarbonReportHtml with transcribed formulas", () => {
  /**
   * Info: (20260810 - Emily) 端到端:走完整條 markdown → HTML,公式的每一個乘號都還在。
   * 只測 escapeArithmeticEmphasis 不夠 —— 它證明字串被轉義了,
   * 但沒證明 marked 之後那些星號真的出現在輸出裡。
   */
  it("should keep every multiplication sign in the rendered html", () => {
    const html = buildCarbonReportHtml(
      `## 3.4 計算細節\n\n${SEPTIC_FORMULA}\n`,
    );
    const text = html.replace(/<[^>]+>/g, "");
    expect(text).toContain("0.6*200/1000000000*248*9*15.625*(85/100)");
    expect(text).not.toContain("248915.625");
  });

  it("should still render deliberate bold as strong", () => {
    const html = buildCarbonReportHtml("**表3.5 全公司類別一統計表**\n");
    expect(html).toContain("<strong>表3.5 全公司類別一統計表</strong>");
  });
});

/**
 * Info: (20260812 - Emily) 行內程式碼(PR review 第 2 點)。
 * 本檔的立場是「圍籬內加反斜線不是防護而是污染」——行內 code span 同理,
 * 當初只漏了一種。實測 `2*3*4` 會被轉義成 2\\*3\\*4,反斜線直接印在報告上。
 */
describe("escapeArithmeticEmphasis 與行內程式碼", () => {
  it("should leave an inline code span untouched", () => {
    expect(escapeArithmeticEmphasis("公式 `2*3*4` 見表")).toBe(
      "公式 `2*3*4` 見表",
    );
  });

  it("should still escape arithmetic outside the code span", () => {
    expect(escapeArithmeticEmphasis("`a*1` 與 2*3")).toBe("`a*1` 與 2\\*3");
  });

  /**
   * Info: (20260812 - Emily) 樣本從 ``a`b*1`` 改成 ``a`2*1``。
   *
   * 原本那個 `b*1` 的星號左側是字母,本來就不匹配判準 ——
   * 於是這條測試在 code span 切法壞掉的時候也是綠的。換成數字才守得住:
   * 舊的 /(`+[^`]*`+)/ 會在內層反引號提早收尾,span 內的算式被當成內文逸出。
   */
  it("should handle a doubled backtick span that contains a backtick", () => {
    expect(escapeArithmeticEmphasis("``a`2*1`` 與 2*3")).toBe(
      "``a`2*1`` 與 2\\*3",
    );
  });
});

/**
 * Info: (20260812 - Emily) 跳過範圍的四個洞(見 markdown_fence 檔頭)。
 * 每一條壞掉的後果都是「保護在該生效的地方失效」或「在不該作用的地方污染內容」。
 */
describe("escapeArithmeticEmphasis 的跳過範圍", () => {
  it("should keep protecting prose after a tilde line inside a backtick fence", () => {
    const out = escapeArithmeticEmphasis(
      ["```", "text", "~~~", "2*3", "```", "外面的公式 4*5=20"].join("\n"),
    );

    // Info: (20260812 - Emily) 圍籬內不動
    expect(out).toContain("\n2*3\n");
    // Info: (20260812 - Emily) 圍籬外仍受保護 —— 這是原本壞掉的那一半
    expect(out).toContain("4\\*5=20");
  });

  it("should not escape inside a nested longer fence", () => {
    const out = escapeArithmeticEmphasis(
      ["````", "```mermaid", "2*3", "```", "````"].join("\n"),
    );

    expect(out).toContain("\n2*3\n");
  });

  it("should not escape an indented code block", () => {
    const out = escapeArithmeticEmphasis(
      ["說明:", "", "    0.6*200*248=1"].join("\n"),
    );

    expect(out).toContain("    0.6*200*248=1");
    expect(out).not.toContain("\\*");
  });

  it("should still escape a formula in a list item", () => {
    const out = escapeArithmeticEmphasis(["- 項目", "", "    2*3"].join("\n"));

    expect(out).toContain("2\\*3");
  });
});
