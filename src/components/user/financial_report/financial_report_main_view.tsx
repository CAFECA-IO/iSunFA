"use client";

import { useState } from "react";
import { ChartColumn } from "lucide-react";
import ReportView from "@/components/user/financial_report/report_view";

export default function FinancialReportMainView() {
  const [activeTab, setActiveTab] = useState<"report" | "embed">("report");

  const embedContent = <div className="mt-6">嵌入碼管理</div>;

  const displayedContent =
    activeTab === "report" ? <ReportView /> : embedContent;

  return (
    <div className="flex max-w-[calc(100vw-30px)] flex-col space-y-6 px-0 md:px-12">
      {/* Info:(20260319 - Julian) Header */}
      <div className="flex flex-col gap-2">
        <h1 className="flex items-center text-base font-bold text-slate-800 lg:text-2xl">
          <ChartColumn
            className="mr-2 h-6 w-6 text-amber-500"
            strokeWidth={2.5}
          />
          會計報表中心
        </h1>
        <p className="text-xs font-medium text-slate-500 lg:text-sm">
          自動根據傳票資訊彙整各類財務報表，並提供外部嵌入功能。
        </p>
      </div>

      {/* Info:(20260319 - Julian) Tabs */}
      <div className="flex items-center border-b border-slate-300">
        <button
          type="button"
          onClick={() => setActiveTab("report")}
          className={`border-b-2 px-6 py-3 font-bold transition-all duration-300 ease-in-out ${
            activeTab === "report"
              ? "border-amber-500 text-amber-500"
              : "border-transparent text-slate-500"
          }`}
        >
          產出報表
        </button>
        {/* <button
          type="button"
          onClick={() => setActiveTab("embed")}
          className={`border-b-2 px-6 py-3 font-bold transition-all duration-300 ease-in-out ${
            activeTab === "embed"
              ? "border-amber-500 text-amber-500"
              : "border-transparent text-slate-500"
          }`}
        >
          嵌入碼管理
        </button> */}
      </div>

      {/* Info:(20260319 - Julian) Tab Content */}
      {displayedContent}
    </div>
  );
}
