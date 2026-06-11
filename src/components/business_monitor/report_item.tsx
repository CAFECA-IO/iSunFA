"use client";

import { FC } from "react";
import Link from "next/link";
import { BookmarkCheck } from "lucide-react";
import { useReportDownload } from "@/hooks/use_report_download";
import { IMockReport } from "@/interfaces/business_monitor";
import { useTranslation } from "@/i18n/i18n_context";

interface IReportItemProps {
  report: IMockReport;
  onShowToast: (type: "success" | "error", message: string) => void;
}

const ReportItem: FC<IReportItemProps> = ({ report, onShowToast }) => {
  const { t } = useTranslation();
  const { downloadTask, startDownload } = useReportDownload();

  // Info: (20260609 - Julian) 整合 useReportDownload 處理下載
  const handleDownload = () => {
    startDownload(
      report.id,
      () => {
        onShowToast(
          "success",
          t("business_monitor.reports.item.toast_download_success", {
            company: report.company,
          }),
        );
        // Info:(20260609 - Julian) 模擬產生檔案 Blob 並觸發瀏覽器下載
        const dummyContent = `Mock Report Content for ${report.company}\nReport Year: ${report.reportYear}\nPeriod: ${report.period}\nIndustry: ${report.industry}`;
        const blob = new Blob([dummyContent], {
          type: "text/plain;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${report.company}_${report.reportYear}永續報告書.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
      () =>
        onShowToast(
          "error",
          t("business_monitor.reports.item.toast_download_error", {
            company: report.company,
          }),
        ),
    );
  };

  const isDownloading = downloadTask?.status === "downloading";
  const isCompleted = downloadTask?.status === "completed";

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md">
      <div className="flex items-center justify-between border-b border-orange-100 bg-orange-50 px-4 py-3 md:px-6 md:py-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-bold text-orange-900">
            {report.company}
          </h3>
          <p className="text-sm font-medium text-orange-700">{report.title}</p>
        </div>
        {report.isVerifiedByThirdParty && (
          <div className="flex items-center gap-1 rounded-md border-0 border-green-300 bg-green-50 px-1 py-1 text-green-700 md:border md:px-2">
            <BookmarkCheck size={24} className="shrink-0" />
            <p className="hidden text-xs font-medium md:block">
              {t("business_monitor.reports.item.verified_by_third_party")}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col p-4 md:p-6">
        <div className="mb-6 flex flex-col gap-1 text-sm text-slate-600 md:gap-2">
          <p>
            <span className="font-medium text-slate-700">
              {t("business_monitor.reports.item.report_year")}
            </span>
            {report.reportYear}
          </p>
          <p>
            <span className="font-medium text-slate-700">
              {t("business_monitor.reports.item.disclosure_period")}
            </span>
            {report.period}
          </p>
          <p>
            <span className="font-medium text-slate-700">
              {t("business_monitor.reports.item.industry")}
            </span>
            {report.industry}
          </p>
          <p>
            <span className="font-medium text-slate-700">
              {t("business_monitor.reports.item.capital_range")}
            </span>
            {report.capital}
          </p>
          <p>
            <span className="font-medium text-slate-700">
              {t("business_monitor.reports.item.verification_agency")}
            </span>
            {report.verificationAgency}
          </p>
          <p>
            <span className="font-medium text-slate-700">
              {t("business_monitor.reports.item.verification_standards")}
            </span>
            {report.verificationStandards}
          </p>
          <p>
            <span className="font-medium text-slate-700">
              {t("business_monitor.reports.item.assurance_agency")}
            </span>
            {report.assuranceAgency}
          </p>
          <p>
            <span className="font-medium text-slate-700">
              {t("business_monitor.reports.item.assurance_standards")}
            </span>
            {report.assuranceStandards}
          </p>
        </div>

        <div className="grid grid-cols-2 items-center gap-2 md:mt-auto md:flex">
          <Link href={`/business_monitor/${report.id}`}>
            <button
              type="button"
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700"
            >
              {t("business_monitor.reports.item.view_details")}
            </button>
          </Link>
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className={`rounded-lg border px-4 py-2 text-sm font-bold transition-colors ${
              isDownloading
                ? "cursor-not-allowed border-slate-300 bg-slate-100 text-slate-400"
                : "border-orange-600 bg-white text-orange-600 hover:bg-orange-50"
            }`}
          >
            {isDownloading
              ? t("business_monitor.reports.item.downloading")
              : isCompleted
                ? t("business_monitor.reports.item.re_download")
                : t("business_monitor.reports.item.download_original")}
          </button>
        </div>

        {/* Info:(20260609 - Julian) Progress Bar Section */}
        {isDownloading && downloadTask && (
          <div className="mt-4 flex flex-col gap-1">
            <div className="flex justify-between text-xs text-slate-500">
              <span>
                {t("business_monitor.reports.item.download_progress")}
              </span>
              <span>{downloadTask.progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-orange-500 transition-all duration-300 ease-in-out"
                style={{ width: `${downloadTask.progress}%` }}
              />
            </div>
            <div className="text-right text-[10px] text-slate-400">
              {(downloadTask.downloadedBytes / (1024 * 1024)).toFixed(1)} MB /{" "}
              {(downloadTask.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportItem;
