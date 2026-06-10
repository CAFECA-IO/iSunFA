"use client";

import { FC, useState, useEffect } from "react";
import {
  Search,
  Building2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
} from "lucide-react";
import Pagination from "@/components/common/pagination";
import CompanySearchInput from "@/components/common/company_search_input";
import { IMockReport, IAIResponse } from "@/interfaces/business_monitor";
import { request } from "@/lib/utils/request";
import { useTranslation } from "@/i18n/i18n_context";
import { BUSINESS_MONITOR_INDUSTRIES } from "@/constants/business_monitor";
import ReportItem from "@/components/business_monitor/report_item";
import AiResponseCard from "@/components/business_monitor/ai_response_card";

const BusinessMonitorPageBody: FC = () => {
  const { t } = useTranslation();

  // Info:(20260609 - Julian) Filter States
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [selectedIndustry, setSelectedIndustry] = useState<string>("");

  // Info:(20260609 - Julian) Applied Filter State
  const [appliedFilters, setAppliedFilters] = useState({
    query: "",
    company: "",
    industry: "",
    year: "",
  });

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
  const [filteredReports, setFilteredReports] = useState<IMockReport[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [aiResponse, setAiResponse] = useState<IAIResponse | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (appliedFilters.query) params.append("query", appliedFilters.query);
        if (appliedFilters.company)
          params.append("company", appliedFilters.company);
        if (appliedFilters.industry)
          params.append("industry", appliedFilters.industry);
        if (appliedFilters.year) params.append("year", appliedFilters.year);
        params.append("page", currentPage.toString());
        params.append("pageSize", "8");

        const res = await request<{
          payload: {
            reports: IMockReport[];
            total: number;
            totalPages: number;
            aiResponse?: IAIResponse;
          };
        }>(`/api/v1/mock/reports?${params.toString()}`);

        if (res?.payload) {
          setFilteredReports(res.payload.reports);
          setTotalCount(res.payload.total);
          setTotalPages(res.payload.totalPages);
          setAiResponse(res.payload.aiResponse || null);
        }
      } catch (err) {
        console.error("Failed to fetch reports", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, [appliedFilters, currentPage]);

  // Info: (20260609 - Julian) 處理搜尋
  const handleSearch = () => {
    setCurrentPage(1);
    setAppliedFilters({
      query: searchQuery,
      company: companyName,
      industry: selectedIndustry,
      year: selectedYear,
    });
  };

  // Info: (20260609 - Julian) 清除搜尋條件
  const handleClear = () => {
    setSearchQuery("");
    setCompanyName("");
    setSelectedIndustry("");
    setSelectedYear("");
    setCurrentPage(1);
    setAppliedFilters({
      query: "",
      company: "",
      industry: "",
      year: "",
    });
  };

  // Info: (20260609 - Julian) Command + Enter (Mac) 或 Ctrl + Enter (Windows) 送出搜尋結果
  const handleHotkey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSearch();
    }
  };

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
            {t("business_monitor.title")}
          </h1>
          <p className="text-xs font-medium text-slate-500 lg:text-sm">
            {t("business_monitor.subtitle")}
          </p>
        </div>

        {/* Info:(20260609 - Julian) Filter Section */}
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
          <div className="grid grid-flow-row grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-5">
            {/* Info:(20260609 - Julian) AI 諮詢 */}
            <div className="flex flex-col gap-2 md:col-span-2">
              <label
                htmlFor="ai-search"
                className="text-xs font-bold text-slate-500"
              >
                {t("business_monitor.filter.ai_consult")}
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Sparkles size={16} className="shrink-0 text-slate-400" />
                </div>
                <input
                  id="ai-search"
                  type="text"
                  placeholder={t("business_monitor.filter.ai_placeholder")}
                  value={searchQuery}
                  onKeyDown={handleHotkey}
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
                {t("business_monitor.filter.select_company")}
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
                {t("business_monitor.filter.select_industry")}
              </label>
              <div className="relative">
                <select
                  id="industry-select"
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                  className="block w-full appearance-none rounded-lg border border-slate-200 py-2.5 pr-8 pl-3 text-sm text-slate-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="">
                    {t("business_monitor.filter.all_industries")}
                  </option>
                  <option value={BUSINESS_MONITOR_INDUSTRIES.SEMICONDUCTOR}>
                    {t("business_monitor.filter.industries.semiconductor")}
                  </option>
                  <option
                    value={BUSINESS_MONITOR_INDUSTRIES.COMPUTER_PERIPHERALS}
                  >
                    {t(
                      "business_monitor.filter.industries.computer_peripherals",
                    )}
                  </option>
                  <option value={BUSINESS_MONITOR_INDUSTRIES.OPTOELECTRONICS}>
                    {t("business_monitor.filter.industries.optoelectronics")}
                  </option>
                  <option value={BUSINESS_MONITOR_INDUSTRIES.COMMUNICATIONS}>
                    {t("business_monitor.filter.industries.communications")}
                  </option>
                  <option
                    value={BUSINESS_MONITOR_INDUSTRIES.ELECTRONIC_COMPONENTS}
                  >
                    {t(
                      "business_monitor.filter.industries.electronic_components",
                    )}
                  </option>
                </select>
              </div>
            </div>

            {/* Info:(20260609 - Julian) 選擇報告區間 */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="year-select"
                className="text-xs font-bold text-slate-500"
              >
                {t("business_monitor.filter.select_year_range")}
              </label>
              <div className="relative">
                <select
                  id="year-select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="block w-full appearance-none rounded-lg border border-slate-200 py-2.5 pr-8 pl-3 text-sm text-slate-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="">
                    {t("business_monitor.filter.all_years")}
                  </option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClear}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-6 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 focus:outline-none lg:w-auto"
            >
              {t("business_monitor.filter.clear_filters")}
            </button>
            <button
              type="button"
              onClick={handleSearch}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-8 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700 focus:outline-none lg:w-auto"
            >
              <Search size={16} />
              {t("business_monitor.filter.search_reports")}
            </button>
          </div>
        </div>

        {/* Info:(20260609 - Julian) AI Answer Card */}
        {!isLoading && aiResponse && (
          <div className="border-b border-dashed border-slate-200 pb-6">
            <div className="flex flex-col gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4 shadow-sm md:p-6">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="shrink-0 text-orange-500" />
                <h2 className="text-sm font-bold text-orange-900 md:text-lg">
                  {t("business_monitor.ai_section.title")}
                </h2>
              </div>
              <div className="rounded-2xl bg-orange-100 px-4 py-2 text-base leading-relaxed font-medium text-slate-800 md:text-xl">
                {aiResponse.answer}
              </div>
              {/* Info: (20260610 - Julian) AI 回應 & 參考資料卡片 */}
              <AiResponseCard
                aiResponse={aiResponse}
                reports={filteredReports}
              />
            </div>
          </div>
        )}

        {/* Info:(20260609 - Julian) Report Count */}
        {!isLoading && filteredReports.length > 0 && (
          <p className="ml-auto text-sm font-medium text-slate-500">
            {t("business_monitor.reports.total_count", { count: totalCount })}
          </p>
        )}

        {/* Info:(20260609 - Julian) Table Section */}
        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-xl border border-slate-200 bg-white shadow-sm">
            {appliedFilters.query ? (
              <>
                <Sparkles
                  size={32}
                  className="shrink-0 animate-pulse text-orange-500"
                />
                <span className="text-sm font-medium text-slate-500">
                  {t("business_monitor.ai_section.searching")}
                </span>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-sm font-medium text-slate-500">
                <LoaderCircle
                  size={32}
                  className="shrink-0 animate-spin text-orange-500"
                />
                <p>{t("business_monitor.reports.loading")}</p>
              </div>
            )}
          </div>
        ) : filteredReports.length > 0 ? (
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
              {appliedFilters.query
                ? t("business_monitor.ai_section.no_answer")
                : t("business_monitor.reports.no_reports")}
            </p>
          </div>
        )}

        {/* Info:(20260609 - Julian) Pagination */}
        {!isLoading && totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Info:(20260609 - Julian) Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg px-6 py-3 text-white shadow-lg transition-all ${
            toastMessage.type === "success" ? "bg-emerald-500" : "bg-red-500"
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
