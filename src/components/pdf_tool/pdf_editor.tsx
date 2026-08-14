"use client";

import { useState, useRef, useEffect } from "react";
import {
  AlertTriangle,
  Check,
  Download,
  Edit3,
  Eye,
  Loader2,
  Share2,
  Sparkles,
  X as XIcon,
} from "lucide-react";
import {
  MarkdownContent,
  MarkdownContentVariant,
} from "@/components/common/markdown_content";
import { useTranslation } from "@/i18n/i18n_context";
import Image from "next/image";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import PdfShareLinkModal from "@/components/pdf_tool/pdf_share_link_modal";
import { AiReportModal } from "@/components/pdf_tool/ai_report_modal";
import EditPanel from "@/components/pdf_tool/edit_panel";
import { PdfToolViewMode, PDF_PRINT_STYLE } from "@/constants/pdf_tool";
import { THEME_STATIC_LIGHT_CLASS } from "@/constants/theme";
import { safeStorage } from "@/lib/utils/storage";
import {
  PDF_EXPORT_JPEG_QUALITY,
  PDF_EXPORT_MARGIN_MM,
  PDF_EXPORT_SCALE,
  PDF_SEGMENT_MAX_PAGES,
} from "@/constants/pdf_export";
import {
  assessCanvasBudget,
  computePageStarts,
  isCanvasBlank,
  maxPagesPerSegment,
} from "@/lib/utils/pdf_canvas_guard";
import {
  createColorConverter,
  createColorSafeComputedStyle,
} from "@/lib/utils/pdf_color_safety";
import {
  isPdfFontUnavailableError,
  requestCarbonReportPdf,
  saveBlobAs,
} from "@/lib/utils/carbon_report_pdf_client";
import {
  CARBON_PDF_EXPORT_MODE,
  CARBON_PDF_FOOTER_TITLE,
  CarbonPdfExportModeEnum,
} from "@/constants/carbon_pdf";

// Info: (20260604 - Julian) 定義預設 md 內容與 storage key
const DEFAULT_CONTENT =
  "# iSunFA Report\n\nEnter your markdown content here...";
const STORAGE_KEY = "isunfa_pdf_editor_draft";

/**
 * Info: (20260807 - Emily) 產出為空白 —— 這是本次修正真正要防的失敗
 * (issue_drafts/inventory_table_import/10_report_pdf_all_blank.md)。
 *
 * 具名錯誤而非泛用 Error:呼叫端要能對使用者說「報告太長,輸出是空白的」,
 * 而不是與「網路失敗」共用同一句「下載失敗」。
 * 一份 153 頁的空白 PDF 在審計場景裡比一個明確的失敗訊息危險得多。
 */
/**
 * Info: (20260807 - Emily) 待輸出的元素量不到尺寸 —— 它沒有被排版
 * (通常是所在容器帶著 display:none)。
 *
 * 與「輸出是空白」分開命名:那是畫了但畫出白紙,這是根本沒東西可畫。
 * 兩者對使用者的下一步完全不同,共用一句話會把人帶往錯的方向。
 */
class PdfNotLaidOutError extends Error {
  constructor(detail: string) {
    super(`pdf source element is not laid out: ${detail}`);
    this.name = "PdfNotLaidOutError";
  }
}

/**
 * Info: (20260807 - Emily) 暫時解除祖先鏈上的 display:none,讓元素量得到尺寸,結束後還原。
 *
 * 為什麼需要:`PdfEditor` 在「編輯 Markdown」模式下用 Tailwind 的 `hidden` 藏起預覽容器,
 * 而 `contentRef` 就在裡面 —— 於是在編輯模式按下載,量到的是 0×0。
 * UAT 實測到的正是這條路徑。
 *
 * 只動 display,不動 position 或 width:改後兩者會改變版面寬度,
 * 而版面寬度是整份 PDF 分頁換算的基準,動了它等於換一份文件去輸出。
 */
const withLaidOutElement = async <T,>(
  element: HTMLElement,
  run: () => Promise<T>,
): Promise<T> => {
  const restores: Array<() => void> = [];
  let node: HTMLElement | null = element;
  while (node) {
    if (window.getComputedStyle(node).display === "none") {
      const original = node.style.display;
      const target = node;
      target.style.display = "block";
      restores.push(() => {
        target.style.display = original;
      });
    }
    node = node.parentElement;
  }
  try {
    return await run();
  } finally {
    restores.reverse().forEach((restore) => restore());
  }
};

class PdfBlankOutputError extends Error {
  constructor(detail: string) {
    super(`pdf output is blank: ${detail}`);
    this.name = "PdfBlankOutputError";
  }
}

/**
 * Info: (20260807 - Emily) 分段光柵化:以「整頁 A4」為單位切片,逐段畫、逐頁貼。
 *
 * 繞開的是單張 canvas 的尺寸上限 —— 153 頁一次畫成一張,高度 34 萬 px,
 * 瀏覽器不會拋錯,只會給一張全空的畫布。
 * 切在分頁線上而非固定像素,是為了不讓任何一行字被從中間剖開。
 */
const renderSegmentedPdf = async (
  element: HTMLElement,
  fileName: string,
): Promise<void> => {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const pdf = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
  });
  const printableWidthMm =
    pdf.internal.pageSize.getWidth() - PDF_EXPORT_MARGIN_MM * 2;
  const printableHeightMm =
    pdf.internal.pageSize.getHeight() - PDF_EXPORT_MARGIN_MM * 2;

  const contentWidthPx = element.scrollWidth;
  const contentHeightPx = element.scrollHeight;
  // Info: (20260807 - Emily) 內容寬對映到可列印寬,由此換算「一頁 A4 等於幾個 CSS px 高」
  const pxPerMm = contentWidthPx / printableWidthMm;
  const pageHeightPx = printableHeightMm * pxPerMm;
  /**
   * Info: (20260807 - Emily) 量出不可切割的區塊,讓分頁線避開它們
   * (UAT 回報:圖表多處被分頁線從中剖開,不只最後兩張)。
   *
   * getBoundingClientRect 是視窗座標,減掉元素自身的 top 才是元素內偏移 ——
   * 與 html2canvas 的 x/y 用的是同一個座標系(那個語意今天才實測釐清過)。
   *
   * 選擇器涵蓋 svg(mermaid 圖表)、table、img、pre:這些東西被切成兩半之後
   * 兩頁各有一半,對查證來說等於這個元素沒用。純文字段落被切開則無所謂,
   * 讀者接得起來,所以不列入 —— 每多一個不可切割的區塊就多一次提前分頁的機會,
   * 而提前分頁的代價是留白。
   */
  const elementTopInViewport = element.getBoundingClientRect().top;
  const atomicBlocks = Array.from(
    element.querySelectorAll<HTMLElement>("svg, table, img, pre"),
  )
    .map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        topPx: rect.top - elementTopInViewport,
        bottomPx: rect.bottom - elementTopInViewport,
      };
    })
    .filter((block) => block.bottomPx > block.topPx);

  /**
   * Info: (20260807 - Emily) 每頁的起始位置(提前分頁之後頁高不再一致)。
   * 用起始位置而不是頁高:呼叫端貼圖要的就是「這頁從內容的哪裡開始」,
   * 而且避免捨入誤差沿著 92 頁累加。
   */
  const pageStarts = computePageStarts(
    contentHeightPx,
    pageHeightPx,
    atomicBlocks,
  );
  const totalPages = pageStarts.length;
  const pagesPerSegment = maxPagesPerSegment(
    pageHeightPx,
    contentWidthPx,
    PDF_EXPORT_SCALE,
    PDF_SEGMENT_MAX_PAGES,
  );

  const pageCanvas = document.createElement("canvas");
  pageCanvas.width = Math.ceil(contentWidthPx * PDF_EXPORT_SCALE);
  pageCanvas.height = Math.ceil(pageHeightPx * PDF_EXPORT_SCALE);
  const pageContext = pageCanvas.getContext("2d");
  if (!pageContext) throw new PdfBlankOutputError("no 2d context for page");

  let emittedPages = 0;
  for (
    let startPage = 0;
    startPage < totalPages;
    startPage += pagesPerSegment
  ) {
    const pagesInSegment = Math.min(pagesPerSegment, totalPages - startPage);
    const sliceTopPx = pageStarts[startPage];
    // Info: (20260807 - Emily) 段落下緣是下一段的起點;最後一段收到內容尾端
    const sliceBottomPx =
      startPage + pagesInSegment < totalPages
        ? pageStarts[startPage + pagesInSegment]
        : contentHeightPx;
    const sliceHeightPx = sliceBottomPx - sliceTopPx;

    /**
     * Info: (20260807 - Emily) 迴圈內 await 是刻意的:同時畫多段等於同時配置多張大 canvas,
     * 那正是這支修正要避開的記憶體壓力。
     */
    const segmentCanvas = await html2canvas(element, {
      scale: PDF_EXPORT_SCALE,
      useCORS: true,
      backgroundColor: "#ffffff",
      /**
       * Info: (20260807 - Emily) x/y 是**元素內偏移**,不是文件座標。
       *
       * 這一點以無頭 Chromium + html2canvas 1.4.1 實測確認過:
       * 把元素在文件中的位置(getBoundingClientRect().top + scrollY)加進 y,
       * 會讓每一段的內容整體下移該距離 —— 元素距頂端 137px 就整份錯開 137px,
       * 最後一段則因為超出內容尾端而變成全白。
       * 錯得很安靜:每段都畫得出東西,空白偵測也攔不下來,
       * 只有逐頁比對內容才看得出全篇往下滑了一截。
       */
      x: 0,
      y: sliceTopPx,
      width: contentWidthPx,
      height: sliceHeightPx,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
      scrollX: 0,
      scrollY: 0,
    });

    /**
     * Info: (20260807 - Emily) 逐段驗空白:超限之外還有 oklch 解析失敗等成因,
     * 共通點都是「畫完了但什麼都沒有」。在這裡攔下,才不會把整份空白存成檔案。
     */
    if (isCanvasBlank(segmentCanvas, () => document.createElement("canvas"))) {
      throw new PdfBlankOutputError(
        `segment at page ${startPage + 1} (${segmentCanvas.width}x${segmentCanvas.height})`,
      );
    }

    for (let offset = 0; offset < pagesInSegment; offset += 1) {
      pageContext.fillStyle = "#ffffff";
      pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      /**
       * Info: (20260807 - Emily) 貼圖位移必須取整 —— 小數位移會觸發重採樣。
       *
       * pageHeightPx 來自 267mm × (contentWidth / 180mm),幾乎必然是小數
       * (794px 寬時為 1177.7667),× scale 後每頁位移是 -2355.53 這種值。
       * drawImage 收到小數 y 會用雙線性重採樣整張圖,等於三分之二的頁面
       * (每段中 offset > 0 的那些)全頁輕微模糊 —— 對一份要給人逐頁閱讀的
       * 查證文件來說,這是實質的品質損失,而且完全可以避免。
       *
       * 取整後是整數位移的純複製,不做任何內插。代價是每頁內容位置最多
       * 偏移半個像素,肉眼不可見;且因為每次都從 offset 重算而非累加,
       * 誤差不會沿著 153 頁累積。
       */
      /**
       * Info: (20260807 - Emily) 每一頁只畫**它自己那一段**,不足一頁的部分留白。
       *
       * 上一版用三參數的 drawImage 貼整張段落 canvas,只調整 y 位移 ——
       * 於是每頁都畫滿一整頁的高度。提前分頁之後某些頁比一整頁短,
       * 多畫出來的部分正好是下一頁開頭的內容:UAT 看到的
       * 「圖被切一半印在上一頁,下一頁又完整印一次」就是這個溢出,
       * 不是重複渲染。提前分頁拉高多少,就溢出多少。
       *
       * 改用來源矩形版本,把來源高度限制在這一頁自己的高度。
       * 取整仍然必要:小數位移或小數高度都會觸發重採樣,整頁輕微模糊。
       */
      const pageTopPx = pageStarts[startPage + offset];
      const pageBottomPx =
        startPage + offset + 1 < totalPages
          ? pageStarts[startPage + offset + 1]
          : contentHeightPx;
      const sourceY = Math.round((pageTopPx - sliceTopPx) * PDF_EXPORT_SCALE);
      const sourceHeight = Math.min(
        Math.round((pageBottomPx - pageTopPx) * PDF_EXPORT_SCALE),
        segmentCanvas.height - sourceY,
      );
      if (sourceHeight > 0) {
        pageContext.drawImage(
          segmentCanvas,
          0,
          sourceY,
          segmentCanvas.width,
          sourceHeight,
          0,
          0,
          segmentCanvas.width,
          sourceHeight,
        );
      }
      if (emittedPages > 0) pdf.addPage();
      pdf.addImage(
        pageCanvas.toDataURL("image/jpeg", PDF_EXPORT_JPEG_QUALITY),
        "JPEG",
        PDF_EXPORT_MARGIN_MM,
        PDF_EXPORT_MARGIN_MM,
        printableWidthMm,
        printableHeightMm,
      );
      emittedPages += 1;
    }
  }

  pdf.save(fileName);
};

enum ToastType {
  SUCCESS = "success",
  ERROR = "error",
  /**
   * Info: (20260812 - Emily) 「成功了,但少了一塊」——**降級**,不是失敗。
   *
   * 需要第三種而不是沿用 ERROR:下載其實成功了,檔案就在使用者的硬碟上。
   * 用紅色的 X 會讓人以為沒抽到檔而再點一次下載(而重印一份 53 頁的報告
   * 要再跑一次 Chrome 與 mermaid),然後拿到同一份東西。
   *
   * 也不能沿用 SUCCESS:那條路徑不出任何提示,而這裡要說的正是
   * 「這份查證文件缺了目錄頁碼／缺了幾張圖」—— 不說的話它看起來是完整的。
   */
  WARNING = "warning",
}

/**
 * Info: (20260812 - Emily) toast 的底色。
 *
 * 用查表而不是巢狀三元:原本是「SUCCESS ? 綠 : 紅」的二元式,加第三種時
 * 巢狀三元會在 className 的樣板字串裡再長一層,而那裡本來就不好讀。
 * 加第四種狀態時這張表只要多一列。
 */
const TOAST_TONE: Readonly<Record<ToastType, string>> = {
  [ToastType.SUCCESS]: "bg-emerald-500",
  [ToastType.WARNING]: "bg-amber-500",
  [ToastType.ERROR]: "bg-red-500",
};

interface IPdfEditorProps {
  setErrorModal: React.Dispatch<
    React.SetStateAction<{
      isOpen: boolean;
      message: string;
    }>
  >;
  layout?: "split" | "toggle";
  /**
   * Info: (20260812 - Emily) 印在文件第一頁的報告名稱
   * (`data/issue_drafts/open/24_report_identity_fields.md`)。
   *
   * 走**文件外殼**而不是內容裡的 H1：報告名稱是文件的中繼資料，
   * 而 ADR 014 要求 `content` 逐字照抄原文。留在內容裡的話使用者可以在
   * 編輯器裡把它刪掉，然後那份文件就沒有名稱了，而沒有人會發現。
   *
   * 空字串或省略即**不印**——沒有名稱是一眼看得出來的缺漏，
   * 而一個猜出來的名稱印在查證文件的封面上會被當成事實。
   */
  reportTitle?: string;
  /**
   * Info: (20260814 - Emily) 查證識別欄位，印在第一頁橫幅裡（issue 24）。
   *
   * 已經是 label/value 的成品而不是原始資料:文案與「沒填印什麼」都由
   * 呼叫端決定（`buildIdentityRows`），這個元件不知道使用者的語言。
   * 與 `shell` 那組文案同一個立場。
   */
  identityRows?: ReadonlyArray<{ label: string; value: string }>;
  isEmbedded?: boolean;
  value?: string;
  onChange?: (val: string) => void;
  storageKey?: string;
  // Info: (20260713 - Tzuhan) 初始檢視模式;未指定時維持 EDIT 以相容既有呼叫點
  defaultViewMode?: PdfToolViewMode;
  // Info: (20260713 - Tzuhan) 預覽內容字級變體;嵌入式場景(如 carbon_chatbot)傳 compact 與 app UI 協調
  contentVariant?: MarkdownContentVariant;
  // Info: (20260714 - Emily) 下載檔名(未指定時維持既有 iSunFA_Document_{timestamp} 格式)
  downloadFileName?: string;
  // Info: (20260714 - Emily) 下載快照前的清理 hook(如 carbon_chatbot 移除段落高亮,避免滲入 PDF)
  onBeforeDownload?: () => void;
  // Info: (20260714 - Emily) split 佈局的並排斷點:預設 md(既有行為);嵌入場景空間較擠時可設 lg,平板寬度退回單欄切換
  splitBreakpoint?: "md" | "lg";
  /**
   * Info: (20260810 - Emily) 改走伺服端向量列印
   * (data/issue_drafts/inventory_table_import/17)。
   *
   * 預設 false —— 這是 opt-in 而不是全域切換,因為前端光柵化那條路仍有它的用途:
   * 文件工具與任務板的短文件輸出正常,而公開分享頁(/share/pdf/[token])沒有登入,
   * 打不到需要驗證的列印端點。目前只有碳盤查報告開啟:
   * 它動輒上百頁、含跨頁表格,而且是要交給查證人員的文件 ——
   * 光柵化產出的點陣圖不能搜尋、不能複製任何一個排放量數字。
   */
  serverPrint?: boolean;
  /**
   * Info: (20260810 - Emily) 轉傳給 MarkdownContent:把段落內的換行還原成硬斷行。
   * 與 serverPrint 一樣是 opt-in —— 只有碳盤查報告的原文行結構被量過。
   */
  /**
   * Info: (20260812 - Emily) 渲染時剝掉內容開頭那行文件級 H1
   * (`data/issue_drafts/open/24_report_identity_fields.md`)。
   *
   * 只有碳盤查報告要開:既有草稿的第一行是 `# <會話名>`，而報告名稱已經改走
   * `reportTitle`（文件外殼）。**選用而非預設** —— `MarkdownContent` 跑在 21 個
   * 使用端上，一支只對碳報告成立的轉換不該無條件套給全部人（`#6644`）。
   */
  stripDocumentTitle?: boolean;
  restoreSourceLineBreaks?: boolean;
}

export default function PdfEditor({
  setErrorModal,
  layout = "split",
  reportTitle = "",
  identityRows = undefined,
  isEmbedded = false,
  value = undefined,
  onChange = undefined,
  storageKey = STORAGE_KEY,
  defaultViewMode = PdfToolViewMode.EDIT,
  contentVariant = "document",
  downloadFileName = undefined,
  onBeforeDownload = undefined,
  splitBreakpoint = "md",
  serverPrint = false,
  stripDocumentTitle = false,
  restoreSourceLineBreaks = false,
}: IPdfEditorProps) {
  const { t } = useTranslation();

  const contentRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Info: (20260604 - Julian) md 內容
  const [markdownContext, setMarkdownContext] =
    useState<string>(DEFAULT_CONTENT);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<PdfToolViewMode>(defaultViewMode);
  /**
   * Info: (20260807 - Emily) 只有預覽看得到的時候才允許下載
   * (UAT 決議:與其在隱藏的元素上輸出一份沒人驗證得了的 PDF,不如擋下來並說清楚)。
   *
   * toggle 版面在「編輯 Markdown」模式下用 display:none 藏起預覽容器,
   * 而 contentRef 就在裡面 —— 量到 0x0,輸出的內容與使用者看到的無關。
   * split 版面兩邊同時在,不受影響。
   */
  const isDownloadable =
    layout !== "toggle" || viewMode === PdfToolViewMode.PREVIEW;

  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);

  // Info: (20260604 - Julian) Share Link Modal State
  const [isShareLinkModalOpen, setIsShareLinkModalOpen] =
    useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState<boolean>(false);

  // Info: (20260605 - Julian) AI Report Modal State
  const [isAiReportModalOpen, setIsAiReportModalOpen] =
    useState<boolean>(false);
  const [aiDataInput, setAiDataInput] = useState<string>("");
  const [aiInstruction, setAiInstruction] = useState<string>("");

  // Info: (20260605 - Julian) Toast Message State
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: ToastType;
  } | null>(null);

  // Info: (20260604 - Julian) 建立一個 ref 來儲存 markdownContext 的最新值
  const markdownRef = useRef<string>(markdownContext);
  useEffect(() => {
    markdownRef.current = markdownContext;
  }, [markdownContext]);

  // Info: (20260708 - Tzuhan) Sync controlled value
  useEffect(() => {
    if (value !== undefined) {
      setMarkdownContext(value);
    }
  }, [value]);

  // Info: (20260615 - Julian) 統一的 Toast 控制與 Timer 清理機制，防止重複點擊時計時器互相干擾
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (text: string, type: ToastType) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage({ text, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimeoutRef.current = null;
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const draftLoadedRef = useRef(false);

  useEffect(() => {
    // Info: (20260604 - Julian) 頁面載入時，從 localstorage 取得草稿
    // Info: (20260712 - Luphia) 以 ref 守衛確保僅掛載時載入一次，避免 props 變動時覆蓋編輯中內容
    if (draftLoadedRef.current) return;
    draftLoadedRef.current = true;

    if (!isEmbedded) {
      const savedDraft = safeStorage.getItem(storageKey);
      if (savedDraft && savedDraft !== DEFAULT_CONTENT) {
        setMarkdownContext(savedDraft);
      }
    }
  }, [isEmbedded, storageKey]);

  useEffect(() => {
    // Info: (20260604 - Julian) 建立「儲存草稿」函式
    const saveDraft = () => {
      if (isEmbedded) return;
      const currentContent = markdownRef.current;
      if (currentContent && currentContent !== DEFAULT_CONTENT) {
        safeStorage.setItem(storageKey, currentContent);
      } else {
        safeStorage.removeItem(storageKey);
      }
    };

    // Info: (20260604 - Julian) 建立「頁面離開前儲存草稿」監聽
    const handleBeforeUnload = () => {
      saveDraft();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      // Info: (20260604 - Julian) 移除監聽並儲存草稿
      window.removeEventListener("beforeunload", handleBeforeUnload);
      saveDraft();

      // Info: (20260605 - Julian) 元件卸載時，如果還有進行中的 AI 請求，就直接中斷它，避免 Memory Leak
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isEmbedded, storageKey]);

  // Info: (20260615 - Julian) 捕捉 Cmd + S / Ctrl + S 快捷鍵，手動儲存草稿到 localStorage
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isSaveShortcut =
        (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s";
      if (isSaveShortcut) {
        e.preventDefault();

        if (!isEmbedded) {
          const currentContent = markdownRef.current;
          if (currentContent && currentContent !== DEFAULT_CONTENT) {
            safeStorage.setItem(storageKey, currentContent);
          } else {
            safeStorage.removeItem(storageKey);
          }
        }

        showToast(
          t("admin_mission_board.pdf_editor.toast_draft_saved")!,
          ToastType.SUCCESS,
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [t, isEmbedded, storageKey]);

  const toggleShareLinkModal = () => {
    setIsShareLinkModalOpen((prev) => !prev);
  };

  const handleShareClick = async () => {
    if (shareToken) {
      setIsShareLinkModalOpen(true);
      return;
    }

    setIsSharing(true);
    try {
      const result = await request<IApiResponse<{ token: string }>>(
        "/api/v1/admin/pdf_editor/share",
        {
          method: "POST",
          body: JSON.stringify({ text: markdownContext }),
        },
      );

      if (result.code === ApiCode.SUCCESS && result.payload?.token) {
        setShareToken(result.payload.token);
        setIsShareLinkModalOpen(true);
      } else {
        setErrorModal({
          isOpen: true,
          message: t("admin_mission_board.pdf_editor.toast_share_link_failed"),
        });
      }
    } catch (error) {
      console.error("Share error:", error);
      setErrorModal({
        isOpen: true,
        message: t("admin_mission_board.pdf_editor.toast_share_link_failed"),
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleRevokeShare = async () => {
    if (!shareToken) return;
    try {
      setIsRevoking(true);
      const result = await request<IApiResponse<null>>(
        `/api/v1/admin/pdf_editor/share/${shareToken}/revoke`,
        { method: "PATCH" },
      );

      if (result.code === ApiCode.SUCCESS) {
        setShareToken(null);
        setIsShareLinkModalOpen(false);
      }
    } catch (error) {
      console.error("Revoke error:", error);
    } finally {
      setIsRevoking(false);
    }
  };

  const handleGenerateAiReport = async (data: string, instruction: string) => {
    if (isAiProcessing) return; // Info: (20260605 - Julian) 避免重複呼叫 AI
    setIsAiReportModalOpen(false); // Info: (20260605 - Julian) 立即關閉視窗
    setIsAiProcessing(true);
    abortControllerRef.current = new AbortController();

    try {
      const response = await request<IApiResponse<{ result: string }>>(
        "/api/v1/admin/pdf_editor/report_generate",
        {
          method: "POST",
          body: JSON.stringify({ data, instruction }),
          signal: abortControllerRef.current.signal,
        },
      );

      if (response && response.payload && response.payload.result) {
        const report = response.payload.result;
        setMarkdownContext((prev) => prev + "\n\n" + report);
        showToast(
          t("admin_mission_board.pdf_editor.toast_report_inserted"),
          ToastType.SUCCESS,
        );
        setAiDataInput("");
        setAiInstruction("");
      } else {
        setErrorModal({
          isOpen: true,
          message: t(
            "admin_mission_board.pdf_editor.ai_assistant.ai_no_response",
          ),
        });
      }
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message.toLowerCase().includes("abort")
      ) {
        console.log("AI request cancelled by user.");
        return;
      }
      console.error("Failed to generate report:", error);
      setErrorModal({
        isOpen: true,
        message: t("admin_mission_board.pdf_editor.ai_assistant.ai_timeout"),
      });
    } finally {
      setIsAiProcessing(false);
      abortControllerRef.current = null;
    }
  };

  // Info: (20260720 - Julian) 中止進行中的 AI 報告生成請求（供子元件「中斷思考」按鈕呼叫）
  const handleStopAi = () => {
    abortControllerRef.current?.abort();
  };

  /**
   * Info: (20260810 - Emily) 伺服端向量列印
   * (data/issue_drafts/inventory_table_import/17)。
   *
   * 送出的是 markdown 而不是快照後的 DOM:伺服端用同一份 markdown 重新排版,
   * 因此輸出是真的分頁文件 —— 列不會被切一半、跨頁的表會重印表頭、
   * 塞不下直式頁的表自動轉橫式,而文字是文字(可搜尋、可複製)。
   * html2canvas 那條路一條列印規則都不執行,那些是它做不到的事。
   *
   * **失敗不自動退回光柵化。** 退回的產物是一份上百頁、數十 MB、
   * 一個字都抽不出來的點陣圖 —— 對查證文件而言那不是「比較差的成功」。
   * 要整批切回舊路徑請改 CARBON_PDF_EXPORT_MODE。
   */
  const downloadViaServer = async (fileName: string): Promise<boolean> => {
    if (!serverPrint) return false;
    if (CARBON_PDF_EXPORT_MODE !== CarbonPdfExportModeEnum.SERVER_VECTOR) {
      return false;
    }
    const result = await requestCarbonReportPdf({
      markdown: markdownContext,
      fileName,
      title: CARBON_PDF_FOOTER_TITLE,
      /**
       * Info: (20260811 - Emily) 下載的 PDF 補上預覽那組頁首／頁尾。
       *
       * 文案從這裡帶上去而不是在伺服端另寫一份:這幾個字就是下方版型用的同一組
       * i18n key,同一份文件的頁首若有兩處來源,遲早一邊改一邊沒改。
       * 日期也在此格式化 —— 伺服端不知道使用者的地區設定。
       */
      shell: {
        brand: t("admin_mission_board.pdf_editor.brand")!,
        internalDocument: t(
          "admin_mission_board.pdf_editor.internal_document",
        )!,
        systemReport: t("admin_mission_board.pdf_editor.system_report")!,
        issuedAt: new Date().toLocaleDateString().replace(/-/g, "/"),
        footerTitle: t("admin_mission_board.pdf_editor.footer_title")!,
        footerText: t("admin_mission_board.pdf_editor.footer_text", {
          year: new Date().getFullYear(),
        })!,
        /**
         * Info: (20260812 - Emily) 目錄抬頭沿用側欄那顆按鈕的字，
         * 兩處指的是同一份東西，各寫一份遲早會不一致。
         */
        tocTitle: t("carbon_chatbot.outline_title")!,
        /*
         * Info: (20260812 - Emily) 報告名稱。省略時 carbon_report_html 不印
         * 那個 <h1 class="doc-title">，第一頁就只有品牌橫幅與目錄。
         */
        title: reportTitle || undefined,
        /**
         * Info: (20260814 - Emily) 一項都沒有就整區不印(公開分享頁那種場合)；
         * 有的話一律四列,包含沒填的 —— 藏起來的話「不適用」與「忘了填」同形。
         */
        identity:
          identityRows && identityRows.length > 0 ? identityRows : undefined,
      },
    });
    saveBlobAs(result.blob, fileName);
    /**
     * Info: (20260812 - Emily) 降級要說出來,不能只進 console。
     *
     * 這兩種降級都不會讓下載失敗,產出的是一份**看起來完整**的查證文件 ——
     * 目錄每一條都留白、或少了幾張圖。原本只有 `console.warn`,
     * 而看得到 console 的人不是拿這份文件去送查證的人。
     *
     * 目錄優先於圖表:沒有頁碼的目錄讓整份文件無法被引用,
     * 而少一張圖時內容仍在該節的原文裡(見 carbon_report_diagram.builder 的
     * `unverifiable` 文案)。兩者同時發生時說比較嚴重的那一個。
     */
    if (result.tocMissing > 0) {
      showToast(
        t("admin_mission_board.pdf_editor.toast_toc_pages_missing")!,
        ToastType.WARNING,
      );
    } else if (result.chartsFailed > 0) {
      showToast(
        t("admin_mission_board.pdf_editor.toast_charts_missing")!,
        ToastType.WARNING,
      );
    }
    /*
     * Info: (20260812 - Emily) log 保留:toast 只有 3 秒,而這兩個數字
     * 是事後追「那份下載為什麼缺頁碼」唯一的線索。
     */
    if (result.tocMissing > 0 || result.chartsFailed > 0) {
      console.warn("[PdfEditor] report downloaded with gaps:", {
        tocFilled: result.tocFilled,
        tocMissing: result.tocMissing,
        chartsFailed: result.chartsFailed,
      });
    }
    return true;
  };

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;

    // Info: (20260714 - Emily) 快照前清理:呼叫端可移除暫時性視覺狀態(如段落高亮),避免滲入 PDF
    onBeforeDownload?.();

    setIsGenerating(true);
    try {
      const serverFileName =
        downloadFileName ?? `iSunFA_Document_${Date.now()}.pdf`;
      if (await downloadViaServer(serverFileName)) {
        return;
      }
      const html2pdf = (await import("html2pdf.js")).default;

      const pdfOverrideStyle = document.createElement("style");
      pdfOverrideStyle.innerHTML = PDF_PRINT_STYLE;

      // Info: (20260608 - Julian) 將建立好的 style 標籤正式塞入網頁的 <head> 中
      document.head.appendChild(pdfOverrideStyle);

      const fileName = downloadFileName ?? `iSunFA_Document_${Date.now()}.pdf`;
      const opt = {
        margin: PDF_EXPORT_MARGIN_MM,
        filename: fileName,
        image: { type: "jpeg" as const, quality: PDF_EXPORT_JPEG_QUALITY },
        html2canvas: {
          scale: PDF_EXPORT_SCALE,
          useCORS: true,
          letterRendering: true,
          scrollY: 0,
          windowY: 0,
        },
        jsPDF: {
          unit: "mm" as const,
          format: "a4" as const,
          orientation: "portrait" as const,
        },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };

      /**
       * Info: (20260810 - Emily) 光柵化期間把 html2canvas 解析不了的顏色**換算成等值的 rgb**
       * (data/issue_drafts/inventory_table_import/17)。
       *
       * 這裡原本是「碰到含 lab / lch / color( 的值一律回 rgb(17, 24, 39)」。
       * 那不是安全退路,是把淺色底塗成近黑:Tailwind v4 的 `bg-gray-50`
       * computed 值為 `oklch(0.985 0.002 247.839)`,字串裡含 "lch" ——
       * UAT 從第一天回報到現在的「表頭一整片黑」就是它,而不是 html2canvas 拋錯。
       * 實測(tools/pdf_harness/proxy.mjs):
       *   無攔截 → 拋錯 unsupported color function "oklch"
       *   既有攔截 → 表頭像素 rgb(17,24,39)
       *   換算 → 表頭像素 rgb(249,250,251)
       *
       * 也因為它先把 oklch 換成了 rgb(17,24,39),8/10 那版在 DOM 上做的
       * 顏色修正一個都沒生效 —— 它讀到的已經是攔截後的值,看不到 oklch。
       */
      const colorProbe = document.createElement("canvas");
      colorProbe.width = 1;
      colorProbe.height = 1;
      const convertColor = createColorConverter(
        colorProbe.getContext("2d", { willReadFrequently: true }),
      );
      const originalGetComputedStyle = window.getComputedStyle;
      window.getComputedStyle = createColorSafeComputedStyle(
        (element, pseudoElement) =>
          originalGetComputedStyle.call(window, element, pseudoElement),
        convertColor,
      );

      try {
        /**
         * Info: (20260807 - Emily) 先算單張 canvas 畫不畫得下,再決定走哪條路。
         *
         * 事前判斷而非事後補救:超限時 `getContext('2d')` 不會拋錯,
         * 只會給一張尺寸正確、內容全空的畫布 —— 等畫完再看已經分不出成因,
         * 而使用者拿到的是一份「看起來完整」的空白檔案。
         * 短文件(絕大多數呼叫點:任務板、文件工具)仍走原本的 html2pdf,
         * 不因為長報告的修正而改變既有輸出。
         */
        const budget = assessCanvasBudget({
          widthPx: contentRef.current.scrollWidth,
          heightPx: contentRef.current.scrollHeight,
          scale: PDF_EXPORT_SCALE,
        });
        /**
         * Info: (20260807 - Emily) 量不到尺寸就先讓它被排版,再重量一次
         * (UAT:在「編輯 Markdown」模式按下載會失敗)。
         *
         * 不把「量不到」當成「太大」:後者分段有救,前者切幾段都還是 0×0。
         * 混用同一個布林值的後果是一句與真因無關的錯誤訊息。
         */
        const target = contentRef.current;
        /**
         * Info: (20260810 - Emily) 光柵化前先把 oklch / color-mix 換成 rgb
         * (issue_drafts/inventory_table_import/17)。
         *
         * html2canvas 遇到這兩類色彩函式是**直接拋錯**而不是退化,
         * 而 Tailwind v4 的整套調色盤就是 oklch —— 任一元素帶到就整份掛掉。
         * UAT 看到的「表頭一整片黑」是它死在那裡、那塊沒被畫上東西。
         *
         * 包在最外層是因為兩條輸出路徑(html2pdf 與分段)都會踩到。
         */
        await withLaidOutElement(target, async () => {
          const verdict = budget.isEmpty
            ? assessCanvasBudget({
                widthPx: target.scrollWidth,
                heightPx: target.scrollHeight,
                scale: PDF_EXPORT_SCALE,
              })
            : budget;

          if (verdict.isEmpty) {
            throw new PdfNotLaidOutError(
              `${target.scrollWidth}x${target.scrollHeight}`,
            );
          }
          if (verdict.withinBudget) {
            await html2pdf().set(opt).from(target).save();
            return;
          }
          console.warn(
            "[PdfEditor] content exceeds single-canvas budget, rendering in segments:",
            verdict,
          );
          await renderSegmentedPdf(target, fileName);
        });
      } finally {
        window.getComputedStyle = originalGetComputedStyle;
        // Info: (20260608 - Julian) PDF 產生完畢後（無論成功或失敗），都要把這個樣式拔除，避免污染網頁
        pdfOverrideStyle.remove();
      }
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      setErrorModal({
        isOpen: true,
        // Info: (20260807 - Emily) 空白產出要說得出是空白 —— 與「下載失敗」共用一句話等於沒說
        /**
         * Info: (20260811 - Luphia) 缺中文字型也要說得出是缺字型(PR review 第 4 點)。
         *
         * 同一條標準:伺服端把它與通用列印失敗分成兩個錯誤碼,因為兩者的處置相反 ——
         * 字型缺失重試一萬次都一樣,唯一的解法是由維運安裝字型。那條分類原本在
         * 這個 catch 裡消失,使用者看到的是一句與成因無關的「下載失敗」。
         */
        message: isPdfFontUnavailableError(error)
          ? t("common.error.pdf_font_unavailable")!
          : error instanceof PdfBlankOutputError ||
              error instanceof PdfNotLaidOutError
            ? t("common.error.pdf_blank_output")!
            : t("common.error.download_failed")!,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      className={`relative flex flex-col overflow-hidden bg-white shadow-sm ${isEmbedded ? "h-full w-full rounded-none border-0" : "h-[800px] rounded-2xl border border-gray-200"}`}
    >
      {/* Info: (20260605 - Julian) Toast 訊息 */}
      {/* Info: (20260812 - Emily) 三種狀態各自有色與圖示,WARNING 的理由見 ToastType */}
      {toastMessage && (
        <div
          className={`fixed top-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg px-6 py-3 text-white shadow-lg transition-all ${
            TOAST_TONE[toastMessage.type]
          }`}
        >
          {toastMessage.type === ToastType.SUCCESS ? (
            <Check size={20} />
          ) : toastMessage.type === ToastType.WARNING ? (
            <AlertTriangle size={20} />
          ) : (
            <XIcon size={20} />
          )}
          <span className="font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* Info: (20260426 - Luphia) Editor Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 bg-gray-50 p-4">
        <div
          className={`flex flex-wrap gap-2 ${layout === "split" ? "lg:hidden" : ""}`}
        >
          <button
            onClick={() => setViewMode(PdfToolViewMode.EDIT)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all ${
              viewMode === PdfToolViewMode.EDIT
                ? "bg-orange-100 text-orange-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Edit3 size={16} className="shrink-0" />
            {t("admin_mission_board.pdf_editor.edit_markdown")!}
          </button>
          <button
            onClick={() => setViewMode(PdfToolViewMode.PREVIEW)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all ${
              viewMode === PdfToolViewMode.PREVIEW
                ? "bg-orange-100 text-orange-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Eye size={16} className="shrink-0" />
            {t("admin_mission_board.pdf_editor.preview_pdf")!}
          </button>
        </div>

        <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
          {!isEmbedded && (
            <button
              onClick={() => setIsAiReportModalOpen(true)}
              disabled={isAiProcessing}
              className="mr-auto flex flex-1 flex-col items-center justify-center gap-x-2 gap-y-1 rounded-lg border border-purple-300 bg-purple-100 px-2 py-2 text-xs font-bold text-purple-600 transition-all enabled:hover:bg-purple-200 disabled:cursor-not-allowed disabled:border-gray-400 disabled:bg-gray-400 disabled:text-gray-700 sm:flex-row sm:px-3 lg:flex-none lg:px-5 lg:text-sm"
            >
              <Sparkles size={16} className="shrink-0" />
              <span className="text-center">
                {t("admin_mission_board.pdf_editor.ai_report_modal.title")}
              </span>
            </button>
          )}
          <button
            onClick={handleDownloadPDF}
            disabled={
              isGenerating || !markdownContext.trim() || !isDownloadable
            }
            title={
              isDownloadable
                ? undefined
                : t("common.error.pdf_download_needs_preview")!
            }
            className="flex flex-1 flex-col items-center justify-center gap-x-2 gap-y-1 rounded-lg bg-orange-600 px-2 py-2 text-xs font-bold text-white transition-all enabled:hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-gray-400 sm:flex-row sm:px-3 lg:flex-none lg:px-5 lg:text-sm"
          >
            <Download size={16} className="shrink-0" />
            <span className="text-center">
              {isGenerating
                ? t("admin_mission_board.pdf_editor.generating")!
                : t("admin_mission_board.pdf_editor.download_pdf")!}
            </span>
          </button>
          {!isEmbedded && (
            <button
              onClick={handleShareClick}
              disabled={isGenerating || !markdownContext.trim() || isSharing}
              className="flex flex-1 flex-col items-center justify-center gap-x-2 gap-y-1 rounded-lg bg-blue-500 px-2 py-2 text-xs font-bold text-white transition-all enabled:hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-gray-400 sm:flex-row sm:px-3 lg:flex-none lg:px-5 lg:text-sm"
            >
              {isSharing ? (
                <Loader2 size={16} className="shrink-0 animate-spin" />
              ) : (
                <Share2 size={16} className="shrink-0" />
              )}
              <span className="text-center">
                {t("admin_mission_board.pdf_editor.share_pdf")}
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Info: (20260615 - Julian) Edit Panel */}
        <EditPanel
          layout={layout}
          splitBreakpoint={splitBreakpoint}
          viewMode={viewMode}
          markdownContext={markdownContext}
          setMarkdownContext={(val) => {
            const nextVal =
              typeof val === "function" ? val(markdownContext) : val;
            if (value !== undefined && onChange) {
              onChange(nextVal);
            }
            setMarkdownContext(nextVal);
          }}
          isAiProcessing={isAiProcessing}
          setIsAiProcessing={setIsAiProcessing}
          setShareToken={setShareToken}
          setErrorModal={setErrorModal}
          onStopAi={handleStopAi}
        />

        {/* Info: (20260426 - Luphia) Preview Pane */}
        <div
          className={`flex flex-1 flex-col overflow-y-auto bg-gray-100 ${
            layout === "toggle"
              ? viewMode === PdfToolViewMode.EDIT
                ? "hidden"
                : "flex"
              : viewMode === PdfToolViewMode.EDIT
                ? splitBreakpoint === "lg"
                  ? "hidden lg:flex"
                  : "hidden md:flex"
                : "flex"
          }`}
        >
          <div className="sticky top-0 z-10 bg-gray-200 px-4 py-2 text-xs font-bold tracking-wider text-gray-500 uppercase">
            {t("admin_mission_board.pdf_editor.pdf_preview")!}
          </div>
          {/* Info: (20260714 - Emily) 手機縮小外距讓 A4 預覽用滿寬度,md+ 維持原留白 */}
          <div className="flex min-h-full justify-center p-3 md:p-8">
            {/* Info: (20260426 - Luphia) A4 Document Container */}
            <div
              className={`${THEME_STATIC_LIGHT_CLASS} mx-auto min-h-[297mm] w-full max-w-[210mm] border border-gray-300 bg-white text-black shadow-md`}
            >
              <div
                id="pdf-content"
                ref={contentRef}
                className="flex min-h-full flex-col bg-[#ffffff] font-sans"
              >
                {/* Info: (20260426 - Luphia) iSunFA Header */}
                <div className="flex items-center justify-between rounded-t-xl bg-[#111827] px-6 py-4">
                  <div className="flex items-center gap-3 text-lg font-bold text-[#ffffff]">
                    <Image
                      src="/isunfa_logo.svg"
                      alt="iSunFA Logo"
                      width={112}
                      height={32}
                      unoptimized
                      className="h-7 w-auto"
                    />
                    <span className="inline-block border-l border-[#4b5563] pl-3">
                      {t("admin_mission_board.pdf_editor.brand")!}
                    </span>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-[#3b82f6]/10 px-3 py-1 text-center text-xs font-medium text-[#60a5fa] ring-1 ring-[#60a5fa]/30 ring-inset">
                    {t("admin_mission_board.pdf_editor.internal_document")!}
                  </span>
                </div>

                <div className="flex-1 p-6 sm:p-10">
                  <div className="mb-6 flex flex-col gap-2 border-b border-[#f3f4f6] pb-6">
                    <div className="inline-block w-fit rounded bg-[#ffedd5] px-2 py-1 text-xs leading-none font-bold text-[#c2410c]">
                      {t("admin_mission_board.pdf_editor.system_report")!}
                    </div>
                    <p className="flex items-center gap-2 text-sm text-[#6b7280]">
                      iSunFA Enterprise Solutions
                      <span className="text-[#d1d5db]">•</span>
                      <span>
                        {new Date().toLocaleDateString().replace(/-/g, "/")}
                      </span>
                    </p>
                  </div>

                  {/* Info: (20260426 - Luphia) Markdown Content */}
                  <div className="max-w-none text-[#374151]">
                    <MarkdownContent
                      content={markdownContext}
                      variant={contentVariant}
                      onContentChange={(val) => {
                        if (value !== undefined && onChange) {
                          onChange(val);
                        }
                        setMarkdownContext(val);
                      }}
                      theme="light"
                      stripDocumentTitle={stripDocumentTitle}
                      restoreSourceLineBreaks={restoreSourceLineBreaks}
                    />
                  </div>
                </div>

                {/* Info: (20260426 - Luphia) iSunFA Footer */}
                <div className="rounded-b-xl border-t border-[#ffedd5] bg-[#fff7ed] px-6 py-8 text-center">
                  <h3 className="mb-2 text-lg font-bold text-[#111827]">
                    {t("admin_mission_board.pdf_editor.footer_title")!}
                  </h3>
                  <p className="mx-auto max-w-lg text-sm text-[#4b5563]">
                    {t("admin_mission_board.pdf_editor.footer_text", {
                      year: new Date().getFullYear(),
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info: (20260604 - Julian) Share Link Modal */}
      <PdfShareLinkModal
        isOpen={isShareLinkModalOpen}
        toggleShareLinkModal={toggleShareLinkModal}
        shareToken={shareToken}
        isRevoking={isRevoking}
        handleRevokeShare={handleRevokeShare}
      />

      {/* Info: (20260605 - Julian) AI Report Modal */}
      <AiReportModal
        isOpen={isAiReportModalOpen}
        onClose={() => setIsAiReportModalOpen(false)}
        onSubmit={handleGenerateAiReport}
        onError={(message) => setErrorModal({ isOpen: true, message })}
        dataInput={aiDataInput}
        setDataInput={setAiDataInput}
        instruction={aiInstruction}
        setInstruction={setAiInstruction}
      />
    </div>
  );
}
