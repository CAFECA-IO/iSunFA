// Info: (20260804 - Tzuhan) 逐章匯入的頁碼切片:由節起始頁索引推導每一章要送哪幾頁。
//
// Info: (20260804 - Tzuhan) 為什麼要抽成純函數:這段邏輯決定「模型看得到哪些頁」,
// Info: (20260804 - Tzuhan) 錯了的表現是**內容無聲消失**——不是錯誤、不是空白,是報告裡少了一張表,
// Info: (20260804 - Tzuhan) 而少的那張剛好可能是唯一的資料來源。留在 hook 裡就永遠測不到。

import {
  CARBON_IMPORT_MAX_SECTIONS_PER_CALL,
  CARBON_PAGE_SLICE_MARGIN,
  CARBON_PAGE_INDEX_MIN_PAGE,
} from "@/constants/carbon_page_slice";

export interface IChapterPageRange {
  fromPage: number;
  /** Info: (20260804 - Tzuhan) 未知即不帶上界,後端送到文末 */
  toPage?: number;
}

export enum PageIndexRejectReasonEnum {
  EMPTY = "empty",
  NOT_POSITIVE_INTEGER = "not_positive_integer",
  NOT_MONOTONIC = "not_monotonic",
}

export interface IPageIndexValidation {
  isValid: boolean;
  reason?: PageIndexRejectReasonEnum;
  /** Info: (20260804 - Tzuhan) 出問題的節與頁碼,供 log 定位是索引的哪一段壞掉 */
  offending?: { paragraphId: string; startPage: number }[];
}

/**
 * Info: (20260804 - Tzuhan) 索引合理性檢查。不合理即整份退回「不帶頁碼範圍」(送全文)。
 *
 * 只驗**結構上必然成立**的性質,不猜內容:
 * 1. 頁碼是 ≥ 1 的整數
 * 2. 依大綱順序**非遞減**(允許同頁多節,但不得倒退)
 *
 * 誠實的限度:這道檢查擋得住整份錯亂的索引,**擋不住「差幾頁」的索引**——
 * 把第四章標在 42 而實際在 45,仍然是單調的。那一類要靠 CARBON_PAGE_SLICE_MARGIN
 * 的安全邊界,以及「預期表格沒拿到就要說出來」的事後偵測。
 * 三者各擋一段,沒有任何一道能單獨保證切片是對的。
 */
export function validatePageIndex(
  orderedSections: { id: string; startPage: number | undefined }[],
): IPageIndexValidation {
  const known = orderedSections.filter(
    (section): section is { id: string; startPage: number } =>
      section.startPage !== undefined,
  );
  if (known.length === 0) {
    return { isValid: false, reason: PageIndexRejectReasonEnum.EMPTY };
  }

  const malformed = known.filter(
    (section) =>
      !Number.isInteger(section.startPage) ||
      section.startPage < CARBON_PAGE_INDEX_MIN_PAGE,
  );
  if (malformed.length > 0) {
    return {
      isValid: false,
      reason: PageIndexRejectReasonEnum.NOT_POSITIVE_INTEGER,
      offending: malformed.map(({ id, startPage }) => ({
        paragraphId: id,
        startPage,
      })),
    };
  }

  const regressions = known.filter(
    (section, i) => i > 0 && section.startPage < known[i - 1].startPage,
  );
  if (regressions.length > 0) {
    return {
      isValid: false,
      reason: PageIndexRejectReasonEnum.NOT_MONOTONIC,
      offending: regressions.map(({ id, startPage }) => ({
        paragraphId: id,
        startPage,
      })),
    };
  }

  return { isValid: true };
}

/**
 * Info: (20260804 - Tzuhan) 推導單一章節要送的頁碼範圍。
 *
 * 上界取「下一章第一節的起始頁」而非「本章最後一節的起始頁」:索引只記**起始**頁,
 * 所以 max(起始頁) 等於「最後一節開始的地方」,那一節的內容全部在它之後。
 * 章節在大綱裡連續,下一章的起點就是本章的自然終點——這是推導出來的邊界,不是猜的緩衝。
 *
 * Info: (20260804 - Tzuhan) 但**那個起點本身是估計值**:它來自一次 LLM 索引呼叫,
 * 同一份 PDF 兩輪可能給出不同答案。把上界訂在一個有誤差的估計值上而不留餘裕,
 * 就等於賭索引每次都準——實測賭輸過:第四章標早了一頁,表3.8 半張被切掉,
 * 桑基圖因此整張消失,而畫面上沒有任何異狀。
 *
 * 故上下界各留 CARBON_PAGE_SLICE_MARGIN 頁。重疊的內容由既有的逐項裁決處理
 * (同一節被兩章送到時,以段落歸屬決定採用哪一份),代價只是多幾頁 token。
 * 這與本模組原本的取捨一致:**多花 token 是成本,漏送內容是錯誤,而且是無聲的錯誤。**
 */
export function resolveChapterPageRange(params: {
  /** Info: (20260804 - Tzuhan) 本章各節的起始頁;有任一節未知即回 null(整章退回送全文) */
  sectionPages: (number | undefined)[];
  /** Info: (20260804 - Tzuhan) 下一章第一節的起始頁;本章為最後一章時為 undefined */
  nextChapterFirstPage: number | undefined;
}): IChapterPageRange | null {
  const { sectionPages, nextChapterFirstPage } = params;
  if (sectionPages.length === 0) return null;
  if (sectionPages.some((page) => !page)) return null;

  const pages = sectionPages as number[];
  const fromPage = Math.max(
    CARBON_PAGE_INDEX_MIN_PAGE,
    Math.min(...pages) - CARBON_PAGE_SLICE_MARGIN,
  );

  /**
   * Info: (20260804 - Tzuhan) 上界必須真的在本章最後一節之後才帶。
   * 比較用的是**加邊界之前**的原始值:若下一章的索引落在本章範圍內,
   * 那是索引錯了,此時帶任何上界都不安全,寧可送全文。
   */
  if (!nextChapterFirstPage || nextChapterFirstPage <= Math.max(...pages)) {
    return { fromPage };
  }
  return { fromPage, toPage: nextChapterFirstPage + CARBON_PAGE_SLICE_MARGIN };
}

export interface IImportUnit {
  /** Info: (20260805 - Tzuhan) 所屬章節(API 仍以此界定範圍規則與活動數據萃取) */
  chapterId: string;
  /** Info: (20260805 - Tzuhan) 本次呼叫要處理的節;為該章的連續子集 */
  sectionIds: string[];
  /** Info: (20260805 - Tzuhan) 同章切成多份時的序號,供進度顯示(1-based) */
  partIndex: number;
  partTotal: number;
}

/**
 * Info: (20260805 - Tzuhan) 把章節切成「單次呼叫跑得完」的工作單元。
 *
 * 為什麼要切:閘道的讀取逾時是 60 秒的**閒置**逾時,而請求在等 LLM 期間
 * 一個位元組都沒送,整段都算閒置。拉長逾時已被否決(全站共用、
 * 慢速連線攻擊成本降低),所以要縮的是工作本身。
 *
 * 切的單位是**節**,不是頁:節是大綱的自然邊界,而頁不是 ——
 * 以頁切會把跨頁的表格切成兩半(表4.8 跨 8 頁),
 * 那是拿「無聲的資料損失」換「請求跑得完」。
 *
 * 章的順序與章內節的順序都保持大綱原序:合併結果必須是決定性的。
 */
export function buildImportUnits(
  sections: { id: string; chapterId: string }[],
  chapterIds: string[],
  maxSectionsPerUnit: number = CARBON_IMPORT_MAX_SECTIONS_PER_CALL,
): IImportUnit[] {
  const units: IImportUnit[] = [];
  chapterIds.forEach((chapterId) => {
    const own = sections
      .filter((section) => section.chapterId === chapterId)
      .map((section) => section.id);
    if (own.length === 0) return;
    const parts: string[][] = [];
    for (let i = 0; i < own.length; i += maxSectionsPerUnit) {
      parts.push(own.slice(i, i + maxSectionsPerUnit));
    }
    parts.forEach((sectionIds, index) => {
      units.push({
        chapterId,
        sectionIds,
        partIndex: index + 1,
        partTotal: parts.length,
      });
    });
  });
  return units;
}

/**
 * Info: (20260805 - Tzuhan) 工作單元的頁碼範圍。
 *
 * 上界取「下一個單元的第一節」而非「下一章的第一節」—— 同章切成多份時,
 * 用下一章當上界會讓每一份都送到章尾,切了等於沒切。
 * 安全邊界的理由與 resolveChapterPageRange 相同(索引是估計值,不是事實)。
 */
export function resolveUnitPageRange(params: {
  sectionPages: (number | undefined)[];
  nextUnitFirstPage: number | undefined;
}): IChapterPageRange | null {
  return resolveChapterPageRange({
    sectionPages: params.sectionPages,
    nextChapterFirstPage: params.nextUnitFirstPage,
  });
}
