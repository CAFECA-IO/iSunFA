/**
 * Info: (20260807 - Emily) 前端 PDF 光柵化的尺寸預算與空白偵測
 * (issue_drafts/inventory_table_import/10_report_pdf_all_blank.md)。
 *
 * 抽成純函式模組而非留在 `pdf_editor.tsx` 裡,是因為這兩件事**必須測得到**:
 * 「超過上限」與「產出是空白」是同一類錯誤的兩個發現時機,
 * 而它們原本都不存在 —— 153 頁空白 PDF 是「成功」下載的。
 */

import {
  PDF_BLANK_PROBE_MIN_INK_PIXELS,
  PDF_BLANK_PROBE_SIZE_PX,
  PDF_CANVAS_MAX_AREA_PX,
  PDF_CANVAS_MAX_DIMENSION_PX,
  PDF_CANVAS_SAFE_RATIO,
  PDF_PAGE_BREAK_MIN_FILL_RATIO,
} from "@/constants/pdf_export";

export interface ICanvasBudgetInput {
  /** Info: (20260807 - Emily) 待光柵化內容的 CSS 像素寬 */
  widthPx: number;
  /** Info: (20260807 - Emily) 待光柵化內容的 CSS 像素高 */
  heightPx: number;
  /** Info: (20260807 - Emily) html2canvas 的 scale */
  scale: number;
}

export interface ICanvasBudgetVerdict {
  /** Info: (20260807 - Emily) 是否在安全預算內(false = 必須分段,單張畫不出來) */
  withinBudget: boolean;
  /**
   * Info: (20260807 - Emily) 根本量不到尺寸(寬或高為 0)——「沒東西可畫」,不是「太大」。
   *
   * 這兩件事原本共用 `withinBudget: false`,而它們的正確處置相反:
   * 太大要分段,量不到則分段也沒用(切幾段都是 0×0)。
   * 混在一起的後果是 UAT 實測到的那條錯誤鏈:元素被 `display:none` 藏著 → 量到 0×0
   * → 判成「超出預算」→ 走分段 → 畫出 0×0 → 空白偵測攔下 → 對使用者說「輸出是空白」。
   * 每一步都照著寫的邏輯跑,而最後那句話與真正的原因無關。
   */
  isEmpty: boolean;
  /** Info: (20260807 - Emily) 實際會配置的 canvas 高(px),供錯誤訊息與 log 指認 */
  projectedHeightPx: number;
  projectedWidthPx: number;
  projectedAreaPx: number;
}

/**
 * Info: (20260807 - Emily) 事前推算單張 canvas 的尺寸,判斷是否落在安全預算內。
 * 事前判斷而非事後補救,是因為超限的失敗形式是**靜默空白**:
 * 等到畫完再看就已經浪費了數十秒,而且分不出是超限還是別的原因。
 */
export const assessCanvasBudget = ({
  widthPx,
  heightPx,
  scale,
}: ICanvasBudgetInput): ICanvasBudgetVerdict => {
  const projectedWidthPx = Math.ceil(widthPx * scale);
  const projectedHeightPx = Math.ceil(heightPx * scale);
  const projectedAreaPx = projectedWidthPx * projectedHeightPx;
  const maxDimension = PDF_CANVAS_MAX_DIMENSION_PX * PDF_CANVAS_SAFE_RATIO;
  const maxArea = PDF_CANVAS_MAX_AREA_PX * PDF_CANVAS_SAFE_RATIO;
  return {
    isEmpty: projectedWidthPx <= 0 || projectedHeightPx <= 0,
    withinBudget:
      projectedWidthPx > 0 &&
      projectedHeightPx > 0 &&
      projectedWidthPx <= maxDimension &&
      projectedHeightPx <= maxDimension &&
      projectedAreaPx <= maxArea,
    projectedWidthPx,
    projectedHeightPx,
    projectedAreaPx,
  };
};

/**
 * Info: (20260807 - Emily) 依安全預算算出「一段最多幾頁」。
 * 回傳至少 1 —— 連一頁都放不下時分段也救不了,由呼叫端以明確錯誤收尾,
 * 而不是回 0 讓迴圈永遠不前進。
 */
export const maxPagesPerSegment = (
  pageHeightPx: number,
  widthPx: number,
  scale: number,
  hardCapPages: number,
): number => {
  if (pageHeightPx <= 0 || scale <= 0) return 1;
  const maxDimension = PDF_CANVAS_MAX_DIMENSION_PX * PDF_CANVAS_SAFE_RATIO;
  const maxArea = PDF_CANVAS_MAX_AREA_PX * PDF_CANVAS_SAFE_RATIO;
  const scaledWidth = Math.max(1, Math.ceil(widthPx * scale));
  const byDimension = Math.floor(maxDimension / (pageHeightPx * scale));
  const byArea = Math.floor(maxArea / scaledWidth / (pageHeightPx * scale));
  return Math.max(1, Math.min(hardCapPages, byDimension, byArea));
};

/**
 * Info: (20260807 - Emily) 降採樣後判斷 canvas 是否「沒有內容」。
 *
 * 為什麼不直接讀原 canvas:一張 4,000 萬像素的 canvas 呼叫 getImageData
 * 會配置 160 MB 並凍住主執行緒。
 *
 * 為什麼**逐次減半**而不是一次縮到位:一次把 1588×2246 畫到 128×128,
 * 瀏覽器會走快速路徑(近似最鄰近取樣),細內容會被整條跳過。
 * 實測一張只有一行標題的 A4,一次縮圖量到 0 個非背景像素 —— 判定成空白,
 * 於是這個護欄會把一份**正常的報告**擋下來並報錯。
 * 每次只縮一半則每一步都是正常的 box filter,墨色會被平均進去而不是被丟棄。
 *
 * 判定基準取「與左上角像素不同的數量」而非「是否為白」:
 * 深色版面的空白頁不是白的,但仍然是整片同色。
 */
export const isCanvasBlank = (
  canvas: HTMLCanvasElement,
  createProbe: () => HTMLCanvasElement,
): boolean => {
  if (canvas.width === 0 || canvas.height === 0) return true;

  /**
   * Info: (20260807 - Emily) 取不到 2d context 就無從判斷 —— 回 false(視為非空白)。
   * 這裡回 true 會把「無法檢查」變成「檢查出問題」,以偵測手段的失效阻斷正常輸出,
   * 那是比漏報更糟的失敗方向。
   */
  const shrink = (
    source: HTMLCanvasElement,
    width: number,
    height: number,
  ): HTMLCanvasElement | null => {
    const target = createProbe();
    target.width = width;
    target.height = height;
    const context = target.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.imageSmoothingEnabled = true;
    context.drawImage(source, 0, 0, width, height);
    return target;
  };

  let source = canvas;
  let width = canvas.width;
  let height = canvas.height;
  while (
    width > PDF_BLANK_PROBE_SIZE_PX * 2 ||
    height > PDF_BLANK_PROBE_SIZE_PX * 2
  ) {
    const nextWidth = Math.max(PDF_BLANK_PROBE_SIZE_PX, Math.ceil(width / 2));
    const nextHeight = Math.max(PDF_BLANK_PROBE_SIZE_PX, Math.ceil(height / 2));
    const stepped = shrink(source, nextWidth, nextHeight);
    if (!stepped) return false;
    source = stepped;
    width = nextWidth;
    height = nextHeight;
  }

  const probe = shrink(
    source,
    PDF_BLANK_PROBE_SIZE_PX,
    PDF_BLANK_PROBE_SIZE_PX,
  );
  if (!probe) return false;
  const context = probe.getContext("2d", { willReadFrequently: true });
  if (!context) return false;

  const { data } = context.getImageData(
    0,
    0,
    PDF_BLANK_PROBE_SIZE_PX,
    PDF_BLANK_PROBE_SIZE_PX,
  );
  const [baseR, baseG, baseB, baseA] = [data[0], data[1], data[2], data[3]];
  let differing = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (
      data[i] !== baseR ||
      data[i + 1] !== baseG ||
      data[i + 2] !== baseB ||
      data[i + 3] !== baseA
    ) {
      differing += 1;
    }
  }
  return differing < PDF_BLANK_PROBE_MIN_INK_PIXELS;
};

/**
 * Info: (20260807 - Emily) 不可切割的區塊在內容座標系裡的上下緣(CSS px,相對於待輸出元素頂端)。
 */
export interface IAtomicBlock {
  topPx: number;
  bottomPx: number;
}

/**
 * Info: (20260807 - Emily) 算出每一頁的起始位置,讓分頁線盡量不要從圖表中間穿過去
 * (issue_drafts/inventory_table_import/10,UAT 回報「圖表多處被截斷」)。
 *
 * 原本每頁固定 pageHeightPx,分頁線落在哪裡純看運氣 ——
 * 一張桑基圖被切成上下兩半、各出現在相鄰兩頁,在查證文件裡等於這張圖沒用。
 *
 * 作法:走到每一個候選分頁線時,看有沒有區塊被它穿過;有的話把分頁線往上提到那個區塊的頂端,
 * 那一頁提早結束、留白,整張圖完整落在下一頁。
 *
 * ## 三個不提前分頁的情況
 *
 * 1. **區塊比一整頁還高** —— 提前也沒用,它在哪一頁都會被切開。硬切,並讓它從頁頂開始
 *    (至少第一刀落在完整的一頁邊界上,而不是把圖切成三段)。
 * 2. **提前之後該頁太空** —— 少於 PDF_PAGE_BREAK_MIN_FILL_RATIO 就不提前。
 *    否則一張靠近頁首的圖會換來一頁幾乎全白;92 頁的報告禁不起這樣累積。
 * 3. **區塊頂端就在游標處** —— 已經在頁頂了,提前會讓分頁線不前進,迴圈就卡死了。
 *
 * ## 為什麼回傳起始位置而不是頁高
 *
 * 提前分頁之後每頁高度不再相同,呼叫端貼圖時要的是「這一頁從內容的哪裡開始」。
 * 回傳頁高會逼呼叫端自己累加,而累加會把捨入誤差沿著 92 頁疊起來。
 */
export const computePageStarts = (
  contentHeightPx: number,
  pageHeightPx: number,
  blocks: readonly IAtomicBlock[],
): number[] => {
  if (pageHeightPx <= 0 || contentHeightPx <= 0) return [0];

  const minFill = pageHeightPx * PDF_PAGE_BREAK_MIN_FILL_RATIO;
  const sorted = [...blocks]
    .filter((b) => b.bottomPx > b.topPx)
    .sort((a, b) => a.topPx - b.topPx);

  const starts = [0];
  let cursor = 0;

  // Info: (20260807 - Emily) 上界防呆:每一輪 cursor 必增,最多不會超過總頁數
  const maxPages =
    Math.ceil(contentHeightPx / pageHeightPx) + blocks.length + 1;
  for (let guard = 0; guard < maxPages; guard += 1) {
    const naturalBoundary = cursor + pageHeightPx;
    if (naturalBoundary >= contentHeightPx) break;

    const straddling = sorted.find(
      (b) =>
        b.topPx > cursor &&
        b.topPx < naturalBoundary &&
        b.bottomPx > naturalBoundary &&
        b.bottomPx - b.topPx <= pageHeightPx,
    );

    const boundary =
      straddling && straddling.topPx - cursor >= minFill
        ? straddling.topPx
        : naturalBoundary;

    starts.push(boundary);
    cursor = boundary;
  }
  return starts;
};
