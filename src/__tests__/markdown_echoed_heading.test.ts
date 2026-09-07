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
   * Info: (20260827 - Emily) 立場已定(#6705):**原文標題被大綱涵蓋就剝**。
   * 這一條在 08-19 版是「原樣保留(open/36 未決)」—— 未決的是「保哪一個」,
   * 而決定之後判準變成「有沒有原文獨有的字」:
   * 「政策聲明」⊂「氣候與永續政策聲明」→ 剝掉不損失任何原文資訊。
   */
  it("原文標題被大綱標題涵蓋 → 剝(#6705 的立場)", () => {
    const md = "### 1.3 氣候與永續政策聲明\n\n1.3政策聲明\n本公司為善盡…\n";

    expect(stripEchoedSectionHeadings(md)).toBe(
      "### 1.3 氣候與永續政策聲明\n\n本公司為善盡…\n",
    );
  });

  // Info: (20260827 - Emily) 今天成品的實際形狀(Carbon_Report_Draft_smtbau6mn.pdf 第 1.5 節)
  it("實測案例:大綱「1.5 組織邊界設定方法」+ 原文「1.5 組織邊界」→ 剝", () => {
    const md =
      "### 1.5 組織邊界設定方法\n\n1.5 組織邊界\n本公司以營運控制權…\n";

    expect(stripEchoedSectionHeadings(md)).toBe(
      "### 1.5 組織邊界設定方法\n\n本公司以營運控制權…\n",
    );
  });

  /**
   * Info: (20260827 - Emily) 立場的另一邊:原文帶了大綱沒有的字就是原文獨有資訊,
   * 剝掉等於刪原文 —— 這一條保證那不會發生。
   */
  it("原文標題有大綱沒有的字 → 保留", () => {
    const md = "### 1.5 組織邊界設定方法\n\n1.5 組織邊界與設施清單\n本公司…\n";

    expect(stripEchoedSectionHeadings(md)).toBe(md);
  });

  /**
   * Info: (20260827 - Emily) 涵蓋判定必須有節號(或 `#`)當錨:
   * 沒有這條,一句剛好是標題子串的正常內文會被當成重複標題刪掉 —— 那是刪內容。
   */
  it("內文首行剛好是標題子串但沒有節號 → 保留", () => {
    const md = "### 3.2 排放源鑑別\n\n排放源\n共 12 項。\n";

    expect(stripEchoedSectionHeadings(md)).toBe(md);
  });

  /**
   * Info: (20260831 - Emily) ⚠ 這一條**守不到 SENTENCE_TAIL**(PR #6729 review 中-1)。
   *
   * reviewer 實測:把 `SENTENCE_TAIL` 整行拿掉,22 條全綠。原因是這個素材
   * 通過的理由不是那道守門 —— `line.text` 是「組織邊界。」,而
   * `heading.text.includes("組織邊界。")` 對「組織邊界設定方法」本來就是 false,
   * 子串那一關已經擋掉了,守門一次都沒參與裁決。
   * 斷言的結果對,但案例不足以區分「守門在」與「守門不在」(§1.9)。
   *
   * 留著它是因為它記錄了一個真實形狀;真正守住那道門的是下面那一條。
   */
  it("帶句末標點的一行是內文,不是標題 → 保留(此例由子串那關擋下)", () => {
    const md = "### 1.5 組織邊界設定方法\n\n1.5 組織邊界。\n本公司…\n";

    expect(stripEchoedSectionHeadings(md)).toBe(md);
  });

  /**
   * Info: (20260831 - Emily) 這一條才真的守 `SENTENCE_TAIL`(review 中-1 的修法)。
   *
   * 要輪到那道守門裁決,**標題文字自己必須含句末標點** ——
   * 這時子串那關會成立(「排放源有哪些?」⊂「排放源有哪些?類別說明」)、
   * 節號也相同,唯一擋住剝除的就是句末標點。拿掉守門這條會紅。
   */
  it("標題自己含句末標點時,句末標點那道守門才是唯一擋下的理由", () => {
    const md =
      "### 3.1 排放源有哪些？類別說明\n\n3.1 排放源有哪些？\n本節逐項說明。\n";

    expect(stripEchoedSectionHeadings(md)).toBe(md);
  });

  it("節號後的連接標點不影響判定(「1.5、組織邊界」)", () => {
    const md = "### 1.5 組織邊界設定方法\n\n1.5、組織邊界\n本公司…\n";

    expect(stripEchoedSectionHeadings(md)).toBe(
      "### 1.5 組織邊界設定方法\n\n本公司…\n",
    );
  });

  /**
   * Info: (20260831 - Emily) 真實的下層標題不得被剝(PR #6729 review 高-1)。
   *
   * reviewer 拿本模組編譯後實跑抓到的:錨原本接受「這一行是 ATX 標頭」,
   * 於是 `1.5.1` 明明不等於 `1.5` 也過了錨,子節標題被靜默刪掉。
   *
   * 這兩條與下面那條「節號相同的 ATX 回聲仍然剝」是一組 ——
   * 原本的六條新測試全部在測「該剝的有沒有剝」,被剝的行也全是純文字,
   * 沒有一條測「不該剝的有沒有留」在 ATX 這一側,所以缺陷全綠通過。
   */
  it("下一層真實子節 ### 1.5.1 → 保留(節號不同,不是回聲)", () => {
    const md = "## 1.5 組織邊界設定方法\n### 1.5.1 組織邊界\n內文。\n";

    expect(stripEchoedSectionHeadings(md)).toBe(md);
  });

  it("無編號的真實子標題 ### 排放源鑑別 → 保留(沒有節號可當錨)", () => {
    const md = "## 3.2 排放源鑑別與量化方法\n### 排放源鑑別\n內文。\n";

    expect(stripEchoedSectionHeadings(md)).toBe(md);
  });

  it("節號相同的 ATX 回聲 → 仍然剝(收緊錨沒有漏掉這一格)", () => {
    const md = "## 1.5 組織邊界設定方法\n### 1.5 組織邊界\n本公司…\n";

    expect(stripEchoedSectionHeadings(md)).toBe(
      "## 1.5 組織邊界設定方法\n本公司…\n",
    );
  });

  /**
   * Info: (20260831 - Emily) 有序清單的首項不是回聲標題(PR #6729 review 高-2)。
   *
   * reviewer 實測:`## 1 溫室氣體盤查範圍` + `1. 溫室氣體` → 首項消失,
   * 清單從「2.」開始。成因是 `1.` 的點被當成節號後的連接標點吃掉,
   * 於是清單項變成「在講第 1 節的一行」。
   * 觸發條件三個都是日常形狀(章節標題後接從 1. 開始的清單、
   * 標題是「清單項＋修飾語」、清單項沒有句末標點)。
   */
  it("有序清單首項不得被當成回聲標題剝掉(1. 溫室氣體)", () => {
    const md = "## 1 溫室氣體盤查範圍\n1. 溫室氣體\n2. 邊界\n";

    expect(stripEchoedSectionHeadings(md)).toBe(md);
  });

  it("整個清單只有一項時也不得被剝(2. 盤查邊界)", () => {
    const md = "## 2 盤查邊界與範疇\n2. 盤查邊界\n";

    expect(stripEchoedSectionHeadings(md)).toBe(md);
  });

  /**
   * Info: (20260831 - Emily) 連續多項會被連續剝(`pendingHeading` 不因剝除而清空),
   * 所以最壞情況不是掉一行而是掉一整段清單 —— 這條釘住整段都在。
   */
  it("連續多項符合時整段清單都要留著", () => {
    const md = "## 1 溫室氣體盤查範圍\n1. 溫室氣體\n1. 溫室\n1. 氣體\n";

    expect(stripEchoedSectionHeadings(md)).toBe(md);
  });

  it("`1)` 形式的清單標記同樣不算節號", () => {
    const md = "## 1 溫室氣體盤查範圍\n1) 溫室氣體\n";

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
