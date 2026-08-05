// Info: (20260716 - Tzuhan) 碳盤查狀態帳本引擎(#6518): 純函式、同構(前端 merge/推進 + 後端驗證共用)
// Info: (20260716 - Tzuhan) 職責邊界: LLM 只萃取(原樣字串)；合併去重與步驟推進全部由本模組決定性裁決

import {
  ICarbonInventoryState,
  IActivityRecord,
  IInventoryExtraction,
  IComputedLedger,
  IMaterialStockRecord,
} from "@/types/carbon_chatbot.types";
import {
  CarbonInventoryStep,
  CARBON_INVENTORY_STEP_ORDER,
  CARBON_INVENTORY_STATE_VERSION,
} from "@/constants/carbon_chatbot";
import { ArticulationStatusEnum } from "@/constants/carbon_articulation";
import { summarizeLedgerEntries } from "@/lib/carbon_ledger_totals";
import { isImportedEntry } from "@/lib/carbon_table38.ledger";

// Info: (20260716 - Tzuhan) ACTIVITY_DATA 完成門檻: 至少 N 筆完整活動數據(門檻為決定性常數，不由 LLM 判斷)
export const CARBON_INVENTORY_MIN_ACTIVITY_RECORDS = 3;

export const createEmptyInventoryState = (): ICarbonInventoryState => ({
  step: CarbonInventoryStep.ORG_PROFILE,
  activities: [],
  updatedAt: new Date().toISOString(),
  version: CARBON_INVENTORY_STATE_VERSION,
});

// Info: (20260716 - Tzuhan) 去重鍵: 同排放源 + 同數量 + 同單位 + 同範疇視為同一筆（重送訊息／重傳附件不重複記帳）
// Info: (20260716 - Tzuhan) #6519 起 export: 計算總表以同一把鍵對齊活動與計算結果
// Info: (20260720 - Tzuhan) #53 憑證匯入紀錄以 esgRecordId 為鍵:兩張同額同源的憑證是兩筆事實
// Info: (20260720 - Tzuhan) (內容鍵會誤併),且穩定 id 讓「重新整理匯入」天然冪等
export const activityDedupeKey = (a: IActivityRecord): string =>
  a.esgRecordId
    ? `esg|${a.esgRecordId}`
    : [
        a.scopeCategory,
        a.sourceName.trim().toLowerCase(),
        a.quantity.trim(),
        a.unit,
      ].join("|");

// Info: (20260720 - Tzuhan) #6520 庫存紀錄去重鍵:同物料 + 同單位視為同一筆(後到的萃取不覆蓋人工確認值)
export const stockRecordDedupeKey = (r: IMaterialStockRecord): string =>
  [r.materialName.trim().toLowerCase(), r.unit].join("|");

export interface IMergeResult {
  state: ICarbonInventoryState;
  addedCount: number;
}

/**
 * Info: (20260716 - Tzuhan) 合併萃取結果進狀態帳本:
 * - 組織欄位(company/year/boundary)只在空缺時填入，不覆蓋既有值(人工確認優先於後到的萃取)
 * - 活動數據以去重鍵合併；數值字串原樣保存，本函式不做任何換算
 * - 步驟由 computeInventoryStep 重算(唯一推進點)
 */
export const mergeInventoryExtraction = (
  state: ICarbonInventoryState,
  extraction: IInventoryExtraction,
  source?: string,
): IMergeResult => {
  const existingKeys = new Set(state.activities.map(activityDedupeKey));
  const added: IActivityRecord[] = [];
  extraction.activities.forEach((activity) => {
    const record: IActivityRecord = {
      ...activity,
      source: activity.source ?? source,
    };
    const key = activityDedupeKey(record);
    if (existingKeys.has(key)) return;
    existingKeys.add(key);
    added.push(record);
  });

  // Info: (20260720 - Tzuhan) #6520 庫存紀錄同軌合併(去重鍵:物料+單位;重送不重複記帳)
  const existingStockKeys = new Set(
    (state.stockRecords ?? []).map(stockRecordDedupeKey),
  );
  const addedStock: IMaterialStockRecord[] = [];
  (extraction.stockRecords ?? []).forEach((record) => {
    const withSource: IMaterialStockRecord = {
      ...record,
      source: record.source ?? source,
    };
    const key = stockRecordDedupeKey(withSource);
    if (existingStockKeys.has(key)) return;
    existingStockKeys.add(key);
    addedStock.push(withSource);
  });

  const next: ICarbonInventoryState = {
    ...state,
    company: state.company ?? extraction.company,
    year: state.year ?? extraction.year,
    boundaryApproach: state.boundaryApproach ?? extraction.boundaryApproach,
    activities: [...state.activities, ...added],
    stockRecords:
      addedStock.length > 0
        ? [...(state.stockRecords ?? []), ...addedStock]
        : state.stockRecords,
    updatedAt: new Date().toISOString(),
  };
  next.step = computeInventoryStep(next);
  return { state: next, addedCount: added.length + addedStock.length };
};

// Info: (20260716 - Tzuhan) 各步驟完成條件(決定性；EMISSION_FACTORS/REVIEW 的出口由 #21/#22 引擎解鎖)
const isStepComplete = (
  step: CarbonInventoryStep,
  state: ICarbonInventoryState,
): boolean => {
  switch (step) {
    case CarbonInventoryStep.ORG_PROFILE:
      return Boolean(state.company) && Boolean(state.year);
    case CarbonInventoryStep.ORG_BOUNDARY:
      return Boolean(state.boundaryApproach);
    case CarbonInventoryStep.EMISSION_SOURCES:
      return state.activities.length >= 1;
    case CarbonInventoryStep.ACTIVITY_DATA:
      return (
        state.activities.length >= CARBON_INVENTORY_MIN_ACTIVITY_RECORDS &&
        state.activities.every((a) => a.quantity.trim() && a.unit)
      );
    case CarbonInventoryStep.EMISSION_FACTORS:
      // Info: (20260716 - Tzuhan) 需每筆活動皆有係數對應；由 #6519(決定論 CO2e 引擎)填入後解鎖
      return (
        state.activities.length > 0 &&
        state.activities.every((a) => Boolean(a.emissionFactor))
      );
    case CarbonInventoryStep.REVIEW:
      // Info: (20260720 - Tzuhan) #6520 勾稽出口:計算總表存在、無待補、守恆非違反(NOT_APPLICABLE =
      // Info: (20260720 - Tzuhan) 純電力/運輸盤查的合法情境,視為通過;VIOLATED 凍結直到使用者澄清)
      return Boolean(
        state.computedLedger &&
        state.computedLedger.pending.length === 0 &&
        state.computedLedger.articulation &&
        state.computedLedger.articulation.status !==
          ArticulationStatusEnum.VIOLATED,
      );
    default:
      return false;
  }
};

// Info: (20260716 - Tzuhan) 唯一推進點: 回傳第一個未完成步驟(全過 = COMPLETED);LLM 無法說服系統跳步
export const computeInventoryStep = (
  state: ICarbonInventoryState,
): CarbonInventoryStep => {
  for (const step of CARBON_INVENTORY_STEP_ORDER) {
    if (step === CarbonInventoryStep.COMPLETED) break;
    if (!isStepComplete(step, state)) return step;
  }
  return CarbonInventoryStep.COMPLETED;
};

// Info: (20260716 - Tzuhan) 供 persona 的步驟描述(餵給 LLM 的 currentStep 真值，取代自由字串)
// Info: (20260720 - Tzuhan) #6520 守恆違反時附上等式事實(TS 決定性產生;LLM 只負責措辭向使用者追問澄清)
export const describeInventoryStep = (state: ICarbonInventoryState): string => {
  const missing: string[] = [];
  if (!state.company) missing.push("企業名稱");
  if (!state.year) missing.push("盤查年度");
  if (!state.boundaryApproach) missing.push("組織邊界方法");
  const activityGap =
    CARBON_INVENTORY_MIN_ACTIVITY_RECORDS - state.activities.length;
  if (activityGap > 0) missing.push(`活動數據(尚缺約 ${activityGap} 筆)`);

  const violations = state.computedLedger?.articulation?.violations ?? [];
  const violationBlock =
    violations.length > 0
      ? `；【質量守恆勾稽違反,請以會計師身份向用戶追問缺口原因,嚴禁自行推測數字】${violations
          .map(
            (v) =>
              `${v.materialName}: 期初+採購-期末=${v.expectedConsumption} ${v.unit},帳上消耗=${v.actualConsumption} ${v.unit},缺口=${v.gap} ${v.unit}`,
          )
          .join("；")}`
      : "";
  return `${state.step}${missing.length > 0 ? `；待蒐集: ${missing.join("、")}` : ""}${violationBlock}`;
};

/**
 * Info: (20260716 - Tzuhan) #6519 掛回計算總表:
 * - 依 activityKey 回填各活動的 emissionFactor/factorSource(決定性,同鍵對齊)
 * - computedLedger 存入 state;步驟由 computeInventoryStep 重算
 *   (全部活動有係數 → EMISSION_FACTORS 完成 → 推進 REVIEW)
 *
 * Info: (20260805 - Luphia) 匯入項目必須跨重算存活。
 * /calculate 只算得出憑證/活動衍生的項目,回應裡不可能有 provenance = IMPORTED 的分錄。
 * 原本這裡是整包覆蓋(`computedLedger: ledger`),於是「確認匯入」會踩到自己的腳:
 * confirmPendingImport 先送出活動、再寫匯入分錄;活動簽章一變就觸發 /calculate,
 * 幾秒後回應落地把整包蓋掉,表3.8 的分錄全部消失。
 * 而報告此時已經寫上「三層加總勾稽通過,已寫入帳本」—— 帳本卻是空的。
 * 在查帳系統裡這不是資料遺失,是報告在說謊。
 */
export const applyComputedLedger = (
  state: ICarbonInventoryState,
  ledger: IComputedLedger,
): ICarbonInventoryState => {
  const factorByKey = new Map(
    ledger.entries.map((entry) => [entry.activityKey, entry.factor]),
  );
  /**
   * Info: (20260805 - Luphia) 合併規則與 applyImportedLedgerEntries 一致:
   * 以 activityKey 取代同一筆(伺服端若同鍵也算出來了,以伺服端為準),
   * 小計/總計一律走 summarizeLedgerEntries —— 禁止在這裡另寫一份累加,
   * 兩份實作遲早不一致,而不一致的表現是「明細加起來不等於小計」。
   */
  const serverKeys = new Set(ledger.entries.map((entry) => entry.activityKey));
  const preservedImported = (state.computedLedger?.entries ?? []).filter(
    (entry) => isImportedEntry(entry) && !serverKeys.has(entry.activityKey),
  );
  /**
   * Info: (20260805 - Luphia) articulation 維持伺服端的裁決,不重算也不清空:
   * 質量守恆勾稽是對「活動數據」的期初+採購=消耗+期末做的,
   * 匯入項目只有最終 CO2e、沒有庫存流量,本來就不在該檢查的範圍內。
   * 這一點必須明說,否則下一個人會以為這個 verdict 也涵蓋了匯入項。
   */
  const mergedEntries = [...ledger.entries, ...preservedImported];
  const mergedLedger: IComputedLedger =
    preservedImported.length === 0
      ? ledger
      : {
          ...ledger,
          entries: mergedEntries,
          ...summarizeLedgerEntries(mergedEntries),
        };
  const next: ICarbonInventoryState = {
    ...state,
    activities: state.activities.map((activity) => {
      const factor = factorByKey.get(activityDedupeKey(activity));
      if (!factor) return activity;
      return {
        ...activity,
        emissionFactor: factor.value,
        factorSource: factor.source,
      };
    }),
    computedLedger: mergedLedger,
    updatedAt: new Date().toISOString(),
  };
  next.step = computeInventoryStep(next);
  return next;
};
