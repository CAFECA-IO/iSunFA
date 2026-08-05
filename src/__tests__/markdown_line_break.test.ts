// Info: (20260804 - Tzuhan) `<br>` 清除:一份實作、兩個呼叫端(表3.8 解析層 + markdown 顯示層)。
// Info: (20260804 - Tzuhan) 存下來的原文一字不改 —— 逐字照錄的合約不能因為顯示不好看就打折。

import { describe, it, expect } from "@jest/globals";
import {
  hasHtmlLineBreaks,
  stripHtmlLineBreaks,
  stripHtmlLineBreaksOutsideFences,
} from "@/lib/utils/markdown_line_break";

describe("stripHtmlLineBreaks", () => {
  /**
   * Info: (20260804 - Tzuhan) 中文折行沒有空白,補了會變成「工業 冷 凍」。
   * 這是實測畫面上真的出現過的儲存格。
   */
  it("中日韓字元之間不補空白", () => {
    expect(stripHtmlLineBreaks("工業<br>冷<br>凍、<br>冷藏<br>裝<br>備")).toBe(
      "工業冷凍、冷藏裝備",
    );
  });

  // Info: (20260804 - Tzuhan) 拉丁文的折行本來就發生在空白處,不補就黏成一個字
  it("非中日韓字元之間補一個空白", () => {
    expect(stripHtmlLineBreaks("Total<br>emissions")).toBe("Total emissions");
  });

  it("全形標點與中文之間不補空白", () => {
    expect(stripHtmlLineBreaks("HFC-134a/R-134a，<br>四氟乙烷")).toBe(
      "HFC-134a/R-134a，四氟乙烷",
    );
  });

  /**
   * Info: (20260804 - Tzuhan) 折行落在數字中間是 PDF 表格的常態,而這是最貴的一種:
   * 補了空白就解不出數字、對不到子代碼,整列被丟掉且無聲。
   */
  it("數字與子代碼中間的折行不補空白", () => {
    expect(stripHtmlLineBreaks("1.<br>1 固定式燃燒")).toBe("1.1 固定式燃燒");
    expect(stripHtmlLineBreaks("2,775.<br>6475")).toBe("2,775.6475");
  });

  it("兩個獨立數字之間仍補空白(兩側都是 ASCII 英數)", () => {
    expect(stripHtmlLineBreaks("24<br>0.5")).toBe("24 0.5");
  });

  /**
   * Info: (20260804 - Tzuhan) 已知代價:拉丁字接中文會少一個空白。
   * 那是外觀問題,上面幾條是資料問題 —— 兩者不對等,故選這一邊。
   */
  it("拉丁字接中文會黏起來(已知取捨,不是遺漏)", () => {
    expect(stripHtmlLineBreaks("R-410a<br>冷媒")).toBe("R-410a冷媒");
  });

  it("三種寫法都認(大小寫不拘)", () => {
    expect(stripHtmlLineBreaks("a<br>b<BR/>c<br />d")).toBe("a b c d");
  });

  /**
   * Info: (20260804 - Tzuhan) 不做空白收斂:markdown 行尾兩個空白等同換行,
   * 全域收斂會改變渲染結果 —— 那是另一種靜默改寫。
   */
  it("不收斂既有的連續空白", () => {
    expect(stripHtmlLineBreaks("結尾  ")).toBe("結尾  ");
  });

  it("沒有標籤時原樣回傳", () => {
    expect(stripHtmlLineBreaks("(1) 總公司")).toBe("(1) 總公司");
  });

  it("hasHtmlLineBreaks 可重複呼叫(帶 /g 的 test 會記住 lastIndex)", () => {
    expect(hasHtmlLineBreaks("a<br>b")).toBe(true);
    expect(hasHtmlLineBreaks("a<br>b")).toBe(true);
    expect(hasHtmlLineBreaks("純文字")).toBe(false);
  });
});

describe("stripHtmlLineBreaksOutsideFences", () => {
  /**
   * Info: (20260804 - Tzuhan) 跳過程式碼區塊的理由與註解剝除完全相同:
   * 使用者貼 HTML 教學範例時,fence 內的 `<br>` 是內容,吃掉它就是靜默改寫他的文件。
   */
  it("程式碼區塊內的 <br> 原樣保留", () => {
    const content = ["段落<br>文字", "```html", "<p>換行:<br></p>", "```"].join(
      "\n",
    );
    const result = stripHtmlLineBreaksOutsideFences(content);
    expect(result).toContain("段落文字");
    expect(result).toContain("<p>換行:<br></p>");
  });

  it("表格儲存格內的 <br> 清掉", () => {
    const content = "| 工業<br>冷<br>凍 | 0.4375 |";
    expect(stripHtmlLineBreaksOutsideFences(content)).toBe(
      "| 工業冷凍 | 0.4375 |",
    );
  });

  it("沒有標籤時回傳同一個字串(不必重建)", () => {
    const content = "| 排放源 | 排放量 |";
    expect(stripHtmlLineBreaksOutsideFences(content)).toBe(content);
  });
});
