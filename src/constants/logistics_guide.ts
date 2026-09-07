// Info: (20260820 - Luphia) 物流碳足跡「操作說明」的結構、插圖登錄與插值。
//
// Info: (20260820 - Luphia) 與 logistics_methodology.ts 同一套分工:
// Info: (20260820 - Luphia) 文案在 i18n 語言檔(guide.chapters),本檔只放
// Info: (20260820 - Luphia) 三件事 —— 插圖識別碼、可插值的實際數值、以及插值機制。
//
// Info: (20260820 - Luphia) **為什麼點數費用不寫在語言檔裡:** 費用取自 ANALYSIS_BASE_COSTS,
// Info: (20260820 - Luphia) 寫進五份語言檔就是把同一個事實複製五份,調價後必然有漏,
// Info: (20260820 - Luphia) 而漏掉的那份會讓說明書上的價格與實際扣款不一致。

import { ANALYSIS_BASE_COSTS } from "@/constants/price";
import {
  interpolateMethodologyText,
  METHODOLOGY_TOKENS,
} from "@/constants/logistics_methodology";

/**
 * Info: (20260820 - Luphia) 插圖識別碼。語言檔以此指定某個步驟要配哪張圖,
 * 圖本身由 guide_figures.tsx 依同一組識別碼渲染 —— 語言檔不含任何圖形資訊。
 *
 * 之所以是識別碼而非圖片路徑:插圖裡的每個標籤都是介面上的實際字串
 * (「產生分析報告」、「進階參數手動配置」),必須隨語言切換。
 * 點陣截圖做不到這件事 —— 一張中文截圖對日文使用者是張看不懂的圖。
 */
export const GUIDE_FIGURE_ID = {
  /** Info: (20260820 - Luphia) 四個分頁各自負責什麼 */
  TABS: "tabs",
  /** Info: (20260820 - Luphia) 參數配置卡片:語意輸入、進階參數、產生按鈕 */
  ANALYSIS_INPUT: "analysis_input",
  /** Info: (20260820 - Luphia) 付款確認對話框 */
  ANALYSIS_PAYMENT: "analysis_payment",
  /** Info: (20260820 - Luphia) 方案切換與報告卡片的組成 */
  ANALYSIS_REPORT: "analysis_report",
  /** Info: (20260820 - Luphia) 匯出勾選選單 */
  EXPORT_MODAL: "export_modal",
  /** Info: (20260820 - Luphia) 里程核算:貼上文本、清單、開始核算 */
  MILEAGE_FLOW: "mileage_flow",
  /** Info: (20260820 - Luphia) 歷史報告清單與展開列 */
  HISTORY_TABLE: "history_table",
} as const;

export type GuideFigureId =
  (typeof GUIDE_FIGURE_ID)[keyof typeof GUIDE_FIGURE_ID];

/** Info: (20260820 - Luphia) 供測試與渲染端做「語言檔指定的圖是否存在」的比對 */
export const GUIDE_FIGURE_IDS: readonly GuideFigureId[] =
  Object.values(GUIDE_FIGURE_ID);

/**
 * Info: (20260820 - Luphia) 每張圖上的編號標記數。
 *
 * 標記畫在 guide_figures.tsx、說明寫在語言檔,兩者靠**順序**對應 ——
 * 一邊多一個標記,另一邊的說明就整組錯位,而錯位不會拋錯,只會讓圖指錯地方。
 * 故在此登錄數量,由 logistics_guide.test.ts 對五份語言檔逐一斷言。
 * 增刪圖上標記時,這裡與五份語言檔必須同時改 —— 測試會擋住只改一邊的情形。
 */
export const GUIDE_FIGURE_CALLOUT_COUNTS: Record<GuideFigureId, number> = {
  [GUIDE_FIGURE_ID.TABS]: 4,
  [GUIDE_FIGURE_ID.ANALYSIS_INPUT]: 3,
  [GUIDE_FIGURE_ID.ANALYSIS_PAYMENT]: 2,
  [GUIDE_FIGURE_ID.ANALYSIS_REPORT]: 5,
  [GUIDE_FIGURE_ID.EXPORT_MODAL]: 4,
  [GUIDE_FIGURE_ID.MILEAGE_FLOW]: 5,
  [GUIDE_FIGURE_ID.HISTORY_TABLE]: 3,
};

/**
 * Info: (20260820 - Luphia) 以實機截圖取代示意圖的登錄處。
 *
 * 目前為空:示意圖以介面實際字串繪製,可隨語言切換且不隨改版過期,
 * 而點陣截圖兩者都做不到。若某張圖的細節非示意圖所能表達(例如地圖底圖的真實樣貌),
 * 在此登錄 `[GUIDE_FIGURE_ID.X]: "/images/..."`,渲染端即改用該圖片。
 *
 * 登錄前請確認:截圖不得含任何帳號、點數餘額或客戶路線等可識別資訊。
 */
export const GUIDE_FIGURE_IMAGES: Partial<Record<GuideFigureId, string>> = {};

/**
 * Info: (20260820 - Luphia) 使用說明分頁的錨點前綴。
 *
 * 側邊目錄與內文標題必須用同一個前綴組出 id,而章節 id 與計算方式的章節 id
 * 各自獨立(兩邊都有 `formula`、`land` 這類自然命名),故分兩個命名空間避免相撞。
 */
export const GUIDE_ANCHOR_PREFIX = {
  CHAPTER: "guide-",
  METHODOLOGY: "methodology-",
} as const;

export interface IGuideStep {
  /** Info: (20260820 - Luphia) 錨點用識別碼,亦為 React key;各語言必須一致 */
  id: string;
  title: string;
  /** Info: (20260820 - Luphia) 該步驟要做的事,一到兩句 */
  body: string;
  /** Info: (20260820 - Luphia) 補充提醒;會以項目符號呈現 */
  notes?: string[];
  /** Info: (20260820 - Luphia) 對應 GUIDE_FIGURE_ID;省略則此步驟不配圖 */
  figure?: GuideFigureId;
  /**
   * Info: (20260820 - Luphia) 圖上編號標記的說明,依序對應 ①②③…
   * 標記畫在圖上、文字列在圖下,兩者靠順序對應 —— 故此陣列長度即圖上的標記數。
   */
  callouts?: string[];
}

export interface IGuideChapter {
  /** Info: (20260820 - Luphia) 錨點用識別碼,亦為 React key;各語言必須一致 */
  id: string;
  title: string;
  summary?: string;
  steps: IGuideStep[];
}

/**
 * Info: (20260820 - Luphia) 語言檔可用的插值 token。
 *
 * 併入 METHODOLOGY_TOKENS:操作說明會引用適用門檻與繞行係數
 * (「兩港距離不足 {{minSeaKm}} km 時海運方案不會出現」),
 * 那些值與計算方式說明引用的是同一個常數,不該有第二份定義。
 */
export const GUIDE_TOKENS: Record<string, string> = {
  ...METHODOLOGY_TOKENS,
  analysisCost: String(ANALYSIS_BASE_COSTS.TRANSPORTATION_CARBON_FOOTPRINT),
};

/**
 * Info: (20260820 - Luphia) 對整份操作說明做插值。
 *
 * 與 interpolateMethodologySections 同樣寬容:缺 title 的步驟仍會渲染,
 * 不因一個語言檔的疏漏而讓整份說明消失。未登錄的 token 原樣保留,
 * 讓 `{{未知}}` 在畫面上顯眼地暴露問題。
 */
export function interpolateGuideChapters(
  chapters: IGuideChapter[] | undefined,
  tokens: Record<string, string> = GUIDE_TOKENS,
): IGuideChapter[] {
  if (!Array.isArray(chapters)) return [];
  const text = (value: string | undefined) =>
    interpolateMethodologyText(value ?? "", tokens);
  return chapters.map((chapter) => ({
    id: chapter?.id ?? "",
    title: text(chapter?.title),
    summary: text(chapter?.summary),
    steps: (chapter?.steps ?? []).map((step) => ({
      id: step?.id ?? "",
      title: text(step?.title),
      body: text(step?.body),
      notes: (step?.notes ?? []).map(text),
      figure: step?.figure,
      callouts: (step?.callouts ?? []).map(text),
    })),
  }));
}
