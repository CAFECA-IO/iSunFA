import { Leaf, Download } from "lucide-react";
import EsgSummary from "@/components/user/esg/esg_summary";
import EsgTableSection from "@/components/user/esg/esg_table_section";

export default function EsgMainView() {
  return (
    <div className="flex w-full flex-col space-y-6 px-12">
      {/* Info: (20260312 - Julian) Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center text-2xl font-bold text-slate-800">
            <Leaf className="mr-2 h-6 w-6 text-green-500" strokeWidth={2.5} />
            碳排管理與 ESG 分析
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            自動分析進項憑證，為您提供即時的碳中和進度與各項排放維度分析。
          </p>
        </div>
        <button
          type="button"
          disabled
          className="flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors enabled:hover:bg-slate-300 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          <Download className="mr-2 h-4 w-4" />
          匯出 ESG 申報表
        </button>
      </div>

      {/* Info: (20260312 - Julian) Summary */}
      <EsgSummary />

      {/* Info: (20260312 - Julian) Table Section */}
      <EsgTableSection />
    </div>
  );
}
