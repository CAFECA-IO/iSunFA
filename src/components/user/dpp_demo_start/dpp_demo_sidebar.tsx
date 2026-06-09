import { ICompanySearchResult } from "@/app/user/dpp-demo/start/page";
import {
  Search,
  Play,
  Loader2,
  AlertCircle,
  CircleDashed,
  CheckCircle2,
  FileText,
} from "lucide-react";

// Info: (20260609 - Tzuhan) 繪製狀態圖示
const renderStateIcon = (
  status: "pending" | "running" | "completed" | "error",
) => {
  switch (status) {
    case "pending":
      return <CircleDashed className="h-6 w-6 text-slate-300" />;
    case "running":
      return (
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
      );
    case "completed":
      return <CheckCircle2 className="h-6 w-6 text-orange-500" />;
    case "error":
      return <AlertCircle className="h-6 w-6 stroke-[2.5px] text-red-500" />;
  }
};

export interface IDppDemoStep {
  id: string;
  label: string;
  status: "pending" | "running" | "completed" | "error";
  log?: string;
  file?: string;
}

export interface IDppDemoSidebarProps {
  keyword: string;
  setKeyword: (val: string) => void;
  suggestions: ICompanySearchResult[];
  showDropdown: boolean;
  selectedCompany: ICompanySearchResult | null;
  handleSelectCompany: (c: ICompanySearchResult) => void;
  year: string;
  setYear: (val: string) => void;
  productCount: number;
  setProductCount: (val: number) => void;
  isGenerating: boolean;
  startGeneration: () => void;
  showExtrapolationAlert: boolean;
  steps: IDppDemoStep[];
  onStepClick?: (step: IDppDemoStep) => void;
}

export function DppDemoSidebar({
  keyword,
  setKeyword,
  suggestions,
  showDropdown,
  selectedCompany,
  handleSelectCompany,
  year,
  setYear,
  productCount,
  setProductCount,
  isGenerating,
  startGeneration,
  showExtrapolationAlert,
  steps,
  onStepClick = () => {},
}: IDppDemoSidebarProps) {
  return (
    <div className="relative z-20 flex h-full w-full flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:w-[420px]">
      <div className="border-b border-gray-100 bg-slate-50/50 p-5">
        <div className="space-y-4">
          <div className="relative">
            <label
              htmlFor="companyKeyword"
              className="mb-1 block text-xs font-bold text-slate-700"
            >
              Target Enterprise (統一編號 / 企業名稱)
            </label>
            <div className="relative">
              <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
              <input
                id="companyKeyword"
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="輸入股票代號或公司名稱..."
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-4 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                disabled={isGenerating}
              />
            </div>
            {showDropdown && (
              <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                {suggestions.length > 0 ? (
                  suggestions.map((c) => (
                    <button
                      key={c.taxId}
                      type="button"
                      onClick={() => handleSelectCompany(c)}
                      className="flex w-full cursor-pointer items-center justify-between border-b border-slate-100 px-4 py-2 text-left text-sm last:border-0 hover:bg-slate-50"
                    >
                      <span className="font-semibold text-slate-700">
                        {c.name}
                      </span>
                      <span className="text-xs text-slate-400">{c.taxId}</span>
                    </button>
                  ))
                ) : (
                  <div className="m-2 flex flex-col gap-1 rounded-r border-l-4 border-orange-500 bg-slate-50 p-4">
                    <span className="text-sm font-bold text-slate-700">
                      尚未支援此非公開發行企業
                    </span>
                    <span className="text-xs text-slate-500">
                      目前系統僅支援上市櫃公司之公開財報與 ESG
                      永續報告書自動爬梳。若需特定企業展示，請聯絡技術團隊進行手動建檔。
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                disabled={isGenerating}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:ring-1 focus:ring-orange-500"
              >
                {["2025", "2024"].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="productCountSelect"
                className="mb-1 block text-xs font-bold text-slate-700"
              >
                Product Count
              </label>
              <select
                id="productCountSelect"
                value={productCount}
                onChange={(e) => setProductCount(Number(e.target.value))}
                disabled={isGenerating}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:ring-1 focus:ring-orange-500"
              >
                {[1, 2, 3, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} 項產品
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={startGeneration}
            disabled={!selectedCompany || isGenerating}
            className="mt-2 flex w-full items-center justify-center rounded-xl bg-slate-800 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-slate-700 disabled:bg-slate-300"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                生成腳本執行中...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" /> 開始生成資料
              </>
            )}
          </button>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto bg-white p-4">
        <h3 className="mb-4 text-xs font-bold tracking-widest text-slate-500 uppercase">
          Pipeline Execution
        </h3>
        {showExtrapolationAlert && (
          <div className="animate-in fade-in slide-in-from-top-4 mb-4 flex flex-col gap-2 rounded-xl border border-orange-200 bg-orange-50 p-4 shadow-sm duration-500">
            <div className="flex items-center text-sm font-bold text-orange-800">
              <AlertCircle className="mr-2 h-4 w-4 flex-shrink-0" />
              未發現當年度 ESG 報告，已自動採用 AI 跨年推估 (Time-Machine)
            </div>
            <div className="pl-6 text-[11px] leading-relaxed text-orange-700/80">
              系統已自動回溯歷史基期，並根據以下核心原理進行跨年度動態模擬：
              <ul className="mt-1.5 list-disc space-y-1 pl-4">
                <li>
                  <strong>總體經濟預測</strong>
                  ：套用全球通膨趨勢與供應鏈波動因子
                </li>
                <li>
                  <strong>營收動能推估</strong>
                  ：依循已公布財報之營收動能推估產能與能耗變化
                </li>
                <li>
                  <strong>綠電轉型推估</strong>：模擬企業面對 CBAM
                  壓力下之再生能源採購佔比提升與減碳路徑
                </li>
              </ul>
            </div>
          </div>
        )}
        <div className="relative mt-2 flex flex-col gap-2">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() =>
                onStepClick && step.status === "completed" && onStepClick(step)
              }
              className={`group relative flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all lg:gap-4 ${
                step.status === "running"
                  ? "border-orange-100 bg-orange-50"
                  : step.status === "completed"
                    ? "cursor-pointer border-transparent hover:border-slate-200 hover:bg-slate-50"
                    : "border-transparent opacity-70"
              } `}
              disabled={
                step.status !== "completed" && step.status !== "running"
              }
            >
              <div className="relative flex shrink-0 items-center justify-center rounded-full bg-transparent lg:bg-white">
                {renderStateIcon(step.status)}
              </div>
              <div className="min-w-0 flex-1">
                <h4
                  className={`mb-0.5 truncate text-sm font-semibold transition-colors ${step.status === "running" ? "text-orange-900" : step.status === "completed" ? "text-slate-800" : "text-slate-500"} `}
                >
                  {step.label}
                </h4>
                {step.status === "completed" && (
                  <div className="mt-0.5 flex items-center text-xs text-slate-400">
                    <FileText className="mr-1 h-3.5 w-3.5" />
                    點擊檢視來源檔案
                  </div>
                )}
                {step.log && (
                  <div className="mt-1 rounded-lg bg-slate-900/5 p-2 text-left font-mono text-xs break-all text-slate-600">
                    &gt; {step.log}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
