import { describe, it, expect } from "@jest/globals";
import {
  FRAMEWORK_ALIGNMENT_PHRASE,
  FRAMEWORK_DISCLAIMER_PHRASE,
} from "@/constants/carbon_report_framework";
import {
  annotateTable,
  buildCarbonReportHtml,
  displayWidth,
  stripActiveContent,
} from "@/lib/utils/carbon_report_html";

/**
 * Info: (20260810 - Emily) 版面判定(哪張表轉橫式)需要真的量測,不在這裡測 ——
 * 那部分由 tools/pdf_harness 在真實 Chromium 驗證。
 * 這裡測的是純字串處理:誰是窄欄、誰是類別列、腳本有沒有被拔掉。
 */
describe("displayWidth", () => {
  /**
   * Info: (20260810 - Emily) 全形算兩格。
   * 用 length 的話「員工參與」與「2317」一樣長,文字欄會被判成窄欄、
   * 鎖上 nowrap,表格直接撐爆 —— 這是判準的地基。
   */
  it("should count full-width characters as two units", () => {
    expect(displayWidth("2317")).toBe(4);
    expect(displayWidth("員工參與")).toBe(8);
    expect(displayWidth("")).toBe(0);
  });
});

describe("annotateTable", () => {
  const table = (rows: string[][], head: string[]) =>
    `<table><thead><tr>${head
      .map((cell) => `<th>${cell}</th>`)
      .join("")}</tr></thead><tbody>${rows
      .map(
        (row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`,
      )
      .join("")}</tbody></table>`;

  it("should mark score columns narrow and text columns label", () => {
    const html = annotateTable(
      table(
        [["類別二：輸入能源的間接溫室氣體排放量", "2.1 外購電力", "2", "21"]],
        ["排放類別", "排放項目", "A.幅度(數量)", "各項評分加總"],
      ),
    );
    const classes = Array.from(html.matchAll(/<td class="(\w+)"/g)).map(
      (match) => match[1],
    );
    expect(classes).toEqual(["label", "label", "narrow", "narrow"]);
  });

  /**
   * Info: (20260810 - Emily) 只有第一格有內容的列 = 客戶原始報告的類別分隔列
   * (橫跨整張表的那一條)。
   */
  it("should collapse a single-cell row into a full-width group row", () => {
    const html = annotateTable(
      table(
        [
          ["類別二：輸入能源的間接溫室氣體排放量", "", "", ""],
          ["2.1 外購電力", "外購電力", "2", "21"],
        ],
        ["排放類別", "排放項目", "A", "合計"],
      ),
    );
    expect(html).toContain('<tr class="group"><td colspan="4">');
    expect(html.match(/<tr class="group"/g)).toHaveLength(1);
  });

  /**
   * Info: (20260810 - Emily) 類別列不能參與窄欄判定 ——
   * 它第二欄以後都是空字串,會把真正的文字欄拉成「整欄都很短」。
   */
  it("should ignore group rows when deciding narrow columns", () => {
    const html = annotateTable(
      table(
        [
          ["類別三：運輸產生的間接溫室氣體排放", "", ""],
          ["3.1 上游運輸", "產品運輸（海）", "8"],
        ],
        ["排放類別", "排放項目", "合計"],
      ),
    );
    const classes = Array.from(html.matchAll(/<td class="(\w+)"/g)).map(
      (match) => match[1],
    );
    expect(classes.slice(-3)).toEqual(["label", "label", "narrow"]);
  });

  it("should leave a table without rows untouched", () => {
    expect(annotateTable("<table></table>")).toBe("<table></table>");
  });
});

describe("stripActiveContent", () => {
  /**
   * Info: (20260810 - Emily) 這份 HTML 會在**伺服器上的** Chrome 裡被載入,
   * 所以使用者能寫進 markdown 的原始 HTML 不能帶有可執行的東西(SSRF)。
   * service 另外全面阻斷網路請求 —— 兩層都做,任一層失效時另一層仍成立。
   */
  it("should remove scripts, frames and inline handlers", () => {
    const dirty =
      '<p onclick="steal()">x</p><script>fetch("http://internal")</script>' +
      '<iframe src="http://internal"></iframe><a href="javascript:alert(1)">y</a>';
    const clean = stripActiveContent(dirty);
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("<iframe");
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("javascript:");
    expect(clean).toContain("<p>x</p>");
  });

  /**
   * Info: (20260811 - Luphia) 這一層清不掉未加引號的事件屬性 —— 記錄它的**極限**
   * (PR review 第 1 點)。
   *
   * 上面那支測的是帶引號的 `onclick="…"`,剛好是 regex 處理得到的形狀。
   * 未加引號的形狀 regex 抓不到,所以這一層不能是唯一的防線:
   * 真正擋住它的是 `buildCarbonReportHtml` 的逸出(見該區塊的測試)。
   *
   * 這支測試不是在為缺陷背書,而是釘住「為什麼需要逸出那一層」——
   * 哪天有人想拿掉逸出、只留這一層,這裡寫著它擋不住什麼。
   */
  it("should document that unquoted handlers slip past this layer", () => {
    expect(stripActiveContent("<img src=x onerror=alert(1)>")).toContain(
      "onerror=alert(1)",
    );
  });
});

describe("buildCarbonReportHtml", () => {
  it("should turn a mermaid fence into a chart container, not a code block", () => {
    const html = buildCarbonReportHtml(
      "# 標題\n\n```mermaid\nflowchart LR\nA-->B\n```\n",
    );
    expect(html).toContain('<figure class="chart"><pre class="mermaid">');
    expect(html).not.toContain("language-mermaid");
  });

  /**
   * Info: (20260810 - Emily) 這三條規則是伺服端列印的全部意義所在:
   * html2canvas 一條都不執行,而它們正是「列不被切一半、跨頁重印表頭」的來源。
   */
  it("should carry the print rules the raster path could never honour", () => {
    const html = buildCarbonReportHtml("內文");
    expect(html).toContain("display: table-header-group");
    expect(html).toContain("break-inside: avoid");
    expect(html).toContain("@page landscapePage");
  });

  it("should render gfm tables with column classes", () => {
    const html = buildCarbonReportHtml(
      "| 排放項目 | 合計 |\n| --- | --- |\n| 外購電力 | 21 |\n",
    );
    expect(html).toContain('<td class="label">外購電力</td>');
    expect(html).toContain('<td class="narrow">21</td>');
  });

  /**
   * Info: (20260811 - Luphia) 原生 HTML 逸出成純文字 —— 這是第一道防線
   * (PR review 第 1 點)。
   *
   * 未加引號的事件屬性是 `stripActiveContent` 的漏網之魚(見該區塊的測試),
   * 而 `sealNetwork` 把 `src=x` 這種相對 URL abort 掉,正是引爆 `onerror` 的那一步 ——
   * 兩層並不獨立。逸出讓它從一開始就不是標籤,漏網與引爆都失去對象。
   */
  it("should escape raw html instead of handing it to Chrome", () => {
    const html = buildCarbonReportHtml("內文 <img src=x onerror=alert(1)> 尾");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).not.toContain("<img src=x");
  });

  /**
   * Info: (20260811 - Luphia) 與預覽看到同一份輸入。
   *
   * 段落錨點是 HTML 註解,必須留在原文、只在顯示時隱藏;逸出之後若不剝除,
   * 它會變成 PDF 上的可見文字。`<br>` 同理(模型照錄原文表格的折行)。
   * `MarkdownContent` 顯示前做的就是這兩道,列印端原本一道都沒做。
   */
  it("should strip anchors and line breaks the preview also strips", () => {
    const html = buildCarbonReportHtml(
      "<!-- carbon-diagram:MILESTONE_TIMELINE:start -->\n\n第一行<br>第二行\n",
    );
    expect(html).not.toContain("carbon-diagram");
    expect(html).not.toContain("&lt;br&gt;");
    expect(html).toContain("第一行第二行");
  });

  /**
   * Info: (20260811 - Luphia) 程式碼區塊內原樣保留 —— 使用者貼 HTML 教學範例時,
   * fence 內的註解與 `<br>` 是內容而不是錨點,吃掉它就是靜默改寫他的文件。
   * 兩支剝除工具本身是 fence-aware 的,這支測試釘住「接上來之後仍然是」。
   */
  it("should leave fenced html untouched", () => {
    const html = buildCarbonReportHtml("```html\n<!-- keep -->\n<br>\n```\n");
    expect(html).toContain("&lt;!-- keep --&gt;");
    expect(html).toContain("&lt;br&gt;");
  });
});

/**
 * Info: (20260812 - Emily) 目錄項目的文字被二次逸出(PR review 第 1 點)。
 *
 * `collectHeadings` 讀的是 marked 產出的 HTML(已逸出),`tocSection` 再逸出一次
 * 就成了 `&amp;amp;`。而同一份文字也是頁碼比對用的 needle,
 * PDF 文字層裡是 `&` —— 永遠對不上,那一條會留白,
 * 而留白的語意是「這一節不在文件裡」。
 */
describe("目錄項目的逸出", () => {
  const shell = {
    brand: "b",
    internalDocument: "i",
    systemReport: "s",
    issuedAt: "d",
    footerTitle: "f",
    footerText: "t",
    tocTitle: "目錄",
  };

  /**
   * Info: (20260812 - Emily) 樣本從 `#` 換成 `##`。
   *
   * 文件級 H1 現在會被 `stripLeadingDocumentTitle` 剝掉（報告名稱改走
   * `shell.title`，見 `issue_drafts/open/24`），所以拿 `#` 當樣本的話
   * 這條測的會是「被剝掉的東西沒進目錄」而不是逸出本身。
   * 換成 `##` —— 那也是報告實際會出現的層級（`buildSectionHeadingByTitle`
   * 產出的是 `###`，章標題是 `##`），不變式沒變，只是樣本選對。
   */
  it("should escape the heading text exactly once", () => {
    const html = buildCarbonReportHtml("## 排放 & 移除 < >\n\n內文\n", shell);
    const text = /<span class="toc-text">([^<]*)<\/span>/.exec(html)?.[1];

    expect(text).toBe("排放 &amp; 移除 &lt; &gt;");
    expect(text).not.toContain("&amp;amp;");
  });
});

/**
 * Info: (20260812 - Emily) 轉換之間的互相干擾。
 *
 * 這些是**跨轉換**的案例,而每一支工具自己的測試只餵自己構造的理想輸入 ——
 * 這批 bug 的形狀全部是「A 的輸出被 B 誤判」,所以驗收必須走完整條管線。
 */
describe("buildCarbonReportHtml transform ordering", () => {
  /**
   * Info: (20260812 - Emily) timeline → 表格是「內容搬家」:
   * 搬出圍籬的算式沒有被逸出過。若逸出先跑,那些星號就裸露在 prose 裡被
   * marked 當成強調吃掉 —— `2*300*4` 變成 `23004`,三個數字合併成一個。
   */
  it("should keep multiplication signs that come out of a timeline fence", () => {
    const html = buildCarbonReportHtml(
      ["```mermaid", "timeline", "  2020 : 產能 2*300*4 噸", "```"].join("\n"),
    );

    expect(html).toContain("2*300*4");
    expect(html).not.toContain("<em>300</em>");
  });

  // Info: (20260812 - Emily) 圍籬外的算式本來就該受保護,一起釘住避免修法只顧一邊
  it("should keep multiplication signs written in prose", () => {
    const html = buildCarbonReportHtml("排放量 = 0.6*200*248 公噸");

    expect(html).toContain("0.6*200*248");
    expect(html).not.toContain("<em>200</em>");
  });
});

/**
 * Info: (20260814 - Emily) 查證用的識別欄位（issue 24）。
 *
 * 這一區的存在理由是「查證單位無法從內容推導」，所以它必須是外殼的一部分，
 * 而且**沒填的欄位也要印出來** —— 藏起來的話「不適用」與「忘了填」同形。
 */
describe("buildCarbonReportHtml 的識別欄位", () => {
  const shell = {
    brand: "陽光智能碳會計",
    internalDocument: "內部文件",
    systemReport: "系統報告",
    issuedAt: "2026/8/14",
    footerTitle: "用人工智能重塑碳會計",
    footerText: "© 2026 iSunFA.",
  };

  it("should print every field it is given, in the order given", () => {
    const html = buildCarbonReportHtml("## 一節\n\n內容。", {
      ...shell,
      title: "高興昌鋼鐵股份有限公司 2023 溫室氣體盤查報告書",
      identity: [
        { label: "盤查年度", value: "2023" },
        { label: "製作單位", value: "溫室氣體盤查推行委員會" },
        { label: "查證單位", value: "亞瑞仕國際驗證股份有限公司" },
        { label: "更新日期", value: "2026-08-14" },
      ],
    });

    const labels = [...html.matchAll(/<dt>([^<]+)<\/dt>/g)].map((m) => m[1]);
    expect(labels).toEqual(["盤查年度", "製作單位", "查證單位", "更新日期"]);
    expect(html).toContain("<dd>亞瑞仕國際驗證股份有限公司</dd>");
  });

  it("should still print a field whose value is a placeholder", () => {
    // Info: (20260814 - Emily) 這是本區最重要的一條:空著但看得見,才會有人去填
    const html = buildCarbonReportHtml("## 一節\n\n內容。", {
      ...shell,
      identity: [
        { label: "查證單位", value: "未填寫" },
        { label: "更新日期", value: "未填寫" },
      ],
    });

    expect(html).toContain("<dt>查證單位</dt><dd>未填寫</dd>");
    expect([...html.matchAll(/<dt>/g)]).toHaveLength(2);
  });

  it("should omit the block entirely when identity is absent or empty", () => {
    // Info: (20260814 - Emily) 公開分享頁那種場合不需要識別資訊
    const absent = buildCarbonReportHtml("## 一節\n\n內容。", shell);
    const empty = buildCarbonReportHtml("## 一節\n\n內容。", {
      ...shell,
      identity: [],
    });

    /**
     * Info: (20260814 - Emily) 比對元素而不是字串:`.doc-identity` 的樣式一直在
     * `<style>` 裡（樣式表是靜態的），拿整份 HTML 找 "doc-identity" 會永遠命中。
     */
    expect(absent).not.toContain('<dl class="doc-identity">');
    expect(empty).not.toContain('<dl class="doc-identity">');
  });

  it("should escape the values, they come from user input", () => {
    const html = buildCarbonReportHtml("## 一節\n\n內容。", {
      ...shell,
      identity: [
        { label: "查證單位", value: '<img src=x onerror="alert(1)">' },
      ],
    });

    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x");
  });

  it("should sit inside the meta banner rather than on a page of its own", () => {
    /**
     * Info: (20260814 - Emily) 票上已判定不做整頁封面:導覽由目錄涵蓋、
     * 識別由橫幅涵蓋,再加一頁是多一頁不是多一份資訊。
     * 所以這一區必須在 doc-shell-meta 裡面,而且不能帶 break-after。
     */
    const html = buildCarbonReportHtml("## 一節\n\n內容。", {
      ...shell,
      identity: [{ label: "盤查年度", value: "2023" }],
    });

    const meta = html.slice(
      html.indexOf('<section class="doc-shell-meta">'),
      html.indexOf("</section>"),
    );
    expect(meta).toContain('<dl class="doc-identity">');
  });
});

describe("揭露框架的聲明行(#6688-C)", () => {
  /**
   * Info: (20260904 - Emily) 這一組是紙面配對的**主守衛**。
   *
   * 分流表條 3(印了對齊卻缺免責)在 PDF 出口已翻成 BLOCK,而它只在配對壞掉時才叫 ——
   * 也就是說它是這裡的下游。上游要有測試釘住「兩行一起、順序不變、緊鄰」,
   * 否則配對壞掉的第一個症狀會是一份被擋住的 PDF,而不是一條紅測試。
   *
   * 字串取自常數而不是寫字面值:印出的與驗收比對的必須是同一份來源,
   * 而寫字面值也會讓這個檔案被 outline 掃描判定為「宣告 IFRS」。
   */
  const shell = {
    brand: "b",
    internalDocument: "i",
    systemReport: "s",
    issuedAt: "d",
    footerTitle: "f",
    footerText: "t",
  };

  it("兩句一起印、順序不變、而且緊鄰", () => {
    const html = buildCarbonReportHtml("## 一節\n\n內容。", {
      ...shell,
      claims: [FRAMEWORK_ALIGNMENT_PHRASE, FRAMEWORK_DISCLAIMER_PHRASE],
    });
    const block = html.slice(
      html.indexOf('<section class="doc-claims">'),
      html.indexOf("</section>", html.indexOf('<section class="doc-claims">')),
    );
    expect(block).toContain(FRAMEWORK_ALIGNMENT_PHRASE);
    expect(block).toContain(FRAMEWORK_DISCLAIMER_PHRASE);
    expect(block.indexOf(FRAMEWORK_ALIGNMENT_PHRASE)).toBeLessThan(
      block.indexOf(FRAMEWORK_DISCLAIMER_PHRASE),
    );
    // Info: (20260904 - Emily) 之間只能有段落標籤 —— 中間插任何內容就不是一組了
    const between = block.slice(
      block.indexOf(FRAMEWORK_ALIGNMENT_PHRASE) +
        FRAMEWORK_ALIGNMENT_PHRASE.length,
      block.indexOf(FRAMEWORK_DISCLAIMER_PHRASE),
    );
    expect(between).toBe("</p><p>");
  });

  it("沒有聲明行時整區不印(空陣列與省略都算)", () => {
    /**
     * Info: (20260904 - Emily) 比對元素不比對字串:`.doc-claims` 的樣式一直在
     * `<style>` 裡,拿整份 HTML 找 "doc-claims" 會永遠命中(識別欄位那條的同一個坑)。
     */
    expect(buildCarbonReportHtml("## 一節\n\n內容。", shell)).not.toContain(
      '<section class="doc-claims">',
    );
    expect(
      buildCarbonReportHtml("## 一節\n\n內容。", { ...shell, claims: [] }),
    ).not.toContain('<section class="doc-claims">');
  });

  it("聲明行在文件外殼的 meta 區裡,不是另外一頁", () => {
    // Info: (20260904 - Emily) 與識別欄位同一個判準:不做整頁封面
    const html = buildCarbonReportHtml("## 一節\n\n內容。", {
      ...shell,
      claims: [FRAMEWORK_ALIGNMENT_PHRASE, FRAMEWORK_DISCLAIMER_PHRASE],
    });
    const meta = html.slice(
      html.indexOf('<section class="doc-shell-meta">'),
      html.lastIndexOf("</section>"),
    );
    expect(meta).toContain('<section class="doc-claims">');
  });

  it("逸出:聲明行也走 escapeHtml(來源是常數,但這一層不假設)", () => {
    const html = buildCarbonReportHtml("## 一節\n\n內容。", {
      ...shell,
      claims: ['<img src=x onerror="alert(1)">'],
    });
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
  });
});
