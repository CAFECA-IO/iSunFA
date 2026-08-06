// Info: (20260720 - Tzuhan) 報告圖表產生器(#51):模板 × computedLedger → mermaid/markdown 字串
// Info: (20260720 - Tzuhan) 決定性純函式(同輸入同輸出);數值取引擎原始 Decimal 字串(mermaid 自行解析,
// Info: (20260720 - Tzuhan) 不加千分位以免圖表引擎誤讀);LLM 夾帶的自繪圖表不經本模組即不合法
// Info: (20260720 - Tzuhan) 語法沿用 Julian 的 markdown 渲染鏈(mermaid pie / xychart-beta),
// Info: (20260720 - Tzuhan) 與 /admin/pdf_tool 寫法一致,下載 PDF 即含圖
// Info: (20260720 - Tzuhan) 防護:空 ledger → 佔位不畫空圖;守恆違反(#22)→ 凍結告警(比照 #23 表格)

import { MoneyUtil } from "@/lib/utils/money";
import { GhgCategoryToScope } from "@/constants/esg";
import { ArticulationStatusEnum } from "@/constants/carbon_articulation";
import {
  CarbonChartTemplateEnum,
  buildChartAnchorStart,
  buildChartAnchorEnd,
  CARBON_CHART_ANCHOR_PREFIX,
  CARBON_SANKEY_MAX_EVIDENCE_NODES,
  CARBON_SANKEY_MAX_IMPORTED_NODES,
  CARBON_SANKEY_MAX_MONTH_NODES,
  CARBON_SANKEY_MIN_SHARE_OF_TOTAL,
} from "@/constants/carbon_report_charts";
import { resolveEmissionMonth } from "@/lib/utils/emission_period";
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
   * Info: (20260806 - Tzuhan) 沒有交易日期的紀錄在月別層的節點名。
   * 一定要有這個節點:把無日期的筆數默默併進某個月份就是編造事實,
   * 而整批丟掉會讓總流入不等於總流出 —— 那張圖就不再是守恆的證明。
   */
  sankeyPeriodUnknown?: string;
  /** Info: (20260806 - Tzuhan) 月別跨度過大而略過該層時的說明 */
  sankeyPeriodCollapsed?: string;
  /**
   * Info: (20260803 - Tzuhan) 匯入桑基圖的標題。**必須帶基準與單位** ——
   * 一張沒有單位的流量圖,讀者無從判斷 8332 是公噸還是公斤,差一千倍。
   */
  importedSankeyTitle?: string;
  /** Info: (20260803 - Tzuhan) 圖下方「未畫出的項目」說明抬頭 */
  importedSankeyExcluded?: string;
  /**
   * Info: (20260806 - Tzuhan) 已匯入報告但帳本空的時候的說明。
   *
   * 與 `insufficient` 分開是必要的:`insufficient` 說的是「補齊活動數據」,
   * 那句話對匯入的報告是**錯的方向** —— 匯入路徑的數據不是靠使用者一筆一筆補,
   * 而是來自表3.8。實測那一輪第三章解析失敗、表3.8 沒進來,
   * 而 3.6 只印著「補齊活動數據」,於是使用者會去找活動數據,
   * 真正該做的是重新匯入第三章。
   *
   * 指錯方向的提示比沒有提示更貴:它讓人把時間花在不會有結果的地方。
   */
  importedSankeyNoLedger?: string;
  /** Info: (20260803 - Tzuhan) 節點過多而降層時的說明 */
  importedSankeyCollapsed?: string;
  /** Info: (20260805 - Tzuhan) 第一層節點名(組織總體) */
  importedSankeyOrganization?: string;
  /**
   * Info: (20260805 - Tzuhan) 圖下方「低於門檻未畫出」說明抬頭。
   * 與 importedSankeyExcluded 分開:「沒有數字」與「數字太小」是不同的事實。
   */
  importedSankeyBelowThreshold?: string;
  /** Info: (20260803 - Tzuhan) ISO 類別顯示名(類別一~六);未提供時輸出 enum 值 */
  formatIsoCategory?: (category: string) => string;
  // Info: (20260722 - Tzuhan) UAT:範疇 enum 值不可讀 → 顯示名 formatter(未提供時原樣輸出)
  formatScope?: (scope: string) => string;
  /** Info: (20260805 - Tzuhan) 三大範疇(Scope 1/2/3)顯示名;桑基圖第三層用 */
  formatEsgScope?: (scope: string) => string;
}

export const CARBON_CHART_DEFAULT_LABELS: ICarbonChartLabels = {
  pieTitle: "各範疇排放占比 (kgCO2e)",
  barTitle: "各範疇排放量 (kgCO2e)",
  axisCo2e: "kgCO2e",
  insufficient: "(資料不足,補齊活動數據後由系統自動生成圖表)",
  frozen:
    "⚠ 質量守恆勾稽未通過,圖表已凍結。請於對話中澄清庫存缺口後,圖表將自動生成。",
  sankeyChatNode: "對話/附件申報",
  sankeyPeriodUnknown: "未標註期間",
  sankeyPeriodCollapsed: "期間跨度超過兩個年度,已略過月別層(月別請看趨勢圖)",
  importedSankeyTitle:
    "溫室氣體排放流向:組織 → 廠址 → 範疇 → 類別 → 排放形式(原文照錄,所在地基準,公噸 CO2e/年)",
  importedSankeyExcluded: "未畫出的項目(NA/NS 或為零)",
  importedSankeyNoLedger:
    "本報告已匯入,但帳本沒有任何可用數據,因此畫不出排放流向圖。桑基圖與系統數據表格的唯一來源是表3.8(各公司溫室氣體排放量),本次未取得該表。請確認第三章是否解析成功;若該章列為解析失敗,請以預覽卡的「重試失敗章節」重新匯入,並在伺服端日誌查看該表是否被丟棄及其原因。",
  importedSankeyCollapsed: "節點過多,已降為三層(組織 → 廠址 → 範疇)",
  importedSankeyOrganization: "全公司",
  importedSankeyBelowThreshold: "占比過小未畫出(公噸 CO2e/年)",
};

// Info: (20260720 - Tzuhan) mermaid 數值:引擎 Decimal 字串正規化(去千分位疑慮,不經 number)
const chartValue = (value: string): string =>
  MoneyUtil.toDecimal(value).toString();

// Info: (20260803 - Tzuhan) ISO 類別的顯示名;未提供 formatter 時原樣輸出(enum 值仍可讀出類別)
const formatCategory = (category: string, labels: ICarbonChartLabels): string =>
  labels.formatIsoCategory?.(category) ?? category;

// Info: (20260805 - Tzuhan) 範疇(Scope 1/2/3)顯示名;同上,未提供 formatter 時原樣輸出
const formatScope = (scope: string, labels: ICarbonChartLabels): string =>
  labels.formatEsgScope?.(scope) ?? scope;

/**
 * Info: (20260805 - Tzuhan) 廠址名的序號前綴((1)、(2)…)。
 * 五層圖的第三層之後要以廠址區隔節點,用全名會讓標籤長到互相重疊,
 * 而序號已足以辨識是哪一個廠址 —— 廠址全名仍在第二層看得到。
 */
const SANKEY_SITE_INDEX_PATTERN = /^\(\s*[0-9]+\s*\)/;

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
/**
 * Info: (20260806 - Tzuhan) 最前面加**月別層**:月別 → 憑證 → 排放源 → 範疇。
 *
 * 帳本紀錄本來就有真實交易日期(`EsgRecord.tradingDate`),
 * 但它在 `carbon_esg_link` 映射成 `IActivityRecord` 時被丟掉了 ——
 * 於是這張圖只畫得出「一整年的合計」,連 TREND_LINE 模板都因為
 * 「單期 ledger 無時間序列」而刻意沒上架。資料一直都在,是介面漏了欄位。
 *
 * 三個刻意的行為:
 *
 * 1. **一筆日期都沒有時不加這一層。** 對話申報與匯入報告都沒有逐筆日期,
 *    那時候月別層只會是一個「未標註期間」的漏斗節點 —— 純噪音。
 * 2. **有日期與沒日期混在一起時,沒日期的走「未標註期間」節點。**
 *    併進某個月份是編造;整批丟掉則會讓總流入不等於總流出,
 *    而這張圖的意義正是守恆的視覺化(#22 同一哲學)。
 * 3. **月別數超過上限即整層略過並明說**(見 CARBON_SANKEY_MAX_MONTH_NODES)。
 *    少一層而不講,讀者會以為這份帳本根本沒有日期。
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

  /**
   * Info: (20260720 - Tzuhan) 憑證/申報來源的節點名。
   * 節點名帶憑證 id 尾碼(cuid 尾段才有區別度;首段為時間戳易撞名)。
   */
  const originNode = (entry: IComputedLedger["entries"][number]): string =>
    entry.evidence?.voucherId
      ? `${entry.sourceName} #${entry.evidence.voucherId.slice(-8)}`
      : labels.sankeyChatNode;

  /**
   * Info: (20260806 - Tzuhan) 逐鍵累加(字串 Decimal,不經 number);同一組節點對只畫一條線。
   *
   * 分隔符取 NUL 而非可列印字元:節點名裡本來就有空白(「外購電力 #aaaa1111」),
   * 用空白或 `|` 都可能把節點名切成兩半 —— 畫出來會是一個名字不完整的節點,
   * 看起來像資料本身有問題。與匯入桑基圖同一慣例。
   */
  const EMISSION_SANKEY_KEY_SEPARATOR = "\u0000";
  const addTo = (
    map: Map<string, string>,
    from: string,
    to: string,
    co2eKg: string,
  ): void => {
    const key = [from, to].join(EMISSION_SANKEY_KEY_SEPARATOR);
    map.set(key, MoneyUtil.add(map.get(key) ?? "0", co2eKg));
  };
  const emit = (map: Map<string, string>): void => {
    map.forEach((total, key) => {
      const [from, to] = key.split(EMISSION_SANKEY_KEY_SEPARATOR);
      rows.push(`${quote(from)},${quote(to)},${chartValue(total)}`);
    });
  };

  // Info: (20260806 - Tzuhan) 月別層:逐筆解出月份(解不出即 null,絕不猜)
  const months = ledger.entries.map((entry) =>
    resolveEmissionMonth(entry.tradingTimestamp),
  );
  const distinctMonths = new Set(
    months.filter((month): month is string => month !== null),
  );
  const hasAnyMonth = distinctMonths.size > 0;
  const withMonthLayer =
    hasAnyMonth && distinctMonths.size <= CARBON_SANKEY_MAX_MONTH_NODES;

  if (withMonthLayer) {
    const byMonth = new Map<string, string>();
    ledger.entries.forEach((entry, index) => {
      // Info: (20260806 - Tzuhan) 無日期者走「未標註期間」節點:不併進任何月份,也不丟掉
      const month = months[index] ?? labels.sankeyPeriodUnknown ?? "未標註期間";
      const target = withEvidenceLayer ? originNode(entry) : entry.sourceName;
      addTo(byMonth, month, target, entry.co2eKg);
    });
    emit(byMonth);
  }

  // Info: (20260720 - Tzuhan) 憑證層:憑證/申報來源 → 排放源(值 = 單筆 CO2e)
  if (withEvidenceLayer) {
    const byOrigin = new Map<string, string>();
    ledger.entries.forEach((entry) => {
      addTo(byOrigin, originNode(entry), entry.sourceName, entry.co2eKg);
    });
    emit(byOrigin);
  }

  // Info: (20260720 - Tzuhan) 排放源 → Scope(同源加總,MoneyUtil 字串累加)
  const bySource = new Map<string, string>();
  ledger.entries.forEach((entry) => {
    addTo(
      bySource,
      entry.sourceName,
      labels.formatScope?.(entry.scopeCategory) ?? entry.scopeCategory,
      entry.co2eKg,
    );
  });
  emit(bySource);

  const lines = ["```mermaid", "sankey-beta", "", ...rows, "```"];
  if (hasAnyMonth && !withMonthLayer && labels.sankeyPeriodCollapsed) {
    lines.push("", `> _${labels.sankeyPeriodCollapsed}_`);
  }
  return lines.join("\n");
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
/**
 * Info: (20260805 - Tzuhan) 匯入報告的五層桑基圖:
 * 組織總體 → 廠址 → 範疇(Scope 1/2/3) → ISO 類別 → 子代碼。
 *
 * **第三層之後每個節點帶廠址前綴。** 先前三個廠址共用同一個類別節點,
 * 總量守恆但線互相交叉,而且看不出「屏東的類別一」與「總公司的類別一」誰是誰 ——
 * 那不是一棵樹,是一張把三棵樹疊在一起的圖。帶上前綴才是真的層級。
 *
 * **第五層是子代碼,不是燃料實體。** 使用者要的第五層是「柴油、外購電力」這種
 * 具體排放源,但表3.8 最細只到子代碼(1.1 固定式燃燒);燃料層級的名稱在表2.2/表3.1,
 * 那兩張表**只有名稱沒有數量**,而活動數據萃取目前抽不到。
 * 沒有數字就沒有流量 —— 硬畫等於自己編一個分配比例,那是零捏造要防的事。
 */
const buildImportedSankey = (
  ledger: IComputedLedger,
  labels: ICarbonChartLabels,
): string => {
  const quote = (name: string): string => `"${name.replace(/"/g, "'")}"`;
  const imported = ledger.entries.filter(isImportedEntry);

  // Info: (20260803 - Tzuhan) 只畫 REPORTED 且 > 0 者;其餘列入說明
  const positive = imported.filter((entry) =>
    MoneyUtil.toDecimal(entry.co2eKg).greaterThan(0),
  );
  const excluded = imported.filter(
    (entry) => !MoneyUtil.toDecimal(entry.co2eKg).greaterThan(0),
  );

  if (positive.length === 0) return `> _${labels.insufficient}_`;

  const totalKg = positive.reduce(
    (sum, entry) => MoneyUtil.add(sum, entry.co2eKg),
    "0",
  );

  /**
   * Info: (20260805 - Tzuhan) 低於總量 CARBON_SANKEY_MIN_SHARE_OF_TOTAL 的流量不畫。
   * 極細的線在圖上看不見,卻照樣佔一個節點與一組標籤 ——
   * 標籤互相重疊之後,連看得見的流量也讀不出來。被濾掉的一律列在圖下方。
   */
  const threshold = MoneyUtil.toDecimal(totalKg).mul(
    CARBON_SANKEY_MIN_SHARE_OF_TOTAL,
  );
  const belowThreshold = positive.filter((entry) =>
    MoneyUtil.toDecimal(entry.co2eKg).lessThan(threshold),
  );

  // Info: (20260803 - Tzuhan) 公斤 → 公噸:圖上的數字要能與原文表格逐格對照
  const toTonne = (co2eKg: string): string =>
    MoneyUtil.toDecimal(co2eKg).div(TONNE_TO_KG_MULTIPLIER).toString();

  /**
   * Info: (20260805 - Tzuhan) 節點名。第一層是組織總體,第二層是廠址原名,
   * 第三層之後以廠址的序號前綴((1)、(2)…)區隔 —— 前綴取自廠址名本身,
   * 用全名會讓標籤長到互相重疊,而序號已足以辨識是哪一個廠址。
   */
  const sitePrefix = (site: string): string =>
    site.match(SANKEY_SITE_INDEX_PATTERN)?.[0] ?? site;
  const scoped = (site: string, label: string): string =>
    `${sitePrefix(site)} ${label}`;

  const organization = labels.importedSankeyOrganization ?? "全公司";

  /**
   * Info: (20260805 - Tzuhan) 逐層累加。以公斤累加、輸出前才換公噸,少一次除法捨入;
   * 全程 MoneyUtil(字串 Decimal),不經 number —— 總流入必須等於總流出,
   * 而浮點的累加順序會讓那個等式偶爾不成立。
   */
  const addTo = (
    map: Map<string, string>,
    key: string,
    co2eKg: string,
  ): void => {
    map.set(key, MoneyUtil.add(map.get(key) ?? "0", co2eKg));
  };
  const KEY_SEPARATOR = "\u0000";
  const layers: Map<string, string>[] = [
    new Map(), // Info: 組織 → 廠址
    new Map(), // Info: 廠址 → 範疇
    new Map(), // Info: 範疇 → 類別
    new Map(), // Info: 類別 → 子代碼
  ];

  /**
   * Info: (20260805 - Tzuhan) 門檻**只套在最細一層**(類別 → 子代碼)。
   *
   * 原本套在每一筆上,後果是:台北分公司總量 9.1982 公噸(占 0.11%,高於門檻),
   * 但它的每一個單項都低於門檻 —— **整個廠址從圖上消失了**。
   * 而三個廠址是這份報告明載的組織邊界,一個營運據點不該因為規模小就從查核圖上不見。
   *
   * 前四層因此以全部正值建立,層間總流量完全守恆;
   * 只有最細一層會少掉低於門檻者,差額由圖下方的清單交代。
   * 「哪些沒畫」說得出來,就不是隱瞞。
   */
  positive.forEach((entry) => {
    const origin = entry.importedOrigin;
    if (!origin) return;
    const site = origin.site;
    const scope = scoped(
      site,
      formatScope(GhgCategoryToScope[entry.scopeCategory], labels),
    );
    const category = scoped(site, formatCategory(origin.isoCategory, labels));
    const subCategory = scoped(site, origin.subCategory);
    addTo(layers[0], [organization, site].join(KEY_SEPARATOR), entry.co2eKg);
    addTo(layers[1], [site, scope].join(KEY_SEPARATOR), entry.co2eKg);
    addTo(layers[2], [scope, category].join(KEY_SEPARATOR), entry.co2eKg);
    if (MoneyUtil.toDecimal(entry.co2eKg).greaterThanOrEqualTo(threshold)) {
      addTo(
        layers[3],
        [category, subCategory].join(KEY_SEPARATOR),
        entry.co2eKg,
      );
    }
  });

  const nodeCount = new Set(
    layers.flatMap((layer) =>
      Array.from(layer.keys()).flatMap((key) => key.split(KEY_SEPARATOR)),
    ),
  ).size;
  /**
   * Info: (20260805 - Tzuhan) 節點過多即砍掉最細的兩層(範疇 → 類別 → 子代碼),
   * 只留 組織 → 廠址 → 範疇。寧可少幾層也不畫成毛線團 ——
   * 沿用 20260803 的同一條哲學,只是這次砍的是尾端而非中段。
   */
  const collapsed = nodeCount > CARBON_SANKEY_MAX_IMPORTED_NODES;
  const emitted = collapsed ? layers.slice(0, 2) : layers;

  const rows = emitted.flatMap((layer) =>
    Array.from(layer.entries()).map(([key, co2eKg]) => {
      const [from, to] = key.split(KEY_SEPARATOR);
      return `${quote(from)},${quote(to)},${toTonne(co2eKg)}`;
    }),
  );

  const lines = ["```mermaid", "sankey-beta", "", ...rows, "```"];
  if (labels.importedSankeyTitle) {
    lines.unshift(`**${labels.importedSankeyTitle}**`, "");
  }
  if (collapsed && labels.importedSankeyCollapsed) {
    lines.push("", `> _${labels.importedSankeyCollapsed}_`);
  }
  /**
   * Info: (20260805 - Tzuhan) 沒畫出來的東西必須說出來:
   * 只看圖會以為那些項目是零,而 NA/NS 的意思正好相反,而低於門檻的也不是零。
   * 兩種原因分開列 —— 「沒有數字」與「數字太小」是不同的事實。
   */
  if (excluded.length > 0 && labels.importedSankeyExcluded) {
    lines.push("", `**${labels.importedSankeyExcluded}**`, "");
    excluded.forEach((entry) => {
      lines.push(`- ${entry.sourceName}`);
    });
  }
  if (belowThreshold.length > 0 && labels.importedSankeyBelowThreshold) {
    lines.push("", `**${labels.importedSankeyBelowThreshold}**`, "");
    belowThreshold.forEach((entry) => {
      lines.push(`- ${entry.sourceName} ${toTonne(entry.co2eKg)}`);
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
    /**
     * Info: (20260806 - Tzuhan) 匯入桑基圖的空帳本要說對的原因。
     * `insufficient` 指向「補齊活動數據」,而匯入路徑的數據來自表3.8,
     * 不是使用者一筆一筆補 —— 指錯方向的提示比沒有提示更貴。
     */
    if (templateId === CarbonChartTemplateEnum.IMPORTED_EMISSION_SANKEY) {
      return wrap(
        `> _${labels.importedSankeyNoLedger ?? labels.insufficient}_`,
      );
    }
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
