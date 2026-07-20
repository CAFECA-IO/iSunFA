// Info: (20260720 - Emily) 報告圖表產生器(#51):模板 × computedLedger → mermaid/markdown 字串
// Info: (20260720 - Emily) 決定性純函式(同輸入同輸出);數值取引擎原始 Decimal 字串(mermaid 自行解析,
// Info: (20260720 - Emily) 不加千分位以免圖表引擎誤讀);LLM 夾帶的自繪圖表不經本模組即不合法
// Info: (20260720 - Emily) 語法沿用 Julian 的 markdown 渲染鏈(mermaid pie / xychart-beta),
// Info: (20260720 - Emily) 與 /admin/pdf_tool 寫法一致,下載 PDF 即含圖
// Info: (20260720 - Emily) 防護:空 ledger → 佔位不畫空圖;守恆違反(#22)→ 凍結告警(比照 #23 表格)

import { MoneyUtil } from "@/lib/utils/money";
import { ArticulationStatusEnum } from "@/constants/carbon_articulation";
import {
  CarbonChartTemplateEnum,
  buildChartAnchorStart,
  buildChartAnchorEnd,
  CARBON_CHART_ANCHOR_PREFIX,
} from "@/constants/carbon_report_charts";
import {
  buildCarbonDataTable,
  ICarbonDataTableLabels,
  CARBON_DATA_TABLE_DEFAULT_LABELS,
} from "@/lib/carbon_report_table.builder";
import { IComputedLedger } from "@/types/carbon_chatbot.types";

// Info: (20260720 - Emily) 圖表文案(由呼叫端以 i18n 注入;佔位/凍結沿用 #23 表格文案語意)
export interface ICarbonChartLabels {
  pieTitle: string;
  barTitle: string;
  axisCo2e: string;
  insufficient: string;
  frozen: string;
}

export const CARBON_CHART_DEFAULT_LABELS: ICarbonChartLabels = {
  pieTitle: "各範疇排放占比 (kgCO2e)",
  barTitle: "各範疇排放量 (kgCO2e)",
  axisCo2e: "kgCO2e",
  insufficient: "(資料不足,補齊活動數據後由系統自動生成圖表)",
  frozen:
    "⚠ 質量守恆勾稽未通過,圖表已凍結。請於對話中澄清庫存缺口後,圖表將自動生成。",
};

// Info: (20260720 - Emily) mermaid 數值:引擎 Decimal 字串正規化(去千分位疑慮,不經 number)
const chartValue = (value: string): string =>
  MoneyUtil.toDecimal(value).toString();

const buildScopePie = (
  ledger: IComputedLedger,
  labels: ICarbonChartLabels,
): string => {
  const rows = Object.entries(ledger.scopeSubtotals)
    .map(([scope, subtotal]) => `    "${scope}" : ${chartValue(subtotal)}`)
    .join("\n");
  return `\`\`\`mermaid\npie title ${labels.pieTitle}\n${rows}\n\`\`\``;
};

const buildScopeBar = (
  ledger: IComputedLedger,
  labels: ICarbonChartLabels,
): string => {
  const scopes = Object.keys(ledger.scopeSubtotals);
  const values = Object.values(ledger.scopeSubtotals).map(chartValue);
  return [
    "```mermaid",
    "xychart-beta",
    `    title "${labels.barTitle}"`,
    `    x-axis [${scopes.map((s) => `"${s}"`).join(", ")}]`,
    `    y-axis "${labels.axisCo2e}"`,
    `    bar [${values.join(", ")}]`,
    "```",
  ].join("\n");
};

/**
 * Info: (20260720 - Emily) 產出模板圖表區塊(錨點包夾,供重算連動替換):
 * 守恆違反 → 凍結告警;空 ledger → 佔位;數值一律引擎產出
 */
export const buildCarbonChartBlock = (
  templateId: CarbonChartTemplateEnum,
  ledger: IComputedLedger | undefined,
  labels: ICarbonChartLabels = CARBON_CHART_DEFAULT_LABELS,
  tableLabels: ICarbonDataTableLabels = CARBON_DATA_TABLE_DEFAULT_LABELS,
): string => {
  const wrap = (body: string): string =>
    `${buildChartAnchorStart(templateId)}\n\n${body}\n\n${buildChartAnchorEnd(templateId)}`;

  if (ledger?.articulation?.status === ArticulationStatusEnum.VIOLATED) {
    return wrap(`> ${labels.frozen}`);
  }
  if (!ledger || ledger.entries.length === 0) {
    return wrap(`> _${labels.insufficient}_`);
  }

  switch (templateId) {
    case CarbonChartTemplateEnum.SCOPE_PIE:
      return wrap(buildScopePie(ledger, labels));
    case CarbonChartTemplateEnum.SCOPE_BAR:
      return wrap(buildScopeBar(ledger, labels));
    case CarbonChartTemplateEnum.SOURCE_TABLE:
    default:
      // Info: (20260720 - Emily) 明細表復用 #23 產生器(去其外層錨點,改包本模板錨點避免雙重替換)
      return wrap(
        buildCarbonDataTable(ledger, tableLabels)
          .split("\n")
          .filter((line) => !line.startsWith("<!-- carbon-data-table"))
          .join("\n")
          .trim(),
      );
  }
};

/**
 * Info: (20260720 - Emily) 插入圖表至段落內容:同模板錨點已存在 → 原地替換(不疊加);否則附加於尾端
 */
export const insertCarbonChartBlock = (
  content: string,
  templateId: CarbonChartTemplateEnum,
  block: string,
): string => {
  const start = buildChartAnchorStart(templateId);
  const end = buildChartAnchorEnd(templateId);
  const startIndex = content.indexOf(start);
  const endIndex = content.indexOf(end);
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const before = content.slice(0, startIndex).replace(/\s+$/, "");
    const after = content.slice(endIndex + end.length).replace(/^\s+/, "");
    return [before, block, after].filter(Boolean).join("\n\n");
  }
  const trimmed = content.trim();
  return trimmed ? `${trimmed}\n\n${block}` : block;
};

// Info: (20260720 - Emily) 內容是否含任何模板圖表(重算連動的掃描條件)
export const hasCarbonChartBlocks = (content: string): boolean =>
  content.includes(`<!-- ${CARBON_CHART_ANCHOR_PREFIX}:`);

/**
 * Info: (20260720 - Emily) 重算連動:重建內容中所有已插入的模板圖表(白名單逐一檢查,敘述零改動)
 */
export const refreshCarbonChartBlocks = (
  content: string,
  ledger: IComputedLedger | undefined,
  labels: ICarbonChartLabels = CARBON_CHART_DEFAULT_LABELS,
  tableLabels: ICarbonDataTableLabels = CARBON_DATA_TABLE_DEFAULT_LABELS,
): string => {
  let next = content;
  Object.values(CarbonChartTemplateEnum).forEach((templateId) => {
    if (!next.includes(buildChartAnchorStart(templateId))) return;
    next = insertCarbonChartBlock(
      next,
      templateId,
      buildCarbonChartBlock(templateId, ledger, labels, tableLabels),
    );
  });
  return next;
};
