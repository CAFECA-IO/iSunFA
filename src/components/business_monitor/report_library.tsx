"use client";

import { FC } from "react";
import { CloudDownload, ExternalLink, FolderOpen } from "lucide-react";
import {
  ICompanyLibraryDocument,
  ICompanyLibraryYear,
} from "@/interfaces/business_monitor";
import { BUSINESS_MONITOR_DOCUMENT_STATUS } from "@/constants/business_monitor";
import { useTranslation } from "@/i18n/i18n_context";
import { formatIsoDate } from "@/lib/business_monitor/format";
import {
  DOWNLOAD_FAILURE,
  useReportDownload,
} from "@/hooks/use_report_download";

type ShowToast = (type: "success" | "error", message: string) => void;

const STATUS_STYLE: Record<string, string> = {
  [BUSINESS_MONITOR_DOCUMENT_STATUS.AVAILABLE]:
    "bg-emerald-50 text-emerald-700",
  [BUSINESS_MONITOR_DOCUMENT_STATUS.PENDING]: "bg-slate-100 text-slate-500",
  [BUSINESS_MONITOR_DOCUMENT_STATUS.NOT_PUBLISHED]:
    "bg-amber-50 text-amber-700",
  [BUSINESS_MONITOR_DOCUMENT_STATUS.FAILED]: "bg-red-50 text-red-600",
};

const LibraryDocument: FC<{
  doc: ICompanyLibraryDocument;
  companyName: string;
  onShowToast: ShowToast;
}> = ({ doc, companyName, onShowToast }) => {
  const { t } = useTranslation();
  const { downloadTask, startDownload } = useReportDownload();
  const isDownloading = downloadTask?.status === "downloading";
  const reportId = doc.reportId;

  const handleDownload = () => {
    if (reportId === null) return;
    startDownload(reportId, undefined, (reason) =>
      onShowToast(
        "error",
        reason === DOWNLOAD_FAILURE.FILE_NOT_READY
          ? t("business_monitor.reports.item.toast_file_not_ready", {
              company: companyName,
            })
          : t("business_monitor.reports.item.toast_download_error", {
              company: companyName,
            }),
      ),
    );
  };

  return (
    <li className="flex flex-col gap-2 border-t border-slate-100 py-3 first:border-t-0 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-800">
          {t(`business_monitor.sources.${doc.source}`)}
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_STYLE[doc.status] ?? ""}`}
          >
            {t(`business_monitor.company.status.${doc.status}`)}
          </span>
        </p>
        <p className="text-xs text-slate-500">
          {[
            doc.period &&
              t("business_monitor.company.period", { period: doc.period }),
            doc.retrievedAt &&
              t("business_monitor.company.retrieved_at", {
                date: formatIsoDate(doc.retrievedAt),
              }),
          ]
            .filter(Boolean)
            .join("・")}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-xs font-bold">
        {doc.sourceUrl && (
          <a
            href={doc.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-500 hover:text-blue-700"
          >
            {t("business_monitor.ai_section.official_source")}
            <ExternalLink size={12} className="shrink-0" />
          </a>
        )}
        {reportId !== null && (
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center gap-1 rounded-lg border border-orange-600 px-3 py-1.5 text-orange-600 hover:bg-orange-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
          >
            <CloudDownload size={14} className="shrink-0" />
            {isDownloading
              ? `${t("business_monitor.reports.item.downloading")} ${downloadTask?.progress ?? 0}%`
              : t("business_monitor.company.download")}
          </button>
        )}
      </div>
    </li>
  );
};

/**
 * Info: (20261022 - Luphia) 報告庫：依「資料所屬年度」分組（財報是會計年度、永續與溫室氣體是揭露年度）。
 * 每份標示本系統取得的日期；不寫「某年公布」，因為那不是來源給的資料。
 */
const ReportLibrary: FC<{
  library: ICompanyLibraryYear[];
  companyName: string;
  onShowToast: ShowToast;
}> = ({ library, companyName, onShowToast }) => {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
          <FolderOpen size={18} className="shrink-0 text-orange-500" />
          {t("business_monitor.company.library_title")}
        </h2>
        <p className="text-xs text-slate-500">
          {t("business_monitor.company.library_hint")}
        </p>
      </div>
      {library.length === 0 ? (
        <p className="text-sm text-slate-400">
          {t("business_monitor.company.library_empty")}
        </p>
      ) : (
        library.map((group) => (
          <div key={group.year} className="flex flex-col">
            <h3 className="text-sm font-bold text-orange-700">
              {t("business_monitor.company.library_year", { year: group.year })}
            </h3>
            <ul>
              {group.documents.map((doc) => (
                <LibraryDocument
                  key={`${doc.source}-${doc.year}-${doc.reportId ?? "none"}`}
                  doc={doc}
                  companyName={companyName}
                  onShowToast={onShowToast}
                />
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
};

export default ReportLibrary;
