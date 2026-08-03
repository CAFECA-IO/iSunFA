// Info: (20260720 - Tzuhan) 報告數據表格產生器(#23):數據段落的表格由本模組從 computedLedger 決定性產出
// Info: (20260720 - Tzuhan) 廢除空殼 categories 佔位 —「數據段落:數字由系統勾稽計算」徽章自此為真實聲明
// Info: (20260720 - Tzuhan) 鐵律:數字一律來自決定論引擎(字串化 Decimal),LLM 零參與填值;
// Info: (20260720 - Tzuhan) LLM 草稿夾帶的任何表格由 stripLlmTables 丟棄(zero fabrication 執行面)
// Info: (20260720 - Tzuhan) 守恆違反(#22)→ 拒產表格,以醒目告警取代(審計軌跡:PDF 匯出保留,不得美化)

import { MoneyUtil } from "@/lib/utils/money";
import { ArticulationStatusEnum } from "@/constants/carbon_articulation";
import { IComputedLedger } from "@/types/carbon_chatbot.types";
import { SOURCE_TABLE_ANCHOR_PATTERN } from "@/constants/carbon_source_tables";
import { isImportedEntry } from "@/lib/carbon_table38.ledger";

// Info: (20260720 - Tzuhan) 表格注入錨點(HTML 註解:Markdown 渲染不可見、PDF 不輸出;重算時依此替換不動敘述)
export const CARBON_DATA_TABLE_START = "<!-- carbon-data-table:start -->";
export const CARBON_DATA_TABLE_END = "<!-- carbon-data-table:end -->";

// Info: (20260720 - Tzuhan) 數據段落勾稽徽章三態(目錄樹顯示;違反時段落內另有告警)
export enum CarbonDataBadgeStateEnum {
  RECONCILED = "RECONCILED",
  VIOLATED = "VIOLATED",
  INSUFFICIENT = "INSUFFICIENT",
}

// Info: (20260720 - Tzuhan) 表格文案(由呼叫端以 i18n 注入;預設 zh-TW,與既有報告組稿語言慣例一致)
export interface ICarbonDataTableLabels {
  detailHeading: string;
  colSource: string;
  colScope: string;
  colQuantity: string;
  colFactor: string;
  colCo2e: string;
  subtotalHeading: string;
  total: string;
  insufficient: string;
  frozen: string;
  pendingNote: string;
  // Info: (20260722 - Tzuhan) UAT:範疇 enum 值不可讀 → 顯示名 formatter(未提供時原樣輸出)
  formatScope?: (scope: string) => string;
}

export const CARBON_DATA_TABLE_DEFAULT_LABELS: ICarbonDataTableLabels = {
  detailHeading: "排放源明細",
  colSource: "排放源",
  colScope: "範疇",
  colQuantity: "活動數據",
  colFactor: "排放係數(來源)",
  colCo2e: "排放量 (kgCO2e)",
  subtotalHeading: "範疇小計",
  total: "總排放量",
  insufficient: "(資料不足,補齊活動數據後由系統自動生成數據表格)",
  frozen:
    "⚠ 質量守恆勾稽未通過,數據表格已凍結。請於對話中澄清庫存缺口後,表格將自動生成。",
  pendingNote: "註:尚有 {count} 筆活動數據待補係數,未計入下表。",
};

// Info: (20260720 - Tzuhan) 徽章三態裁決(決定性):違反 > 有數據 > 不足
export const deriveDataBadgeState = (
  ledger: IComputedLedger | undefined,
): CarbonDataBadgeStateEnum => {
  if (ledger?.articulation?.status === ArticulationStatusEnum.VIOLATED) {
    return CarbonDataBadgeStateEnum.VIOLATED;
  }
  if (ledger && ledger.entries.length > 0) {
    return CarbonDataBadgeStateEnum.RECONCILED;
  }
  return CarbonDataBadgeStateEnum.INSUFFICIENT;
};

/**
 * Info: (20260720 - Tzuhan) 從計算總表決定性產出 markdown 表格區塊(含錨點包夾):
 * - 違反守恆 → 告警取代表格(凍結;PDF 保留)
 * - 無資料 → 佔位說明(不畫空表)
 * - 數字格式化走 MoneyUtil.formatDynamic(Decimal 千分位,無 number 運算)
 */
export const buildCarbonDataTable = (
  ledger: IComputedLedger | undefined,
  labels: ICarbonDataTableLabels = CARBON_DATA_TABLE_DEFAULT_LABELS,
): string => {
  const wrap = (body: string): string =>
    `${CARBON_DATA_TABLE_START}\n\n${body}\n\n${CARBON_DATA_TABLE_END}`;

  if (ledger?.articulation?.status === ArticulationStatusEnum.VIOLATED) {
    return wrap(`> ${labels.frozen}`);
  }
  /**
   * Info: (20260803 - Tzuhan) 系統計算表格**只列本系統算出來的項目**(Issue B)。
   *
   * 匯入的表3.8 項目同樣進 ledger(桑基圖與總量需要),但它們已經以「原文照錄」
   * 的形式出現在同一節裡。若這裡也列一次,同一組數字會在一節內出現兩遍 ——
   * 一遍標著原文、一遍看起來像本系統算的,而查核者無從判斷哪個才是我們的主張。
   * 「兩者並存但絕不合併」的執行面就在這一行。
   */
  const computedEntries = ledger?.entries.filter(
    (entry) => !isImportedEntry(entry),
  );
  if (!ledger || !computedEntries || computedEntries.length === 0) {
    return wrap(`> _${labels.insufficient}_`);
  }

  const lines: string[] = [];
  lines.push(`**${labels.detailHeading}**`);
  lines.push("");
  lines.push(
    `| ${labels.colSource} | ${labels.colScope} | ${labels.colQuantity} | ${labels.colFactor} | ${labels.colCo2e} |`,
  );
  lines.push("| --- | --- | --- | --- | ---: |");
  const scopeLabel = (scope: string): string =>
    labels.formatScope?.(scope) ?? scope;
  computedEntries.forEach((entry) => {
    lines.push(
      `| ${entry.sourceName} | ${scopeLabel(entry.scopeCategory)} | ${MoneyUtil.formatDynamic(entry.convertedQuantity, 3)} ${entry.convertedUnit} | ${entry.factor.value}(${entry.factor.source}) | ${MoneyUtil.formatDynamic(entry.co2eKg, 3)} |`,
    );
  });

  lines.push("");
  lines.push(`**${labels.subtotalHeading}**`);
  lines.push("");
  lines.push(`| ${labels.colScope} | ${labels.colCo2e} |`);
  lines.push("| --- | ---: |");
  Object.entries(ledger.scopeSubtotals).forEach(([scope, subtotal]) => {
    lines.push(
      `| ${scopeLabel(scope)} | ${MoneyUtil.formatDynamic(subtotal, 3)} |`,
    );
  });
  lines.push(
    `| **${labels.total}** | **${MoneyUtil.formatDynamic(ledger.totalCo2eKg, 3)}** |`,
  );

  if (ledger.pending.length > 0) {
    lines.push("");
    lines.push(
      `> _${labels.pendingNote.replace("{count}", String(ledger.pending.length))}_`,
    );
  }
  return wrap(lines.join("\n"));
};

/**
 * Info: (20260720 - Tzuhan) 丟棄 LLM 草稿夾帶的 markdown 表格(fence-aware):
 * 數據段落的表格唯一合法來源是本模組;LLM 敘述中的 |...| 表格列(含分隔列)整塊移除
 *
 * Info: (20260801 - Tzuhan) 例外:落在 `carbon-source-table` 錨點之間的表格是**自上傳文件
 * 逐字照錄**的原文,不是模型產生的,必須保留(見 issue_drafts/inventory_table_import)。
 * 這道剝除原本假設「表格 = LLM 產生 = 不可信」,而該假設在匯入原文表格後不再成立;
 * 分辨的依據是錨點,不是內容 —— 內容無從分辨,來源可以。
 */
export const stripLlmTables = (content: string): string => {
  const lines = content.split("\n");
  const kept: string[] = [];
  let inFence = false;
  let inSourceTable = false;
  lines.forEach((line) => {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    const anchor = line.match(SOURCE_TABLE_ANCHOR_PATTERN);
    if (anchor) {
      inSourceTable = anchor[2] === "start";
      kept.push(line);
      return;
    }
    if (!inFence && !inSourceTable && /^\s*\|.*\|\s*$/.test(line)) return;
    kept.push(line);
  });
  // Info: (20260720 - Tzuhan) 移除表格後可能留下連續空行,收斂為單一空行
  return kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

/**
 * Info: (20260720 - Tzuhan) 表格注入/替換(重算連動的核心):
 * 內容已含錨點 → 只替換錨點區塊(敘述零改動);無錨點 → 附加於內容尾端
 */
export const injectDataTable = (
  content: string,
  tableBlock: string,
): string => {
  const startIndex = content.indexOf(CARBON_DATA_TABLE_START);
  const endIndex = content.indexOf(CARBON_DATA_TABLE_END);
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const before = content.slice(0, startIndex).replace(/\s+$/, "");
    const after = content
      .slice(endIndex + CARBON_DATA_TABLE_END.length)
      .replace(/^\s+/, "");
    return [before, tableBlock, after].filter(Boolean).join("\n\n");
  }
  const trimmed = content.trim();
  return trimmed ? `${trimmed}\n\n${tableBlock}` : tableBlock;
};

// Info: (20260720 - Tzuhan) 內容是否已含注入表格(重算連動的掃描條件)
export const hasInjectedDataTable = (content: string): boolean =>
  content.includes(CARBON_DATA_TABLE_START);
