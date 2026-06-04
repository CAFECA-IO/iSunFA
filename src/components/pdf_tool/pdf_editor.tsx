"use client";

import { useState, useRef, useEffect, Fragment } from "react";
import {
  Check,
  Download,
  Edit3,
  Eye,
  Maximize2,
  Loader2,
  Share2,
  Sparkles,
  Type,
  Wand2,
  X as XIcon,
} from "lucide-react";
import { MarkdownContent } from "@/components/common/markdown_content";
import { useTranslation } from "@/i18n/i18n_context";
import Image from "next/image";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";

import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Trash2 } from "lucide-react";

enum ViewMode {
  EDIT = "edit",
  PREVIEW = "preview",
}

enum AiActionType {
  REWRITE = "rewrite",
  EXPAND = "expand",
  POLISH = "polish",
}

interface IAiSuggestion {
  isActive: boolean;
  originalContext: string;
  selectionStart: number;
  selectionEnd: number;
  selectedText: string;
  aiResult: string;
  x: number;
  y: number;
}

interface IAiText {
  isOpen: boolean;
  x: number;
  y: number;
  selectedText: string;
  selectionStart: number;
  selectionEnd: number;
}

function PdfShareLinkModal({
  isOpen,
  toggleShareLinkModal,
  shareToken,
  isRevoking,
  handleRevokeShare,
}: {
  isOpen: boolean;
  toggleShareLinkModal: () => void;
  shareToken: string | null;
  isRevoking: boolean;
  handleRevokeShare: () => void;
}) {
  const { t } = useTranslation();

  const linkUrl = shareToken
    ? `${window.location.origin}/share/pdf/${shareToken}`
    : "";

  const copyToClipboard = async () => {
    if (!shareToken) return;
    await navigator.clipboard.writeText(linkUrl);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-60" onClose={toggleShareLinkModal}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </TransitionChild>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <DialogTitle
                  as="h3"
                  className="mb-2 flex items-center gap-2 text-lg leading-6 font-bold text-gray-900"
                >
                  <Share2 size={20} className="text-blue-600" />
                  分享 PDF
                </DialogTitle>

                <div className="mt-2">
                  <p
                    className="mb-4 text-sm text-gray-500"
                    dangerouslySetInnerHTML={{
                      __html: "任何擁有此連結的人皆可檢視此 PDF。",
                    }}
                  />

                  <div className="mt-4 mb-6 flex justify-center">
                    {shareToken && (
                      <div className="inline-block rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                        <QRCodeSVG
                          value={linkUrl}
                          size={160}
                          level="M"
                          className="h-auto w-full"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-1.5">
                    <input
                      aria-label="Share link"
                      readOnly
                      value={shareToken ? linkUrl : ""}
                      className="flex-1 border-none bg-transparent px-2 text-sm text-gray-600 outline-none focus:ring-0"
                    />
                    <button
                      type="button"
                      onClick={copyToClipboard}
                      className="flex shrink-0 items-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Copy size={16} /> {t("analysis.share.copy")}
                    </button>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                    onClick={handleRevokeShare}
                    disabled={isRevoking || !shareToken}
                  >
                    {isRevoking ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                    {t("analysis.share.revoke")}
                  </button>
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                    onClick={toggleShareLinkModal}
                  >
                    {t("analysis.share.done")}
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

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

  const [markdownContext, setMarkdownContext] = useState<string>(
    "# iSunFA Report\n\nEnter your markdown content here...",
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.EDIT);

  // Info: (20260603 - Julian) AI Context Menu State
  const [aiMenu, setAiMenu] = useState<IAiText>({
    isOpen: false,
    x: 0,
    y: 0,
    selectedText: "",
    selectionStart: 0,
    selectionEnd: 0,
  });
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);
  const [aiSuggestion, setAiSuggestion] = useState<IAiSuggestion | null>(null);

  // Info: (20260604 - Julian) Share Link Modal State
  const [isShareLinkModalOpen, setIsShareLinkModalOpen] =
    useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState<boolean>(false);

  useEffect(() => {
    // Info: (20260603 - Julian) 點擊 menu 外時，關閉 ai menu
    const handleClickOutside = (e: MouseEvent) => {
      if (isAiProcessing) return;
      const menuEl = document.getElementById("ai-context-menu");
      const suggestionEl = document.getElementById("ai-suggestion-menu");
      if (menuEl && menuEl.contains(e.target as Node)) return;
      if (suggestionEl && suggestionEl.contains(e.target as Node)) return;
      setAiMenu((prev) => ({ ...prev, isOpen: false }));
    };

    if (aiMenu.isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [aiMenu.isOpen, isAiProcessing]);

  useEffect(() => {
    // Info: (20260603 - Julian) 檢查選取
    const checkSelection = (e?: MouseEvent | KeyboardEvent) => {
      if (isAiProcessing) return; // Info: (20260603 - Julian) AI 處理時，不處理選取事件

      const textarea = textareaRef.current;
      if (!textarea || document.activeElement !== textarea) return;

      // Info: (20260603 - Julian) 取得選取範圍
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      if (start !== end) {
        const selectedText = textarea.value.substring(start, end);

        setAiMenu((prev) => {
          let x = prev.x;
          let y = prev.y;

          // Info: (20260603 - Julian) 從 MouseEvent 取得 ai menu 位置；否則定位到 Textarea 中央位置
          if (e instanceof MouseEvent) {
            x = e.clientX;
            y = e.clientY;
          } else if (!prev.isOpen) {
            const rect = textarea.getBoundingClientRect();
            x = rect.left + rect.width / 2;
            y = rect.top + rect.height / 2;
          }

          return {
            ...prev,
            isOpen: true,
            x,
            y,
            selectedText,
            selectionStart: start,
            selectionEnd: end,
          };
        });
      } else {
        setAiMenu((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
      }
    };

    // Info: (20260603 - Julian) MouseUp → 檢查選取；若點擊 ai menu 則不處理
    const handleGlobalMouseUp = (e: MouseEvent) => {
      const menuEl = document.getElementById("ai-context-menu");
      const suggestionEl = document.getElementById("ai-suggestion-menu");
      if (menuEl && menuEl.contains(e.target as Node)) return;
      if (suggestionEl && suggestionEl.contains(e.target as Node)) return;
      checkSelection(e);
    };

    // Info: (20260603 - Julian) KeyUp → 檢查選取
    const handleGlobalKeyUp = (e: KeyboardEvent) => {
      checkSelection(e);
    };

    document.addEventListener("mouseup", handleGlobalMouseUp);
    document.addEventListener("keyup", handleGlobalKeyUp);

    return () => {
      document.removeEventListener("mouseup", handleGlobalMouseUp);
      document.removeEventListener("keyup", handleGlobalKeyUp);
    };
  }, [isAiProcessing]);

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

  // Info: (20260603 - Julian) 「AI 操作」處理
  const handleAiAction = async (actionType: AiActionType) => {
    if (!aiMenu.selectedText || isAiProcessing) return;

    setIsAiProcessing(true);
    setAiMenu((prev) => ({ ...prev, isOpen: false }));

    let instruction = "";
    if (actionType === AiActionType.REWRITE) {
      instruction = "【精簡縮寫】";
    } else if (actionType === AiActionType.EXPAND) {
      instruction = "擴寫";
    } else if (actionType === AiActionType.POLISH) {
      instruction = "【潤飾流暢】";
    }

    try {
      const response = await request<IApiResponse<{ result: string }>>(
        "/api/v1/admin/pdf_editor/refine",
        {
          method: "POST",
          body: JSON.stringify({
            text: aiMenu.selectedText,
            instruction,
          }),
        },
      );

      if (response && response.payload && response.payload.result) {
        setAiSuggestion({
          isActive: true,
          originalContext: markdownContext,
          selectionStart: aiMenu.selectionStart,
          selectionEnd: aiMenu.selectionEnd,
          selectedText: aiMenu.selectedText,
          aiResult: response.payload.result,
          x: aiMenu.x,
          y: aiMenu.y,
        });
        setAiMenu((prev) => ({ ...prev, isOpen: false }));
      } else {
        setErrorModal({
          isOpen: true,
          message:
            t("admin_mission_board.pdf_editor.ai_no_response") ||
            "AI 暫時無法回應或缺乏有效結果，請稍後再試！",
        });
      }
    } catch (error) {
      console.error("Failed to refine text:", error);
      setErrorModal({
        isOpen: true,
        message:
          t("admin_mission_board.pdf_editor.ai_timeout") ||
          "網路連線逾時或系統異常，請檢查網路狀態並稍後再試！",
      });
    } finally {
      setIsAiProcessing(false);
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

  const aiOptions = Object.entries(AiActionType).map(([key, value]) => {
    const iconMap: Record<
      AiActionType,
      React.ComponentType<{ size?: number }>
    > = {
      [AiActionType.REWRITE]: Wand2,
      [AiActionType.EXPAND]: Maximize2,
      [AiActionType.POLISH]: Type,
    };

    // ToDo: (20260603 - Julian) 處理翻譯
    const tKey: Record<AiActionType, string> = {
      [AiActionType.REWRITE]: "精簡縮寫",
      [AiActionType.EXPAND]: "擴寫",
      [AiActionType.POLISH]: "潤飾流暢",
    };

    return {
      key,
      value,
      icon: iconMap[value],
      text: tKey[value],
    };
  });

  // Info: (20260603 - Julian) AI 編輯 menu
  const aiContextMenu = aiMenu.isOpen && (
    <div
      id="ai-context-menu"
      className="fixed z-50 flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
      style={{
        top: `${aiMenu.y + 10}px`,
        left: `${aiMenu.x + 10}px`,
      }}
      onMouseDown={(e) => e.preventDefault()} // Info: (20260603 - Julian) 阻止預設事件
    >
      <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-500">
        <Sparkles size={16} />
        AI Assistant
      </div>
      <div className="flex flex-col p-1">
        {aiOptions.map((option) => (
          <button
            key={option.key}
            onMouseDown={(e) => {
              // Info: (20260603 - Julian) 按下滑鼠時，不要觸發 onBlur
              e.preventDefault();
              e.stopPropagation();
              if (!isAiProcessing) handleAiAction(option.value);
            }}
            disabled={isAiProcessing}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors enabled:hover:bg-orange-50 enabled:hover:text-orange-700 disabled:opacity-50"
          >
            {isAiProcessing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <option.icon size={16} />
            )}
            {option.text}
          </button>
        ))}
      </div>
    </div>
  );

  // Info: (20260603 - Julian) 是否採用 AI 建議 menu
  const aiSuggestionMenu = aiSuggestion?.isActive && (
    <div
      id="ai-suggestion-menu"
      className="absolute top-12 right-6 z-30 flex flex-col items-center gap-2 overflow-hidden rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 shadow-2xl"
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="flex w-full items-center justify-center gap-1 border-b border-orange-100 pb-2 text-xs font-bold text-orange-600">
        <Sparkles size={14} />
        採用 AI 建議？
      </div>
      <div className="mt-1 flex w-full flex-col gap-2">
        <button
          type="button"
          onClick={() => {
            const { originalContext, selectionStart, selectionEnd, aiResult } =
              aiSuggestion;
            const newContext =
              originalContext.substring(0, selectionStart) +
              aiResult +
              originalContext.substring(selectionEnd);
            setMarkdownContext(newContext);
            setAiSuggestion(null);
          }}
          className="flex w-full items-center justify-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-green-500"
        >
          <Check size={14} />
          採用
        </button>
        <button
          type="button"
          onClick={() => setAiSuggestion(null)}
          className="flex w-full items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        >
          <XIcon size={14} />
          捨棄
        </button>
      </div>
    </div>
  );

  // Info: (20260603 - Julian) AI 思考中的動畫
  const aiThinkingAnim = isAiProcessing && (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px]">
      <div className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-white px-6 py-4 shadow-xl">
        <div className="flex size-8 items-center justify-center rounded-full bg-orange-100 text-orange-600">
          <Sparkles size={16} className="animate-pulse" />
        </div>
        <div className="flex items-center gap-1 font-bold text-orange-600">
          <span>AI 正在思考中</span>
          <span className="flex gap-0.5">
            <span className="animate-bounce" style={{ animationDelay: "0ms" }}>
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
    </div>
  );

  // Info: (20260603 - Julian) AI 編輯結果差異預覽
  const diffPreview = aiSuggestion?.isActive && (
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
    <div className="flex h-[800px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Info: (20260426 - Luphia) Editor Toolbar */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode(ViewMode.EDIT)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all ${
              viewMode === ViewMode.EDIT
                ? "bg-orange-100 text-orange-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Edit3 size={16} />
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
            <Eye size={16} />
            {t("admin_mission_board.pdf_editor.preview_pdf")!}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            disabled={isGenerating || !markdownContext.trim()}
            className="flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2 text-sm font-bold text-white transition-all enabled:hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            <Download size={16} />
            {isGenerating
              ? t("admin_mission_board.pdf_editor.generating")!
              : t("admin_mission_board.pdf_editor.download_pdf")!}
          </button>
          <button
            onClick={handleShareClick}
            disabled={isGenerating || !markdownContext.trim() || isSharing}
            className="flex items-center gap-2 rounded-lg bg-blue-500 px-5 py-2 text-sm font-bold text-white transition-all enabled:hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isSharing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Share2 size={16} />
            )}
            分享 PDF 連結
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
              if (aiMenu.isOpen)
                setAiMenu((prev) => ({ ...prev, isOpen: false }));
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
          {aiSuggestionMenu}

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
    </div>
  );
}
