/**
 * Info: (20260811 - Emily) 既有草稿裡的 mermaid timeline → 表格
 * (issue_drafts/open/20 第 2 張票的後半)。
 *
 * 產表端已改成直接輸出表格,但**既有草稿的 markdown 裡已經存著 timeline 區塊** ——
 * 那是改動之前產生的,不會因為產生器換了寫法就變。實測 UAT 那份下載下來仍是彩虹軸:
 * 產生器的修正只影響下一次生成,而重新產生整份報告要再燒一次 LLM 額度。
 *
 * 所以讀取端也轉一次。與乘號那件同一個做法(`escapeArithmeticEmphasis` 也是兩端都套),
 * 理由也一樣:重新產生一份 54 頁的報告很貴,而轉換是決定性的、冪等的。
 *
 * 為什麼非轉不可(數字在票裡):timeline 一個時間點一欄、欄寬固定,
 * 15 條中文沿革的 SVG 內在寬度 3,559px,排到頁寬要縮到 28%、事件字級 4.5px(正文 14px)。
 * 表格是 688px 不縮放、11.3px。
 */

/** Info: (20260811 - Emily) 與 CARBON_DIAGRAM_DEFAULT_LABELS 的兩個表頭一致 */
export const MILESTONE_TABLE_HEADERS = {
  period: "時間",
  event: "事件",
} as const;

const TIMELINE_BLOCK = /```mermaid[ \t]*\r?\n[ \t]*timeline\b([\s\S]*?)```/g;

/** Info: (20260811 - Emily) 表格以 `|` 分隔儲存格,內容裡的直線必須逸出否則多切一欄 */
const cell = (text: string): string => text.trim().replace(/\|/g, "\\|");

/**
 * Info: (20260811 - Emily) 把一段 timeline 定義轉成表格列。
 *
 * mermaid timeline 的形狀是 `時間標籤 : 事件 : 事件`,另有 `title` 與 `section`。
 * `title` 提到表格前面成為粗體行(它是這張圖的標題,不是資料);
 * `section` 轉成只有第一格有內容的列 —— `annotateTable` 會把那種列渲染成橫跨整表的
 * 分隔列,正好是原文分段的樣子。
 */
const bodyToTable = (body: string): string => {
  const titles: string[] = [];
  const rows: string[] = [];

  body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .forEach((line) => {
      const title = /^title\s+(.+)$/.exec(line);
      if (title) {
        titles.push(`**${cell(title[1])}**`);
        return;
      }
      const section = /^section\s+(.+)$/.exec(line);
      if (section) {
        rows.push(`| ${cell(section[1])} |  |`);
        return;
      }
      /*
       * Info: (20260811 - Emily) 冒號可能是全形。第一段是時間標籤,其餘每一段各是一個事件;
       * 同一時間標籤的多個事件各佔一列,時間只寫在第一列(縱向合併的表達方式)。
       */
      const parts = line.split(/[:：]/).map((part) => part.trim());
      const period = parts.shift() ?? "";
      const events = parts.filter((part) => part.length > 0);
      if (events.length === 0) {
        // Info: (20260811 - Emily) 只有時間標籤沒有事件:仍然列出來,不猜也不丟
        rows.push(`| ${cell(period)} |  |`);
        return;
      }
      events.forEach((event, index) => {
        rows.push(`| ${index === 0 ? cell(period) : ""} | ${cell(event)} |`);
      });
    });

  if (rows.length === 0) return "";
  return [
    ...titles,
    ...(titles.length > 0 ? [""] : []),
    `| ${MILESTONE_TABLE_HEADERS.period} | ${MILESTONE_TABLE_HEADERS.event} |`,
    "| --- | --- |",
    ...rows,
  ].join("\n");
};

/**
 * Info: (20260811 - Emily) 把 markdown 裡所有 mermaid timeline 區塊換成表格。
 * 沒有 timeline 就原樣返回;轉不出任何一列(空區塊)時保留原區塊 ——
 * 把一個看不懂的區塊換成空表格會讓內容消失,而消失是無聲的。
 */
export const convertTimelineBlocksToTables = (markdown: string): string => {
  if (!markdown.includes("timeline")) return markdown;
  return markdown.replace(TIMELINE_BLOCK, (block, body: string) => {
    const table = bodyToTable(body);
    /**
     * Info: (20260812 - Emily) 前後各補一個換行(PR review 第 3 點)。
     *
     * 圍籬本身佔一整行,替換成表格之後緊接在後的那一行會被當成表格的續列吃掉 ——
     * 實測「後文」變成 `<tr class="group">` 的一列。產生器產出的形狀兩側本來就有
     * 空行不會中,但手動編輯過的草稿會,而這條轉換現在跑在全 app 的 markdown 上。
     * 消失是無聲的。
     */
    return table === "" ? block : `\n${table}\n`;
  });
};
