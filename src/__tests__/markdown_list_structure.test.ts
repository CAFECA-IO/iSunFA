import { splitInlineListItems } from "@/lib/utils/markdown_list_structure";
import { restoreLineStructure } from "@/lib/utils/markdown_line_structure";

/**
 * Info: (20260814 - Emily) 素材是 2026-08-14 新匯入件 (`smssl0zqq`) 的實際內容
 * (`data/issue_drafts/open/26_import_uat.md`)。
 *
 * 不用 08-12 那份下載件當樣本：兩者的行結構破損程度差一個量級
 * （`●` 獨立成行 54 個 vs 3 個），拿舊樣本會低估。
 */
describe("splitInlineListItems", () => {
  it("should break before each bullet in 1.5.2 盤查地址", () => {
    const source =
      "施。 1.5.2 盤查地址： ● 總公司：高雄市鼓山區中華一路 318 號 ● 台北分公司：台北市大同區涼州街 62 號 1,2F ● 屏東分公司：屏東縣枋寮東海村永翔路 2 號";

    const result = splitInlineListItems(source);
    const lines = result.markdown.split("\n");

    expect(lines).toEqual([
      "施。 1.5.2 盤查地址：",
      "● 總公司：高雄市鼓山區中華一路 318 號",
      "● 台北分公司：台北市大同區涼州街 62 號 1,2F",
      "● 屏東分公司：屏東縣枋寮東海村永翔路 2 號",
    ]);
    expect(result.inserted).toBe(3);
  });

  it("should break before ascending dotted numbering in 1.6", () => {
    const source =
      "1.6 報告書涵蓋期間、頻率與責任 1.6.1 本報告書涵蓋時間為 2023 年 01 月 01 日至 2023 年 12 月 31 日。 1.6.2 報告書製作頻率：每年一次。 1.6.3 報告書負責單位：由溫室氣體盤查推行委員會負責。";

    const lines = splitInlineListItems(source).markdown.split("\n");

    expect(lines).toHaveLength(4);
    expect(lines[1]).toBe(
      "1.6.1 本報告書涵蓋時間為 2023 年 01 月 01 日至 2023 年 12 月 31 日。",
    );
    expect(lines[2]).toBe("1.6.2 報告書製作頻率：每年一次。");
    expect(lines[3]).toBe(
      "1.6.3 報告書負責單位：由溫室氣體盤查推行委員會負責。",
    );
  });

  it("should break before parenthesised ordinals in 3.2.1", () => {
    const source =
      "3.2溫室氣體排放或移除數據之選擇3.2.1 排放係數選取原則：(1) 內部量測數據(2) 質量平衡計算所得係數(3) 同製程/設備經驗係數(4) 製造廠提供係數";

    const lines = splitInlineListItems(source).markdown.split("\n");

    expect(lines[lines.length - 4]).toBe("(1) 內部量測數據");
    expect(lines[lines.length - 3]).toBe("(2) 質量平衡計算所得係數");
    expect(lines[lines.length - 2]).toBe("(3) 同製程/設備經驗係數");
    expect(lines[lines.length - 1]).toBe("(4) 製造廠提供係數");
  });

  /**
   * Info: (20260814 - Emily) 這一條是本檔最重要的負向測試。
   * `6.0.4` 是排放係數管理表的版本號，同一行出現兩次 ——
   * 只看「出現多次」的版本會在它前面斷行，把句子切成兩半。
   */
  it("should not break a repeated version number", () => {
    const source =
      "體排放係數管理表 6.0.4 版（燃料熱值）、溫室氣體排放係數管理表 6.0.4 版（逸散排放源）、產品碳足跡排放係數";

    expect(splitInlineListItems(source)).toEqual({
      markdown: source,
      inserted: 0,
    });
  });

  it("should keep 3.2.3 numbering while breaking its ordinals, and leave 6.0.4 alone", () => {
    // Info: (20260814 - Emily) 同一行混了兩族:遞增的 (n) 是清單，重複的 6.0.4 是版本號
    const source =
      '料為主。3.2.3 各排放係數說明(1) 緊急發電機柴油"：環境部-溫室氣體排放係數管理表 6.0.4(2) 公務車車用汽油"：環境部-溫室氣體排放係數管理表 6.0.4(3) 堆高機柴油"：環境部-溫室氣體排放係數管理表 6.0.4';

    const lines = splitInlineListItems(source).markdown.split("\n");

    expect(lines).toEqual([
      "料為主。3.2.3 各排放係數說明",
      '(1) 緊急發電機柴油"：環境部-溫室氣體排放係數管理表 6.0.4',
      '(2) 公務車車用汽油"：環境部-溫室氣體排放係數管理表 6.0.4',
      '(3) 堆高機柴油"：環境部-溫室氣體排放係數管理表 6.0.4',
    ]);
  });

  it("should ignore two parenthesised numbers in prose", () => {
    // Info: (20260814 - Emily) 括號序號門檻是 3 —— 散文裡的交叉引用只會有一兩個
    const source = "本公司依 (1) 與 (2) 之規定辦理。";

    expect(splitInlineListItems(source)).toEqual({
      markdown: source,
      inserted: 0,
    });
  });

  it("should ignore a two level section reference", () => {
    // Info: (20260814 - Emily) `2.2` 只有兩層，不是項目標記
    const source = "同盤查範圍，如 2.2 盤查範圍，另見 3.4 各類排放量計算細節。";

    expect(splitInlineListItems(source)).toEqual({
      markdown: source,
      inserted: 0,
    });
  });

  it("should ignore a standard number that looks dotted", () => {
    const source =
      "本公司透過 ISO 14064-1：2018 與 ISO 14064-3：2019 進行盤查與查證。";

    expect(splitInlineListItems(source)).toEqual({
      markdown: source,
      inserted: 0,
    });
  });

  it("should not break a checkbox or tick used as a value", () => {
    // Info: (20260814 - Emily) ☐ ☑ ✓ 也在符號對照表裡，但它們是值不是標記
    const source = "查證結果 ✓ 通過 ✓ 符合 ☐ 未適用 ☐ 待補";

    expect(splitInlineListItems(source)).toEqual({
      markdown: source,
      inserted: 0,
    });
  });

  it("should leave a bullet that is already at the start of its line", () => {
    const source = ["● 致力於溫室氣體盤查", "● 持續推動節能減碳措施"].join(
      "\n",
    );

    expect(splitInlineListItems(source)).toEqual({
      markdown: source,
      inserted: 0,
    });
  });

  it("should not break before an indented marker at the start of a line", () => {
    /**
     * Info: (20260814 - Emily) 切點的判準是「前面還有內容」而不是「offset > 0」。
     * 用 offset 判的話，縮排的項目符號會在自己前面斷一次，產出一個空白行。
     */
    const source = "  ● 甲 ● 乙";

    const result = splitInlineListItems(source);

    expect(result.inserted).toBe(1);
    expect(result.markdown.split("\n")).toEqual(["  ● 甲", "● 乙"]);
  });

  it("should not touch table rows", () => {
    const source = ["| 甲 | ● 乙 ● 丙 |", "| --- | --- |", "| 1 | 2 |"].join(
      "\n",
    );

    expect(splitInlineListItems(source)).toEqual({
      markdown: source,
      inserted: 0,
    });
  });

  it("should not touch fenced code", () => {
    const source = ["```", "● a ● b ● c", "```"].join("\n");

    expect(splitInlineListItems(source)).toEqual({
      markdown: source,
      inserted: 0,
    });
  });

  it("should be idempotent", () => {
    const source =
      "施。 1.5.2 盤查地址： ● 總公司：高雄市 ● 台北分公司：台北市 ● 屏東分公司：屏東縣";

    const once = splitInlineListItems(source);
    const twice = splitInlineListItems(once.markdown);

    expect(twice.inserted).toBe(0);
    expect(twice.markdown).toBe(once.markdown);
  });

  it("should count every inserted break", () => {
    const source = "前言 ● 甲 ● 乙 ● 丙";

    expect(splitInlineListItems(source).inserted).toBe(3);
  });
});

/**
 * Info: (20260814 - Emily) 兩支的順序：先補回換行，再把換行標成硬斷行。
 * 反過來沒有意義 —— `restoreLineStructure` 只能處理已經存在的換行。
 */
describe("splitInlineListItems + restoreLineStructure", () => {
  it("should turn one glued line into hard broken lines", () => {
    const source = "1.5.2 盤查地址： ● 總公司：高雄市 ● 台北分公司：台北市";

    const structured = restoreLineStructure(
      splitInlineListItems(source).markdown,
    );
    const lines = structured.split("\n");

    expect(lines).toHaveLength(3);
    // Info: (20260814 - Emily) 行尾兩空白 = markdown 的硬斷行，marked 與 remark 都認
    expect(lines[0].endsWith("  ")).toBe(true);
    expect(lines[1].endsWith("  ")).toBe(true);
    expect(lines[2].endsWith("  ")).toBe(false);
  });

  it("should leave the pipeline unchanged when nothing is glued", () => {
    const source = ["第一段。", "", "第二段。"].join("\n");

    expect(restoreLineStructure(splitInlineListItems(source).markdown)).toBe(
      restoreLineStructure(source),
    );
  });
});

/**
 * Info: (20260814 - Emily) 重複標籤與單層編號兩族（issue 35）。
 *
 * 素材是 59 頁實測件（`smssqthnc`）的實際內容 —— 1.4 節的委員會名單是那份
 * PDF 上唯一剩下的文字牆，而它正好緊鄰委員會架構圖（issue 34）。
 */
describe("splitInlineListItems 的重複標籤族", () => {
  it("should break before each 委員 in the 1.4 committee wall of text", () => {
    const source =
      "執行秘書: 陳廉佳、歐家安 委員: 人事部經理及課級主管 委員: 會計部經理及課級主管 委員: 總務部經理及課級主管 委員: 工安部經理及課級主管";

    const lines = splitInlineListItems(source).markdown.split("\n");

    expect(lines).toEqual([
      "執行秘書: 陳廉佳、歐家安",
      "委員: 人事部經理及課級主管",
      "委員: 會計部經理及課級主管",
      "委員: 總務部經理及課級主管",
      "委員: 工安部經理及課級主管",
    ]);
  });

  it("should not confuse 主任委員 with 副主任委員 or 委員", () => {
    // Info: (20260814 - Emily) 三個都以「委員」結尾，但它們是三個不同的標籤，各出現一次
    const source =
      "主任委員: 張印燈廠長 副主任委員: 陳豐仁副廠長 管理代表: 歐青銓 課長";

    expect(splitInlineListItems(source)).toEqual({
      markdown: source,
      inserted: 0,
    });
  });

  it("should ignore a label repeated only twice", () => {
    // Info: (20260814 - Emily) 標籤要 2 字以上才算 —— 用「註」會因為長度不足而
    // 根本不進判準，那條測試就會為了錯的理由通過（本檔第一版正是如此）
    const source = "備註: 第一點說明 備註: 第二點說明";

    expect(splitInlineListItems(source)).toEqual({
      markdown: source,
      inserted: 0,
    });
  });

  it("should not treat a single character label as a marker", () => {
    // Info: (20260814 - Emily) 一個字加冒號太容易誤中（「註:」「例:」「甲:」），
    // 所以標籤下限是 2 字。這條把那個下限釘住。
    const source = "註: 甲 註: 乙 註: 丙";

    expect(splitInlineListItems(source)).toEqual({
      markdown: source,
      inserted: 0,
    });
  });

  it("should not treat repeated clock hours as a label", () => {
    // Info: (20260814 - Emily) 純數字標籤不算 —— 這是時刻不是清單
    const source = "會議時段 10:30 至 10:45 與 10:50 各一場";

    expect(splitInlineListItems(source)).toEqual({
      markdown: source,
      inserted: 0,
    });
  });
});

describe("splitInlineListItems 的單層編號族", () => {
  it("should break the 第十一章 reference list", () => {
    const source =
      "1. 質量平衡法 2. 溫室氣體排放係數管理表 6.0.4 版（燃料熱值） 3. 溫室氣體排放係數管理表 6.0.4 版（逸散排放源） 4. 產品碳足跡資訊網";

    const lines = splitInlineListItems(source).markdown.split("\n");

    expect(lines).toEqual([
      "1. 質量平衡法",
      "2. 溫室氣體排放係數管理表 6.0.4 版（燃料熱值）",
      "3. 溫室氣體排放係數管理表 6.0.4 版（逸散排放源）",
      "4. 產品碳足跡資訊網",
    ]);
  });

  it("should not break a version number or a decimal", () => {
    /**
     * Info: (20260814 - Emily) `6.0.4` 的 `6.` 後面接數字，`(?!\d)` 就排除了；
     * `3.14` 同理。這一族最容易誤中的就是它們。
     */
    const source =
      "依 6.0.4 版計算，圓周率取 3.14，係數 1.05 與 2.5 皆四捨五入。";

    expect(splitInlineListItems(source)).toEqual({
      markdown: source,
      inserted: 0,
    });
  });

  it("should require the list to start at 1", () => {
    // Info: (20260814 - Emily) 不從 1 開始無法分辨「清單續段」與「散文裡剛好遞增的數字」
    const source = "見 2. 與 3. 以及 4. 之規定";

    expect(splitInlineListItems(source)).toEqual({
      markdown: source,
      inserted: 0,
    });
  });

  it("should require at least three items", () => {
    const source = "1. 第一項 2. 第二項";

    expect(splitInlineListItems(source)).toEqual({
      markdown: source,
      inserted: 0,
    });
  });

  it("should require the numbers to ascend", () => {
    const source = "1. 甲 3. 乙 2. 丙";

    expect(splitInlineListItems(source)).toEqual({
      markdown: source,
      inserted: 0,
    });
  });

  it("should not touch section numbering like 1.4", () => {
    // Info: (20260814 - Emily) `1.4` 的 `1.` 後面接 4，屬於 DOTTED 族的地盤
    const source = "1.4溫室氣體盤查推行委員會 架構圖 如下所示";

    expect(splitInlineListItems(source)).toEqual({
      markdown: source,
      inserted: 0,
    });
  });

  it("should stay idempotent with the two new families", () => {
    const source =
      "職責: 協助督導 委員: 人事部 委員: 會計部 委員: 總務部 1. 甲 2. 乙 3. 丙";

    const once = splitInlineListItems(source);
    const twice = splitInlineListItems(once.markdown);

    expect(once.inserted).toBeGreaterThan(0);
    expect(twice.inserted).toBe(0);
    expect(twice.markdown).toBe(once.markdown);
  });
});
