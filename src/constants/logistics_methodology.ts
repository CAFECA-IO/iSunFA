// Info: (20260802 - Luphia) 物流碳足跡計算方式說明的結構與插值。
//
// Info: (20260802 - Luphia) 文案本身移至 i18n 語言檔(methodology.sections),
// Info: (20260802 - Luphia) 本檔只保留兩件事:資料筆數常數,以及把常數值代入文案的插值機制。
//
// Info: (20260802 - Luphia) **為什麼數值不寫在語言檔裡:** 排放係數、繞行係數、適用門檻
// Info: (20260802 - Luphia) 都是計算實際採用的值,寫進語言檔就是把同一個事實複製五份 ——
// Info: (20260802 - Luphia) 調參後五份都要改,必然有漏,而漏掉的那份會讓說明與計算不一致。
// Info: (20260802 - Luphia) 語言檔只放 {{token}},實際值一律由此處自常數取得。

import {
  EMISSION_FACTORS,
  EMISSION_FACTOR_SOURCES,
  EMISSION_FACTOR_UNIT,
  ESTIMATION_TORTUOSITY_FACTORS,
  MIN_AIR_LEG_DISTANCE_KM,
  MIN_SEA_LEG_DISTANCE_KM,
} from "@/constants/logistics";

/**
 * Info: (20260802 - Luphia) 靜態資料的筆數。由 logistics_methodology.test.ts
 * 對實際 JSON 斷言,不可手改 —— 資料換版而筆數變動時測試會失敗,不會靜默過期。
 */
export const METHODOLOGY_DATASET_COUNTS = {
  airportsTotal: 5277,
  airportsSelectable: 4563,
  seaports: 3924,
  shippingLaneFeatures: 3599,
} as const;

/** Info: (20260802 - Luphia) 大圓距離採用的地球平均半徑,與 @/lib/utils/geo 一致 */
const EARTH_RADIUS_KM = 6371;

/** Info: (20260802 - Luphia) OSRM 路徑的否決門檻:駕駛距離不足直線距離此比例即視為座標吸附錯誤 */
const OSRM_MIN_RATIO_TO_DIRECT = 0.5;

/** Info: (20260802 - Luphia) OSRM 請求逾時(ms) */
const OSRM_TIMEOUT_MS = 10000;

export interface IMethodologyItem {
  term: string;
  detail: string;
}

export interface IMethodologySection {
  /** Info: (20260802 - Luphia) 錨點用識別碼,亦為 React key;各語言必須一致 */
  id: string;
  title: string;
  paragraphs?: string[];
  items?: IMethodologyItem[];
}

/**
 * Info: (20260802 - Luphia) 語言檔可用的插值 token 與其實際值。
 *
 * 全部取自常數 —— 新增 token 時必須同時在此登錄,否則語言檔寫了也不會被替換。
 * logistics_methodology.test.ts 會斷言語言檔用到的每個 token 都在此有定義。
 */
export const METHODOLOGY_TOKENS: Record<string, string> = {
  factorUnit: EMISSION_FACTOR_UNIT,
  landFactor: EMISSION_FACTORS.LAND,
  seaFactor: EMISSION_FACTORS.SEA,
  airFactor: EMISSION_FACTORS.AIR,
  landSource: EMISSION_FACTOR_SOURCES.LAND,
  seaSource: EMISSION_FACTOR_SOURCES.SEA,
  airSource: EMISSION_FACTOR_SOURCES.AIR,
  landTortuosity: String(ESTIMATION_TORTUOSITY_FACTORS.LAND),
  seaTortuosity: String(ESTIMATION_TORTUOSITY_FACTORS.SEA),
  minSeaKm: String(MIN_SEA_LEG_DISTANCE_KM),
  minAirKm: String(MIN_AIR_LEG_DISTANCE_KM),
  earthRadiusKm: String(EARTH_RADIUS_KM),
  osrmMinRatioPercent: String(OSRM_MIN_RATIO_TO_DIRECT * 100),
  osrmTimeoutSeconds: String(OSRM_TIMEOUT_MS / 1000),
  airportsTotal: String(METHODOLOGY_DATASET_COUNTS.airportsTotal),
  airportsSelectable: String(METHODOLOGY_DATASET_COUNTS.airportsSelectable),
  seaports: String(METHODOLOGY_DATASET_COUNTS.seaports),
  shippingLaneFeatures: String(METHODOLOGY_DATASET_COUNTS.shippingLaneFeatures),
};

/** Info: (20260802 - Luphia) 比對語言檔中的 {{token}} */
export const METHODOLOGY_TOKEN_PATTERN = /\{\{(\w+)\}\}/g;

/**
 * Info: (20260802 - Luphia) 把單一字串中的 token 換成實際值。
 *
 * 未登錄的 token **原樣保留**而非清空:留著 `{{未知}}` 會在畫面上顯眼地暴露問題,
 * 清空則會產生一句讀起來通順但缺了數值的說明 —— 後者更危險。
 */
export function interpolateMethodologyText(
  text: string,
  tokens: Record<string, string> = METHODOLOGY_TOKENS,
): string {
  return text.replace(METHODOLOGY_TOKEN_PATTERN, (whole, name: string) =>
    Object.prototype.hasOwnProperty.call(tokens, name) ? tokens[name] : whole,
  );
}

/**
 * Info: (20260802 - Luphia) 對整份說明結構做插值。
 *
 * 語言檔取回的資料來自 t<T>(),型別由呼叫端斷言而非執行期驗證 ——
 * 故此處對缺漏欄位採寬容處理:缺 title 的章節仍會渲染(標題為空),
 * 不因一個語言檔的疏漏而讓整個說明區塊消失。
 */
export function interpolateMethodologySections(
  sections: IMethodologySection[] | undefined,
  tokens: Record<string, string> = METHODOLOGY_TOKENS,
): IMethodologySection[] {
  if (!Array.isArray(sections)) return [];
  return sections.map((section) => ({
    id: section?.id ?? "",
    title: interpolateMethodologyText(section?.title ?? "", tokens),
    paragraphs: (section?.paragraphs ?? []).map((text) =>
      interpolateMethodologyText(text, tokens),
    ),
    items: (section?.items ?? []).map((item) => ({
      term: interpolateMethodologyText(item?.term ?? "", tokens),
      detail: interpolateMethodologyText(item?.detail ?? "", tokens),
    })),
  }));
}
