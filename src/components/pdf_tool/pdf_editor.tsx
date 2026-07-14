"use client";

import { useState, useRef, useEffect } from "react";
import {
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
import PdfShareLinkModal from "@/components/pdf_tool/pdf_share_link_modal";
import { AiReportModal } from "@/components/pdf_tool/ai_report_modal";
import EditPanel from "@/components/pdf_tool/edit_panel";
import { PdfToolViewMode, PDF_PRINT_STYLE } from "@/constants/pdf_tool";
import { safeStorage } from "@/lib/utils/storage";

// Info: (20260604 - Julian) 定義預設 md 內容與 storage key
const DEFAULT_CONTENT =
  "# iSunFA Report\n\nEnter your markdown content here...";
const STORAGE_KEY = "isunfa_pdf_editor_draft";

enum ToastType {
  SUCCESS = "success",
  ERROR = "error",
}

interface IPdfEditorProps {
  setErrorModal: React.Dispatch<
    React.SetStateAction<{
      isOpen: boolean;
      message: string;
    }>
  >;
  layout?: "split" | "toggle";
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
}

export default function PdfEditor({
  setErrorModal,
  layout = "split",
  isEmbedded = false,
  value = undefined,
  onChange = undefined,
  storageKey = STORAGE_KEY,
  defaultViewMode = PdfToolViewMode.EDIT,
  contentVariant = "document",
  downloadFileName = undefined,
  onBeforeDownload = undefined,
  splitBreakpoint = "md",
}: IPdfEditorProps) {
  const { t } = useTranslation();

  const contentRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Info: (20260604 - Julian) md 內容
  const [markdownContext, setMarkdownContext] =
    useState<string>(DEFAULT_CONTENT);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<PdfToolViewMode>(defaultViewMode);

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

      if (result.code === "SUCCESS" && result.payload?.token) {
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

      if (result.code === "SUCCESS") {
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

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;

    // Info: (20260714 - Emily) 快照前清理:呼叫端可移除暫時性視覺狀態(如段落高亮),避免滲入 PDF
    onBeforeDownload?.();

    setIsGenerating(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;

      const pdfOverrideStyle = document.createElement("style");
      pdfOverrideStyle.innerHTML = PDF_PRINT_STYLE;

      // Info: (20260608 - Julian) 將建立好的 style 標籤正式塞入網頁的 <head> 中
      document.head.appendChild(pdfOverrideStyle);

      const opt = {
        margin: 15,
        filename: downloadFileName ?? `iSunFA_Document_${Date.now()}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
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

      // Info: (20260426 - Luphia) Globally proxy getComputedStyle during PDF generation to prevent html2canvas crashing on Tailwind v4's lab/oklch colors
      const originalGetComputedStyle = window.getComputedStyle;
      window.getComputedStyle = function (
        elt: Element,
        pseudoElt?: string | null,
      ) {
        const styles = originalGetComputedStyle.call(window, elt, pseudoElt);

        return new Proxy(styles, {
          get(target: CSSStyleDeclaration, prop: string | symbol) {
            const targetObj = target as unknown as Record<
              string | symbol,
              unknown
            >;
            if (typeof targetObj[prop] === "function") {
              if (prop === "getPropertyValue") {
                return function (property: string) {
                  const val = target.getPropertyValue(property);
                  if (
                    typeof val === "string" &&
                    (val.includes("lab") ||
                      val.includes("lch") ||
                      val.includes("color("))
                  ) {
                    if (
                      property.toLowerCase().includes("shadow") ||
                      property.toLowerCase().includes("image")
                    )
                      return "none";
                    return "rgb(17, 24, 39)"; // Info: (20260426 - Luphia) Safe fallback
                  }
                  return val;
                };
              }
              return (targetObj[prop] as (...args: unknown[]) => unknown).bind(
                target,
              );
            }

            const val = targetObj[prop];
            if (
              typeof val === "string" &&
              (val.includes("lab") ||
                val.includes("lch") ||
                val.includes("color("))
            ) {
              if (
                String(prop).toLowerCase().includes("shadow") ||
                String(prop).toLowerCase().includes("image")
              )
                return "none";
              return "rgb(17, 24, 39)"; // Info: (20260426 - Luphia) Safe fallback
            }

            return val;
          },
        });
      };

      try {
        await html2pdf().set(opt).from(contentRef.current).save();
      } finally {
        window.getComputedStyle = originalGetComputedStyle;
        // Info: (20260608 - Julian) PDF 產生完畢後（無論成功或失敗），都要把這個樣式拔除，避免污染網頁
        pdfOverrideStyle.remove();
      }
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      setErrorModal({
        isOpen: true,
        message: t("common.error.download_failed")!,
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
      {toastMessage && (
        <div
          className={`fixed top-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg px-6 py-3 shadow-lg transition-all ${
            toastMessage.type === ToastType.SUCCESS
              ? "bg-emerald-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {toastMessage.type === ToastType.SUCCESS ? (
            <Check size={20} />
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
            disabled={isGenerating || !markdownContext.trim()}
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
          <div className="flex min-h-full justify-center p-8">
            {/* Info: (20260426 - Luphia) A4 Document Container */}
            <div className="mx-auto min-h-[297mm] w-full max-w-[210mm] border border-gray-300 bg-white text-black shadow-md">
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
