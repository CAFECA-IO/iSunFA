"use client";

import { useState, useEffect } from "react";
import { CompanySearchInput } from "@/components/common/company_search_input";
import { ICompanySearchResult } from "@/app/user/dpp-demo/start/page";
import { request } from "@/lib/utils/request";
import {
  DownloadCloud,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { DppDemoHeader } from "@/components/user/dpp_demo_start/dpp_demo_header";

const getFileUrl = (path: string) =>
  `/api/dpp-demo/files?action=serve&path=${encodeURIComponent(path)}`;
const downloadFileUrl = (path: string) =>
  `/api/dpp-demo/files?action=download&path=${encodeURIComponent(path)}`;

export default function ReportDownloaderPage() {
  const [keyword, setKeyword] = useState<string>("");
  const [suggestions, setSuggestions] = useState<ICompanySearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [selectedCompany, setSelectedCompany] =
    useState<ICompanySearchResult | null>(null);
  const [year, setYear] = useState<string>("2025");

  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadLog, setDownloadLog] = useState<string>("");
  const [downloadError, setDownloadError] = useState<string>("");
  const [completedFiles, setCompletedFiles] = useState<string[]>([]);

  // Info: (20260609 - Tzuhan) 模糊搜尋防抖處理 (Debounce)
  useEffect(() => {
    if (keyword.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    if (selectedCompany && keyword === selectedCompany.name) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await request<{ payload: ICompanySearchResult[] }>(
          `/api/v1/company/lookup?query=${encodeURIComponent(keyword)}`,
        );
        if (res?.payload) {
          setSuggestions(res.payload);
          setShowDropdown(true);
        }
      } catch (e: unknown) {
        console.error("Lookup failed", e);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [keyword, selectedCompany]);

  const handleSelectCompany = (company: ICompanySearchResult) => {
    setSelectedCompany(company);
    setKeyword(company.name);
    setShowDropdown(false);
    setCompletedFiles([]); // Reset results when changing company
    setDownloadLog("");
    setDownloadError("");
  };

  const startDownload = async () => {
    if (!selectedCompany) return;
    setIsDownloading(true);
    setDownloadLog("準備下載中...");
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
        `/api/v1/dpp-demo/generate?${queryParams.toString()}`,
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
                setDownloadLog("下載完成！");
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
      setDownloadError(err instanceof Error ? err.message : "下載失敗");
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <DppDemoHeader />

      <div className="mx-auto w-full max-w-4xl flex-1 overflow-hidden p-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-2xl font-bold text-slate-800">
            財報與 ESG 報告下載器
          </h1>
          <p className="mb-8 text-slate-500">
            透過輸入企業統編或名稱，快速自動爬梳並下載公開財務報表及永續報告書。
          </p>

          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <CompanySearchInput
              keyword={keyword}
              setKeyword={setKeyword}
              suggestions={suggestions}
              showDropdown={showDropdown}
              handleSelectCompany={handleSelectCompany}
              disabled={isDownloading}
            />

            <div>
              <label
                htmlFor="yearSelect"
                className="mb-1 block text-xs font-bold text-slate-700"
              >
                Year
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
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 下載進行中...
              </>
            ) : (
              <>
                <DownloadCloud className="mr-2 h-5 w-5" /> 開始下載報告
              </>
            )}
          </button>

          {(downloadLog || downloadError || completedFiles.length > 0) && (
            <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-6">
              <h2 className="mb-4 flex items-center text-lg font-bold text-slate-700">
                處理狀態
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
                    已下載的檔案：
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
                            新分頁開啟
                          </a>
                          <a
                            href={downloadFileUrl(file)}
                            download
                            className="rounded-md bg-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-orange-600"
                          >
                            儲存檔案
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
