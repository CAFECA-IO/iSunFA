// Info: (20260720 - Tzuhan) 報告圖表產生器(#51):模板 × computedLedger → mermaid/markdown 字串
// Info: (20260720 - Tzuhan) 決定性純函式(同輸入同輸出);數值取引擎原始 Decimal 字串(mermaid 自行解析,
// Info: (20260720 - Tzuhan) 不加千分位以免圖表引擎誤讀);LLM 夾帶的自繪圖表不經本模組即不合法
// Info: (20260720 - Tzuhan) 語法沿用 Julian 的 markdown 渲染鏈(mermaid pie / xychart-beta),
// Info: (20260720 - Tzuhan) 與 /admin/pdf_tool 寫法一致,下載 PDF 即含圖
// Info: (20260720 - Tzuhan) 防護:空 ledger → 佔位不畫空圖;守恆違反(#22)→ 凍結告警(比照 #23 表格)

import { Decimal } from "decimal.js";
import { MoneyUtil } from "@/lib/utils/money";
import { ArticulationStatusEnum } from "@/constants/carbon_articulation";
import {
  CarbonChartTemplateEnum,
  buildChartAnchorStart,
  buildChartAnchorEnd,
  CARBON_CHART_ANCHOR_PREFIX,
  CARBON_SANKEY_MAX_EVIDENCE_NODES,
  CARBON_SANKEY_MAX_IMPORTED_NODES,
} from "@/constants/carbon_report_charts";
import { TONNE_TO_KG_MULTIPLIER } from "@/constants/imported_quantity";
import { isImportedEntry } from "@/lib/carbon_table38.ledger";
import {
  buildCarbonDataTable,
  ICarbonDataTableLabels,
  CARBON_DATA_TABLE_DEFAULT_LABELS,
} from "@/lib/carbon_report_table.builder";
import { IComputedLedger } from "@/types/carbon_chatbot.types";

// Info: (20260720 - Tzuhan) 圖表文案(由呼叫端以 i18n 注入;佔位/凍結沿用 #23 表格文案語意)
export interface ICarbonChartLabels {
  pieTitle: string;
  barTitle: string;
  axisCo2e: string;
  insufficient: string;
  frozen: string;
  // Info: (20260720 - Tzuhan) #53 桑基圖:非憑證來源(對話/附件申報)的聚合節點名
  sankeyChatNode: string;
  /**
   * Info: (20260803 - Tzuhan) 匯入桑基圖的標題。**必須帶基準與單位** ——
   * 一張沒有單位的流量圖,讀者無從判斷 8332 是公噸還是公斤,差一千倍。
   */
  importedSankeyTitle?: string;
  /** Info: (20260803 - Tzuhan) 圖下方「未畫出的項目」說明抬頭 */
  importedSankeyExcluded?: string;
  /** Info: (20260803 - Tzuhan) 節點過多而降為兩層時的說明 */
  importedSankeyCollapsed?: string;
  /** Info: (20260803 - Tzuhan) ISO 類別顯示名(類別一~六);未提供時輸出 enum 值 */
  formatIsoCategory?: (category: string) => string;
  // Info: (20260722 - Tzuhan) UAT:範疇 enum 值不可讀 → 顯示名 formatter(未提供時原樣輸出)
  formatScope?: (scope: string) => string;
}

export const CARBON_CHART_DEFAULT_LABELS: ICarbonChartLabels = {
  pieTitle: "各範疇排放占比 (kgCO2e)",
  barTitle: "各範疇排放量 (kgCO2e)",
  axisCo2e: "kgCO2e",
  insufficient: "(資料不足,補齊活動數據後由系統自動生成圖表)",
  frozen:
    "⚠ 質量守恆勾稽未通過,圖表已凍結。請於對話中澄清庫存缺口後,圖表將自動生成。",
  sankeyChatNode: "對話/附件申報",
  importedSankeyTitle: "溫室氣體排放流向(原文照錄,所在地基準,公噸 CO2e/年)",
  importedSankeyExcluded: "未畫出的項目(NA/NS 或為零)",
  importedSankeyCollapsed: "節點過多,已降為兩層(廠址 → 類別)",
};

// Info: (20260720 - Tzuhan) mermaid 數值:引擎 Decimal 字串正規化(去千分位疑慮,不經 number)
const chartValue = (value: string): string =>
  MoneyUtil.toDecimal(value).toString();

// Info: (20260803 - Tzuhan) ISO 類別的顯示名;未提供 formatter 時原樣輸出(enum 值仍可讀出類別)
const formatCategory = (category: string, labels: ICarbonChartLabels): string =>
  labels.formatIsoCategory?.(category) ?? category;

const buildScopePie = (
  ledger: IComputedLedger,
  labels: ICarbonChartLabels,
): string => {
  const scopeLabel = (scope: string): string =>
    labels.formatScope?.(scope) ?? scope;
  const rows = Object.entries(ledger.scopeSubtotals)
    .map(
      ([scope, subtotal]) =>
        `    "${scopeLabel(scope)}" : ${chartValue(subtotal)}`,
    )
    .join("\n");
  return `\`\`\`mermaid\npie title ${labels.pieTitle}\n${rows}\n\`\`\``;
};

/**
 * Info: (20260720 - Tzuhan) #53 碳流量桑基圖:憑證(voucher)→ 排放源 → Scope 三層流量;
 * 非憑證來源聚合為單一「對話/附件申報」節點;每條流量 = 該紀錄 CO2e(引擎原值);
 * 憑證節點超過上限 → 略過憑證層(排放源 → Scope 兩層),保持可讀性。
 * mermaid sankey-beta 為 CSV 語法,節點名一律引號包裹(名稱含逗號不破格式)。
 */
const buildEmissionSankey = (
  ledger: IComputedLedger,
  labels: ICarbonChartLabels,
): string => {
  const quote = (name: string): string => `"${name.replace(/"/g, "'")}"`;
  const rows: string[] = [];

  const evidenceEntries = ledger.entries.filter((e) => e.evidence?.voucherId);
  const withEvidenceLayer =
    evidenceEntries.length > 0 &&
    evidenceEntries.length <= CARBON_SANKEY_MAX_EVIDENCE_NODES;

  // Info: (20260720 - Tzuhan) 第一層:憑證/申報來源 → 排放源(值 = 單筆 CO2e)
  if (withEvidenceLayer) {
    ledger.entries.forEach((entry) => {
      // Info: (20260720 - Tzuhan) 節點名帶憑證 id 尾碼(cuid 尾段才有區別度;首段為時間戳易撞名)
      const origin = entry.evidence?.voucherId
        ? `${entry.sourceName} #${entry.evidence.voucherId.slice(-8)}`
        : labels.sankeyChatNode;
      rows.push(
        `${quote(origin)},${quote(entry.sourceName)},${chartValue(entry.co2eKg)}`,
      );
    });
  }

  // Info: (20260720 - Tzuhan) 第二層:排放源 → Scope(同源加總,MoneyUtil 字串累加)
  const bySource = new Map<string, { scope: string; total: string }>();
  ledger.entries.forEach((entry) => {
    const key = `${entry.sourceName}|${entry.scopeCategory}`;
    const current = bySource.get(key) ?? {
      scope: entry.scopeCategory,
      total: "0",
    };
    current.total = MoneyUtil.add(current.total, entry.co2eKg);
    bySource.set(key, current);
  });
  bySource.forEach((value, key) => {
    const sourceName = key.slice(0, key.lastIndexOf("|"));
    const scopeName = labels.formatScope?.(value.scope) ?? value.scope;
    rows.push(
      `${quote(sourceName)},${quote(scopeName)},${chartValue(value.total)}`,
    );
  });

  return ["```mermaid", "sankey-beta", "", ...rows, "```"].join("\n");
};

/**
 * Info: (20260803 - Tzuhan) 匯入報告的碳流量桑基圖:**廠址 → 類別 → 排放形式**(Issue C)。
 *
 * 與憑證切面分開的理由見 CarbonChartTemplateEnum.IMPORTED_EMISSION_SANKEY 的註解。
 * 三個刻意的行為:
 *
 * 1. **零與 NA/NS 一律不畫。** mermaid sankey 的零權重連結沒有意義,而 NA/NS 根本沒有數字。
 *    但被排除者必須列在圖下方 —— 一張只畫得出來的圖會讓人以為沒畫的都是零,
 *    而 NA/NS 的意思正好相反。
 * 2. **超過節點上限降為兩層**(廠址 → 類別),並明說降級了。寧可少一層也不畫成毛線團。
 * 3. **單位以公噸呈現**,與原文一致。ledger 存的是公斤,此處換算回公噸再畫 ——
 *    圖上的數字要能與原文表格逐格對照,否則對帳的意義就消失了。
 */
const buildImportedSankey = (
  ledger: IComputedLedger,
  labels: ICarbonChartLabels,
): string => {
  const quote = (name: string): string => `"${name.replace(/"/g, "'")}"`;
  const imported = ledger.entries.filter(isImportedEntry);

  // Info: (20260803 - Tzuhan) 只畫 REPORTED 且 > 0 者;其餘列入說明
  const drawable = imported.filter((entry) =>
    MoneyUtil.toDecimal(entry.co2eKg).greaterThan(0),
  );
  const excluded = imported.filter(
    (entry) => !MoneyUtil.toDecimal(entry.co2eKg).greaterThan(0),
  );

  if (drawable.length === 0) return `> _${labels.insufficient}_`;

  // Info: (20260803 - Tzuhan) 公斤 → 公噸:圖上的數字要能與原文表格逐格對照
  const toTonne = (co2eKg: string): string =>
    MoneyUtil.toDecimal(co2eKg).div(TONNE_TO_KG_MULTIPLIER).toString();

  const sites = new Set(drawable.map((entry) => entry.importedOrigin?.site));
  const categories = new Set(
    drawable.map((entry) => entry.importedOrigin?.isoCategory),
  );
  const nodeCount = sites.size + categories.size + drawable.length;
  const collapsed = nodeCount > CARBON_SANKEY_MAX_IMPORTED_NODES;

  const rows: string[] = [];

  /**
   * Info: (20260803 - Tzuhan) 第一層 廠址 → 類別:同一廠址同一類別的子項加總。
   * 以 MoneyUtil 累加(字串 Decimal),不經 number —— 圖上的總流入必須等於總流出,
   * 而浮點的累加順序會讓那個等式偶爾不成立。
   */
  const bySiteCategory = new Map<string, string>();
  drawable.forEach((entry) => {
    const origin = entry.importedOrigin;
    if (!origin) return;
    const key = `${origin.site}|${formatCategory(origin.isoCategory, labels)}`;
    bySiteCategory.set(
      key,
      MoneyUtil.add(bySiteCategory.get(key) ?? "0", toTonne(entry.co2eKg)),
    );
  });
  bySiteCategory.forEach((total, key) => {
    const [site, category] = key.split("|");
    rows.push(`${quote(site)},${quote(category)},${total}`);
  });

  /**
   * Info: (20260803 - Tzuhan) 第二層 類別 → 排放形式(子代碼):節點過多時整層略過。
   *
   * **同一組節點對先自己加總再輸出。** 三個廠址共用同一個類別節點,
   * 因此「類別一 → 1.1」會同時來自總公司與屏東;若原樣輸出兩行,
   * 就等於賭 mermaid 會把重複的連結加總 —— 它也可能畫成兩條重疊的平行線。
   * 依賴渲染器未明文保證的行為,是今天已經吃過虧的那類假設(中文節點那次)。
   * 自己加總,輸出就是決定性的。
   */
  if (!collapsed) {
    // Info: (20260803 - Tzuhan) 以公斤累加、輸出前才換公噸,少一次除法捨入
    const byCategorySub = new Map<
      string,
      { category: string; subCategory: string; co2eKg: Decimal }
    >();
    drawable.forEach((entry) => {
      const origin = entry.importedOrigin;
      if (!origin) return;
      const category = formatCategory(origin.isoCategory, labels);
      const key = `${category}\u0000${origin.subCategory}`;
      const current = byCategorySub.get(key);
      const co2eKg = MoneyUtil.toDecimal(entry.co2eKg);
      if (current) {
        current.co2eKg = current.co2eKg.plus(co2eKg);
      } else {
        byCategorySub.set(key, {
          category,
          subCategory: origin.subCategory,
          co2eKg,
        });
      }
    });
    byCategorySub.forEach(({ category, subCategory, co2eKg }) => {
      rows.push(
        `${quote(category)},${quote(subCategory)},${toTonne(co2eKg.toString())}`,
      );
    });
  }

  const lines = ["```mermaid", "sankey-beta", "", ...rows, "```"];
  if (labels.importedSankeyTitle) {
    lines.unshift(`**${labels.importedSankeyTitle}**`, "");
  }
  if (collapsed && labels.importedSankeyCollapsed) {
    lines.push("", `> _${labels.importedSankeyCollapsed}_`);
  }
  if (excluded.length > 0 && labels.importedSankeyExcluded) {
    lines.push("", `**${labels.importedSankeyExcluded}**`, "");
    excluded.forEach((entry) => {
      lines.push(`- ${entry.sourceName}`);
    });
  }
  return lines.join("\n");
};

const buildScopeBar = (
  ledger: IComputedLedger,
  labels: ICarbonChartLabels,
): string => {
  const scopes = Object.keys(ledger.scopeSubtotals).map(
    (scope) => labels.formatScope?.(scope) ?? scope,
  );
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
 * Info: (20260720 - Tzuhan) 產出模板圖表區塊(錨點包夾,供重算連動替換):
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
    case CarbonChartTemplateEnum.EMISSION_SANKEY:
      return wrap(buildEmissionSankey(ledger, labels));
    case CarbonChartTemplateEnum.IMPORTED_EMISSION_SANKEY:
      return wrap(buildImportedSankey(ledger, labels));
    case CarbonChartTemplateEnum.SOURCE_TABLE:
    default:
      // Info: (20260720 - Tzuhan) 明細表復用 #23 產生器(去其外層錨點,改包本模板錨點避免雙重替換)
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
 * Info: (20260720 - Tzuhan) 插入圖表至段落內容:同模板錨點已存在 → 原地替換(不疊加);否則附加於尾端
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

// Info: (20260720 - Tzuhan) 內容是否含任何模板圖表(重算連動的掃描條件)
export const hasCarbonChartBlocks = (content: string): boolean =>
  content.includes(`<!-- ${CARBON_CHART_ANCHOR_PREFIX}:`);

/**
 * Info: (20260720 - Tzuhan) 重算連動:重建內容中所有已插入的模板圖表(白名單逐一檢查,敘述零改動)
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
