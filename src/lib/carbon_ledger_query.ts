// Info: (20260825 - Emily) 帳本確定性查詢層(#6707 第一層)
//
// Info: (20260825 - Emily) 職責邊界(與 carbon_inventory.ts 同一個立場):
// Info: (20260825 - Emily) 所有數值由本模組從帳本決定性取出,LLM 只負責把 facts 說成人話。
// Info: (20260825 - Emily) LLM 的回答裡不得出現本模組沒給的數字 —— 出口守門(第三層)憑此集合攔截。
//
// Info: (20260825 - Emily) 三條產品鐵律在這一層的落點:
// Info: (20260825 - Emily) 1. 數字不憑空捏造 —— 數值只從 ledger 欄位取,總計/小計讀既存欄位不重算
// Info: (20260825 - Emily)    (summarizeLedgerEntries 是唯一累加實作;這裡連 add 都盡量不做)。
// Info: (20260825 - Emily) 2. 異常只來自列舉過的偵測器 —— queryAnomalies 只讀既存的決定性裁決
// Info: (20260825 - Emily)    (匯入阻擋/pending/articulation 的 violations 與 warnings/年度標註),
// Info: (20260825 - Emily)    不發明新的「疑點」;新偵測器要先開票、定義證據鏈、進這個列舉。
// Info: (20260825 - Emily) 3. 拒答是一等公民 —— 資料不在帳本裡回 refused + 缺什麼,不改寫題目。

import { MoneyUtil } from "@/lib/utils/money";
import { isImportedEntry } from "@/lib/carbon_table38.ledger";
import type {
  IComputedLedger,
  IComputedLedgerEntry,
  ILedgerImportBlock,
  ILedgerYearWarning,
} from "@/types/carbon_chatbot.types";
import type { IContextFact } from "@/interfaces/carbon_paragraph_draft";

/**
 * Info: (20260825 - Emily) 一筆可引用的事實:label/value 供敘事,source 供溯源(表號+位置或帳本欄位)。
 * Info: (20260827 - Emily) emissionsKg:本筆的排放量數值(kg 級),供出口守門裁決 ——
 * 見 IContextFact.emissionsKg 的註解(渲染字串不當機器裁決的真值來源)。
 */
export interface ILedgerFact {
  label: string;
  value: string;
  source: string;
  emissionsKg?: string[];
}

/**
 * Info: (20260825 - Emily) 拒答理由(一等公民,所以是 enum 不是自由字串):
 * 敘事端與測試都要能對「為什麼拒」做精確斷言,自由字串做不到。
 */
export enum LedgerRefusalReasonEnum {
  /** 帳本不存在或沒有任何分錄(還沒匯入報告、也沒有憑證計算結果) */
  LEDGER_EMPTY = "LEDGER_EMPTY",
  /** 問的維度帳本沒有(例:問廠址,但帳本裡沒有任何帶廠址的分錄) */
  DIMENSION_ABSENT = "DIMENSION_ABSENT",
}

export type ILedgerQueryResult =
  | { ok: true; facts: ILedgerFact[] }
  | {
      ok: false;
      refusal: {
        reason: LedgerRefusalReasonEnum;
        /** 缺的是什麼,說給使用者聽(拒答要說得出缺口,不是一句「不知道」) */
        missing: string;
      };
    };

const refuse = (
  reason: LedgerRefusalReasonEnum,
  missing: string,
): ILedgerQueryResult => ({ ok: false, refusal: { reason, missing } });

const hasEntries = (
  ledger: IComputedLedger | undefined,
): ledger is IComputedLedger =>
  ledger !== undefined && ledger.entries.length > 0;

/**
 * Info: (20260825 - Emily) 分錄的溯源字串。匯入項有 importedOrigin(表號+廠址+子代碼),
 * 憑證項退回 sourceName + activityKey —— 兩種來源都必須說得出「這個數字從哪來」。
 */
const traceOf = (entry: IComputedLedgerEntry): string =>
  entry.importedOrigin
    ? `原文照錄 表${entry.importedOrigin.tableNo} ${entry.importedOrigin.site} ${entry.importedOrigin.subCategory}`
    : `本系統計算 ${entry.sourceName}(${entry.activityKey})`;

/**
 * Info: (20260825 - Emily) 全公司總量與範疇小計。
 * **讀既存欄位,不重算**:totalCo2eKg/scopeSubtotals 由 summarizeLedgerEntries 寫入,
 * 這裡再加一次就是第二份累加實作 —— 兩份遲早不一致,而不一致在查帳系統裡是致命的。
 */
export const queryTotal = (
  ledger: IComputedLedger | undefined,
): ILedgerQueryResult => {
  if (!hasEntries(ledger)) {
    return refuse(
      LedgerRefusalReasonEnum.LEDGER_EMPTY,
      "帳本中沒有任何排放分錄:請先匯入盤查報告,或完成活動數據與係數計算",
    );
  }
  const facts: ILedgerFact[] = [
    {
      label: "全公司總排放量",
      value: `${ledger.totalCo2eKg} kgCO2e`,
      source: `帳本總計欄(${ledger.entries.length} 筆分錄,計算於 ${ledger.computedAt})`,
      emissionsKg: [ledger.totalCo2eKg],
    },
    ...Object.entries(ledger.scopeSubtotals).map(([scope, subtotal]) => ({
      label: `${scope} 小計`,
      value: `${subtotal} kgCO2e`,
      source: "帳本範疇小計欄",
      emissionsKg: [subtotal],
    })),
  ];
  return { ok: true, facts };
};

/**
 * Info: (20260825 - Emily) 排放量前 N 大來源(「最高的碳排是什麼?」的答案)。
 * 排序走 decimal.js 的 comparedTo —— 碳排量字串禁止原生浮點,排序也一樣
 * ("1000.05" vs "1000.5" 用 parseFloat 排對是運氣,不是保證)。
 * 同值以 activityKey 字典序決勝:排序必須決定性,同一份帳本兩次問答不得換答案。
 */
export const queryTopEmitters = (
  ledger: IComputedLedger | undefined,
  count: number,
): ILedgerQueryResult => {
  if (!hasEntries(ledger)) {
    return refuse(
      LedgerRefusalReasonEnum.LEDGER_EMPTY,
      "帳本中沒有任何排放分錄:請先匯入盤查報告,或完成活動數據與係數計算",
    );
  }
  const ranked = [...ledger.entries].sort((a, b) => {
    const byAmount = MoneyUtil.toDecimal(b.co2eKg).comparedTo(
      MoneyUtil.toDecimal(a.co2eKg),
    );
    if (byAmount !== 0) return byAmount;
    return a.activityKey < b.activityKey ? -1 : 1;
  });
  /**
   * Info: (20260825 - Emily) 占比由這裡決定性算出(Decimal,一位小數)。
   * 08-25 實測:事實包沒給占比,LLM 就自己算了「39.9%」—— persona 禁計算
   * 擋不住它,而 % 沒有排放單位、守門也不看。把占比變成事實,
   * LLM 有現成的值可引用,就沒有理由自己算。
   * (%的守門納管先不做:方法學文字裡的合法百分比 —— 重算門檻 3%、
   * 不確定性 5% —— 不在事實包裡,納管會誤殺;記在 #6707。)
   */
  const total = MoneyUtil.toDecimal(ledger.totalCo2eKg);
  const shareOf = (co2eKg: string): string | null =>
    total.isZero()
      ? null
      : MoneyUtil.toDecimal(co2eKg).div(total).mul(100).toFixed(1);
  const facts = ranked.slice(0, count).map((entry, index) => {
    const share = shareOf(entry.co2eKg);
    return {
      label: `排放量第 ${index + 1} 大:${entry.sourceName}`,
      value: `${entry.co2eKg} kgCO2e(${entry.convertedQuantity} ${entry.convertedUnit}${share === null ? "" : `,占全公司總量 ${share}%`})`,
      source: traceOf(entry),
      // Info: (20260827 - Emily) 只有 co2eKg 是排放量:括號裡的活動量與占比不得替排放量斷言背書
      emissionsKg: [entry.co2eKg],
    };
  });
  return { ok: true, facts };
};

/**
 * Info: (20260825 - Emily) 各廠址小計。廠址維度只存在於匯入分錄(importedOrigin.site);
 * 憑證分錄沒有這個維度 —— 所以這裡的累加是**新維度的第一份實作**,不是第二份
 * (summarizeLedgerEntries 只按範疇分組)。仍全程 MoneyUtil,禁止原生浮點累加。
 * 帳本裡沒有任何帶廠址的分錄時拒答,並說清楚是維度缺席,不是排放量為零。
 */
export const querySiteSubtotals = (
  ledger: IComputedLedger | undefined,
): ILedgerQueryResult => {
  if (!hasEntries(ledger)) {
    return refuse(
      LedgerRefusalReasonEnum.LEDGER_EMPTY,
      "帳本中沒有任何排放分錄:請先匯入盤查報告,或完成活動數據與係數計算",
    );
  }
  const imported = ledger.entries.filter(
    (entry) => isImportedEntry(entry) && entry.importedOrigin,
  );
  if (imported.length === 0) {
    return refuse(
      LedgerRefusalReasonEnum.DIMENSION_ABSENT,
      "帳本中沒有帶廠址資訊的分錄(廠址維度來自匯入的原文表格):目前無法按廠址拆分",
    );
  }
  const subtotals = new Map<string, string>();
  const tableNos = new Set<string>();
  imported.forEach((entry) => {
    const site = entry.importedOrigin!.site;
    tableNos.add(entry.importedOrigin!.tableNo);
    subtotals.set(
      site,
      MoneyUtil.add(subtotals.get(site) ?? "0", entry.co2eKg),
    );
  });
  const facts = [...subtotals.entries()].map(([site, subtotal]) => ({
    label: `${site} 排放小計`,
    value: `${subtotal} kgCO2e`,
    source: `原文照錄 表${[...tableNos].join("、")} 分錄加總(MoneyUtil)`,
    emissionsKg: [subtotal],
  }));
  return { ok: true, facts };
};

/**
 * Info: (20260825 - Emily) 疑點(「這間公司的碳排是否異常?」的素材)。
 *
 * **列舉制**:只讀五個既存的決定性裁決 ——
 * 1. importBlocks:匯入表格被勾稽擋下的紀錄(「對帳差異」偵測器;
 *    存在 state 不在 ledger,因為被擋時帳本可能整本是空的)
 * 2. pending:決定論引擎判「無法裁決」的活動(絕不猜值的那批)
 * 3. articulation.violations:質量守恆勾稽的缺口(期初+採購-期末 ≠ 帳上消耗)
 * 4. articulation.warnings:合理性警示(數量超出物理量級邊界;僅警示不凍結)
 * 5. yearWarning:年度標註不完整(detectUndatedImportedEntries 的決定性判斷;
 *    同 importBlocks 住在 state 不在 ledger —— 它是「這次匯入與既有帳本的關係」,
 *    不是帳本自身的一筆資料。**刻意不塞進 pending**(PR #6725 round-2 追加回饋):
 *    pending 的語意是「活動數據待補」,借用它就是從既有桶子偷渡偵測器,
 *    而且 label 會變成「待補項」、待補計數會被污染)
 *
 * 這裡**不發明新偵測器**(不能為了找錯而找):新的偵測器要先開票、
 * 定義證據鏈、進這個列舉,才輪得到出現在回答裡。
 * 沒有觸發時回 ok + 空 facts —— 「查過而無異常」與「沒查」必須分得出來。
 *
 * 帳本空 + 有阻擋紀錄 → **回 ok 帶阻擋事實,不拒答**:
 * 「帳本為什麼是空的」本身就是這一題的答案,拒答反而把最該浮出的疑點藏掉。
 */
export const queryAnomalies = (
  ledger: IComputedLedger | undefined,
  importBlocks?: ILedgerImportBlock[],
  yearWarning?: ILedgerYearWarning,
): ILedgerQueryResult => {
  const blockFacts: ILedgerFact[] = (importBlocks ?? []).map((block) => ({
    label: `匯入表格被勾稽擋下:${block.paragraphId}`,
    value: block.reason,
    source: `匯入勾稽紀錄(${block.blockedAt})`,
  }));
  /**
   * Info: (20260828 - Emily) 第五個偵測器:年度標註不完整。
   * label 講實話 —— 它不是待補項,而是「帳本裡有分錄無法判斷年度歸屬」;
   * 沒有 activityKey 可寫,source 因此指向這次匯入的年度(證據鏈)。
   */
  const yearFacts: ILedgerFact[] = yearWarning
    ? [
        {
          label: `年度標註不完整:${yearWarning.undatedCount} 筆匯入分錄沒有盤查年度`,
          value: `這些分錄在系統開始記錄盤查年度之前匯入,無法判斷屬於哪一年;若它們不屬於 ${yearWarning.incomingYear} 年,帳本總量會虛增。清空帳本後逐年重新匯入即可確定歸屬。`,
          source: `帳本年度歸屬檢查(本次匯入年度 ${yearWarning.incomingYear})`,
        },
      ]
    : [];
  const signalFacts = [...blockFacts, ...yearFacts];
  if (!hasEntries(ledger)) {
    if (signalFacts.length > 0) return { ok: true, facts: signalFacts };
    return refuse(
      LedgerRefusalReasonEnum.LEDGER_EMPTY,
      "帳本中沒有任何排放分錄,無從評估異常:請先匯入盤查報告",
    );
  }
  const facts: ILedgerFact[] = [
    ...signalFacts,
    ...ledger.pending.map((item) => ({
      label: `待補項:${item.sourceName}`,
      value: item.reason,
      source: `帳本待補清單(${item.activityKey})`,
    })),
    ...(ledger.articulation?.violations ?? []).map((violation) => ({
      label: `質量守恆缺口:${violation.materialName}`,
      value: `期初+採購-期末=${violation.expectedConsumption} ${violation.unit},帳上消耗=${violation.actualConsumption} ${violation.unit},缺口=${violation.gap} ${violation.unit}`,
      source: "帳本質量守恆勾稽(articulation)",
    })),
    ...(ledger.articulation?.warnings ?? []).map((warning) => ({
      label: `合理性警示:${warning.sourceName}`,
      value: `數量 ${warning.quantity} ${warning.unit},超出物理量級邊界(上限 ${warning.plausibleMax} ${warning.unit})`,
      source: `帳本合理性警示(${warning.activityKey})`,
    })),
  ];
  return { ok: true, facts };
};

/**
 * Info: (20260825 - Emily) 把查詢結果攤平成 IContextFact,給注入層(第二層)餵 LLM。
 * 拒答不產生 facts —— 拒答句由敘事端用 refusal.missing 組,不讓 LLM 有機會填空。
 */
export const toContextFacts = (result: ILedgerQueryResult): IContextFact[] =>
  result.ok
    ? result.facts.map((fact) => ({
        label: fact.label,
        value: fact.value,
        source: fact.source,
      }))
    : [];

/**
 * Info: (20260825 - Emily) 年間量級跳動的門檻:×3 或 ÷3(#6707 的年間偵測器)。
 *
 * 為什麼是倍數不是百分比:需求原話是「量級跳動」—— ±30% 是正常年間波動
 * (產能、天氣、係數改版),報了就是「為了找錯而找」;跨一個量級
 * (三倍以上)才值得人看一眼。門檻是具名常數:要調,這裡調,說得出為什麼。
 */
export const YEAR_OVER_YEAR_JUMP_FACTOR = 3;

/** Info: (20260825 - Emily) 年間比較的單邊輸入:年度 + 該年度的帳本 */
export interface IYearLedger {
  year: number;
  ledger: IComputedLedger;
}

/**
 * Info: (20260825 - Emily) 年間量級跳動偵測器(獨立入口,不在 queryAnomalies 的列舉裡 ——
 * 它吃的是兩個年度的帳本快照,不是當前帳本;`open/63` 的查詢層半件)。
 *
 * 配對鍵用 sourceName(廠址+排放源,兩種 provenance 都有這個欄位)——
 * activityKey 含 basis 前綴與 esgRecordId,同一排放源兩年的 key 不保證相等。
 *
 * 三種疑點形態,各有證據鏈(兩年的值+各自的表號):
 * 1. 量級跳動:兩年都有值,比值 ≥ ×3 或 ≤ ÷3(0 → 正值視為跳動,寫「0 → X」)
 * 2. 排放源消失:上年度有、本年度無 —— 可能是真減排,也可能是漏盤,都該看一眼
 * 3. 排放源新增:本年度有、上年度無 —— 可能是新設施,也可能是上年度漏了
 *
 * 只有單一年度時拒答(DIMENSION_ABSENT)—— 「無法比較」與「比較過沒異常」
 * 必須分得出來,這正是拒答一等公民的用法。
 */
export const queryYearOverYear = (
  current: IYearLedger | undefined,
  previous: IYearLedger | undefined,
): ILedgerQueryResult => {
  if (!current || !previous || !hasEntries(current.ledger)) {
    /**
     * Info: (20260827 - Emily) 拒答的說明**只在年度已知時**指示「再匯一年」
     * (PR #6725 review R1)。
     *
     * 原本一律那樣說,而 reviewer 追出來的後果是:年度未知時,
     * 跨年度匯入會在帳本裡留下「只有前一年有」的孤兒列並算進總量
     * (去重鍵不含年度;年度未知時合併端無從分辨,只能退回舊行為)。
     * 也就是系統會主動叫使用者去做一件安靜弄髒總量的事 —— 而那份總量
     * 會流進事實包、LLM 引用、數據表與桑基圖,最後進到送查證的文件。
     *
     * Info: (20260831 - Emily) R1 更正:兩態**都**改成只說狀態(不再分安全與否)。
     *
     * 規則 3(換鍋)上線後,年度已知時再匯一年確實是安全的 —— 但那不構成
     * 系統該指示使用者去做的理由。拒答的職責是說明「為什麼答不出來」,
     * 不是替使用者決定下一步;要不要匯第二年是他的決定,真的匯了,
     * 合併規則與年度標註偵測器會接住。
     *
     * 界線不是「祈使句一律不准」:帳本為空時的「請先匯入盤查報告」照留,
     * 那個動作沒有任何既有資料可以弄髒。要擋的是**指示一個會動到既有帳本的動作**。
     */
    const yearKnown = current?.year !== undefined;
    return refuse(
      LedgerRefusalReasonEnum.DIMENSION_ABSENT,
      yearKnown
        ? "帳本只有單一年度,年間比較無從進行(年間比較需要兩個年度各自的帳本快照)"
        : "本帳本沒有標註盤查年度,年間比較無從進行(年度快照以盤查年度為鍵,未標註年度時建立不了快照)",
    );
  }
  const byName = (ledger: IComputedLedger): Map<string, IComputedLedgerEntry> =>
    new Map(ledger.entries.map((entry) => [entry.sourceName, entry]));
  const currentByName = byName(current.ledger);
  const previousByName = byName(previous.ledger);
  const facts: ILedgerFact[] = [];

  currentByName.forEach((entry, name) => {
    const prior = previousByName.get(name);
    if (!prior) {
      facts.push({
        label: `年間新增排放源:${name}`,
        value: `${previous.year} 年無此排放源,${current.year} 年為 ${entry.co2eKg} kgCO2e —— 可能是新設施,也可能是 ${previous.year} 年漏盤`,
        source: `${current.year}:${traceOf(entry)}`,
        // Info: (20260827 - Emily) 年份不是排放量:只標排放量本體(見 IContextFact.emissionsKg)
        emissionsKg: [entry.co2eKg],
      });
      return;
    }
    const currentValue = MoneyUtil.toDecimal(entry.co2eKg);
    const priorValue = MoneyUtil.toDecimal(prior.co2eKg);
    if (priorValue.isZero() && currentValue.isZero()) return;
    const jumped = priorValue.isZero()
      ? true
      : currentValue.div(priorValue).gte(YEAR_OVER_YEAR_JUMP_FACTOR) ||
        (!currentValue.isZero() &&
          priorValue.div(currentValue).gte(YEAR_OVER_YEAR_JUMP_FACTOR)) ||
        currentValue.isZero();
    if (!jumped) return;
    const ratio = priorValue.isZero()
      ? `0 → ${entry.co2eKg}`
      : `×${currentValue.div(priorValue).toFixed(1)}`;
    facts.push({
      label: `年間量級跳動:${name}`,
      value: `${previous.year} 年 ${prior.co2eKg} kgCO2e → ${current.year} 年 ${entry.co2eKg} kgCO2e(${ratio})`,
      source: `${previous.year}:${traceOf(prior)} / ${current.year}:${traceOf(entry)}`,
      // Info: (20260827 - Emily) 兩年的排放量都合法可引用;年份與倍數不是排放量
      emissionsKg: [prior.co2eKg, entry.co2eKg],
    });
  });

  previousByName.forEach((prior, name) => {
    if (currentByName.has(name)) return;
    facts.push({
      label: `年間排放源消失:${name}`,
      value: `${previous.year} 年為 ${prior.co2eKg} kgCO2e,${current.year} 年無此排放源 —— 可能是真減排,也可能是漏盤`,
      source: `${previous.year}:${traceOf(prior)}`,
      emissionsKg: [prior.co2eKg],
    });
  });

  /**
   * Info: (20260831 - Emily) 兩個年度都在、什麼都沒跨門檻時**也要有結論**
   * (PR #6725 review R4 的殘留半)。
   *
   * 這是本函式檔頭自己寫的那條規矩:「『無法比較』與『比較過沒異常』必須分得出來」。
   * 原本 facts 為空就回空 —— 於是事實包裡零筆年間事實,與「只有一個年度」
   * 在下游**完全同形**,而 persona 被指示去轉述一筆不存在的「無法進行」說明
   * (reviewer 實測:年增 10% 的主要路徑上,清單裡年間事實 0 筆)。
   *
   * 三種上游狀態現在有三種可觀測值:
   *   不滿兩個年度      → yearComparisonUnavailableFact 的「無法進行」(進 core)
   *   兩年且有跳動/增減 → 逐筆疑點(進異常池,排在最前面)
   *   兩年且都沒跨門檻 → 這一筆「查過而無異常」
   *
   * 不省這一筆的理由與拒答一等公民同源:沉默無法區分「查過」與「沒查」,
   * 而 LLM 對沉默的處理方式沒有人保證。
   */
  if (facts.length === 0) {
    return {
      ok: true,
      facts: [
        {
          label: "年間比較:各排放源皆未跨門檻",
          value: `${previous.year} 年與 ${current.year} 年逐排放源比對,無任何一項達到 ×${YEAR_OVER_YEAR_JUMP_FACTOR} 或 ÷${YEAR_OVER_YEAR_JUMP_FACTOR} 的量級跳動,也沒有排放源新增或消失`,
          source: `帳本年度快照(${previous.year} / ${current.year})`,
        },
      ],
    };
  }

  return { ok: true, facts };
};

/** Info: (20260825 - Emily) 事實包上限。與 validator 的 ledgerFacts max 同值 —— 超了請求會被 schema 打回 */
export const LEDGER_FACT_BUNDLE_MAX = 80;
/** Info: (20260825 - Emily) 「最高的碳排是什麼」要答得出前幾名,固定取 5:決定性,不隨帳本大小變 */
export const LEDGER_FACT_TOP_EMITTERS = 5;

/**
 * Info: (20260825 - Emily) 標準事實包(#6707 第二層的輸入):每一則聊天請求隨行注入。
 *
 * ## 為什麼是「一律注入」而不是「先判斷使用者在問什麼再查」
 *
 * 路由使用者意圖需要一層 NLU —— 那一層一旦判錯,查詢層再正確也輪不到上場,
 * 而且判錯是**靜默的**(使用者只看到 AI 答非所問或編了數字)。
 * 事實包是決定性組出來的固定形狀(總量+範疇+廠址+前五大+異常),
 * 成本可預算(上限 LEDGER_FACT_BUNDLE_MAX),把「懂問題」留給 LLM,
 * 把「數字對」留給本模組 —— 各做各的擅長。
 *
 * ## 上限的處理是明說,不是靜默截斷
 *
 * 異常事實可能很多(待補清單沒有上限)。超出預算時裁掉的是異常尾巴,
 * 並補一筆「另有 N 條未列出」—— 靜默截斷會讓 LLM 說「只有這些問題」,那是說謊。
 *
 * 帳本空時回空陣列:注入端(persona)對「無事實」另有明確拒答指令,不在這裡造假事實。
 */
/**
 * Info: (20260825 - Emily) #6719:從年度快照挑最近兩年做年間比較。
 * Info: (20260831 - Emily) 不滿兩個年度時仍然回空 —— 但「為什麼比不了」改由
 * yearComparisonUnavailableFact 送進 core(舊註解說「由 persona 的無事實規則處理」
 * 是錯的:帳本有分錄時 persona 走的是**有事實**分支,那條規則不會生效)。
 */
const yearOverYearFacts = (
  ledgerByYear: Record<number, IComputedLedger> | undefined,
): IContextFact[] => {
  const years = Object.keys(ledgerByYear ?? {})
    .map(Number)
    .sort((a, b) => b - a);
  if (!ledgerByYear || years.length < 2) return [];
  return toContextFacts(
    queryYearOverYear(
      { year: years[0], ledger: ledgerByYear[years[0]] },
      { year: years[1], ledger: ledgerByYear[years[1]] },
    ),
  );
};

/**
 * Info: (20260831 - Emily) 年間比較做不成時的**說明**(PR #6725 R1 更正時追出來的缺口)。
 *
 * persona 有一條「使用者問跟去年比 → 照清單中的說明原文轉述」,而拒答經
 * toContextFacts 一律不產生事實、yearOverYearFacts 又在不滿兩個年度時早退 ——
 * 清單裡從來沒有那筆。模型被要求轉述一段不存在的文字,而 persona 的其他條文
 * 正在禁止它自行發揮。兩端各自看起來都正確,錯在它們之間。
 *
 * **它進 core 不進 anomalies**,兩個理由,都是昨天那條回饋的同一把尺:
 * 1. 它不是疑點。放進異常池會讓「另有 N 條異常事實未列出」把它算進去 ——
 *    那是拿別的桶子的語意來裝自己的東西(pending 那格剛因為同樣的理由被否決)。
 * 2. 異常池會被上限裁掉,而「為什麼比不了」正好在帳本最忙的時候最該說得出來。
 *
 * 帳本本身空的時候不送:那時每個查詢都拒答,persona 走「無事實」分支,
 * 多這一條只會讓空帳本的畫面更吵。
 */
const yearComparisonUnavailableFact = (
  ledgerByYear: Record<number, IComputedLedger> | undefined,
  ledger: IComputedLedger | undefined,
): IContextFact[] => {
  const years = Object.keys(ledgerByYear ?? {}).map(Number);
  if (years.length >= 2 || !hasEntries(ledger)) return [];
  return [
    {
      label: "年間比較:無法進行",
      value:
        years.length === 1
          ? `年間比較需要兩個年度各自的帳本快照,目前只有 ${years[0]} 年這一份`
          : "年間比較需要兩個年度各自的帳本快照,目前一份都沒有(年度快照以盤查年度為鍵,帳本尚未標註盤查年度)",
      source: `帳本年度快照(目前 ${years.length} 個年度)`,
    },
  ];
};

export const buildLedgerFactBundle = (
  ledger: IComputedLedger | undefined,
  importBlocks?: ILedgerImportBlock[],
  ledgerByYear?: Record<number, IComputedLedger>,
  yearWarning?: ILedgerYearWarning,
): IContextFact[] => {
  const core = [
    ...toContextFacts(queryTotal(ledger)),
    ...toContextFacts(querySiteSubtotals(ledger)),
    ...toContextFacts(queryTopEmitters(ledger, LEDGER_FACT_TOP_EMITTERS)),
    ...yearComparisonUnavailableFact(ledgerByYear, ledger),
  ];
  /**
   * Info: (20260825 - Emily) 年間疑點與其他異常同池,一起受上限與「據實申報」規則管。
   *
   * Info: (20260831 - Emily) 年間事實排在**最前面**(PR #6725 review R4)。
   *
   * 上限裁的是尾巴(`slice(0, budget)`),而年間事實原本排在最後 ——
   * 也就是這一池裡**訊號最強的東西第一個被丟掉**:待補清單沒有上限,
   * 一份待補很多的帳本會把「某個排放源的排放量翻了三倍」擠掉,
   * 而 LLM 只讀到「另有 N 條異常事實未列出」,它會理解成 N 條待補項,
   * 不會理解成「排放量翻了三倍而我沒說」。
   *
   * 排序是唯一需要的修法:量級跳動是跨年度的結構性變化(可能是關廠、
   * 可能是漏盤、也可能是真的成長),而待補項是單筆活動數據缺係數 ——
   * 前者值得人看一眼,後者是清單工作。
   */
  const anomalies = [
    ...yearOverYearFacts(ledgerByYear),
    ...toContextFacts(queryAnomalies(ledger, importBlocks, yearWarning)),
  ];
  const budget = LEDGER_FACT_BUNDLE_MAX - core.length - 1;
  if (anomalies.length <= budget + 1) {
    return [...core, ...anomalies];
  }
  const kept = anomalies.slice(0, Math.max(budget, 0));
  return [
    ...core,
    ...kept,
    {
      label: "異常事實逾上限",
      value: `另有 ${anomalies.length - kept.length} 條異常事實未列出`,
      source: "事實包上限裁剪(據實申報,非全貌)",
    },
  ];
};
