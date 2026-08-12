// Info: (20260801 - Tzuhan) 段落內容組裝器(純函數):把四種來源不同的內容按固定順序組成一段
// Info: (20260801 - Tzuhan) 見 issue_drafts/inventory_table_import 的 Issue A 第 4 點。
//
// Info: (20260801 - Tzuhan) 為什麼順序要寫死在程式碼而非交給 LLM:
// Info: (20260801 - Tzuhan) 一個段落內會同時出現「原文照錄的表」與「本系統計算的表」,
// Info: (20260801 - Tzuhan) 兩者的可信度來源完全不同。若順序每次不一樣,讀者就得逐張確認標籤才知道
// Info: (20260801 - Tzuhan) 自己在看什麼;固定成「敘述 → 原文 → 系統 → 對帳」之後,位置本身就是語意。
//
// Info: (20260801 - Tzuhan) 冪等性是這個模組的核心約束:重算會反覆呼叫它,
// Info: (20260801 - Tzuhan) 每次都必須先把既有的受管區塊剝掉再重組,否則區塊會逐次疊加。

import {
  CARBON_DATA_TABLE_END,
  CARBON_DATA_TABLE_START,
} from "@/lib/carbon_report_table.builder";
import {
  buildSourceTableBlock,
  type ICarbonSourceTable,
  type ICarbonSourceTableLabels,
} from "@/lib/carbon_source_table.builder";
import { CARBON_SOURCE_TABLE_ANCHOR_PREFIX } from "@/constants/carbon_source_tables";

/**
 * Info: (20260801 - Tzuhan) 對帳區塊的錨點。獨立命名空間的理由與其他三種相同:
 * 對帳結論隨 ledger 重算而變(原文總量不變、系統總量會變),必須能單獨替換。
 */
export const CARBON_RECONCILIATION_START =
  "<!-- carbon-reconciliation:start -->";
export const CARBON_RECONCILIATION_END = "<!-- carbon-reconciliation:end -->";

export interface IComposeParagraphInput {
  /** Info: (20260801 - Tzuhan) 敘述文字。可含既有的受管區塊,會先被剝除再重組(冪等) */
  content: string;
  /** Info: (20260801 - Tzuhan) 原文照錄的表格,依給定順序輸出(通常即表號順序) */
  sourceTables?: ICarbonSourceTable[];
  /** Info: (20260801 - Tzuhan) 系統計算表格區塊(已含 carbon-data-table 錨點) */
  dataTableBlock?: string;
  /** Info: (20260801 - Tzuhan) 對帳說明:原文總量 vs 系統總量的差異。純文字,由呼叫端組出 */
  reconciliation?: string;
  labels?: ICarbonSourceTableLabels;
}

/**
 * Info: (20260801 - Tzuhan) 移除某一組錨點包夾的所有區塊(含錨點本身)。
 * 逐一掃描而非用 regex 全域替換:錨點鍵含中文表號,正則轉義的風險高於直接掃描,
 * 而且掃描能處理「只有起錨點沒有結束錨點」的截斷內容。
 */
const removeAnchoredBlocks = (
  content: string,
  startPattern: RegExp,
  endPattern: RegExp,
): string => {
  const lines = content.split("\n");
  const kept: string[] = [];
  let depth = 0;
  lines.forEach((line) => {
    if (startPattern.test(line)) {
      depth += 1;
      return;
    }
    if (endPattern.test(line)) {
      // Info: (20260801 - Tzuhan) 沒有對應起錨點的孤兒結束錨點一併丟棄,不留在敘述裡
      depth = Math.max(0, depth - 1);
      return;
    }
    if (depth === 0) kept.push(line);
  });
  return kept.join("\n");
};

const SOURCE_TABLE_START_LINE = new RegExp(
  `<!--\\s*${CARBON_SOURCE_TABLE_ANCHOR_PREFIX}:.+?:start\\s*-->`,
);
const SOURCE_TABLE_END_LINE = new RegExp(
  `<!--\\s*${CARBON_SOURCE_TABLE_ANCHOR_PREFIX}:.+?:end\\s*-->`,
);

/**
 * Info: (20260801 - Tzuhan) 取出敘述本體:剝掉所有受管區塊後剩下的文字。
 * 匯出此函數是為了讓呼叫端能在不重組的情況下取得純敘述(例如比對 LLM 是否改寫了敘述)。
 */
export function extractNarrative(content: string): string {
  let narrative = removeAnchoredBlocks(
    content,
    SOURCE_TABLE_START_LINE,
    SOURCE_TABLE_END_LINE,
  );
  narrative = removeAnchoredBlocks(
    narrative,
    new RegExp(escapeAnchor(CARBON_DATA_TABLE_START)),
    new RegExp(escapeAnchor(CARBON_DATA_TABLE_END)),
  );
  narrative = removeAnchoredBlocks(
    narrative,
    new RegExp(escapeAnchor(CARBON_RECONCILIATION_START)),
    new RegExp(escapeAnchor(CARBON_RECONCILIATION_END)),
  );
  return narrative.replace(/\n{3,}/g, "\n\n").trim();
}

// Info: (20260801 - Tzuhan) 錨點字串含 <!-- 與 --> 等正則元字元,轉義後才可當 pattern
const escapeAnchor = (anchor: string): string =>
  anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Info: (20260801 - Tzuhan) 依固定順序組出段落內容:
 * **敘述 → 原文表格 → 系統計算表格 → 對帳說明**。
 *
 * 三個保證:
 * 1. 冪等 —— 對同一輸入重複呼叫結果不變(先剝除受管區塊再重組)
 * 2. 敘述零改動 —— 只搬動位置,不改寫文字
 * 3. 缺任一種區塊時其餘照常輸出,不留空殼標題
 */
export function composeParagraphContent(input: IComposeParagraphInput): string {
  /**
   * Info: (20260812 - Emily) 乘號逸出與行結構補償**不再寫進儲存的內容**。
   *
   * 原本在這裡套用,理由是「存進去的內容就該是對的」。但這兩支都是**顯示層的
   * 補償**(markdown 渲染器會吃掉乘號、會收掉軟斷行),而這個函式第 113 行的
   * 保證是「敘述零改動 —— 只搬動位置,不改寫文字」——寫進 `\*` 與每行兩個
   * 尾隨空白就是改寫文字,直接違反 ADR 014 的「content 逐字照抄原文」。
   *
   * 而且它會壞掉一件不明顯的事:ADR 014 的圖表護欄要求「節點文字必須能在該段
   * 原文中找到(去空白與標點後比對)」。行尾空白會被那個 normalize 吃掉,
   * 反斜線不會 —— 於是一個含算式的節點 label 可能對不回自己的原文,
   * 而失敗的表現是**整張圖不畫**,沒有人會知道原因是一個反斜線。
   *
   * 兩個讀取端都已經各自套了(`buildCarbonReportHtml` 與 `MarkdownContent`),
   * 所以移除這裡不會讓任何一端的顯示變差。
   */
  const narrative = extractNarrative(input.content);
  const blocks: string[] = [];
  if (narrative.length > 0) blocks.push(narrative);

  (input.sourceTables ?? []).forEach((table) => {
    blocks.push(buildSourceTableBlock(table, input.labels));
  });

  if (input.dataTableBlock && input.dataTableBlock.trim().length > 0) {
    blocks.push(input.dataTableBlock.trim());
  }

  if (input.reconciliation && input.reconciliation.trim().length > 0) {
    blocks.push(
      [
        CARBON_RECONCILIATION_START,
        input.reconciliation.trim(),
        CARBON_RECONCILIATION_END,
      ].join("\n"),
    );
  }

  return blocks.join("\n\n");
}
