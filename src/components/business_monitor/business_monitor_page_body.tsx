"use client";

import { FC, useState } from "react";
import { Search, Building2, Sparkles } from "lucide-react";
import Pagination from "@/components/common/pagination";

// Mock data
const companySuggestions = [
  { taxId: "2317", name: "鴻海精密工業股份有限公司" },
  { taxId: "2330", name: "台灣積體電路製造股份有限公司" },
  { taxId: "2454", name: "聯發科技股份有限公司" },
  { taxId: "2308", name: "台達電子工業股份有限公司" },
];

interface IMockReport {
  id: number;
  company: string;
  title: string;
  reportYear: string;
  period: string;
  industry: string;
  capital: string;
  verificationAgency: string;
  verificationStandards: string;
  assuranceAgency: string;
  assuranceStandards: string;
}

const mockReports: IMockReport[] = [
  {
    id: 1,
    company: "環拓科技股份有限公司",
    title: "2024 年永續報告書",
    reportYear: "2024",
    period: "2024/01/31 ~ 2024/12/31",
    industry: "綠能環保",
    capital: "無",
    verificationAgency: "無",
    verificationStandards: "參考國際永續標準、準則與規範(GRI、TCFD、SASB)",
    assuranceAgency: "無",
    assuranceStandards: "無",
  },
  {
    id: 2,
    company: "鴻海精密工業股份有限公司",
    title: "2024 年永續報告書",
    reportYear: "2024",
    period: "2024/01/01 ~ 2024/12/31",
    industry: "其他電子業",
    capital: "100億以上",
    verificationAgency: "台灣檢驗科技股份有限公司(SGS)",
    verificationStandards: "參考國際永續標準、準則與規範(GRI、SASB)",
    assuranceAgency: "資誠聯合會計師事務所",
    assuranceStandards: "確信準則 3000 號",
  },
  {
    id: 3,
    company: "友達光電股份有限公司",
    title: "2024 年永續報告書",
    reportYear: "2024",
    period: "2024/01/01 ~ 2024/12/31",
    industry: "光電業",
    capital: "100億以上",
    verificationAgency: "台灣檢驗科技股份有限公司(SGS)",
    verificationStandards: "參考國際永續標準、準則與規範(GRI、SASB)",
    assuranceAgency: "資誠聯合會計師事務所",
    assuranceStandards: "確信準則 3000 號",
  },
  {
    id: 4,
    company: "聯電股份有限公司",
    title: "2024 年永續報告書",
    reportYear: "2024",
    period: "2024/01/01 ~ 2024/12/31",
    industry: "半導體業",
    capital: "100億以上",
    verificationAgency: "台灣檢驗科技股份有限公司(SGS)",
    verificationStandards: "參考國際永續標準、準則與規範(GRI、SASB)",
    assuranceAgency: "資誠聯合會計師事務所",
    assuranceStandards: "確信準則 3000 號",
  },
  {
    id: 5,
    company: "台灣積體電路製造股份有限公司",
    title: "2024 年永續報告書",
    reportYear: "2024",
    period: "2024/01/01 ~ 2024/12/31",
    industry: "半導體業",
    capital: "100億以上",
    verificationAgency: "台灣檢驗科技股份有限公司(SGS)",
    verificationStandards: "參考國際永續標準、準則與規範(GRI、SASB)",
    assuranceAgency: "資誠聯合會計師事務所",
    assuranceStandards: "確信準則 3000 號",
  },
];

const ReportItem: FC<{ report: IMockReport }> = ({ report }) => {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
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
          <button className="rounded-lg border border-orange-600 bg-white px-4 py-2 text-sm font-bold text-orange-600 transition-colors hover:bg-orange-50">
            下載原始報告
          </button>
        </div>
      </div>
    </div>
  );
};

const BusinessMonitorPageBody: FC = () => {
  // Info:(20260609 - Julian) Filter States
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [showCompanyDropdown, setShowCompanyDropdown] =
    useState<boolean>(false);
  const [selectedIndustry, setSelectedIndustry] = useState<string>("");

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
                  <Sparkles className="h-4 w-4 text-slate-400" />
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
            <div className="relative flex flex-col gap-2">
              <label
                htmlFor="company-search"
                className="text-xs font-bold text-slate-500"
              >
                選擇企業
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Building2 className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="company-search"
                  type="text"
                  placeholder="輸入企業名稱或統編"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    setShowCompanyDropdown(true);
                  }}
                  onFocus={() => setShowCompanyDropdown(true)}
                  onBlur={() =>
                    setTimeout(() => setShowCompanyDropdown(false), 200)
                  }
                  className="block w-full rounded-lg border border-slate-200 py-2.5 pr-3 pl-10 text-sm text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              {showCompanyDropdown && companyName && (
                <div className="absolute top-full z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                  {companySuggestions
                    .filter(
                      (c) =>
                        c.name.includes(companyName) ||
                        c.taxId.includes(companyName),
                    )
                    .map((c) => (
                      <button
                        key={c.taxId}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setCompanyName(`${c.name} (${c.taxId})`);
                          setShowCompanyDropdown(false);
                        }}
                        className="w-full border-b border-gray-100 px-4 py-2 text-left text-sm font-medium text-gray-700 last:border-0 hover:bg-orange-50"
                      >
                        {c.name}{" "}
                        <span className="font-normal text-gray-400">
                          ({c.taxId})
                        </span>
                      </button>
                    ))}
                  {companySuggestions.filter(
                    (c) =>
                      c.name.includes(companyName) ||
                      c.taxId.includes(companyName),
                  ).length === 0 && (
                    <div className="px-4 py-2 text-sm text-gray-500">
                      查無符合的企業
                    </div>
                  )}
                </div>
              )}
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
              <ReportItem key={report.id} report={report} />
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
    </main>
  );
};

export default BusinessMonitorPageBody;
