// Info: (20260716 - Emily) 碳盤查狀態帳本引擎(#6518): 純函式、同構(前端 merge/推進 + 後端驗證共用)
// Info: (20260716 - Emily) 職責邊界: LLM 只萃取(原樣字串)；合併去重與步驟推進全部由本模組決定性裁決

import {
  ICarbonInventoryState,
  IActivityRecord,
  IInventoryExtraction,
} from "@/types/carbon_chatbot.types";
import {
  CarbonInventoryStep,
  CARBON_INVENTORY_STEP_ORDER,
  CARBON_INVENTORY_STATE_VERSION,
} from "@/constants/carbon_chatbot";

// Info: (20260716 - Emily) ACTIVITY_DATA 完成門檻: 至少 N 筆完整活動數據(門檻為決定性常數，不由 LLM 判斷)
export const CARBON_INVENTORY_MIN_ACTIVITY_RECORDS = 3;

export const createEmptyInventoryState = (): ICarbonInventoryState => ({
  step: CarbonInventoryStep.ORG_PROFILE,
  activities: [],
  updatedAt: new Date().toISOString(),
  version: CARBON_INVENTORY_STATE_VERSION,
});

// Info: (20260716 - Emily) 去重鍵: 同排放源+同數量+同單位+同範疇視為同一筆(重送訊息/重傳附件不重複記帳)
const activityDedupeKey = (a: IActivityRecord): string =>
  [
    a.scopeCategory,
    a.sourceName.trim().toLowerCase(),
    a.quantity.trim(),
    a.unit,
  ].join("|");

export interface IMergeResult {
  state: ICarbonInventoryState;
  addedCount: number;
}

/**
 * Info: (20260716 - Emily) 合併萃取結果進狀態帳本:
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

  const next: ICarbonInventoryState = {
    ...state,
    company: state.company ?? extraction.company,
    year: state.year ?? extraction.year,
    boundaryApproach: state.boundaryApproach ?? extraction.boundaryApproach,
    activities: [...state.activities, ...added],
    updatedAt: new Date().toISOString(),
  };
  next.step = computeInventoryStep(next);
  return { state: next, addedCount: added.length };
};

// Info: (20260716 - Emily) 各步驟完成條件(決定性；EMISSION_FACTORS/REVIEW 的出口由 #21/#22 引擎解鎖)
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
      // Info: (20260716 - Emily) 需每筆活動皆有係數對應；由 #6519(決定論 CO2e 引擎)填入後解鎖
      return (
        state.activities.length > 0 &&
        state.activities.every((a) => Boolean(a.emissionFactor))
      );
    case CarbonInventoryStep.REVIEW:
      // Info: (20260716 - Emily) 勾稽通過才算完成；由 #6520(質量守恆護欄)裁決
      return false;
    default:
      return false;
  }
};

// Info: (20260716 - Emily) 唯一推進點: 回傳第一個未完成步驟(全過 = COMPLETED);LLM 無法說服系統跳步
export const computeInventoryStep = (
  state: ICarbonInventoryState,
): CarbonInventoryStep => {
  for (const step of CARBON_INVENTORY_STEP_ORDER) {
    if (step === CarbonInventoryStep.COMPLETED) break;
    if (!isStepComplete(step, state)) return step;
  }
  return CarbonInventoryStep.COMPLETED;
};

// Info: (20260716 - Emily) 供 persona 的步驟描述(餵給 LLM 的 currentStep 真值，取代自由字串)
export const describeInventoryStep = (state: ICarbonInventoryState): string => {
  const missing: string[] = [];
  if (!state.company) missing.push("企業名稱");
  if (!state.year) missing.push("盤查年度");
  if (!state.boundaryApproach) missing.push("組織邊界方法");
  const activityGap =
    CARBON_INVENTORY_MIN_ACTIVITY_RECORDS - state.activities.length;
  if (activityGap > 0) missing.push(`活動數據(尚缺約 ${activityGap} 筆)`);
  return `${state.step}${missing.length > 0 ? `；待蒐集: ${missing.join("、")}` : ""}`;
};
