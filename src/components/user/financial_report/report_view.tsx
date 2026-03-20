"use client";

import { useState } from "react";
import { Filter, Share2, Download, Code } from "lucide-react";
import EmbedGenerateModal from "@/components/user/financial_report/embed_generate_modal";

export default function ReportView() {
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState<boolean>(false);

  const handleGenerateReport = () => {
    console.log("Generate Report");
  };

  const handleShare = () => {
    console.log("Share");
  };

  const handleDownload = () => {
    console.log("Download");
  };

  const handleGenerateEmbedCode = () => setIsEmbedModalOpen(true);
  const handleCloseModal = () => setIsEmbedModalOpen(false);

  // Info: (20260319 - Julian) 資產負債表的版面配置
  const balanceSheetView = (
    <div className="overflow-x-auto p-6 md:p-12">
      <div className="mx-auto max-w-4xl min-w-[600px]">
        <div className="mb-10 text-center text-[#1e293b]">
          <h2 className="text-2xl font-black tracking-[0.2em] md:text-3xl">
            ISUNFA 智慧會計系統
          </h2>
          <h3 className="mt-3 text-xl font-bold tracking-widest">資產負債表</h3>
          <p className="mt-3 text-sm font-medium text-slate-500">
            日期：2024-Q2 (單位：新台幣元)
          </p>
        </div>

        <div className="w-full text-base leading-relaxed text-[#1e293b]">
          <div className="flex justify-between border-b-2 border-[#1e293b] pb-2 font-bold antialiased">
            <span>會計科目名稱</span>
            <span>本期金額</span>
          </div>

          <div>
            {/* Info:(20260319 - Julian) 1. 資產 */}
            <div className="flex justify-between border-b border-slate-200 bg-slate-50 px-2 py-2 font-bold">
              <span>資產 (Assets)</span>
              <span></span>
            </div>

            <div className="flex justify-between border-b border-slate-100 py-2 pl-6 font-semibold text-slate-700">
              <span>流動資產</span>
              <span>2,450,000</span>
            </div>

            <div className="flex justify-between border-b border-slate-100 py-2 pl-10 text-[15px] font-medium text-slate-600">
              <span>現金及銀行存款</span>
              <span>1,200,000</span>
            </div>

            <div className="flex justify-between border-b border-slate-100 py-2 pl-10 text-[15px] font-medium text-slate-600">
              <span>應收帳款</span>
              <span>1,250,000</span>
            </div>

            <div className="flex justify-between border-b border-slate-100 py-2 pl-6 font-semibold text-slate-700">
              <span>非流動資產</span>
              <span>5,800,000</span>
            </div>

            {/* Info:(20260319 - Julian) 資產總計 */}
            <div className="mt-2 flex justify-between border-b-2 border-slate-200 py-4 pl-2 font-black">
              <span className="text-lg">資產總計</span>
              <span className="text-xl">8,250,000</span>
            </div>

            {/* Info:(20260319 - Julian) 2. 負債及權益 */}
            <div className="flex justify-between border-b border-slate-200 bg-slate-50 px-2 py-2 font-bold">
              <span>負債及權益 (Liabilities & Equity)</span>
              <span></span>
            </div>

            <div className="flex justify-between border-b border-slate-100 py-2 pl-6 font-semibold text-slate-700">
              <span>流動負債</span>
              <span>1,100,000</span>
            </div>

            <div className="flex justify-between border-b border-slate-100 py-2 pl-6 font-semibold text-slate-700">
              <span>長期負債</span>
              <span>2,000,000</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {/* Info:(20260319 - Julian) 報表參數設定 */}
        <div className="flex h-fit w-full shrink-0 flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:w-72">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <Filter className="h-5 w-5 text-slate-800" strokeWidth={2.5} />
            <h2 className="text-base font-bold text-slate-800">報表參數設定</h2>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col space-y-2">
              <label
                htmlFor="report-type"
                className="text-sm font-bold text-slate-600"
              >
                報表種類
              </label>
              <select
                id="report-type"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              >
                <option>資產負債表 (Balance Sheet)</option>
                <option>現金流量表 (Cash Flow Statement)</option>
                <option>損益表 (Income Statement)</option>
                <option>試算表 (Trial Balance)</option>
              </select>
            </div>

            <div className="flex flex-col space-y-2">
              <label
                htmlFor="report-period"
                className="text-sm font-bold text-slate-600"
              >
                期間選擇
              </label>
              <select
                id="report-period"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              >
                <option>2024 第二季 (Q2)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleGenerateReport}
              className="mt-2 w-full rounded-md bg-slate-600 py-2 text-sm font-bold text-white transition-colors outline-none hover:bg-slate-800"
            >
              立即產出報表
            </button>

            {/* Info:(20260319 - Julian) 傳票核對數提示 */}
            <div className="rounded-xl border border-slate-200 bg-gray-50/50 p-4">
              <p className="text-xs leading-relaxed font-medium text-slate-600">
                系統將根據目前已核對的 1,245 筆傳票資訊進行即時彙整。
              </p>
            </div>
          </div>
        </div>

        {/* Info:(20260319 - Julian) 報表預覽 */}
        <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Info: (20260319 - Julian) 報表標題列 */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-50/50 px-4 py-4 md:px-6">
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold tracking-wider text-slate-800">
                BALANCE SHEET
              </span>
              <span className="text-sm font-bold text-slate-600">2024-Q2</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleShare}
                className="text-slate-500 transition-colors hover:text-slate-800"
                title="分享"
              >
                <Share2 className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="text-slate-500 transition-colors hover:text-slate-800"
                title="下載"
              >
                <Download className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleGenerateEmbedCode}
                className="flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-amber-600"
              >
                <Code className="h-4 w-4" strokeWidth={2.5} />
                產生嵌入碼
              </button>
            </div>
          </div>

          {/* Info:(20260319 - Julian) 報表內容 */}
          {balanceSheetView}
        </div>
      </div>

      {/* Info: (20260319 - Julian) Embed Generate Modal */}
      {isEmbedModalOpen && <EmbedGenerateModal onClose={handleCloseModal} />}
    </>
  );
}
