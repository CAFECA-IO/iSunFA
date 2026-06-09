import { Building } from "lucide-react";

export function DppDemoHeader() {
  return (
    <>
      <div
        className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden opacity-30 blur-3xl pointer-events-none"
        aria-hidden="true"
      >
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-br from-orange-400 to-amber-200 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-5 flex-shrink-0 z-10 relative">
        <h1 className="text-xl font-bold text-gray-900 flex items-center">
          <Building className="w-6 h-6 mr-3 text-orange-500" />
          企業模擬資料生成中心 (Phase 1)
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          指定目標企業並自動觸發底層爬蟲與 AI 萃取腳本，以建立數位產品護照的企業畫像與基礎實體檔案。
        </p>
      </div>
    </>
  );
}
