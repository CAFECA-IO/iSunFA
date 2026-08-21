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
  PERCENT_MULTIPLIER,
  SITE_SHARE_DECIMAL_PLACES,
  CARBON_SANKEY_TOP_ITEM_COUNT,
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
/**
 * Info: (20260820 - Emily) 為什麼有三個欄位是必填而其餘是選填。
 *
 * 選填 + `if (labels.x)` + 呼叫端是完整物件字面值（沒有 spread 預設值）
 * = 加了新文案卻忘了接 i18n 時**紙上什麼都不印，而且沒有任何錯誤**。
 * 這個坑在本檔與 `use_carbon_chat.ts` 的註解裡記過三次
 * （20260805、20260806、20260819），第三次是 08-19 兩趟驗收全紅。
 *
 * 註解防不住它，型別可以：`importedSankeyTitle`、`importedSankeyIsoMapping`、
 * `importedTopItemsTitle` 這三個是**紙上一定要有的文字**，改成必填之後，
 * 呼叫端漏接會在 `tsc --noEmit` 就紅（#6671 已把它放進 `npm test`）。
 *
 * 驗收方式：在本型別加一個新的必填欄位而不動 `use_carbon_chat.ts`，
 * `tsc` 必須報 TS2741。
 *
 * 其餘欄位維持選填是刻意的 —— 它們是「有就印、沒有就略過」的補充說明
 * （廠址小計、低於門檻、期間未標註…），缺了不會讓讀者看不到主要內容。
 */
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
  importedSankeyTitle: string;
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
  /**
   * Info: (20260806 - Tzuhan) 子代碼 ↔ GHG Protocol 類別對照的抬頭。
   * 那個映射是 1:1 所以不畫成一層,但它是一個分類判斷,必須說出來。
   */
  importedSankeyGhgMapping?: string;
  /**
   * Info: (20260819 - Emily) 範疇制與 ISO 類別制的對照說明(`open/53`)。
   *
   * 圖上的分類層印的是 GHG Protocol 的範疇一/二/三,而本報告的敘述採 ISO 14064-1
   * 類別一~六 —— 兩邊各自都對,中間對不上,而**紙上沒有一句話說它們是同一批排放源**。
   * 08-19 量到:一份宣告依 ISO 14064-1 編製的報告裡,「範疇」出現 77 次,
   * 其中至少 72 次是系統自己印上去的(客戶原文全文只有 5 次)。
   *
   * 與上面 `importedSankeyGhgMapping` 同一個理由:隱藏的分類判斷等於沒有依據,
   * 查核者無法質疑他看不到的東西。所以不是把「範疇」藏起來,是把對照說出來。
   *
   * 這是固定文字而不是交給模型寫的原因:模型不知道系統圖表印了什麼標籤,
   * 叫它寫這一句就是叫它猜;而固定文字驗得起來(驗收腳本可以要求它與「範疇」同時出現)。
   *
   * 真修是把圖表改成類別制(`open/53`),但那要改**分組鍵**不只是換標籤 ——
   * 多個 GHG 類別對到同一個 ISO 類別(Cat 1/2/3/5/8 → 類別四),
   * 只換標籤會得到好幾列「類別四」各自小計,比現在更糟。
   */
  importedSankeyIsoMapping: string;
  /** Info: (20260806 - Tzuhan) 排放去向圖的標題(前 N 大 + 其他) */
  importedTopItemsTitle: string;
  /**
   * Info: (20260806 - Tzuhan) 「其他」節點名。**它是一個真的節點**,不是丟掉 ——
   * 沒進前 N 名的流量仍然畫在圖上,廠址的流出才等於流入。
   */
  importedSankeyOther?: string;
  /** Info: (20260805 - Tzuhan) 第一層節點名(組織總體) */
  importedSankeyOrganization?: string;
  /**
   * Info: (20260805 - Tzuhan) 圖下方「低於門檻未畫出」說明抬頭。
   * 與 importedSankeyExcluded 分開:「沒有數字」與「數字太小」是不同的事實。
   */
  importedSankeyBelowThreshold?: string;
  /**
   * Info: (20260807 - Tzuhan) 廠址小計清單的抬頭(分類圖抽掉廠址層後改列在圖下)。
   * 廠址是報告明載的組織邊界,不畫在圖上不等於可以不說 ——
   * 少了這份清單,「哪個據點排最多」就從這一節消失了。
   */
  importedSankeySiteTotals?: string;
  // Info: (20260722 - Tzuhan) UAT:範疇 enum 值不可讀 → 顯示名 formatter(未提供時原樣輸出)
  formatScope?: (scope: string) => string;
  /**
   * Info: (20260807 - Tzuhan) 子代碼顯示名(`2.1 外購電力`)。
   *
   * 末端節點原本只印代碼,而「2.1」對讀者不是資訊 —— 實測回報「尾端看不出流向哪裡」。
   * 未提供時原樣輸出代碼(不猜),與 formatScope 同一慣例。
   */
  formatSubCategory?: (subCategory: string) => string;
  /** Info: (20260805 - Tzuhan) 三大範疇(Scope 1/2/3)顯示名;桑基圖第三層用 */
  formatEsgScope?: (scope: string) => string;
}

// Info: (20260807 - Emily) 桑基圖根節點的顯示名:預設標籤與 fallback 共用同一個來源
// Info: (20260807 - Emily) (PR review 低優先項:魔法字串重複)
const SANKEY_ROOT_LABEL = "全公司";

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
    "排放分類:全公司 → 範疇 → 子代碼(原文照錄,所在地基準,公噸 CO2e/年)",
  importedSankeyExcluded: "未畫出的項目(NA/NS 或為零)",
  importedSankeyNoLedger:
    "本報告已匯入,但帳本沒有任何可用數據,因此畫不出排放流向圖。桑基圖與系統數據表格的唯一來源是表3.8(各公司溫室氣體排放量),本次未取得該表。請確認第三章是否解析成功;若該章列為解析失敗,請以預覽卡的「重試失敗章節」重新匯入,並在伺服端日誌查看該表是否被丟棄及其原因。",
  importedSankeyCollapsed: "節點過多,已降為一層(全公司 → 範疇)",
  importedSankeySiteTotals: "各廠址小計(公噸 CO2e/年,占全公司比)",
  importedSankeyGhgMapping: "子代碼與 GHG Protocol 類別的對照",
  importedSankeyIsoMapping:
    "圖上的分類層依 GHG Protocol 範疇標示;對照 ISO 14064-1 為:範疇一=類別一、範疇二=類別二、範疇三=類別三至類別六。本報告敘述採 ISO 14064-1 類別制,兩者指同一批排放源。",
  importedTopItemsTitle:
    "排放去向:全公司 → 前九大排放項目與其他(原文照錄,所在地基準,公噸 CO2e/年)",
  importedSankeyOther: "其他",
  importedSankeyOrganization: SANKEY_ROOT_LABEL,
  importedSankeyBelowThreshold: "占比過小未畫出(公噸 CO2e/年)",
};

// Info: (20260720 - Tzuhan) mermaid 數值:引擎 Decimal 字串正規化(去千分位疑慮,不經 number)
const chartValue = (value: string): string =>
  MoneyUtil.toDecimal(value).toString();

/**
 * Info: (20260807 - Tzuhan) 子代碼顯示名(`2.1 外購電力`);未提供 formatter 時原樣輸出代碼。
 * 原樣輸出而非留空:代碼本身是可查的事實,而編一個名稱不是。
 */
const formatSubCategory = (
  subCategory: string,
  labels: ICarbonChartLabels,
): string => labels.formatSubCategory?.(subCategory) ?? subCategory;

// Info: (20260805 - Tzuhan) 範疇(Scope 1/2/3)顯示名;同上,未提供 formatter 時原樣輸出
const formatScope = (scope: string, labels: ICarbonChartLabels): string =>
  labels.formatEsgScope?.(scope) ?? scope;

/**
 * Info: (20260805 - Tzuhan) 廠址名的序號前綴((1)、(2)…)。
 * 五層圖的第三層之後要以廠址區隔節點,用全名會讓標籤長到互相重疊,
 * 而序號已足以辨識是哪一個廠址 —— 廠址全名仍在第二層看得到。
 */
const SANKEY_SITE_INDEX_PATTERN = /^\(\s*[0-9]+\s*\)/;

interface ISankeyEdge {
  from: string;
  to: string;
  co2eKg: string;
}

/**
 * Info: (20260806 - Tzuhan) 摺疊「純傳遞」節點:一入、一出,且進出數值相同。
 *
 * ## 為什麼要摺
 *
 * 這種節點在數學上什麼都沒說 —— 流量進來多少就出去多少,沒有分岔、沒有分解。
 * 而它在畫面上要付兩份代價:佔一個欄位的寬度,而且 mermaid 把標籤畫在節點右側,
 * 於是它的標籤會壓到下一層節點的標籤上。
 *
 * 實測那份報告正是如此:範疇一 2831.93 → 類別一 2831.93、範疇二 3464.5 → 類別二 3464.5,
 * 兩組數值完全相同(ISO 14064 的類別一/二 與範疇一/二 本來就是一對一),
 * 於是「(1) 範疇二 3464.5」的標籤直接疊在「(1) 類別二 3464.5」上,兩者都讀不出來。
 * 而範疇三 2026.96 → 類別三 1242.47 + 類別四 784.49 **真的分岔**,那一個保留。
 *
 * 也就是說:重疊不是隨機的擁擠,是那兩層在這份報告裡本來就重複。
 * 靠縮短字或拉大畫布治不了根 —— 該拿掉的是沒有帶進資訊的節點。
 *
 * ## 資訊零損失
 *
 * 摺疊只是把 `A → N → B`(兩段同值)換成 `A → B`,總流入與總流出完全不變。
 * 被摺掉的節點名稱其實仍在下游節點的標籤裡看得到分類層級(類別一就是範疇一),
 * 所以讀者不會少知道任何一件事。
 *
 * ## 受保護的節點
 *
 * `protectedNodes` 的成員即使符合條件也不摺 —— 組織與廠址在此列。
 * 廠址是報告明載的組織邊界,不因數值重複而消失。
 *
 * ## 決定性
 *
 * 每一輪只摺第一個符合條件的節點,並在原位置替換那條邊(不 push 到尾端),
 * 因此同輸入必得同輸出、同順序。連續的傳遞鏈會在多輪中逐一摺完。
 */
export function collapsePassThroughNodes(
  edges: readonly ISankeyEdge[],
  protectedNodes: ReadonlySet<string>,
): ISankeyEdge[] {
  let current: ISankeyEdge[] = [...edges];

  // Info: (20260806 - Tzuhan) 最多摺 edges.length 輪:每輪必減一條邊,故不可能無窮迴圈
  for (let round = 0; round < edges.length; round += 1) {
    const inbound = new Map<string, number[]>();
    const outbound = new Map<string, number[]>();
    current.forEach((edge, index) => {
      if (!inbound.has(edge.to)) inbound.set(edge.to, []);
      inbound.get(edge.to)?.push(index);
      if (!outbound.has(edge.from)) outbound.set(edge.from, []);
      outbound.get(edge.from)?.push(index);
    });

    // Info: (20260806 - Tzuhan) 依邊的順序找候選,結果才與輸入順序無關地穩定
    const target = current
      .map((edge) => edge.to)
      .find((node) => {
        if (protectedNodes.has(node)) return false;
        const ins = inbound.get(node) ?? [];
        const outs = outbound.get(node) ?? [];
        if (ins.length !== 1 || outs.length !== 1) return false;
        return MoneyUtil.toDecimal(current[ins[0]].co2eKg).equals(
          MoneyUtil.toDecimal(current[outs[0]].co2eKg),
        );
      });
    if (target === undefined) return current;

    const inIndex = (inbound.get(target) ?? [])[0];
    const outIndex = (outbound.get(target) ?? [])[0];
    // Info: (20260806 - Tzuhan) 在入邊的原位置替換,維持列的視覺順序
    current = current
      .map((edge, index) =>
        index === inIndex
          ? { from: edge.from, to: current[outIndex].to, co2eKg: edge.co2eKg }
          : edge,
      )
      .filter((_edge, index) => index !== outIndex);
  }
  return current;
}

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
 * Info: (20260806 - Tzuhan) 匯入報告的分類切面:**廠址 → 範疇 → 子代碼**(三層)。
 *
 * ## 為什麼從五層減成三層
 *
 * 原本是 組織 → 廠址 → 範疇 → ISO 類別 → 子代碼。
 * 但 **範疇 → ISO 類別 對類別一/二是 1:1**(見 SCOPE_BY_ISO_SUBCATEGORY 的明表:
 * 類別一整組 → 範疇一、類別二 → 範疇二),而 1:1 的層在 sankey 上必然重疊 ——
 * mermaid 把標籤畫在節點右側,「範疇二 3464.5」就直接壓在「類別二 3464.5」上。
 *
 * 那不是排版沒調好,是那兩層本來就重複。ISO 類別的資訊並沒有消失:
 * 子代碼的第一個數字就是它的類別(3.1 屬類別三),而類別的完整名稱在原文表格裡。
 *
 * 「這份報告的排放去哪了」(見 IMPORTED_TOP_ITEMS_SANKEY)與「它怎麼分類的」
 * 本來就是兩個問題,查核者也是分開問的 —— 兩張三層圖比一張五層圖好讀。
 *
 * ## GHG Protocol 類別不另開一層
 *
 * `SCOPE_BY_ISO_SUBCATEGORY` 是**子代碼 → GHG 類別的 1:1 EXACT 映射**
 * (3.1 上游運輸 → Cat 4、3.2 下游運輸 → Cat 9、3.3 員工通勤 → Cat 7…),
 * 所以 GHG 類別是子代碼的**換名**而不是再細分 —— 另開一層即純傳遞節點。
 * 改為在圖下方列一份對照,把那個映射明白說出來(隱藏的判斷等於沒有依據)。
 *
 * ## 子代碼是最細,不是燃料實體
 *
 * 表3.8 最細只到子代碼(1.1 固定式燃燒);燃料層級的名稱在表2.2/表3.1,
 * 而**那兩張表只有名稱沒有數量**。沒有數字就沒有流量 ——
 * 硬畫等於自己編一個分配比例,那是零捏造要防的事。
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
   *
   * Info: (20260807 - Tzuhan) 抽掉廠址層之後,門檻是以**全公司合併後**的項目計算。
   * 這比原本寬鬆:先前台北分公司的每一項單獨看都低於門檻,合併後它們與屏東的同一
   * 子代碼相加,反而畫得出來 —— 而「全公司的 2.1 有多少」正是這張圖要回答的。
   */
  const threshold = MoneyUtil.toDecimal(totalKg).mul(
    CARBON_SANKEY_MIN_SHARE_OF_TOTAL,
  );

  // Info: (20260803 - Tzuhan) 公斤 → 公噸:圖上的數字要能與原文表格逐格對照
  const toTonne = (co2eKg: string): string =>
    MoneyUtil.toDecimal(co2eKg).div(TONNE_TO_KG_MULTIPLIER).toString();

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
    new Map(), // Info: (20260806 - Tzuhan) 全公司 → 範疇
    new Map(), // Info: (20260806 - Tzuhan) 範疇 → 子代碼
  ];

  /**
   * Info: (20260806 - Tzuhan) 子代碼 ↔ GHG Protocol 類別的對照(只記圖上實際畫出的)。
   *
   * 不另開一層的理由見本函式檔頭:那個映射是 1:1,另開一層即純傳遞節點。
   * 但**必須說出來** —— 那是一個分類判斷,而隱藏的判斷等於沒有依據。
   */
  const ghgBySubCategory = new Map<string, string>();

  /**
   * Info: (20260807 - Tzuhan) 廠址小計:不畫在圖上,但一定要說。
   * 廠址是報告明載的組織邊界;抽掉那一層是為了讓線讀得出比重,
   * 不是為了讓據點消失。清單保留每個廠址的總量與占比,
   * 而廠址 × 子代碼的完整矩陣本來就是同一節的原文表3.8。
   */
  const bySite = new Map<string, string>();

  /**
   * Info: (20260807 - Tzuhan) 子代碼合併後的總量:門檻的判定基準(理由見下方註解)。
   * 鍵用原始代碼而非顯示名 —— 顯示名可能隨語系變,而門檻的判定不該隨語系變。
   */
  const byCode = new Map<string, string>();

  const organization = labels.importedSankeyOrganization ?? SANKEY_ROOT_LABEL;

  positive.forEach((entry) => {
    const origin = entry.importedOrigin;
    if (!origin) return;
    const scope = formatScope(GhgCategoryToScope[entry.scopeCategory], labels);
    const subCategory = formatSubCategory(origin.subCategory, labels);
    ghgBySubCategory.set(
      origin.subCategory,
      labels.formatScope?.(entry.scopeCategory) ?? entry.scopeCategory,
    );
    addTo(
      bySite,
      // Info: (20260807 - Tzuhan) 去掉原文那個不唯一的 `(n)`(兩個廠址都寫 `(1)`)
      origin.site.replace(SANKEY_SITE_INDEX_PATTERN, "").trim() || origin.site,
      entry.co2eKg,
    );
    addTo(layers[0], [organization, scope].join(KEY_SEPARATOR), entry.co2eKg);
    // Info: (20260807 - Tzuhan) 先全部累加,門檻在合併後才套(見下)
    addTo(layers[1], [scope, subCategory].join(KEY_SEPARATOR), entry.co2eKg);
    addTo(byCode, origin.subCategory, entry.co2eKg);
  });

  /**
   * Info: (20260807 - Tzuhan) 門檻**只套最細一層,而且是在合併之後才套**。
   *
   * 逐筆套會出事:台北分公司的 2.1 外購電力是 5.8344 公噸,低於門檻(8.33),
   * 而屏東的 2.1 是 3464.5 —— 抽掉廠址層之後兩者是同一個節點。
   * 逐筆濾掉台北那筆的後果是「範疇二 3470.34 → 2.1 外購電力 3464.50」:
   * **差額 5.83 憑空消失,而它既沒畫出來、也不在「未畫出」清單裡**
   * (清單是以合併後的值算的,合併後 2.1 遠高於門檻)。
   *
   * 那正是本模組再三聲明要避免的形狀:沒畫出來的東西必須說得出來。
   * 所以判定與清單都以合併後的值為準 —— 一個子代碼要嘛整個畫、要嘛整個列在下面。
   */
  const belowThreshold = Array.from(byCode.entries()).filter(([, co2eKg]) =>
    MoneyUtil.toDecimal(co2eKg).lessThan(threshold),
  );
  const droppedCodes = new Set(
    belowThreshold.map(([code]) => formatSubCategory(code, labels)),
  );
  Array.from(layers[1].keys()).forEach((key) => {
    if (droppedCodes.has(key.split(KEY_SEPARATOR)[1])) layers[1].delete(key);
  });

  const nodeCount = new Set(
    layers.flatMap((layer) =>
      Array.from(layer.keys()).flatMap((key) => key.split(KEY_SEPARATOR)),
    ),
  ).size;
  /**
   * Info: (20260806 - Tzuhan) 節點過多即砍掉最細一層,只留 全公司 → 範疇。
   * 寧可少一層也不畫成毛線團 —— 沿用 20260803 的同一條哲學。
   */
  const collapsed = nodeCount > CARBON_SANKEY_MAX_IMPORTED_NODES;
  const emitted = collapsed ? layers.slice(0, 1) : layers;

  const edges: ISankeyEdge[] = emitted.flatMap((layer) =>
    Array.from(layer.entries()).map(([key, co2eKg]) => {
      const [from, to] = key.split(KEY_SEPARATOR);
      return { from, to, co2eKg };
    }),
  );

  /**
   * Info: (20260807 - Tzuhan) 根節點(全公司)不參與摺疊。
   *
   * 只有一個範疇時「全公司 → 範疇一」是 1 進 1 出且等值,摺疊規則會把它吃掉,
   * 而那樣圖上就只剩子代碼、沒有總量 —— 讀者無從知道這些項目加起來是多少。
   * 前車之鑑是門檻套錯層級讓台北分公司整個消失:
   * 數學上多餘的節點,在查核上不一定多餘。
   */
  /**
   * Info: (20260807 - Emily) 範疇層一併保護 —— 摺疊規則當初的免責條件已經不成立
   * (issue_drafts/inventory_table_import/11)。
   *
   * `collapsePassThroughNodes` 的「資訊零損失」論證寫的是:
   * 被摺掉的節點名稱仍在下游節點的標籤裡看得到(類別一就是範疇一)。
   * 那在下游節點是 **ISO 類別**時成立;但 20260806 改成顯示**子代碼**之後,
   * 下游變成「2.1 外購電力」,而它與範疇的對應關係不再寫在標籤上。
   *
   * 後果在 UAT 實測到:範疇一(分岔到 1.1~1.4)與範疇三(分岔到 3.x/4.x)都留著,
   * 唯獨範疇二只有 2.1 一個子代碼,於是被摺掉 ——
   * 圖上變成「全公司 → 2.1 外購電力」,三個範疇只畫得出兩個。
   * 而被摺掉的那個是 3470.34 公噸,**占全公司 42%,是最大的一塊**。
   *
   * 對查核者來說這不是版面問題:圖的標題寫著「全公司 → 範疇 → 子代碼」,
   * 卻有一個範疇不在圖上,而且無法從圖上讀出它的小計。
   * 數學上多餘的節點,在查核上不一定多餘 —— 與上面保護根節點的同一條理由。
   */
  const scopeNodes = Array.from(layers[0].keys()).map(
    (key) => key.split(KEY_SEPARATOR)[1],
  );
  const protectedNodes = new Set<string>([organization, ...scopeNodes]);

  const rows = collapsePassThroughNodes(edges, protectedNodes).map(
    (edge) => `${quote(edge.from)},${quote(edge.to)},${toTonne(edge.co2eKg)}`,
  );

  const lines = ["```mermaid", "sankey-beta", "", ...rows, "```"];
  if (labels.importedSankeyTitle) {
    lines.unshift(`**${labels.importedSankeyTitle}**`, "");
  }
  if (collapsed && labels.importedSankeyCollapsed) {
    lines.push("", `> _${labels.importedSankeyCollapsed}_`);
  }
  /**
   * Info: (20260807 - Tzuhan) 各廠址小計。排序由大到小,同額時以廠址名收斂 ——
   * 同一份輸入必須輸出同一份清單(決定性)。占比以公斤計算再取百分比,
   * 不用已經換過公噸的值:少一次捨入。
   */
  if (bySite.size > 0 && labels.importedSankeySiteTotals) {
    lines.push("", `**${labels.importedSankeySiteTotals}**`, "");
    Array.from(bySite.entries())
      .sort((a, b) => {
        const diff = MoneyUtil.toDecimal(b[1]).comparedTo(
          MoneyUtil.toDecimal(a[1]),
        );
        return diff !== 0 ? diff : a[0].localeCompare(b[0]);
      })
      .forEach(([site, co2eKg]) => {
        const share = MoneyUtil.toDecimal(co2eKg)
          .div(MoneyUtil.toDecimal(totalKg))
          .mul(PERCENT_MULTIPLIER)
          .toDecimalPlaces(SITE_SHARE_DECIMAL_PLACES)
          .toString();
        lines.push(`- ${site} ${toTonne(co2eKg)} (${share}%)`);
      });
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
  /**
   * Info: (20260807 - Emily) 降為一層時不列這份清單(PR review 低優先項)。
   *
   * 這份清單宣稱「這些項目因為占比過小才沒畫出來」。而 collapsed 的時候,
   * 套門檻的那一層(範疇 → 子代碼)整層都沒畫 —— 圖上一個子代碼都沒有,
   * 不是只有清單裡這幾個沒有。
   *
   * 所以它不是一句措辭不夠精確的話,是一句**不成立**的話:
   * 它把「整層被拿掉」說成「這幾個太小」,讀者會反過來以為其餘子代碼都畫出來了。
   * 真正的原因旁邊已經講了(「節點過多,已降為一層」),這份清單只會蓋掉它。
   *
   * 少畫的東西必須說出來 —— 但說的必須是**真正的原因**,
   * 否則「有交代」反而比「沒交代」更容易讓人誤判。
   */
  if (
    !collapsed &&
    belowThreshold.length > 0 &&
    labels.importedSankeyBelowThreshold
  ) {
    lines.push("", `**${labels.importedSankeyBelowThreshold}**`, "");
    belowThreshold
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([subCategory, co2eKg]) => {
        lines.push(
          `- ${formatSubCategory(subCategory, labels)} ${toTonne(co2eKg)}`,
        );
      });
  }
  /**
   * Info: (20260806 - Tzuhan) 子代碼 ↔ GHG Protocol 類別的對照。
   *
   * 這個映射是一個**分類判斷**(ISO 14064-1 的 3.1 上游運輸 = GHG Protocol Cat 4),
   * 而隱藏的判斷等於沒有依據 —— 查核者無法質疑他看不到的東西。
   * 不畫成一層是因為映射 1:1,那會是純傳遞節點;但省略不說是另一回事。
   *
   * 只列圖上實際畫出的子代碼:列出沒畫的會讓人以為圖上有。
   */
  if (ghgBySubCategory.size > 0 && labels.importedSankeyGhgMapping) {
    lines.push("", `**${labels.importedSankeyGhgMapping}**`, "");
    Array.from(ghgBySubCategory.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([subCategory, ghgCategory]) => {
        /**
         * Info: (20260807 - Tzuhan) 左邊只放**代碼**,不放名稱。
         *
         * 名稱已經在圖上的節點文字裡了;而這份清單要說的是「映射」,
         * 兩邊都放名稱會出現「3.1 上游運輸與配送 → 上游運輸與配送」這種
         * 看起來像 bug 的同語重複 —— ISO 與 GHG Protocol 對這幾項的用詞剛好一樣。
         */
        lines.push(`- ${subCategory} → ${ghgCategory}`);
      });
  }
  /**
   * Info: (20260819 - Emily) 對照說明不綁 `ghgBySubCategory` 是否為空 ——
   * 圖上的範疇標籤在任何情況下都印得出來,說明就得跟著在。
   */
  if (labels.importedSankeyIsoMapping) {
    lines.push("", `> _${labels.importedSankeyIsoMapping}_`);
  }
  return lines.join("\n");
};

/**
 * Info: (20260806 - Tzuhan) 匯入報告的**排放去向**:全公司 → 廠址 → 前 N 大項目 + 其他。
 *
 * ## 為什麼與分類切面拆成兩張
 *
 * sankey 的每一層必須是上一層的細分。原本一張圖硬塞
 * 組織 → 廠址 → 範疇 → ISO 類別 → 子代碼,而範疇 → ISO 類別 對類別一/二是 1:1 ——
 * 1:1 的層必然讓標籤互相重疊。詳見 buildImportedSankey 的檔頭。
 *
 * 「排放去哪了」與「怎麼分類的」是兩個問題,分開問、分開畫。
 *
 * ## 前 N 大 + 其他,而不是門檻
 *
 * 名額給的是節點數的**上界**;門檻是相對值,通過的節點數沒有上限。
 * 而且門檻已經害過一次:台北分公司總量占 0.11% 高於門檻,
 * 但它每一個單項都低於門檻 —— 整個廠址從圖上消失。
 *
 * **「其他」是一個真的節點**,不是丟掉:沒進前 N 名的流量仍然畫在圖上,
 * 所以每個廠址的流出等於它的流入,總量守恆。
 * 門檻制做不到這件事 —— 它只能把那些流量從圖上移除,再列在圖下方。
 *
 * ## 名額是逐廠址算的
 *
 * 前 N 大取「該廠址底下的項目」,不是全公司通吃。
 * 全公司通吃的話,小廠址的項目永遠擠不進前九名,那個廠址就只會有一條「其他」——
 * 又回到「小廠址看不見」的老問題。
 */
const buildImportedTopItemsSankey = (
  ledger: IComputedLedger,
  labels: ICarbonChartLabels,
): string => {
  const quote = (name: string): string => `"${name.replace(/"/g, "'")}"`;
  const imported = ledger.entries.filter(isImportedEntry);
  const positive = imported.filter((entry) =>
    MoneyUtil.toDecimal(entry.co2eKg).greaterThan(0),
  );
  const excluded = imported.filter(
    (entry) => !MoneyUtil.toDecimal(entry.co2eKg).greaterThan(0),
  );
  if (positive.length === 0) {
    return `> _${labels.importedSankeyNoLedger ?? labels.insufficient}_`;
  }

  const toTonne = (co2eKg: string): string =>
    MoneyUtil.toDecimal(co2eKg).div(TONNE_TO_KG_MULTIPLIER).toString();

  const organization = labels.importedSankeyOrganization ?? SANKEY_ROOT_LABEL;
  const otherLabel = labels.importedSankeyOther ?? "其他";

  /**
   * Info: (20260806 - Tzuhan) 兩層:全公司 → 前 N 大項目 + 其他。**刻意沒有廠址層。**
   *
   * 第一版做成 組織 → 廠址 → 逐廠址前九大,結果是 3 × (9+1) = 最多 30 個葉節點,
   * 而實測這份報告 97.5% 集中在一個廠址 —— 另外兩個廠址合計 2.5%,
   * 它們那十幾個項目全是看不見的細線,把整張圖的比重稀釋掉。
   *
   * 廠址的分布在分類切面那張圖的第一層就看得到(#1 201 / #2 9.2 / #3 8121),
   * 這裡再分一次沒有帶進資訊,只是讓「哪一項最大」變得讀不出來 ——
   * 而那正是這張圖唯一要回答的問題。
   *
   * 項目跨廠址依子代碼合併:公司層級的「前九大排放項目」本來就是合併後的概念。
   * 以公斤累加、輸出前才換公噸:少一次除法捨入。
   */
  const byItem = new Map<string, string>();
  positive.forEach((entry) => {
    const origin = entry.importedOrigin;
    if (!origin) return;
    byItem.set(
      origin.subCategory,
      MoneyUtil.add(byItem.get(origin.subCategory) ?? "0", entry.co2eKg),
    );
  });

  /**
   * Info: (20260806 - Tzuhan) 排序鍵帶子代碼:同額項目的先後才是決定性的。
   * 只比數值時同額項目的順序取決於 Map 的走訪順序,那會讓同一份輸入畫出不同的圖。
   */
  const sorted = Array.from(byItem.entries()).sort((a, b) => {
    const diff = MoneyUtil.toDecimal(b[1]).comparedTo(
      MoneyUtil.toDecimal(a[1]),
    );
    return diff !== 0 ? diff : a[0].localeCompare(b[0]);
  });
  const top = sorted.slice(0, CARBON_SANKEY_TOP_ITEM_COUNT);
  const rest = sorted.slice(CARBON_SANKEY_TOP_ITEM_COUNT);

  /**
   * Info: (20260807 - Tzuhan) 末端節點印**代碼 + 標準名稱**(`2.1 外購電力`)。
   *
   * 原本只印代碼。實測回報:「尾端只有代碼,看不出流向哪裡」——
   * 這張圖是給查證人員與主管看的,而 `2.1` 要回頭翻表才知道是外購電力。
   * 代碼留在前面,才能拿這個標籤回原文表3.8 逐格對照(見 formatIsoSubCategoryLabel)。
   */
  const rows: string[] = top.map(
    ([subCategory, co2eKg]) =>
      `${quote(organization)},${quote(formatSubCategory(subCategory, labels))},${toTonne(co2eKg)}`,
  );
  /**
   * Info: (20260806 - Tzuhan) 「其他」是一個**真的節點**,不是丟掉 ——
   * 沒進前 N 名的流量仍然畫在圖上,所以第一層的流出等於原文全公司總量。
   * 門檻制做不到這件事:它只能把那些流量從圖上移除,再列在圖下方。
   */
  if (rest.length > 0) {
    const otherTotal = rest.reduce(
      (sum, [, value]) => MoneyUtil.add(sum, value),
      "0",
    );
    rows.push(
      `${quote(organization)},${quote(`${otherLabel}(${rest.length})`)},${toTonne(otherTotal)}`,
    );
  }

  const lines = ["```mermaid", "sankey-beta", "", ...rows, "```"];
  if (labels.importedTopItemsTitle) {
    lines.unshift(`**${labels.importedTopItemsTitle}**`, "");
  }
  /**
   * Info: (20260806 - Tzuhan) NA/NS 與為零者仍要列出:這張圖沒有門檻,
   * 所以「沒畫出來」只剩一個原因 —— 原文根本沒有數字。那件事必須說出來。
   */
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
    /**
     * Info: (20260806 - Tzuhan) 匯入桑基圖的空帳本要說對的原因。
     * `insufficient` 指向「補齊活動數據」,而匯入路徑的數據來自表3.8,
     * 不是使用者一筆一筆補 —— 指錯方向的提示比沒有提示更貴。
     */
    if (
      templateId === CarbonChartTemplateEnum.IMPORTED_EMISSION_SANKEY ||
      templateId === CarbonChartTemplateEnum.IMPORTED_TOP_ITEMS_SANKEY
    ) {
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
    case CarbonChartTemplateEnum.IMPORTED_TOP_ITEMS_SANKEY:
      return wrap(buildImportedTopItemsSankey(ledger, labels));
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
/**
 * Info: (20260807 - Emily) 一個區塊裡有沒有「真的東西」。
 *
 * 資料不足時 `buildCarbonChartBlock` 回的是一句佔位提示,既沒有 mermaid 圍籬
 * 也沒有表格列。用「有沒有這兩者」判斷,比拿字串去比對 i18n 文案可靠 ——
 * 文案會改,而且有五種語言。
 */
const carriesRenderedData = (block: string): boolean =>
  block.includes("```mermaid") || /^\s*\|.*\|\s*$/m.test(block);

// Info: (20260807 - Emily) 取出兩個錨點之間的現有內容(含錨點);找不到就回空字串
const readExistingBlock = (
  content: string,
  templateId: CarbonChartTemplateEnum,
): string => {
  const start = content.indexOf(buildChartAnchorStart(templateId));
  if (start < 0) return "";
  const endAnchor = buildChartAnchorEnd(templateId);
  const end = content.indexOf(endAnchor, start);
  if (end < 0) return "";
  return content.slice(start, end + endAnchor.length);
};

/**
 * Info: (20260807 - Emily) 依帳本重建所有內嵌圖表。
 *
 * ## 算不出圖的重建,不得蓋掉已經有圖的區塊
 *
 * 這是 UAT 追了一整天的「刷新後桑基圖不見」的真因
 * (issue_drafts/inventory_table_import/12)。刷新前後兩份 markdown 比對後很明確:
 * **錨點完好,中間的內容被換成了「(資料不足,補齊活動數據後由系統自動生成圖表)」**。
 * 也就是說圖沒有存丟、也沒有讀丟 —— 是重載時這支函式拿著一份還沒載入完的帳本
 * 重建了一次,算出「沒有資料」,然後把好好的圖蓋掉,接著那份殘缺內容被存了回去。
 *
 * 一次失敗的重建於是變成永久的資料損失。這與 `12` 修過的
 * 「一次還原失敗變成永久失敗」是同一個形狀,只是換了一層。
 *
 * 判斷的依據不是「帳本是不是空的」—— 那正是呼叫端搞不清楚的事,
 * 而是**新算出來的東西有沒有比現有的少**。帳本真的被清空時,
 * 使用者會經由明確的操作把圖移除,而不是靠一次沉默的重建。
 */
export const refreshCarbonChartBlocks = (
  content: string,
  ledger: IComputedLedger | undefined,
  labels: ICarbonChartLabels = CARBON_CHART_DEFAULT_LABELS,
  tableLabels: ICarbonDataTableLabels = CARBON_DATA_TABLE_DEFAULT_LABELS,
): string => {
  let next = content;
  /**
   * Info: (20260808 - Luphia) 守恆凍結必須穿透「保留現有」的防護。
   *
   * 凍結告警是 blockquote,既無 mermaid 也無表格列,`carriesRenderedData`
   * 會把它判成「沒有真的東西」—— 於是勾稽違反時舊圖被留著、告警從未出現,
   * 而同一次重算裡資料表格走無條件替換,表格凍結了、圖表還在,同頁自相矛盾。
   * 凍結是**帳本當下狀態的權威陳述**,不是資訊遺失;防護只該擋「算不出圖」的降級。
   */
  const isFrozen =
    ledger?.articulation?.status === ArticulationStatusEnum.VIOLATED;
  Object.values(CarbonChartTemplateEnum).forEach((templateId) => {
    if (!next.includes(buildChartAnchorStart(templateId))) return;
    const rebuilt = buildCarbonChartBlock(
      templateId,
      ledger,
      labels,
      tableLabels,
    );
    if (
      !isFrozen &&
      !carriesRenderedData(rebuilt) &&
      carriesRenderedData(readExistingBlock(next, templateId))
    ) {
      // Info: (20260807 - Emily) 保留現有內容:降級的重建不是新資訊,是資訊遺失
      return;
    }
    next = insertCarbonChartBlock(next, templateId, rebuilt);
  });
  return next;
};
