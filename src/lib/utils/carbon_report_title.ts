/**
 * Info: (20260812 - Emily) 報告名稱：從內容裡搬到文件外殼
 * (`data/issue_drafts/open/24_report_identity_fields.md`)。
 *
 * ## 為什麼要搬
 *
 * 報告的 H1 原本是 `# ${session.title}`,而 `session.title` 是**使用者第一則訊息
 * 截斷 24 字**(`use_carbon_chat.ts`)。於是那份要送第三方查證的 53 頁文件,
 * 第一頁印的是 `8/12.test1`。
 *
 * 光是換一個來源不夠。報告名稱是**文件的中繼資料**,不是內容 ——
 * 而 ADR 014 要求 `content` 逐字照抄原文,一個系統產生的標題不該住在那裡面。
 * 住在內容裡還有一個實際後果:使用者可以在編輯器裡把它刪掉,
 * 於是那份文件就沒有名稱了,而沒有人會發現。
 *
 * 所以標題改走 `ICarbonReportShell.title`（那個欄位一直存在,只是從沒被帶過值）,
 * 內容裡不再有文件級 H1。
 *
 * ## 既有草稿
 *
 * `rawMarkdown` 是「使用者所見即所存」的權威來源,而且是逐段 patch 的 ——
 * 已經存過的草稿，第一行早就烤進了 `# 8/12.test1`,不會因為產生端改了就變。
 * 這與 timeline、私有區符號、表頭補欄是**同一個形狀**,那三次都因此被回報
 * 「沒修好」。所以這裡也要有讀取端的一支。
 */

/** Info: (20260812 - Emily) 文件級標題：檔案開頭、單一個 `#` */
const LEADING_H1 = /^\s*#\s+(.+?)\s*$/;

export interface IStrippedDocumentTitle {
  /** Info: (20260812 - Emily) 取出來的標題;開頭不是 H1 時為空字串 */
  readonly title: string;
  /** Info: (20260812 - Emily) 移除該行(與其後的空行)之後的內容 */
  readonly body: string;
}

/**
 * Info: (20260812 - Emily) 剝掉**開頭第一行**的文件級 H1,並把它回傳。
 *
 * 三個刻意的限制,都是為了「寧可少剝，不要剝到內容」：
 *
 * 1. **只看第一個非空行。** 內文中間的 `#` 是章節標題(大綱本來就用 `##`／`###`,
 *    但使用者手動編輯過的草稿什麼都可能有),剝到那些就是刪掉使用者的內容。
 * 2. **只認單一個 `#`。** `##` 以下是節標題,不是文件名稱。
 * 3. **回傳標題而不是丟掉。** 既有草稿的那一行雖然是會話名,但它是目前唯一
 *    寫過的「名稱」——呼叫端可以拿它當遷移的預設值,而不是留下一份無名文件。
 */
export const stripLeadingDocumentTitle = (
  markdown: string,
): IStrippedDocumentTitle => {
  const lines = markdown.split("\n");
  const index = lines.findIndex((line) => line.trim() !== "");
  if (index === -1) return { title: "", body: markdown };

  const matched = LEADING_H1.exec(lines[index]);
  if (matched === null) return { title: "", body: markdown };

  /*
   * Info: (20260812 - Emily) 連同標題後面的空行一起吃掉,否則剝完會留下一個
   * 開頭的空段落 —— 而 `restoreLineStructure` 與 marked 對開頭空行的處理不同,
   * 那會讓預覽與列印再度分歧。
   */
  let next = index + 1;
  while (next < lines.length && lines[next].trim() === "") next += 1;

  return { title: matched[1], body: lines.slice(next).join("\n") };
};

/**
 * Info: (20260812 - Emily) 報告名稱的預設值：**公司名 + 盤查年度**。
 *
 * 不用 `documentName`（`Carbon_Report_Draft_<id>.pdf`）當預設 —— 那是檔名,
 * 印在一份要送查證的文件第一頁上不得體,而且帶副檔名。
 *
 * 兩個值都取不到時**回空字串而不是猜**：沒有標題是一眼看得出來的缺漏,
 * 而猜錯的年度會被印在封面上當成事實。這與目錄頁碼「找不到就留白」同一個判準。
 */
export const buildDefaultReportName = (input: {
  readonly accountBookName?: string;
  readonly inventoryYear?: string;
  readonly suffix: string;
}): string => {
  const company = (input.accountBookName ?? "").trim();
  const year = (input.inventoryYear ?? "").trim();
  if (company === "" && year === "") return "";
  return [company, year, input.suffix].filter((part) => part !== "").join(" ");
};

/**
 * Info: (20260812 - Emily) 決定這份報告要印哪個名稱。
 *
 * 順序是「使用者填的 → 既有草稿烤進去的 → 依公司與年度組出來的」。
 *
 * 中間那一項是給既有草稿的：它雖然是會話名,但它是使用者目前**看得到**的那個名稱,
 * 突然換掉會讓人以為報告被換了一份。留著它並讓使用者改,比替他決定好。
 */
export const resolveReportName = (input: {
  readonly explicitName?: string;
  readonly legacyHeading?: string;
  readonly fallback: string;
}): string => {
  const explicit = (input.explicitName ?? "").trim();
  if (explicit !== "") return explicit;
  const legacy = (input.legacyHeading ?? "").trim();
  if (legacy !== "") return legacy;
  return input.fallback;
};
