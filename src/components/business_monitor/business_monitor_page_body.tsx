"use client";

import { FC, useState } from "react";
import {
  Search,
  Building2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Pagination from "@/components/common/pagination";
import CompanySearchInput from "@/components/common/company_search_input";
import { useReportDownload } from "@/hooks/use_report_download";
import { IMockReport, mockReports } from "@/interfaces/business_monitor";

const ReportItem: FC<{
  report: IMockReport;
  onShowToast: (type: "success" | "error", message: string) => void;
}> = ({ report, onShowToast }) => {
  const { downloadTask, startDownload } = useReportDownload();

  const handleDownload = () => {
    startDownload(
      report.id,
      () => onShowToast("success", `${report.company} - 原始報告下載完成`),
      () => onShowToast("error", `${report.company} - 下載失敗，請稍後再試`),
    );
  };

  const isDownloading = downloadTask?.status === "downloading";
  const isCompleted = downloadTask?.status === "completed";

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md">
      <div className="border-b border-orange-100 bg-orange-50 px-4 py-3 md:px-6 md:py-4">
        <h3 className="mb-1 text-xl font-bold text-orange-900">
          {report.company}
        </h3>
        <p className="text-sm font-medium text-orange-700">{report.title}</p>
      </div>

      <div className="flex flex-col p-4 md:p-6">
        <div className="mb-6 flex flex-col gap-1 text-sm text-slate-600 md:gap-2">
          <p>
            <span className="font-medium text-slate-700">報告年度：</span>
            {report.reportYear}
          </p>
          <p>
            <span className="font-medium text-slate-700">揭露期間：</span>
            {report.period}
          </p>
          <p>
            <span className="font-medium text-slate-700">產業別：</span>
            {report.industry}
          </p>
          <p>
            <span className="font-medium text-slate-700">資本額區間：</span>
            {report.capital}
          </p>
          <p>
            <span className="font-medium text-slate-700">查證機構：</span>
            {report.verificationAgency}
          </p>
          <p>
            <span className="font-medium text-slate-700">查證採用標準：</span>
            {report.verificationStandards}
          </p>
          <p>
            <span className="font-medium text-slate-700">確信機構：</span>
            {report.assuranceAgency}
          </p>
          <p>
            <span className="font-medium text-slate-700">確信採用標準：</span>
            {report.assuranceStandards}
          </p>
        </div>

        <div className="grid grid-cols-2 items-center gap-2 md:mt-auto md:flex">
          <button className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700">
            查看揭露細節
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`rounded-lg border px-4 py-2 text-sm font-bold transition-colors ${
              isDownloading
                ? "cursor-not-allowed border-slate-300 bg-slate-100 text-slate-400"
                : "border-orange-600 bg-white text-orange-600 hover:bg-orange-50"
            }`}
          >
            {isDownloading
              ? "下載中..."
              : isCompleted
                ? "重新下載"
                : "下載原始報告"}
          </button>
        </div>

        {/* Info:(20260609 - Julian) Progress Bar Section */}
        {isDownloading && downloadTask && (
          <div className="mt-4 flex flex-col gap-1">
            <div className="flex justify-between text-xs text-slate-500">
              <span>下載進度</span>
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

const BusinessMonitorPageBody: FC = () => {
  // Info:(20260609 - Julian) Filter States
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [selectedIndustry, setSelectedIndustry] = useState<string>("");

  // Info:(20260609 - Julian) Toast State
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Info:(20260609 - Julian) Data States
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [filteredReports, setFilteredReports] =
    useState<IMockReport[]>(mockReports);
  const [currentPage, setCurrentPage] = useState<number>(1);

  return (
    <main className="min-h-screen bg-gray-50/50 pt-8 pb-20">
      <div className="mx-auto flex max-w-6xl flex-col gap-y-4 px-4 md:px-8 lg:max-w-[calc(100vw-30px)] lg:gap-y-6 lg:px-12">
        {/* Info:(20260609 - Julian) Header */}
        <div className="flex flex-col gap-2">
          <h1 className="flex items-center text-base font-bold text-slate-800 lg:text-2xl">
            <Building2
              size={24}
              className="mr-2 shrink-0 text-orange-500"
              strokeWidth={2.5}
            />
            企業觀測看板
          </h1>
          <p className="text-xs font-medium text-slate-500 lg:text-sm">
            搜尋臺灣公開發行公司之財報數據、下載官方股東會年報，並由 AI
            智能助理為您深度分析
          </p>
        </div>

        {/* Info:(20260609 - Julian) Filter Section */}
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
          <div className="grid grid-flow-row grid-cols-1 gap-2 md:grid-cols-3 md:gap-4 lg:grid-cols-6 lg:gap-6">
            {/* Info:(20260609 - Julian) AI 諮詢 */}
            <div className="flex flex-col gap-2 md:col-span-3">
              <label
                htmlFor="ai-search"
                className="text-xs font-bold text-slate-500"
              >
                AI 諮詢
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Sparkles size={16} className="shrink-0 text-slate-400" />
                </div>
                <input
                  id="ai-search"
                  type="text"
                  placeholder="如：鴻海離職率是多少？"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full rounded-lg border border-slate-200 py-2.5 pr-3 pl-10 text-sm text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Info:(20260609 - Julian) 選擇企業 */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="company-search"
                className="text-xs font-bold text-slate-500"
              >
                選擇企業
              </label>
              <CompanySearchInput
                value={companyName}
                onChange={setCompanyName}
              />
            </div>

            {/* Info:(20260609 - Julian) 選擇產業別 */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="industry-select"
                className="text-xs font-bold text-slate-500"
              >
                選擇產業別
              </label>
              <div className="relative">
                <select
                  id="industry-select"
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                  className="block w-full appearance-none rounded-lg border border-slate-200 py-2.5 pr-8 pl-3 text-sm text-slate-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="">全部產業</option>
                  <option value="半導體業">半導體業</option>
                  <option value="電腦及週邊設備業">電腦及週邊設備業</option>
                  <option value="光電業">光電業</option>
                  <option value="通信網路業">通信網路業</option>
                  <option value="電子零組件業">電子零組件業</option>
                </select>
              </div>
            </div>

            {/* Info:(20260609 - Julian) 選擇報告區間 */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="year-select"
                className="text-xs font-bold text-slate-500"
              >
                選擇報告區間
              </label>
              <div className="relative">
                <select
                  id="year-select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="block w-full appearance-none rounded-lg border border-slate-200 py-2.5 pr-8 pl-3 text-sm text-slate-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                >
                  <option value={2025}>2025 年 (民國 114 年)</option>
                  <option value={2024}>2024 年 (民國 113 年)</option>
                  <option value={2023}>2023 年 (民國 112 年)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-2 flex justify-end">
            <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-8 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700 focus:outline-none lg:w-auto">
              <Search size={16} />
              搜尋報告
            </button>
          </div>
        </div>

        {filteredReports.length > 0 && (
          <p className="ml-auto text-sm font-medium text-slate-500">
            共 {filteredReports.length} 筆
          </p>
        )}

        {/* Info:(20260609 - Julian) Table Section */}
        {filteredReports.length > 0 ? (
          <div className="grid grid-flow-row grid-cols-1 gap-4 md:grid-cols-2">
            {filteredReports.map((report) => (
              <ReportItem
                key={report.id}
                report={report}
                onShowToast={showToast}
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mb-4 rounded-full">
              <Building2
                size={60}
                className="shrink-0 text-slate-300"
                strokeWidth={1.5}
              />
            </div>
            <p className="text-sm font-bold text-slate-400">
              請先搜尋並選擇一家公司來開始觀測。
            </p>
          </div>
        )}

        {/* Info:(20260609 - Julian) Pagination */}
        {filteredReports.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={10}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Info:(20260609 - Julian) Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg px-6 py-3 shadow-lg transition-all ${
            toastMessage.type === "success"
              ? "bg-emerald-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 size={20} className="shrink-0" />
          ) : (
            <AlertCircle size={20} className="shrink-0" />
          )}
          <span className="font-medium">{toastMessage.text}</span>
        </div>
      )}
    </main>
  );
};

export default BusinessMonitorPageBody;
