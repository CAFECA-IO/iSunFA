"use client";

import { useState } from "react";
import CompanySearchInput from "@/components/common/company_search_input";
import { ICompanySearchResult } from "@/app/(landing)/digital_product_passport_simulator/start/page";
import {
  DownloadCloud,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { DppHeader } from "@/components/user/dpp_start/dpp_header";
import { useTranslation } from "@/i18n/i18n_context";

const getFileUrl = (path: string) =>
  `/api/v1/digital_product_passport_simulator/files?action=serve&path=${encodeURIComponent(path)}`;
const downloadFileUrl = (path: string) =>
  `/api/v1/digital_product_passport_simulator/files?action=download&path=${encodeURIComponent(path)}`;

export default function ReportDownloaderPage() {
  const { t } = useTranslation();
  const [keyword, setKeyword] = useState<string>("");
  const [selectedCompany, setSelectedCompany] =
    useState<ICompanySearchResult | null>(null);
  const [year, setYear] = useState<string>("2025");

  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadLog, setDownloadLog] = useState<string>("");
  const [downloadError, setDownloadError] = useState<string>("");
  const [completedFiles, setCompletedFiles] = useState<string[]>([]);

  const handleSelectCompany = (company: ICompanySearchResult) => {
    setSelectedCompany(company);
    setKeyword(company.name);
    setCompletedFiles([]); // Info: (20260611 - Tzuhan) Reset results when changing company
    setDownloadLog("");
    setDownloadError("");
  };

  const startDownload = async () => {
    if (!selectedCompany) return;
    setIsDownloading(true);
    setDownloadLog(t("report_downloader.preparing"));
    setDownloadError("");
    setCompletedFiles([]);

    try {
      const queryParams = new URLSearchParams({
        stockId: selectedCompany.taxId,
        year,
        mode: "download_only",
        productCount: "1",
      });

      const response = await fetch(
        `/api/v1/dpp/generate?${queryParams.toString()}`,
      );
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.substring("data: ".length);
            if (dataStr === "[DONE]") {
              setIsDownloading(false);
              return;
            }
            try {
              const eventData = JSON.parse(dataStr);
              if (eventData.type === "log" && eventData.message) {
                setDownloadLog(eventData.message);
              } else if (
                eventData.type === "fin_complete" ||
                eventData.type === "esg_complete"
              ) {
                if (eventData.file) {
                  setCompletedFiles((prev) => [...prev, eventData.file]);
                }
              } else if (eventData.type === "complete") {
                setIsDownloading(false);
                setDownloadLog(t("report_downloader.download_complete"));
              } else if (eventData.type === "error") {
                setDownloadError(eventData.message);
                setIsDownloading(false);
              }
            } catch (e) {
              console.error("Failed to parse SSE JSON", dataStr, e);
            }
          }
        }
      }
    } catch (err: unknown) {
      setDownloadError(
        err instanceof Error
          ? err.message
          : t("report_downloader.download_failed"),
      );
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <DppHeader />

      <div className="mx-auto w-full max-w-4xl flex-1 overflow-hidden p-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-2xl font-bold text-slate-800">
            {t("report_downloader.title")}
          </h1>
          <p className="mb-8 text-slate-500">
            {t("report_downloader.description")}
          </p>

          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="companyKeyword"
                className="mb-1 block text-xs font-bold text-slate-700"
              >
                {t("report_downloader.target_enterprise")}
              </label>
              <CompanySearchInput
                value={keyword}
                onChange={setKeyword}
                onSelect={handleSelectCompany}
                disabled={isDownloading}
              />
            </div>

            <div>
              <label
                htmlFor="yearSelect"
                className="mb-1 block text-xs font-bold text-slate-700"
              >
                {t("report_downloader.year")}
              </label>
              <select
                id="yearSelect"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                disabled={isDownloading}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:ring-1 focus:ring-orange-500"
              >
                {["2025", "2024", "2023"].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={startDownload}
            disabled={!selectedCompany || isDownloading}
            className="flex w-full items-center justify-center rounded-xl bg-slate-800 py-3 text-base font-bold text-white shadow-sm transition-all hover:bg-slate-700 disabled:bg-slate-300"
          >
            {isDownloading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />{" "}
                {t("report_downloader.downloading")}
              </>
            ) : (
              <>
                <DownloadCloud className="mr-2 h-5 w-5" />{" "}
                {t("report_downloader.start_download")}
              </>
            )}
          </button>

          {(downloadLog || downloadError || completedFiles.length > 0) && (
            <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-6">
              <h2 className="mb-4 flex items-center text-lg font-bold text-slate-700">
                {t("report_downloader.processing_status")}
              </h2>

              {downloadError ? (
                <div className="mb-4 flex items-center text-red-500">
                  <AlertCircle className="mr-2 h-5 w-5" />
                  <span>{downloadError}</span>
                </div>
              ) : (
                <div className="mb-4 flex items-center text-slate-600">
                  {isDownloading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin text-orange-500" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-5 w-5 text-green-500" />
                  )}
                  <span className="font-mono text-sm">{downloadLog}</span>
                </div>
              )}

              {completedFiles.length > 0 && (
                <div className="mt-4 border-t border-slate-200 pt-4">
                  <h3 className="mb-3 text-sm font-bold text-slate-700">
                    {t("report_downloader.downloaded_files")}
                  </h3>
                  <ul className="space-y-2">
                    {completedFiles.map((file, idx) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3"
                      >
                        <div className="flex items-center">
                          <FileText className="mr-2 h-4 w-4 text-orange-500" />
                          <span className="text-sm font-medium text-slate-700">
                            {file.split("/").pop()}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <a
                            href={getFileUrl(file)}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md px-3 py-1.5 text-xs font-bold text-indigo-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            {t("report_downloader.open_new_tab")}
                          </a>
                          <a
                            href={downloadFileUrl(file)}
                            download
                            className="rounded-md bg-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-orange-600"
                          >
                            {t("report_downloader.save_file")}
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
