import { marked } from "marked";
import { escapeHtml } from "@/lib/utils/logistics_report_html";
import { escapeArithmeticEmphasis } from "@/lib/utils/markdown_arithmetic_safety";
import { restoreLineStructure } from "@/lib/utils/markdown_line_structure";
import { splitInlineListItems } from "@/lib/utils/markdown_list_structure";
import { convertTimelineBlocksToTables } from "@/lib/utils/markdown_timeline_table";
import { replaceOfficeSymbolChars } from "@/lib/utils/office_symbol_chars";
import { padAllTableHeaders } from "@/lib/utils/markdown_table_columns";
import { prepareCarbonMarkdown } from "@/lib/utils/carbon_markdown_prepare";
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
  /*
   * Info: (20260814 - Emily) 識別欄位(issue 24)。兩欄自動排,四項就是 2x2;
   * 欄數用 auto-fit 而不是寫死 2,因為省略某一項時剩三項也要排得好看。
   * break-inside 讓這塊不會被分頁切開 —— 識別資訊斷成兩頁沒有意義。
   */
  .doc-identity {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(60mm, 1fr));
    gap: 2mm 6mm; margin: 5mm 0 0; font-size: 9pt;
    break-inside: avoid; page-break-inside: avoid;
  }
  .doc-identity dt {
    color: rgb(107, 114, 128); font-size: 8pt; margin: 0 0 0.5mm;
  }
  .doc-identity dd { margin: 0; color: rgb(15, 23, 42); font-weight: 600; }

  /*
   * Info: (20260812 - Emily) 目錄。整塊自成一頁：目錄橫跨兩頁而中間夾著正文
   * 會讓人以為目錄結束了。項目用 flex 讓引導點自動撐開，頁碼靠右對齊。
   */
  .doc-toc { break-after: page; page-break-after: always; margin: 0 0 6mm; }
  .doc-toc-title { font-size: 14pt; margin: 0 0 4mm; color: rgb(15, 23, 42); }
  .doc-toc-list { list-style: none; margin: 0; padding: 0; font-size: 10pt; }
  .doc-toc-list li { margin: 0 0 1.6mm; break-inside: avoid; }
  .doc-toc-list a {
    display: flex; align-items: baseline; gap: 1.5mm;
    color: rgb(30, 41, 59); text-decoration: none;
  }
  .doc-toc-list .toc-dots {
    flex: 1 1 auto; border-bottom: 0.2mm dotted rgb(148, 163, 184);
    transform: translateY(-1mm);
  }
  /* 頁碼欄寬固定：填 1~3 位數都不會讓那一行重新換行（見 TOC_PAGE_PLACEHOLDER） */
  .doc-toc-list .toc-page {
    flex: 0 0 auto; min-width: 9mm; text-align: right;
    font-variant-numeric: tabular-nums; color: rgb(71, 85, 105);
  }
  .doc-toc-list li.lv2 { padding-left: 5mm; }
  .doc-toc-list li.lv3 { padding-left: 10mm; font-size: 9.5pt; }

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
  /**
   * Info: (20260814 - Emily) 查證用的識別欄位
   * (`data/issue_drafts/open/24_report_identity_fields.md`)。
   *
   * 盤查年度／製作單位／查證單位／更新日期 —— 原始報告都有，我們都沒有。
   * 其中查證單位**無法從內容推導**，盤查年度雖然推得出來但抽錯的代價是封面寫錯年度。
   *
   * ## 為什麼是 label/value 陣列而不是四個具名欄位
   *
   * 文案與「沒填要印什麼」都由呼叫端決定,與本檔既有的 brand／systemReport
   * 同一個立場(見檔頭:文案由呼叫端傳入而不是在這裡寫死)。
   * 這支不知道使用者的語言,也不該替它決定「未填寫」三個字怎麼寫。
   *
   * ## 為什麼沒填的欄位也要印
   *
   * 藏起來的話,「這一項不適用」與「我們忘了填」在紙上完全同形 ——
   * 而讀這份文件的是查證單位。空著但看得見,才會有人去填它。
   * 這與目錄頁碼找不到就留白、圖畫不出來也要說是同一個判準。
   *
   * 省略整個欄位即不印這一區(例如公開分享頁那種不需要識別資訊的場合)。
   */
  identity?: ReadonlyArray<{ readonly label: string; readonly value: string }>;
  /** Info: (20260812 - Emily) 目錄抬頭;省略即不印目錄 */
  tocTitle?: string;
}

const SHELL_VENDOR = "iSunFA Enterprise Solutions";

/**
 * Info: (20260812 - Emily) 下載的報告要有可點的目錄，而且每一條要標頁碼
 * (Emily 2026-08-12)。應用程式裡已經有章節目錄，缺的是 PDF 這一份。
 *
 * 只收 h1~h3。h4 以下是節內的小標，收進來會讓一份 33 節的報告變成上百條，
 * 目錄本身就要好幾頁 —— 目錄的用途是定位章節，不是重述全文。
 */
const TOC_HEADING = /<(h[123])([^>]*)>([\s\S]*?)<\/\1>/g;

/**
 * Info: (20260812 - Emily) 頁碼欄位**先佔位再填數字**。
 *
 * 這是這個做法的關鍵：目錄的高度在第一次排版時就已經是最終高度，
 * 之後只把佔位符換成數字。若等量完頁碼才插入目錄，目錄本身會把後面的內容往後推，
 * 頁碼跟著全錯，就得反覆排版到收斂 —— 而收斂與否沒有保證。
 * **真正的護欄是 `.toc-page { min-width: 9mm }`**，不是佔位符的字元寬度
 * （PR review 指出）：10pt 下 3 位數約 4.4mm，遠小於 9mm，所以佔位符與 1~3 位數
 * 的量測寬度都被 min-width 吃掉。佔位符只讓沒有頁碼的那條不塌陷。
 * 動了 min-width，這個保證就會無聲失效。
 */
export const TOC_PAGE_PLACEHOLDER = "\u2007\u2007\u2007";

const slugForIndex = (index: number): string => `carbon-sec-${index}`;

/**
 * Info: (20260812 - Emily) 目錄項目的文字要**解一次逸出**再存起來(PR review 第 1 點)。
 *
 * `collectHeadings` 讀的是 marked 產出的 HTML,裡面的 `&` 已經是 `&amp;`;
 * `tocSection` 再逸出一次就成了 `&amp;amp;`,畫面上印出字面的 `&amp;`。
 * 第二層後果更嚴重:同一份文字也是 `fillTocPageNumbers` 的比對用字,
 * 而產出的 PDF 文字層裡是 `&` —— 永遠對不上,那一條會留白,
 * 而留白的語意是「這一節不在文件裡」。
 *
 * 解在這裡而不是把 `tocSection` 的 `escapeHtml` 拿掉:
 * entries 要的本來就是原始字,輸出面的逸出是該有的防護,兩者都要留。
 */
const HTML_ENTITY: Readonly<Record<string, string>> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};
const decodeEntities = (text: string): string =>
  text.replace(
    /&(?:amp|lt|gt|quot|#39);/g,
    (entity) => HTML_ENTITY[entity] ?? entity,
  );

export interface ICarbonTocEntry {
  /** Info: (20260812 - Emily) 錨點 id，同時是 PDF 內部連結的目標 */
  id: string;
  /** Info: (20260812 - Emily) 標題純文字，服務端據此在產出的 PDF 裡找它落在第幾頁 */
  text: string;
  level: number;
}

/**
 * Info: (20260812 - Emily) 給標題掛 id 並取出目錄項目。
 * 已經有 id 的標題不覆蓋 —— 那可能是別處掛上去的錨點。
 */
export const collectHeadings = (
  body: string,
): { body: string; entries: ICarbonTocEntry[] } => {
  const entries: ICarbonTocEntry[] = [];
  let index = 0;
  const next = body.replace(
    TOC_HEADING,
    (whole, tag: string, attrs: string, inner: string) => {
      const text = decodeEntities(inner.replace(/<[^>]+>/g, "")).trim();
      if (text === "") return whole;
      index += 1;
      const id = slugForIndex(index);
      entries.push({ id, text, level: Number(tag.slice(1)) });
      const withId = /\bid=/.test(attrs) ? attrs : `${attrs} id="${id}"`;
      return `<${tag}${withId}>${inner}</${tag}>`;
    },
  );
  return { body: next, entries };
};

/**
 * Info: (20260812 - Emily) 目錄區塊。項目是 `<a href="#id">`，
 * Chrome 的 page.pdf 會把它輸出成真的 PDF 內部連結（點了會跳），預覽端也天然可點。
 */
const tocSection = (
  entries: readonly ICarbonTocEntry[],
  title: string,
): string =>
  entries.length === 0
    ? ""
    : [
        '<nav class="doc-toc">',
        `<h2 class="doc-toc-title">${escapeHtml(title)}</h2>`,
        '<ol class="doc-toc-list">',
        ...entries.map(
          (entry) =>
            `<li class="lv${entry.level}"><a href="#${entry.id}">` +
            `<span class="toc-text">${escapeHtml(entry.text)}</span>` +
            `<span class="toc-dots"></span>` +
            `<span class="toc-page" data-target="${entry.id}">${TOC_PAGE_PLACEHOLDER}</span>` +
            "</a></li>",
        ),
        "</ol>",
        "</nav>",
      ].join("");

/**
 * Info: (20260814 - Emily) 識別欄位那一小塊(issue 24)。
 *
 * 刻意**不做整頁封面**:導覽已由目錄涵蓋、識別由這塊橫幅涵蓋,
 * 再加一頁是多一頁不是多一份資訊(票上已判定)。
 *
 * 用 `dl` 而不是表格:這是四組「名稱 → 值」,不是資料表。
 * 表格會帶進框線與表頭樣式,而這裡要的是一塊安靜的識別資訊。
 */
const shellIdentity = (identity: ICarbonReportShell["identity"]): string =>
  identity === undefined || identity.length === 0
    ? ""
    : [
        '<dl class="doc-identity">',
        ...identity.map(
          (field) =>
            `<div><dt>${escapeHtml(field.label)}</dt>` +
            `<dd>${escapeHtml(field.value)}</dd></div>`,
        ),
        "</dl>",
      ].join("");

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
    shellIdentity(shell.identity),
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
  /**
   * Info: (20260812 - Emily) 順帶剝掉開頭那行文件級 H1
   * (`data/issue_drafts/open/24_report_identity_fields.md`)。
   *
   * 報告名稱已經改走 `shell.title`（文件外殼）。既有草稿的第一行還烤著
   * `# <會話名>` —— 不剝的話同一份文件的第一頁會出現兩個名稱，
   * 一個在外殼、一個在內文，而內文那個是舊的。
   *
   * 排在 `stripMarkdownComments` 之後：內容前面若有 HTML 註解，
   * 剝除只看「第一個非空行」，會被那行註解擋住而漏剝。
   * 預覽端由 `MarkdownContent` 的 `stripDocumentTitle` 做同一件事。
   */
  /**
   * Info: (20260820 - Emily) 前置轉換改走共用函式（PR review A2）。
   *
   * 原本這裡與 `MarkdownContent` 各排一串，靠兩則註解宣稱「順序完全一致」——
   * 而 `stripLeadingDocumentTitle` 兩邊位置不同，同一份輸入產出不同結果。
   * 順序現在寫在 `prepareCarbonMarkdown` 裡，兩端各呼叫一次。
   *
   * 這裡固定剝文件級 H1：報告名稱已改走 `shell.title`（文件外殼），
   * 內文那個是舊的，不剝的話同一頁會出現兩個名稱。
   */
  const source = prepareCarbonMarkdown(markdown, {
    stripDocumentTitle: true,
    /*
     * Info: (20260820 - Emily) 匯出端固定開：這條路徑只有碳盤查報告會走，
     * 而碳報告的標頭一律由 `p.title` 產生，內容第一行的同文是重複。
     * 預覽端由 `MarkdownContent` 的 `stripEchoedHeadings` 做同一件事，
     * 但那個元件還服務另外 16 個使用端，所以那邊是開關、這邊是固定。
     */
    stripEchoedHeadings: true,
  }).markdown;
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
  /**
   * Info: (20260812 - Emily) `escapeArithmeticEmphasis` 必須是最後一道。
   *
   * 規則:**任何把圍籬內容搬到 prose 的轉換,都必須跑在語意防護之前。**
   * `convertTimelineBlocksToTables` 就是一次「內容搬家」——
   * 逸出跳過圍籬(那是對的,在 code block 裡加反斜線是污染不是防護),
   * 於是原本待在 timeline 圍籬裡、沒有被逸出的 `*` 一旦被搬成表格儲存格,
   * 就落回 prose 上下文,marked 照樣把它當強調吃掉:
   * `2020 : 產能 2*300*4 噸` → `產能 23004 噸`。
   *
   * 這正是 `5ad9824fd`(stop markdown from eating the multiplication signs)
   * 修掉的那件事在新路徑上重演,所以順序本身要當成一條規則寫下來,
   * 而不是「記得把 esc 放最後」——下一支搬家型的轉換也適用。
   */
  let body = marked.parse(
    escapeArithmeticEmphasis(
      padAllTableHeaders(
        convertTimelineBlocksToTables(
          /**
           * Info: (20260814 - Emily) 先補回換行，再標硬斷行
           * (`data/issue_drafts/open/26_import_uat.md` 的觀察項)。
           *
           * `restoreLineStructure` 還原的是「來源已經有的」換行，而 08-14
           * 新匯入件幾乎沒有輸出那些換行 —— 整份清單塞在同一行
           * （最嚴重的是 `3.2.3` 把 (1)~(31) 全放在一行）。
           * 補換行要排在它前面，它才有東西可以標。
           *
           * 這裡不記 log：渲染端每次都重跑，補了什麼不會沉進儲存裡。
           * 真正要記的是匯入端，而那要等 prompt 一起改（`open/26`）。
           */
          replaceOfficeSymbolChars(
            restoreLineStructure(splitInlineListItems(source).markdown),
          ),
        ),
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

  // Info: (20260812 - Emily) 掛 id 要在 annotateTable 之後：那一步只重寫表格，不動標題
  const headed = collectHeadings(body);
  body = headed.body;

  return [
    '<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="utf-8">',
    `<style>${printStyle()}</style>`,
    "</head><body>",
    shell ? shellHeader(shell) : "",
    shell?.tocTitle ? tocSection(headed.entries, shell.tocTitle) : "",
    body,
    shell ? shellFooter(shell) : "",
    "</body></html>",
  ].join("");
};
