import { marked } from "marked";
import { escapeHtml } from "@/lib/utils/logistics_report_html";
import { stripMarkdownComments } from "@/lib/utils/markdown_comment";
import { stripHtmlLineBreaksOutsideFences } from "@/lib/utils/markdown_line_break";
import { escapeArithmeticEmphasis } from "@/lib/utils/markdown_arithmetic_safety";
import { restoreLineStructure } from "@/lib/utils/markdown_line_structure";
import { convertTimelineBlocksToTables } from "@/lib/utils/markdown_timeline_table";
import { replaceOfficeSymbolChars } from "@/lib/utils/office_symbol_chars";
import {
  CARBON_PDF_CHART_MAX_HEIGHT_MM,
  CARBON_PDF_FONT_STACK,
  CARBON_PDF_LANDSCAPE_MARGIN_MM,
  CARBON_PDF_PORTRAIT_MARGIN_MM,
  CARBON_PDF_TABLE_BASE_PT,
} from "@/constants/carbon_pdf";

/**
 * Info: (20260810 - Emily) 碳盤查報告 markdown → 可列印 HTML
 * (data/issue_drafts/inventory_table_import/17)。
 *
 * 版面對照客戶原始報告(data/高興昌鋼鐵…溫室氣體盤查報告書.pdf p.10-11):
 * 標籤欄寬、評分欄窄且等寬、全格線、表頭橫排置中、類別列橫跨整張表。
 * 使用者指定「請參考原本報告的排版」—— 那份文件才是查證人員讀的東西。
 *
 * 純函式:不碰 DOM、不啟動瀏覽器,因此可以在 jest 直接測。
 * 需要量測才能決定的事(哪張表塞不下要轉橫式)在 service 的頁內腳本裡做。
 */

const MERMAID_BLOCK =
  /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g;
const CELL = /<(t[hd])([^>]*)>([\s\S]*?)<\/\1>/g;
const ROW = /<tr>[\s\S]*?<\/tr>/g;
const TABLE = /<table>[\s\S]*?<\/table>/g;

/**
 * Info: (20260810 - Emily) 內容寬度以「全形算兩格」計。
 * 「3」與「員工參與」不該用同一把尺量 —— 用 length 會把四個中文字算成
 * 跟四個數字一樣短,於是文字欄被判成窄欄、鎖上 nowrap,表格直接撐爆。
 */
export const displayWidth = (text: string): number =>
  Array.from(text).reduce(
    (sum, char) => sum + (/[⺀-￿]/.test(char) ? 2 : 1),
    0,
  );

/** Info: (20260810 - Emily) 窄欄的內容寬度上限(約三個中文字) */
export const NARROW_MAX_DISPLAY_WIDTH = 6;

const textOf = (cellHtml: string): string =>
  cellHtml
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;/g, " ")
    .trim();

interface IParsedCell {
  tag: string;
  attrs: string;
  html: string;
  text: string;
}

const parseRow = (row: string): IParsedCell[] => {
  const cells: IParsedCell[] = [];
  CELL.lastIndex = 0;
  let match = CELL.exec(row);
  while (match !== null) {
    cells.push({
      tag: match[1],
      attrs: match[2],
      html: match[3],
      text: textOf(match[3]),
    });
    match = CELL.exec(row);
  }
  return cells;
};

/**
 * Info: (20260810 - Emily) 只有第一格有內容的列 = 原文的類別分隔列
 * (「類別二:輸入能源的間接溫室氣體排放量」橫跨整張表的那一條)。
 */
export const isGroupRow = (cells: readonly IParsedCell[]): boolean =>
  cells.length > 1 &&
  cells[0].text !== "" &&
  cells.slice(1).every((cell) => cell.text === "");

/**
 * Info: (20260810 - Emily) 依「整欄內容有多短」決定窄欄,而不是依欄位順序。
 *
 * 評分欄清一色是一到兩位數,標籤欄是整句中文 —— 差距大到不需要知道語意就分得出來,
 * 也因此換一份報告、換一種表格都還成立。
 * 窄欄之後會拿到 width:1%,多餘寬度全流向文字欄,這正是原文的比例。
 */
export const detectNarrowColumns = (rows: IParsedCell[][]): boolean[] => {
  const colCount = Math.max(0, ...rows.map((cells) => cells.length));
  const bodyRows = rows.filter(
    (cells) => cells.some((cell) => cell.tag === "td") && !isGroupRow(cells),
  );
  return Array.from({ length: colCount }, (unused, index) => {
    const values = bodyRows.map((cells) => cells[index]?.text ?? "");
    if (values.length === 0) return false;
    if (values.every((value) => value === "")) return false;
    return values.every(
      (value) => displayWidth(value) <= NARROW_MAX_DISPLAY_WIDTH,
    );
  });
};

/** Info: (20260810 - Emily) 為單一表格標上窄欄/文字欄與類別分隔列 */
export const annotateTable = (tableHtml: string): string => {
  const rawRows = tableHtml.match(ROW) ?? [];
  if (rawRows.length === 0) return tableHtml;

  const rows = rawRows.map(parseRow);
  const colCount = Math.max(0, ...rows.map((cells) => cells.length));
  const narrow = detectNarrowColumns(rows);

  const rendered = rows.map((cells) => {
    if (isGroupRow(cells)) {
      return `<tr class="group"><td colspan="${colCount}">${cells[0].html}</td></tr>`;
    }
    const inner = cells
      .map((cell, index) => {
        const className = narrow[index] ? "narrow" : "label";
        return `<${cell.tag} class="${className}"${cell.attrs}>${cell.html}</${cell.tag}>`;
      })
      .join("");
    return `<tr>${inner}</tr>`;
  });

  let cursor = 0;
  return tableHtml.replace(ROW, () => {
    const row = rendered[cursor];
    cursor += 1;
    return row;
  });
};

/**
 * Info: (20260811 - Luphia) 原生 HTML 一律**逸出成純文字**,不交給 Chrome 解析
 * (PR review 第 1 點)。
 *
 * 這是這條路徑的第一道防線,`stripActiveContent` 退居第二道。
 * 原本相反 —— marked 預設放行原生 HTML,再用 regex 追著清 —— 而 regex 清不乾淨:
 * 實測 `<img src=x onerror=alert(1)>`(屬性未加引號)完整存活到交給 Chrome 的 HTML 裡,
 * 而 `src=x` 是相對 URL,`sealNetwork` 把它 abort 正是引爆 `onerror` 的那一步。
 * 也就是說那兩層並不獨立:第二層的 abort 去引爆第一層的漏網之魚。
 *
 * 改成逸出而不是刪除,是為了與預覽一致:`MarkdownContent` 未啟用 rehype-raw,
 * react-markdown 把原生 HTML 當純文字印出(見 carbon_report_preview 的註解
 * 「嚴禁在內容層塞原生 HTML」)。逸出之後同一份 markdown 在預覽與列印看起來一樣,
 * 而「兩邊各寫一份的下場」這份 PR 自己在 sankey 別名那段已經說過一次。
 *
 * 代價要說清楚:報告若真的夾帶原生 HTML 表格,列印端從「畫成表格」變成
 * 「印出逸出後的文字」。但它在預覽裡本來就是逸出後的文字 ——
 * 這個改動讓兩邊一致,不是讓列印變差。
 */
marked.use({
  renderer: {
    html: ({ text }) => escapeHtml(text),
  },
});

/**
 * Info: (20260810 - Emily) 拔掉腳本與事件屬性。
 *
 * markdown 允許夾帶原始 HTML,而這份 HTML 會被交給**伺服器上的** Chrome 執行。
 * 報告內容雖然出自使用者自己的草稿,但「使用者能寫的東西會在伺服器的網路位置上執行」
 * 本身就是不該存在的能力(SSRF)。service 另外全面阻斷網路請求,兩層都做:
 * 這一層擋執行,那一層擋外連 —— 任一層失效時另一層仍成立。
 *
 * Info: (20260811 - Luphia) 上面的逸出接手之後,這一層的角色是**真正的第二道**:
 * 它擋的是「逸出萬一失效」,而不是唯一的防線。它清不掉未加引號的事件屬性
 * (見測試 `should document that unquoted handlers slip past this layer`),
 * 所以不能單獨成立 —— 保留是因為兩層仍比一層好,不是因為它夠用。
 */
export const stripActiveContent = (html: string): string =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<(script|iframe|object|embed|link)\b[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "");

const printStyle = (): string => {
  const portrait = CARBON_PDF_PORTRAIT_MARGIN_MM;
  const landscape = CARBON_PDF_LANDSCAPE_MARGIN_MM;
  return `
  @page portraitPage {
    size: A4 portrait;
    margin: ${portrait.top}mm ${portrait.right}mm ${portrait.bottom}mm ${portrait.left}mm;
  }
  @page landscapePage {
    size: A4 landscape;
    margin: ${landscape.top}mm ${landscape.right}mm ${landscape.bottom}mm ${landscape.left}mm;
  }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    page: portraitPage;
    margin: 0;
    font-family: ${CARBON_PDF_FONT_STACK};
    font-size: 10.5pt;
    line-height: 1.75;
    color: #1e293b;
  }
  h1, h2, h3, h4 { color: #0f172a; line-height: 1.4; margin: 1.4em 0 .5em; }
  h1 { font-size: 17pt; }
  h2 { font-size: 14pt; }
  h3 { font-size: 12pt; }
  h4 { font-size: 11pt; }
  /* 標題不可與其後內容分離：孤零零留在頁尾的節標題讀不出它在標什麼 */
  h1, h2, h3, h4 { break-after: avoid-page; page-break-after: avoid; }
  p, li { orphans: 2; widows: 2; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 1.6em 0; }
  a { color: #c2410c; text-decoration: none; }

  /* 表格版面對照客戶原始報告 p.10-11 */
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: auto;
    font-size: ${CARBON_PDF_TABLE_BASE_PT}pt;
    line-height: 1.45;
    margin: .8em 0;
  }
  /* 跨頁的表在每一頁重印表頭：沒有表頭的續頁讀不出那一欄是什麼 */
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
  /* 不可切割的單位是列，不是表：表格比一頁高是常態 */
  tr { break-inside: avoid; page-break-inside: avoid; }
  /* 全格線：查證時要能指著某一格說「這一格」 */
  th, td {
    border: 1px solid #94a3b8;
    padding: 3px 5px;
    vertical-align: middle;
    text-align: left;
    word-break: break-word;
  }
  th {
    background: #f1f5f9;
    color: #c2410c;
    font-weight: 600;
    text-align: center;
  }

  /*
   * 窄欄拿 width:1%，多餘寬度全流向文字欄 —— 這就是原文的比例：
   * 排放類別／排放項目佔掉大半，A~H 各佔一小條。
   */
  th.narrow, td.narrow { width: 1%; text-align: center; }
  /* 資料格不換行（「21」不該斷成兩行），表頭仍可換行（原文的 A.幅度(數量) 就是兩行） */
  td.narrow { white-space: nowrap; }
  /*
   * 欄寬下限以 em 而非 mm 表示 —— 縮字級才會跟著縮。
   * 寫死 mm 的話字縮小了欄寬下限不動，表格寬度根本不會變（縮字等於白縮）。
   * 4.2em 約三個中文字寬，6.5em 約五個：低於此中文開始逐字換行變直排。
   */
  th.narrow { white-space: normal; min-width: 4.2em; }
  th.label, td.label { min-width: 6.5em; }

  /* 類別列：原文是橫跨整張表的一條分隔列 */
  tr.group td {
    background: #f8fafc;
    font-weight: 600;
    text-align: center;
    color: #334155;
  }

  /* 塞不下直式頁的表改走橫式頁；由 service 量測後掛上 */
  .wide { page: landscapePage; }

  figure.chart {
    break-inside: avoid;
    page-break-inside: avoid;
    text-align: center;
    margin: 8mm 0;
  }
  figure.chart svg {
    max-width: 100%;
    max-height: ${CARBON_PDF_CHART_MAX_HEIGHT_MM}mm;
    height: auto;
  }
  figure.chart .chart-failed {
    color: #b45309;
    font-size: 9pt;
    border: 1px dashed #fbbf24;
    padding: 6px 10px;
  }
  pre.mermaid { text-align: center; }
  img { max-width: 100%; height: auto; }
  blockquote {
    margin: 1em 0;
    padding: .6em 1em;
    border-left: 3px solid #fb923c;
    background: #fff7ed;
    break-inside: avoid;
  }
  code { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: .9em; }

  /*
   * Info: (20260811 - Emily) 文件外殼(頁首／頁尾),對照預覽的 pdf_editor 版型。
   *
   * 各出現一次而不是每頁重印:預覽是一份連續文件,頁首在最上、頁尾在最下,
   * 逐頁重印會與使用者看到的不同。逐頁的那條資訊(報告名 + 頁碼)已由
   * page.pdf 的 displayHeaderFooter 負責,兩者不重疊。
   *
   * 深色底必須 break-inside: avoid —— 一條被切成兩頁的深色橫幅比沒有更難看。
   * 顏色以 rgb() 寫死而不用 Tailwind 的色票:這份 HTML 在 headless Chrome 裡
   * 沒有樣式表,而 oklch() 這類現代色彩空間在 html2canvas 那條路上炸過一次。
   */
  .doc-shell-header {
    display: flex; align-items: center; justify-content: space-between;
    background: rgb(17, 24, 39); color: rgb(255, 255, 255);
    padding: 6mm 8mm; margin: 0 0 7mm;
    break-inside: avoid; page-break-inside: avoid;
    break-after: avoid-page; page-break-after: avoid;
  }
  .doc-shell-header .brand {
    display: flex; align-items: center; gap: 3.5mm;
    font-size: 13pt; font-weight: 700; line-height: 1;
  }
  .doc-shell-header .brand img { height: 8mm; width: auto; }
  .doc-shell-header .brand-name {
    border-left: 0.3mm solid rgb(75, 85, 99); padding-left: 3.5mm;
  }
  .doc-shell-header .badge {
    border: 0.3mm solid rgb(147, 197, 253); border-radius: 20mm;
    background: rgb(30, 58, 95); color: rgb(147, 197, 253);
    padding: 1.2mm 3.5mm; font-size: 8pt; white-space: nowrap;
  }

  .doc-shell-meta {
    border-bottom: 0.3mm solid rgb(226, 232, 240);
    padding-bottom: 5mm; margin: 0 0 7mm;
    break-inside: avoid; page-break-inside: avoid;
    break-after: avoid-page; page-break-after: avoid;
  }
  .doc-shell-meta .tag {
    display: inline-block; background: rgb(255, 237, 213); color: rgb(194, 65, 12);
    font-size: 8pt; font-weight: 700; padding: 1mm 2mm; border-radius: 1mm;
  }
  .doc-shell-meta .line {
    margin: 2.5mm 0 0; font-size: 9pt; color: rgb(107, 114, 128);
  }
  .doc-shell-meta .dot { color: rgb(209, 213, 219); }
  .doc-shell-meta .doc-title { margin: 4mm 0 0; font-size: 16pt; }

  /* 頁尾整塊不可分頁,且必須與前文分開 —— 它是文件的結尾而不是一段內容 */
  .doc-shell-footer {
    border-top: 0.3mm solid rgb(255, 237, 213); background: rgb(255, 247, 237);
    padding: 9mm 8mm; margin: 10mm 0 0; text-align: center;
    break-inside: avoid; page-break-inside: avoid;
  }
  .doc-shell-footer h3 {
    margin: 0 0 2mm; font-size: 13pt; color: rgb(17, 24, 39);
  }
  .doc-shell-footer p {
    margin: 0 auto; max-width: 120mm; font-size: 9pt; color: rgb(75, 85, 99);
  }
`;
};

/**
 * Info: (20260810 - Emily) markdown → 完整的可列印 HTML 文件。
 *
 * mermaid 區塊只換成容器不在此渲染:mermaid 需要真的 DOM,
 * 而在 headless Chrome 裡畫出來的是**向量** SVG —— 這正是改走伺服端列印的理由之一。
 */
/**
 * Info: (20260811 - Emily) 下載的 PDF 要有預覽上那組頁首／頁尾
 * (Emily 2026-08-11:「下載的檔案補上 header 跟 footer」)。
 *
 * 文案由呼叫端傳入而不是在這裡寫死:預覽那組是 i18n
 * (`admin_mission_board.pdf_editor.*`),同一份文件在兩處各寫一份文案,
 * 遲早會一邊改一邊沒改 —— 這幾天追的多數問題都是這種兩端分歧。
 *
 * logo 以 data URL 傳入:列印時 `sealNetwork` 會擋掉所有非 data/about/blob 的請求
 * (SSRF 防護),`/isunfa_logo.svg` 這種相對路徑在無伺服器的頁面裡本來也取不到。
 * 沒有 logo 就只出品牌文字,不讓一個圖檔讓整份報告印不出來。
 */
export interface ICarbonReportShell {
  /** Info: (20260811 - Emily) 深色頁首左側的品牌字(預覽的 pdf_editor.brand) */
  brand: string;
  /** Info: (20260811 - Emily) 頁首右上的徽章(pdf_editor.internal_document) */
  internalDocument: string;
  /** Info: (20260811 - Emily) 內容上方的橘色標籤(pdf_editor.system_report) */
  systemReport: string;
  /** Info: (20260811 - Emily) 標籤下方那行的日期,呼叫端格式化(伺服端不知道使用者的地區設定) */
  issuedAt: string;
  /** Info: (20260811 - Emily) 頁尾標語(pdf_editor.footer_title) */
  footerTitle: string;
  /** Info: (20260811 - Emily) 頁尾版權句,`{{year}}` 已由呼叫端代入 */
  footerText: string;
  /** Info: (20260811 - Emily) iSunFA logo 的 data URL;取不到就省略 */
  logoDataUrl?: string;
  /** Info: (20260811 - Emily) 報告標題;省略即不印(內容自己的 h1 已足夠) */
  title?: string;
}

const SHELL_VENDOR = "iSunFA Enterprise Solutions";

const shellHeader = (shell: ICarbonReportShell): string =>
  [
    '<header class="doc-shell-header">',
    '<div class="brand">',
    shell.logoDataUrl
      ? `<img src="${escapeHtml(shell.logoDataUrl)}" alt="" />`
      : "",
    `<span class="brand-name">${escapeHtml(shell.brand)}</span>`,
    "</div>",
    `<span class="badge">${escapeHtml(shell.internalDocument)}</span>`,
    "</header>",
    '<section class="doc-shell-meta">',
    `<span class="tag">${escapeHtml(shell.systemReport)}</span>`,
    `<p class="line">${escapeHtml(SHELL_VENDOR)} <span class="dot">•</span> ${escapeHtml(shell.issuedAt)}</p>`,
    shell.title ? `<h1 class="doc-title">${escapeHtml(shell.title)}</h1>` : "",
    "</section>",
  ].join("");

const shellFooter = (shell: ICarbonReportShell): string =>
  [
    '<footer class="doc-shell-footer">',
    `<h3>${escapeHtml(shell.footerTitle)}</h3>`,
    `<p>${escapeHtml(shell.footerText)}</p>`,
    "</footer>",
  ].join("");

export const buildCarbonReportHtml = (
  markdown: string,
  shell?: ICarbonReportShell,
): string => {
  marked.setOptions({ gfm: true, breaks: false });
  /**
   * Info: (20260811 - Luphia) 先套上預覽層的兩道剝除,再交給 marked
   * (PR review 第 1 點的一部分)。
   *
   * `MarkdownContent` 顯示前做的是
   * `stripHtmlLineBreaksOutsideFences(stripMarkdownComments(content))`,
   * 而列印端原本收到的是未經處理的原文 —— 兩邊看到的輸入不是同一份。
   *
   * 這兩道不是為了安全,是為了**內容正確**:
   * - HTML 註解是段落錨點(carbon-data-table / carbon-chart / carbon-diagram),
   *   必須留在原文、只在顯示時隱藏;逸出之後若不剝除,錨點會變成 PDF 上的可見文字。
   * - `<br>` 是模型逐字照錄原文表格時用來表示折行的,同理。
   *
   * 兩支都是 fence-aware 的既有共用工具(有單元測試護住),程式碼區塊內原樣保留 ——
   * 使用者貼 HTML 教學範例時,fence 內的那些是內容而不是錨點。
   *
   * Info: (20260810 - Emily) 剝除之後才轉義乘號:轉義要看的是**最後交給 marked 的那份文字**,
   * 順序與 `MarkdownContent` 一致(comment → br → 乘號),兩端看到的輸入才是同一份。
   * 既有草稿是在轉義加入之前組成的,內容裡的乘號還是裸的;重新產生一份 46 頁的報告很貴,
   * 所以讀取端也擋一次 —— 函式是冪等的,重複套用無害。
   */
  const source = stripHtmlLineBreaksOutsideFences(
    stripMarkdownComments(markdown),
  );
  /**
   * Info: (20260811 - Emily) 既有草稿裡的 mermaid timeline 在此轉成表格。
   * 產表端已改成直接輸出表格,但既有草稿的 markdown 裡存著改動前產生的 timeline 區塊,
   * 不會因為產生器換了寫法就變 —— 實測那份 54 頁的下載仍是縮到 28% 的彩虹軸。
   * 轉換是決定性且冪等的,比重新產生整份報告便宜太多。
   */
  /**
   * Info: (20260811 - Emily) Word 私有區符號在此也換一次。
   *
   * 匯入端已經換了,但那只影響新匯入的報告 —— 既有草稿的 markdown 裡存著
   * 改動前抽取進來的 U+F06C,實測那份 54 頁的下載仍有 57 個空心方框
   * (p.3 與 p.18–24)。函式是冪等且不改長度的,兩端都套沒有代價。
   */
  let body = marked.parse(
    convertTimelineBlocksToTables(
      replaceOfficeSymbolChars(
        restoreLineStructure(escapeArithmeticEmphasis(source)),
      ),
    ),
    { async: false },
  ) as string;
  body = stripActiveContent(body);
  body = body.replace(
    MERMAID_BLOCK,
    (unused, source: string) =>
      `<figure class="chart"><pre class="mermaid">${source}</pre></figure>`,
  );
  body = body.replace(TABLE, (table) => annotateTable(table));

  return [
    '<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="utf-8">',
    `<style>${printStyle()}</style>`,
    "</head><body>",
    shell ? shellHeader(shell) : "",
    body,
    shell ? shellFooter(shell) : "",
    "</body></html>",
  ].join("");
};
