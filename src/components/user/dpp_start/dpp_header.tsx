import { Building } from "lucide-react";

export function DppHeader() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden opacity-30 blur-3xl"
        aria-hidden="true"
      >
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-br from-orange-400 to-amber-200 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
      </div>
      <div className="relative z-10 flex-shrink-0 rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
        <h1 className="flex items-center text-xl font-bold text-gray-900">
          <Building className="mr-3 h-6 w-6 text-orange-500" />
          企業模擬資料生成中心 (Phase 1)
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          指定目標企業並自動觸發底層爬蟲與 AI
          萃取腳本，以建立數位產品護照的企業畫像與基礎實體檔案。
        </p>
      </div>
    </>
  );
}
