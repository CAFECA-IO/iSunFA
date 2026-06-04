import React from "react";
import Image from "next/image";
import Link from "next/link";

export interface IReportLayoutProps {
  children: React.ReactNode;
  badgeText?: string;

  // Info: (20260501 - Luphia) 針對 PDF 匯出優化，若是 PDF 匯出則禁用 Link 與 next/image，避免 html-to-image 無法截取
  isPdfExport?: boolean;
  // Info: (20260501 - Luphia) 當設為 true 時，Header 與 Footer 只會在 isPdfExport = true 時顯示，平常隱藏
  hideFrameUnlessExport?: boolean;

  // Info: (20260501 - Luphia) Footer 選項
  footerType?: "cta" | "simple" | "custom" | "none";
  footerTitle?: string;
  ctaTitle?: string;
  ctaDesc?: string;
  ctaButtonText?: string;
  ctaButtonHref?: string;
  customFooter?: React.ReactNode;

  className?: string;
  contentClassName?: string;
}

export function ReportLayout({
  children,
  badgeText = "",
  isPdfExport = false,
  hideFrameUnlessExport = false,
  footerType = "none",
  footerTitle = "",
  ctaTitle = "",
  ctaDesc = "",
  ctaButtonText = "",
  ctaButtonHref = "/",
  customFooter = null,
  className = "bg-white rounded-2xl shadow-md ring-1 ring-gray-900/5",
  contentClassName = "p-6 sm:p-10",
}: IReportLayoutProps) {
  const Logo = isPdfExport ? (
    <div className="flex items-center gap-3 text-lg font-bold text-white">
      <Image
        src="/isunfa_logo.svg"
        alt="iSunFA Logo"
        className="h-7 w-auto"
        width={112}
        height={32}
        priority
      />
      <span className="hidden border-l border-gray-600 pl-3 sm:inline-block">
        陽光智能碳會計
      </span>
    </div>
  ) : (
    <Link
      href="/"
      className="flex cursor-pointer items-center gap-3 text-lg font-bold text-white transition-opacity hover:opacity-80"
    >
      <Image
        src="/isunfa_logo.svg"
        alt="iSunFA Logo"
        width={112}
        height={32}
        priority
        className="h-7 w-auto"
      />
      <span className="hidden border-l border-gray-600 pl-3 sm:inline-block">
        陽光智能碳會計
      </span>
    </Link>
  );

  const showFrame = !hideFrameUnlessExport || isPdfExport;

  return (
    <div className={`flex flex-col overflow-hidden ${className}`}>
      {/* Info: (20260501 - Luphia) Header */}
      {showFrame && (
        <div className="flex items-center justify-between bg-gray-900 px-6 py-4">
          {Logo}
          {badgeText && (
            <span className="inline-flex items-center rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 ring-1 ring-blue-400/30 ring-inset">
              {badgeText}
            </span>
          )}
        </div>
      )}

      {/* Info: (20260501 - Luphia) Body */}
      <div className={`flex-1 ${contentClassName}`}>{children}</div>

      {/* Info: (20260501 - Luphia) Footer */}
      {showFrame && footerType === "cta" && (
        <div className="border-t border-orange-100 bg-orange-50 px-6 py-8 text-center">
          {ctaTitle && (
            <h3 className="mb-2 text-lg font-bold text-gray-900">{ctaTitle}</h3>
          )}
          {ctaDesc && (
            <p className="mx-auto mb-6 max-w-lg text-sm text-gray-600">
              {ctaDesc}
            </p>
          )}
          <Link
            href={ctaButtonHref}
            className="inline-block rounded-lg bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-orange-500"
          >
            {ctaButtonText || "Go"}
          </Link>
        </div>
      )}
      {showFrame && footerType === "simple" && (
        <div className="flex flex-col items-center justify-between gap-2 border-t border-gray-200 bg-gray-50 px-6 py-5 text-center text-sm font-medium text-gray-500 sm:flex-row sm:px-8 sm:text-left">
          {footerTitle && <span>{footerTitle}</span>}
          <span>
            本報告透過 AI 技術生成，由 iSunFA 陽光智能碳會計提供 •{" "}
            {new Date().toISOString().split("T")[0].replace(/-/g, "/")}
          </span>
        </div>
      )}
      {showFrame && footerType === "custom" && customFooter}
    </div>
  );
}
