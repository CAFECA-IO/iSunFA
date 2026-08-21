import { describe, it, expect } from "@jest/globals";
import { stripEchoedSectionHeadings } from "@/lib/utils/markdown_echoed_heading";

/**
 * Info: (20260819 - Emily) 實測形狀取自 08-18 的兩份下載件
 * (`Carbon_Report_Draft_smsy97kus` / `smsy9kn8y`,用真實抽取器量):
 * run1 重複 第五章 / 第六章 / 9.3,run2 重複 第五章 / 第六章 / 第七章。
 * 兩趟的集合不同,所以這是非決定性的 —— 判準與修法都不能只針對某幾節。
 */
describe("stripEchoedSectionHeadings", () => {
  it("剝掉標題之後那一行同文的內容（沒有 # 前綴）", () => {
    const md =
      "### 第五章 溫室氣體減量措施及內部績效追蹤\n\n第五章 溫室氣體減量措施及內部績效追蹤\n\n本公司節約能源…\n";

    expect(stripEchoedSectionHeadings(md)).toBe(
      "### 第五章 溫室氣體減量措施及內部績效追蹤\n\n\n本公司節約能源…\n",
    );
  });

  it("剝掉標題之後那一行同文的**標題**（兩行都是 ###）", () => {
    const md = "### 9.3 實質性門檻\n### 9.3 實質性門檻\n界定誤差門檻。\n";

    expect(stripEchoedSectionHeadings(md)).toBe(
      "### 9.3 實質性門檻\n界定誤差門檻。\n",
    );
  });

  it("空白與全形差異也算同文（抽取端會插空白）", () => {
    const md =
      "## 第六章 溫室氣體資訊管理及盤查作業\n\n第六章　溫室氣體資訊管理及盤查作業\n內文\n";

    expect(stripEchoedSectionHeadings(md)).not.toContain(
      "第六章　溫室氣體資訊管理及盤查作業",
    );
    expect(stripEchoedSectionHeadings(md)).toContain("內文");
  });

  /**
   * Info: (20260819 - Emily) 這一條是重點的另一半:`open/36` 未決的那一半不能被順手吃掉。
   * 原文自己的標題與系統標題**不同字**時,那是客戶的原聲(「1.3政策聲明」),
   * 保哪一個是立場問題,不是這支函式該決定的。
   */
  it("原文標題與系統標題不同字時原樣保留（open/36 的立場未決）", () => {
    const md = "### 1.3 氣候與永續政策聲明\n\n1.3政策聲明\n本公司為善盡…\n";

    expect(stripEchoedSectionHeadings(md)).toBe(md);
  });

  it("不吃子節編號", () => {
    const md =
      "### 1.1 公司簡介與財務報告邊界\n\n1.1.1 公司名稱：高興昌鋼鐵股份有限公司\n";

    expect(stripEchoedSectionHeadings(md)).toBe(md);
  });

  it("程式碼區塊內原樣保留", () => {
    const md = "```markdown\n### 範例標題\n範例標題\n```\n";

    expect(stripEchoedSectionHeadings(md)).toBe(md);
  });

  it("隔了一段非同文的內容之後,剛好等於標題的段落不受影響", () => {
    const md = "### 量化方法\n\n本節說明算式。\n\n量化方法\n";

    expect(stripEchoedSectionHeadings(md)).toBe(md);
  });

  it("連續多份重複都剝掉", () => {
    const md = "### 一節\n一節\n一節\n內文\n";

    expect(stripEchoedSectionHeadings(md)).toBe("### 一節\n內文\n");
  });

  it("是冪等的（讀取端會被套用多次）", () => {
    const md = "### 第五章 減量措施\n\n第五章 減量措施\n\n內文\n";
    const once = stripEchoedSectionHeadings(md);

    expect(stripEchoedSectionHeadings(once)).toBe(once);
  });

  it("沒有重複時不動任何一個位元組", () => {
    const md = "# 報告\n\n## 第一章\n\n內文一\n\n### 1.1 節\n\n內文二\n";

    expect(stripEchoedSectionHeadings(md)).toBe(md);
  });
});
