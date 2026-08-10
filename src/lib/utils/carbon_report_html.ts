import { marked } from "marked";
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
 * Info: (20260810 - Emily) 拔掉腳本與事件屬性。
 *
 * markdown 允許夾帶原始 HTML,而這份 HTML 會被交給**伺服器上的** Chrome 執行。
 * 報告內容雖然出自使用者自己的草稿,但「使用者能寫的東西會在伺服器的網路位置上執行」
 * 本身就是不該存在的能力(SSRF)。service 另外全面阻斷網路請求,兩層都做:
 * 這一層擋執行,那一層擋外連 —— 任一層失效時另一層仍成立。
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
`;
};

/**
 * Info: (20260810 - Emily) markdown → 完整的可列印 HTML 文件。
 *
 * mermaid 區塊只換成容器不在此渲染:mermaid 需要真的 DOM,
 * 而在 headless Chrome 裡畫出來的是**向量** SVG —— 這正是改走伺服端列印的理由之一。
 */
export const buildCarbonReportHtml = (markdown: string): string => {
  marked.setOptions({ gfm: true, breaks: false });
  let body = marked.parse(markdown, { async: false }) as string;
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
    `</head><body>${body}</body></html>`,
  ].join("");
};
