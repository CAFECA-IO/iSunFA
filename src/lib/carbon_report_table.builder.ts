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

// Info: (20260720 - Tzuhan) 數據段落勾稽徽章(目錄樹顯示;違反時段落內另有告警)
export enum CarbonDataBadgeStateEnum {
  RECONCILED = "RECONCILED",
  /**
   * Info: (20260804 - Tzuhan) 段落含原文照錄的匯入項目。
   *
   * 與 RECONCILED 分開的理由:RECONCILED 的文案是「數字由決定論引擎產出」,
   * 而匯入項目的數字是從外部報告逐字抄來的,本系統一個乘法都沒做。
   * 只要段落裡有一列是抄的,那句話對整段就不成立 —— 徽章是對整段的聲明,
   * 不能因為「大部分是算的」就照掛。混合情形一律落在這一態。
   */
  IMPORTED = "IMPORTED",
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
  // Info: (20260804 - Tzuhan) 逐列來源標示:同一張表混了兩種來源,不標示就分不出哪列是我們算的
  colProvenance: string;
  provenanceComputed: string;
  provenanceImported: string;
  notProvided: string;
  importedNote: string;
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
  colProvenance: "資料來源",
  provenanceComputed: "系統計算",
  provenanceImported: "原文照錄",
  notProvided: "原文未提供",
  importedNote:
    "註:標示「原文照錄」者為外部報告既有的排放當量,本系統未套用任何活動數據或排放係數,故該兩欄為「原文未提供」;其數字已與原文總量勾稽(見本節對帳說明)。",
};

/**
 * Info: (20260720 - Tzuhan) 徽章裁決(決定性):違反 > 含匯入 > 全部系統計算 > 不足
 *
 * Info: (20260804 - Tzuhan) 原本只看 `entries.length > 0` 就回 RECONCILED,
 * 而表格那側同時把匯入項目過濾掉、印「資料不足」—— 同一份 ledger,
 * 徽章說「已勾稽 ✓」、表格說「資料不足」,兩者互相打臉。
 * 現在兩側都以 provenance 為準,而且只要有一列是抄的就不宣稱「由引擎產出」。
 */
export const deriveDataBadgeState = (
  ledger: IComputedLedger | undefined,
): CarbonDataBadgeStateEnum => {
  if (ledger?.articulation?.status === ArticulationStatusEnum.VIOLATED) {
    return CarbonDataBadgeStateEnum.VIOLATED;
  }
  if (!ledger || ledger.entries.length === 0) {
    return CarbonDataBadgeStateEnum.INSUFFICIENT;
  }
  if (ledger.entries.some(isImportedEntry)) {
    return CarbonDataBadgeStateEnum.IMPORTED;
  }
  return CarbonDataBadgeStateEnum.RECONCILED;
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
   * Info: (20260804 - Tzuhan) 匯入項目也列進系統表格,但**逐列標示來源**(修正 20260803 的處置)。
   *
   * 原本整批過濾掉匯入項目,理由是「同一組數字會在一節內出現兩遍,查核者無從
   * 判斷哪個才是我們的主張」。那個顧慮是對的,但處置收得太寬 ——
   * 連範疇小計與總計也一起沒了,於是 3.6「溫室氣體排放總量匯總表」這一節,
   * 標題是排放總量匯總,內容是「資料不足」,而總量其實就握在 ledger 裡。
   *
   * 分辨不出來的解法是**把來源寫出來**,不是把資料藏起來。加一欄「資料來源」之後,
   * 「哪列是我們算的」變成表上的事實,而不是靠讀者猜。
   *
   * 兩欄仍然不填:活動數據與排放係數。原文只給最終 CO2e,
   * 活動數據 × 係數 × GWP 全發生在報告作者端 —— 本系統一個乘法都沒做。
   * 尤其不能把 convertedQuantity 印進「活動數據」欄:匯入項目的該欄塞的是
   * 排放當量本身,印出來會與右邊的排放量差一個 1000 倍,讀成「係數是 1000」。
   */
  if (!ledger || ledger.entries.length === 0) {
    return wrap(`> _${labels.insufficient}_`);
  }
  const hasImported = ledger.entries.some(isImportedEntry);

  const lines: string[] = [];
  lines.push(`**${labels.detailHeading}**`);
  lines.push("");
  lines.push(
    `| ${labels.colSource} | ${labels.colScope} | ${labels.colQuantity} | ${labels.colFactor} | ${labels.colCo2e} | ${labels.colProvenance} |`,
  );
  lines.push("| --- | --- | --- | --- | ---: | --- |");
  const scopeLabel = (scope: string): string =>
    labels.formatScope?.(scope) ?? scope;
  ledger.entries.forEach((entry) => {
    const imported = isImportedEntry(entry);
    const quantity = imported
      ? labels.notProvided
      : `${MoneyUtil.formatDynamic(entry.convertedQuantity, 3)} ${entry.convertedUnit}`;
    const factor = imported
      ? labels.notProvided
      : `${entry.factor.value}(${entry.factor.source})`;
    const provenance = imported
      ? `${labels.provenanceImported}(${entry.importedOrigin?.tableNo ?? entry.factor.source})`
      : labels.provenanceComputed;
    lines.push(
      `| ${entry.sourceName} | ${scopeLabel(entry.scopeCategory)} | ${quantity} | ${factor} | ${MoneyUtil.formatDynamic(entry.co2eKg, 3)} | ${provenance} |`,
    );
  });

  if (hasImported) {
    lines.push("");
    lines.push(`> _${labels.importedNote}_`);
  }

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
