"use client";

import { useTranslation } from "@/i18n/i18n_context";
import Image from "next/image";
import { MarkdownContent } from "@/components/common/markdown_content";

export default function PublicPdfClientView({ content }: { content: string }) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen justify-center bg-gray-50 p-4 sm:p-8">
      {/* Info: (20260604 - Julian) A4 Document Container */}
      <div className="mx-auto min-h-[297mm] w-full max-w-[210mm] border border-gray-300 bg-white text-black shadow-md">
        <div className="flex min-h-full flex-col bg-[#ffffff] font-sans">
          {/* Info: (20260604 - Julian) iSunFA Header */}
          <div className="flex items-center justify-between bg-[#111827] px-6 py-4">
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

            {/* Info: (20260604 - Julian) Markdown Content */}
            <div className="max-w-none text-[#374151]">
              <MarkdownContent content={content} theme="light" />
            </div>
          </div>

          {/* Info: (20260604 - Julian) iSunFA Footer */}
          <div className="border-t border-[#ffedd5] bg-[#fff7ed] px-6 py-8 text-center">
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
  );
}
