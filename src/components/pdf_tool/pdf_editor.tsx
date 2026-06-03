"use client";

import { useState, useRef, useEffect } from "react";
import {
  Download,
  Edit3,
  Eye,
  Sparkles,
  Wand2,
  Type,
  Maximize2,
  Loader2,
} from "lucide-react";
import { MarkdownContent } from "@/components/common/markdown_content";
import { useTranslation } from "@/i18n/i18n_context";
import Image from "next/image";

enum ViewMode {
  EDIT = "edit",
  PREVIEW = "preview",
}

enum AiActionType {
  REWRITE = "rewrite",
  EXPAND = "expand",
  POLISH = "polish",
}

interface IAiText {
  isOpen: boolean;
  x: number;
  y: number;
  selectedText: string;
  selectionStart: number;
  selectionEnd: number;
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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isAiProcessing) return; // Info: Don't close while processing
      const menuEl = document.getElementById("ai-context-menu");
      if (menuEl && menuEl.contains(e.target as Node)) {
        return;
      }
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
    const checkSelection = (e?: MouseEvent | KeyboardEvent) => {
      if (isAiProcessing) return; // Info: Don't disrupt while processing

      const textarea = textareaRef.current;
      if (!textarea || document.activeElement !== textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      if (start !== end) {
        const selectedText = textarea.value.substring(start, end);

        setAiMenu((prev) => {
          let x = prev.x;
          let y = prev.y;

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

    const handleGlobalMouseUp = (e: MouseEvent) => {
      const menuEl = document.getElementById("ai-context-menu");
      if (menuEl && menuEl.contains(e.target as Node)) {
        return;
      }
      checkSelection(e);
    };

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

  // Info: (20260603 - Julian) 「AI 操作」處理
  const handleAiAction = async (actionType: AiActionType) => {
    if (!aiMenu.selectedText || isAiProcessing) return;

    setIsAiProcessing(true);
    // TODO: (20260603 - Julian) replace with real API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    let newText = aiMenu.selectedText;
    if (actionType === AiActionType.REWRITE) {
      newText = `[AI 重寫] ${aiMenu.selectedText}`;
    } else if (actionType === AiActionType.EXPAND) {
      newText = `[AI 擴寫] ${aiMenu.selectedText} (補充細節...)`;
    } else if (actionType === AiActionType.POLISH) {
      newText = `[AI 潤飾] ${aiMenu.selectedText}`;
    }

    const before = markdownContext.substring(0, aiMenu.selectionStart);
    const after = markdownContext.substring(aiMenu.selectionEnd);

    setMarkdownContext(before + newText + after);
    setAiMenu((prev) => ({ ...prev, isOpen: false }));
    setIsAiProcessing(false);
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
    const Icon = iconMap[value];
    return {
      key,
      value,
      icon: Icon,
    };
  });

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
            className="enable:hover:text-orange-700 enable:hover:bg-orange-50 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors disabled:opacity-50"
          >
            {isAiProcessing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <option.icon size={16} />
            )}
            {option.key}
          </button>
        ))}
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

        <button
          onClick={handleDownloadPDF}
          disabled={isGenerating || !markdownContext.trim()}
          className="flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2 text-sm font-bold text-white transition-all hover:bg-orange-500 disabled:opacity-50"
        >
          <Download size={16} />
          {isGenerating
            ? t("admin_mission_board.pdf_editor.generating")!
            : t("admin_mission_board.pdf_editor.download_pdf")!}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Info: (20260426 - Luphia) Editor Pane */}
        <div
          className={`flex flex-1 flex-col border-r border-gray-200 ${viewMode === "preview" ? "hidden md:flex" : "flex"}`}
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
              if (aiMenu.isOpen)
                setAiMenu((prev) => ({ ...prev, isOpen: false }));
            }}
            className="flex-1 resize-none p-6 font-mono text-sm text-gray-800 focus:ring-2 focus:ring-orange-500 focus:outline-none focus:ring-inset"
            placeholder={t("admin_mission_board.pdf_editor.type_here")!}
          />
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
    </div>
  );
}
