"use client";

import { useState, useRef, useEffect } from "react";
import {
  Check,
  CirclePause,
  Download,
  Edit3,
  Eye,
  Loader2,
  Share2,
  Sparkles,
  X as XIcon,
} from "lucide-react";
import { MarkdownContent } from "@/components/common/markdown_content";
import { useTranslation } from "@/i18n/i18n_context";
import { useTextSelectionMenu } from "@/hooks/use_text_selection_menu";
import Image from "next/image";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import PdfShareLinkModal from "@/components/pdf_tool/pdf_share_link_modal";
import { AiContextMenu } from "@/components/pdf_tool/ai_context_menu";
import { AiSuggestionMenu } from "@/components/pdf_tool/ai_suggestion_menu";
import { AiReportModal } from "@/components/pdf_tool/ai_report_modal";

enum ViewMode {
  EDIT = "edit",
  PREVIEW = "preview",
}

// Info: (20260604 - Julian) AI 建議（採用/捨棄）
interface IAiSuggestion {
  isOpen: boolean;
  x: number;
  y: number;
  originalContext: string;
  selectionStart: number;
  selectionEnd: number;
  selectedText: string;
  aiResult: string;
}

// Info: (20260604 - Julian) 定義預設 md 內容與 storage key
const DEFAULT_CONTENT =
  "# iSunFA Report\n\nEnter your markdown content here...";
const STORAGE_KEY = "isunfa_pdf_editor_draft";

export default function PdfEditor({
  setErrorModal,
}: {
  setErrorModal: React.Dispatch<
    React.SetStateAction<{
      isOpen: boolean;
      message: string;
    }>
  >;
}) {
  const { t } = useTranslation();
  const contentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Info: (20260604 - Julian) md 內容
  const [markdownContext, setMarkdownContext] =
    useState<string>(DEFAULT_CONTENT);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.EDIT);

  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);

  // Info: (20260603 - Julian) AI Assistant Menu Hook
  const { aiAssistantMenu, setAiAssistantMenu } = useTextSelectionMenu(
    textareaRef,
    isAiProcessing,
  );
  const [aiSuggestion, setAiSuggestion] = useState<IAiSuggestion | null>(null);
  const [customAiPrompt, setCustomAiPrompt] = useState<string>("");

  // Info: (20260604 - Julian) Share Link Modal State
  const [isShareLinkModalOpen, setIsShareLinkModalOpen] =
    useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState<boolean>(false);

  // Info: (20260605 - Julian) AI Report Modal State
  const [isAiReportModalOpen, setIsAiReportModalOpen] =
    useState<boolean>(false);

  // Info: (20260605 - Julian) Toast Message State
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Info: (20260604 - Julian) 建立一個 ref 來儲存 markdownContext 的最新值
  const markdownRef = useRef<string>(markdownContext);
  useEffect(() => {
    markdownRef.current = markdownContext;
  }, [markdownContext]);

  useEffect(() => {
    // Info: (20260604 - Julian) 頁面載入時，從 localstorage 取得草稿
    const savedDraft = localStorage.getItem(STORAGE_KEY);
    if (savedDraft && savedDraft !== DEFAULT_CONTENT) {
      setMarkdownContext(savedDraft);
    }

    // Info: (20260604 - Julian) 建立「儲存草稿」函式
    const saveDraft = () => {
      const currentContent = markdownRef.current;
      if (currentContent && currentContent !== DEFAULT_CONTENT) {
        localStorage.setItem(STORAGE_KEY, currentContent);
      } else {
        localStorage.removeItem(STORAGE_KEY);
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
  }, []);

  const toggleShareLinkModal = () => setIsShareLinkModalOpen((prev) => !prev);

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
          message: t("common.error.default") || "Failed to generate share link",
        });
      }
    } catch (error) {
      console.error("Share error:", error);
      setErrorModal({
        isOpen: true,
        message: t("common.error.default") || "Failed to generate share link",
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

  // Info: (20260603 - Julian) 「AI 文本微調」處理
  const handleAiAction = async (actionType: string) => {
    if (!aiAssistantMenu.selectedText || isAiProcessing) return;

    setIsAiProcessing(true);
    setAiAssistantMenu((prev) => ({ ...prev, isOpen: false }));

    try {
      // Info: (20260604 - Julian) 設置 AbortController，以便中斷請求
      abortControllerRef.current = new AbortController();
      const response = await request<IApiResponse<{ result: string }>>(
        "/api/v1/admin/pdf_editor/refine",
        {
          method: "POST",
          body: JSON.stringify({
            text: aiAssistantMenu.selectedText,
            action: actionType, // Info: (20260604 - Julian) 直接傳送 actionType，讓 Backend 處理
          }),
          signal: abortControllerRef.current.signal,
        },
      );

      if (response && response.payload && response.payload.result) {
        // Info: (20260604 - Julian) 設置 AI 建議的座標、選取範圍及結果
        setAiSuggestion({
          isOpen: true,
          x: aiAssistantMenu.x,
          y: aiAssistantMenu.y,
          originalContext: markdownContext,
          selectionStart: aiAssistantMenu.selectionStart,
          selectionEnd: aiAssistantMenu.selectionEnd,
          selectedText: aiAssistantMenu.selectedText,
          aiResult: response.payload.result,
        });
        // Info: (20260604 - Julian) 關閉 AI Assistant menu 並清空 custom prompt
        setAiAssistantMenu((prev) => ({ ...prev, isOpen: false }));
        setCustomAiPrompt("");
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
        return; // Info: (20260604 - Julian) 用戶主動取消不報錯
      }

      console.error("Failed to refine text:", error);
      setErrorModal({
        isOpen: true,
        message: t("admin_mission_board.pdf_editor.ai_assistant.ai_timeout"),
      });
    } finally {
      setIsAiProcessing(false);
      // Info: (20260604 - Julian) 清空 AbortController
      abortControllerRef.current = null;
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

        // Info: (20260605 - Julian) 顯示成功提示
        setToastMessage({
          type: "success",
          text: t("common.success") || "報告生成並插入成功！",
        });
        setTimeout(() => setToastMessage(null), 3000);
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

    setIsGenerating(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;

      const opt = {
        margin: 15,
        filename: `iSunFA_Document_${Date.now()}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
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
                    return "rgb(17, 24, 39)"; // Safe fallback
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
              return "rgb(17, 24, 39)"; // Safe fallback
            }

            return val;
          },
        });
      };

      try {
        await html2pdf().set(opt).from(contentRef.current).save();
      } finally {
        window.getComputedStyle = originalGetComputedStyle;
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

  // Info: (20260603 - Julian) AI 編輯 menu
  const aiContextMenu = aiAssistantMenu.isOpen && (
    <AiContextMenu
      isOpen={aiAssistantMenu.isOpen}
      x={aiAssistantMenu.x}
      y={aiAssistantMenu.y}
      customAiPrompt={customAiPrompt}
      setCustomAiPrompt={setCustomAiPrompt}
      isAiProcessing={isAiProcessing}
      handleAiAction={handleAiAction}
    />
  );

  // Info: (20260603 - Julian) 是否採用 AI 建議 menu
  const aiSuggestionMenuEl = aiSuggestion?.isOpen && (
    <AiSuggestionMenu
      isOpen={aiSuggestion.isOpen}
      onReplace={() => {
        const { originalContext, selectionStart, selectionEnd, aiResult } =
          aiSuggestion;
        const newContext =
          originalContext.substring(0, selectionStart) +
          aiResult +
          originalContext.substring(selectionEnd);
        setMarkdownContext(newContext);
        setAiSuggestion(null);
      }}
      onInsert={() => {
        const { originalContext, selectionEnd, aiResult } = aiSuggestion;
        const insertText = `\n\n${aiResult}`;
        const newContext =
          originalContext.substring(0, selectionEnd) +
          insertText +
          originalContext.substring(selectionEnd);
        setMarkdownContext(newContext);
        setAiSuggestion(null);
      }}
      onDiscard={() => setAiSuggestion(null)}
    />
  );

  // Info: (20260603 - Julian) AI 思考中的動畫
  const aiThinkingAnim = isAiProcessing && (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px]">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-orange-100 bg-white px-8 py-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-orange-100 text-orange-600">
            <Sparkles size={16} className="animate-pulse" />
          </div>
          <div className="flex items-center gap-1 font-bold text-orange-600">
            <span>
              {t("admin_mission_board.pdf_editor.ai_assistant.ai_is_thinking")}
            </span>
            <span className="flex gap-0.5">
              <span
                className="animate-bounce"
                style={{ animationDelay: "0ms" }}
              >
                .
              </span>
              <span
                className="animate-bounce"
                style={{ animationDelay: "150ms" }}
              >
                .
              </span>
              <span
                className="animate-bounce"
                style={{ animationDelay: "300ms" }}
              >
                .
              </span>
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (abortControllerRef.current) {
              abortControllerRef.current.abort();
            }
          }}
          className="flex items-center gap-2 rounded-full border border-gray-200 px-6 py-1.5 text-xs font-bold text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
        >
          <CirclePause size={16} />
          {t("admin_mission_board.pdf_editor.ai_assistant.stop_thinking")}
        </button>
      </div>
    </div>
  );

  // Info: (20260603 - Julian) AI 編輯結果差異預覽
  const diffPreview = aiSuggestion?.isOpen && (
    <div className="absolute inset-0 z-20 flex flex-col bg-white/80 p-6 backdrop-blur-sm">
      <div className="flex-1 overflow-y-auto rounded-xl border border-orange-200 bg-white p-6 font-mono text-sm leading-relaxed whitespace-pre-wrap text-gray-800 shadow-lg">
        {aiSuggestion.originalContext.substring(0, aiSuggestion.selectionStart)}
        <del className="text-gray-400 decoration-red-500 decoration-2">
          {aiSuggestion.selectedText}
        </del>
        <mark className="rounded bg-orange-100 px-1 text-orange-900">
          {aiSuggestion.aiResult}
        </mark>
        {aiSuggestion.originalContext.substring(aiSuggestion.selectionEnd)}
      </div>
    </div>
  );

  return (
    <div className="relative flex h-[800px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Info: (20260605 - Julian) Toast 訊息 */}
      {toastMessage && (
        <div
          className={`fixed top-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg px-6 py-3 shadow-lg transition-all ${
            toastMessage.type === "success"
              ? "bg-emerald-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {toastMessage.type === "success" ? (
            <Check size={20} />
          ) : (
            <XIcon size={20} />
          )}
          <span className="font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* Info: (20260426 - Luphia) Editor Toolbar */}
      <div className="flex flex-col gap-4 border-b border-gray-200 bg-gray-50 p-4">
        <div className="flex gap-2 lg:hidden">
          <button
            onClick={() => setViewMode(ViewMode.EDIT)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all ${
              viewMode === ViewMode.EDIT
                ? "bg-orange-100 text-orange-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Edit3 size={16} className="shrink-0" />
            {t("admin_mission_board.pdf_editor.edit_markdown")!}
          </button>
          <button
            onClick={() => setViewMode(ViewMode.PREVIEW)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all ${
              viewMode === ViewMode.PREVIEW
                ? "bg-orange-100 text-orange-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Eye size={16} className="shrink-0" />
            {t("admin_mission_board.pdf_editor.preview_pdf")!}
          </button>
        </div>

        <div className="flex w-full gap-2">
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
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Info: (20260426 - Luphia) Editor Pane */}
        <div
          className={`relative flex flex-1 flex-col border-r border-gray-200 ${viewMode === "preview" ? "hidden md:flex" : "flex"}`}
        >
          <div className="bg-gray-100 px-4 py-2 text-xs font-bold tracking-wider text-gray-500 uppercase">
            {t("admin_mission_board.pdf_editor.markdown_input")!}
          </div>
          <textarea
            ref={textareaRef}
            aria-label="Markdown Input"
            value={markdownContext}
            onChange={(e) => {
              setMarkdownContext(e.target.value);
              setShareToken(null); // Info: (20260604 - Julian) PDF 內容變更時，將 Token 設為 null
              if (aiAssistantMenu.isOpen)
                setAiAssistantMenu((prev) => ({ ...prev, isOpen: false }));
            }}
            readOnly={isAiProcessing}
            className={`flex-1 resize-none p-6 font-mono text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none focus:ring-inset ${
              isAiProcessing
                ? "cursor-not-allowed text-gray-400 opacity-75"
                : "text-gray-800"
            }`}
            placeholder={t("admin_mission_board.pdf_editor.type_here")!}
          />

          {/* Info: (20260603 - Julian) Diff Preview Overlay */}
          {diffPreview}

          {/* Info: (20260603 - Julian) Pinned AI Suggestion Menu */}
          {aiSuggestionMenuEl}

          {/* Info: (20260603 - Julian) AI Processing Animation */}
          {aiThinkingAnim}
        </div>

        {/* Info: (20260603 - Julian) AI Context Menu */}
        {aiContextMenu}

        {/* Info: (20260426 - Luphia) Preview Pane */}
        <div
          className={`flex flex-1 flex-col overflow-y-auto bg-gray-100 ${viewMode === "edit" ? "hidden md:flex" : "flex"}`}
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
                  <span className="inline-flex items-center rounded-full bg-[#3b82f6]/10 px-3 py-1 text-xs font-medium text-[#60a5fa] ring-1 ring-[#60a5fa]/30 ring-inset">
                    {t("admin_mission_board.pdf_editor.internal_document")!}
                  </span>
                </div>

                <div className="flex-1 p-6 sm:p-10">
                  <div className="mb-6 border-b border-[#f3f4f6] pb-6">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded bg-[#ffedd5] px-2 py-0.5 text-xs font-bold text-[#c2410c]">
                        {t("admin_mission_board.pdf_editor.system_report")!}
                      </span>
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
                    <MarkdownContent content={markdownContext} theme="light" />
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
      />
    </div>
  );
}
