// Info: (20260825 - Emily) 帳本確定性查詢層(#6707 第一層)
//
// Info: (20260825 - Emily) 職責邊界(與 carbon_inventory.ts 同一個立場):
// Info: (20260825 - Emily) 所有數值由本模組從帳本決定性取出,LLM 只負責把 facts 說成人話。
// Info: (20260825 - Emily) LLM 的回答裡不得出現本模組沒給的數字 —— 出口守門(第三層)憑此集合攔截。
//
// Info: (20260825 - Emily) 三條產品鐵律在這一層的落點:
// Info: (20260825 - Emily) 1. 數字不憑空捏造 —— 數值只從 ledger 欄位取,總計/小計讀既存欄位不重算
// Info: (20260825 - Emily)    (summarizeLedgerEntries 是唯一累加實作;這裡連 add 都盡量不做)。
// Info: (20260825 - Emily) 2. 異常只來自列舉過的偵測器 —— queryAnomalies 只讀 pending 與
// Info: (20260825 - Emily)    articulation.violations 兩個既存的決定性裁決,不發明新的「疑點」。
// Info: (20260825 - Emily) 3. 拒答是一等公民 —— 資料不在帳本裡回 refused + 缺什麼,不改寫題目。

import { MoneyUtil } from "@/lib/utils/money";
import { isImportedEntry } from "@/lib/carbon_table38.ledger";
import type {
  IComputedLedger,
  IComputedLedgerEntry,
} from "@/types/carbon_chatbot.types";
import type { IContextFact } from "@/interfaces/carbon_paragraph_draft";

/** Info: (20260825 - Emily) 一筆可引用的事實:label/value 供敘事,source 供溯源(表號+位置或帳本欄位) */
export interface ILedgerFact {
  label: string;
  value: string;
  source: string;
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
    },
    ...Object.entries(ledger.scopeSubtotals).map(([scope, subtotal]) => ({
      label: `${scope} 小計`,
      value: `${subtotal} kgCO2e`,
      source: "帳本範疇小計欄",
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
  const facts = ranked.slice(0, count).map((entry, index) => ({
    label: `排放量第 ${index + 1} 大:${entry.sourceName}`,
    value: `${entry.co2eKg} kgCO2e(${entry.convertedQuantity} ${entry.convertedUnit})`,
    source: traceOf(entry),
  }));
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
  }));
  return { ok: true, facts };
};

/**
 * Info: (20260825 - Emily) 疑點(「這間公司的碳排是否異常?」的素材)。
 *
 * **列舉制**:只讀帳本裡三個既存的決定性裁決 ——
 * 1. pending:決定論引擎判「無法裁決」的活動(絕不猜值的那批)
 * 2. articulation.violations:質量守恆勾稽的缺口(期初+採購-期末 ≠ 帳上消耗)
 * 3. articulation.warnings:合理性警示(數量超出物理量級邊界;僅警示不凍結)
 *
 * 這裡**不發明新偵測器**(不能為了找錯而找):新的偵測器要先開票、
 * 定義證據鏈、進這個列舉,才輪得到出現在回答裡。
 * 沒有觸發時回 ok + 空 facts —— 「查過而無異常」與「沒查」必須分得出來。
 */
export const queryAnomalies = (
  ledger: IComputedLedger | undefined,
): ILedgerQueryResult => {
  if (!hasEntries(ledger)) {
    return refuse(
      LedgerRefusalReasonEnum.LEDGER_EMPTY,
      "帳本中沒有任何排放分錄,無從評估異常:請先匯入盤查報告",
    );
  }
  const facts: ILedgerFact[] = [
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
export const buildLedgerFactBundle = (
  ledger: IComputedLedger | undefined,
): IContextFact[] => {
  const core = [
    ...toContextFacts(queryTotal(ledger)),
    ...toContextFacts(querySiteSubtotals(ledger)),
    ...toContextFacts(queryTopEmitters(ledger, LEDGER_FACT_TOP_EMITTERS)),
  ];
  const anomalies = toContextFacts(queryAnomalies(ledger));
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
