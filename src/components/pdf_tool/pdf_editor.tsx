"use client";

import { useState, useRef } from "react";
import { Download, Edit3, Eye } from "lucide-react";
import { MarkdownContent } from "@/components/common/markdown_content";
import { useTranslation } from "@/i18n/i18n_context";
import Image from "next/image";

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

  const [markdownContext, setMarkdownContext] = useState<string>(
    "# iSunFA Report\n\nEnter your markdown content here...",
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");

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

  return (
    <div className="flex h-[800px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Info: (20260426 - Luphia) Editor Toolbar */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("edit")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all ${
              viewMode === "edit"
                ? "bg-orange-100 text-orange-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Edit3 className="h-4 w-4" />
            {t("admin_mission_board.pdf_editor.edit_markdown")!}
          </button>
          <button
            onClick={() => setViewMode("preview")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all ${
              viewMode === "preview"
                ? "bg-orange-100 text-orange-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Eye className="h-4 w-4" />
            {t("admin_mission_board.pdf_editor.preview_pdf")!}
          </button>
        </div>

        <button
          onClick={handleDownloadPDF}
          disabled={isGenerating || !markdownContext.trim()}
          className="flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2 text-sm font-bold text-white transition-all hover:bg-orange-500 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
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
            aria-label="Markdown Input"
            value={markdownContext}
            onChange={(e) => setMarkdownContext(e.target.value)}
            className="flex-1 resize-none p-6 font-mono text-sm text-gray-800 focus:ring-2 focus:ring-orange-500 focus:outline-none focus:ring-inset"
            placeholder={t("admin_mission_board.pdf_editor.type_here")!}
          />
        </div>

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
