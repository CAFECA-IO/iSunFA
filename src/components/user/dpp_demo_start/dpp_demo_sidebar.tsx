import { ICompanySearchResult } from "@/app/user/dpp-demo/start/page";
import { Search, Play, Loader2, AlertCircle, CircleDashed, CheckCircle2 } from "lucide-react";

// Info: (20260609 - Tzuhan) 繪製狀態圖示
const renderStateIcon = (status: "pending" | "running" | "completed" | "error") => {
  switch (status) {
    case "pending": return <CircleDashed className="w-6 h-6 text-slate-300" />;
    case "running": return <div className="w-6 h-6 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" />;
    case "completed": return <CheckCircle2 className="w-6 h-6 stroke-[2.5px] text-orange-500" />;
    case "error": return <AlertCircle className="w-6 h-6 stroke-[2.5px] text-red-500" />;
  }
};

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
  steps: {
    id: string;
    label: string;
    status: "pending" | "running" | "completed" | "error";
    log?: string;
  }[];
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
  steps
}: IDppDemoSidebarProps) {
  return (
    <div className="w-full lg:w-[420px] flex-shrink-0 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden z-20 relative">
      <div className="p-5 border-b border-gray-100 bg-slate-50/50">
        <div className="space-y-4">
          <div className="relative">
            <label htmlFor="companyKeyword" className="block text-xs font-bold text-slate-700 mb-1">Target Enterprise (統一編號 / 企業名稱)</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="companyKeyword"
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="輸入股票代號或公司名稱..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                disabled={isGenerating}
              />
            </div>
            {showDropdown && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {suggestions.length > 0 ? (
                  suggestions.map((c) => (
                    <button
                      key={c.taxId}
                      type="button"
                      onClick={() => handleSelectCompany(c)}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-100 last:border-0"
                    >
                      <span className="font-semibold text-slate-700">{c.name}</span>
                      <span className="text-slate-400 text-xs">{c.taxId}</span>
                    </button>
                  ))
                ) : (
                  <div className="p-4 bg-slate-50 border-l-4 border-orange-500 m-2 rounded-r flex flex-col gap-1">
                    <span className="text-sm font-bold text-slate-700">尚未支援此非公開發行企業</span>
                    <span className="text-xs text-slate-500">
                      目前系統僅支援上市櫃公司之公開財報與 ESG 永續報告書自動爬梳。若需特定企業展示，請聯絡技術團隊進行手動建檔。
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="yearSelect" className="block text-xs font-bold text-slate-700 mb-1">Year</label>
              <select
                id="yearSelect"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                disabled={isGenerating}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-orange-500"
              >
                {["2025", "2024"].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="productCountSelect" className="block text-xs font-bold text-slate-700 mb-1">Product Count</label>
              <select
                id="productCountSelect"
                value={productCount}
                onChange={(e) => setProductCount(Number(e.target.value))}
                disabled={isGenerating}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-orange-500"
              >
                {[1, 2, 3, 5].map(n => <option key={n} value={n}>{n} 項產品</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={startGeneration}
            disabled={!selectedCompany || isGenerating}
            className="w-full mt-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-300 text-white font-bold py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center text-sm"
          >
            {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 生成腳本執行中...</> : <><Play className="w-4 h-4 mr-2" /> 開始生成資料</>}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-white custom-scrollbar">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Pipeline Execution</h3>
        {showExtrapolationAlert && (
          <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-xl flex flex-col gap-2 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center text-orange-800 font-bold text-sm">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              未發現當年度 ESG 報告，已自動採用 AI 跨年推估 (Time-Machine)
            </div>
            <div className="text-[11px] text-orange-700/80 leading-relaxed pl-6">
              系統已自動回溯歷史基期，並根據以下核心原理進行跨年度動態模擬：
              <ul className="list-disc pl-4 mt-1.5 space-y-1">
                <li><strong>總體經濟預測</strong>：套用全球通膨趨勢與供應鏈波動因子</li>
                <li><strong>營收動能推估</strong>：依循已公布財報之營收動能推估產能與能耗變化</li>
                <li><strong>綠電轉型推估</strong>：模擬企業面對 CBAM 壓力下之再生能源採購佔比提升與減碳路徑</li>
              </ul>
            </div>
          </div>
        )}
        <div className="flex-col gap-2 relative mt-2 flex">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`relative w-full flex items-center gap-3 lg:gap-4 p-3 rounded-xl transition-all text-left group
                ${step.status === "running" ? "bg-orange-50 border border-orange-100" : "hover:bg-slate-50 border border-transparent"}
              `}
            >
              <div className="relative shrink-0 flex items-center justify-center bg-transparent lg:bg-white rounded-full">
                {renderStateIcon(step.status)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`text-sm font-semibold mb-0.5 truncate transition-colors
                  ${step.status === "running" ? "text-orange-900" : step.status === "completed" ? "text-slate-800" : "text-slate-500"}
                `}>
                  {step.label}
                </h4>
                {step.log && (
                  <div className="mt-1 p-2 bg-slate-900/5 rounded-lg text-xs font-mono text-slate-600 break-all">
                    &gt; {step.log}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
