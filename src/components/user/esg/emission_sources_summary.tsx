"use client";

import { numberWithCommas } from "@/lib/utils/common";
import {
  ChartColumn,
  ChartPie,
  Database,
  Zap,
} from "lucide-react";
import { EsgScope } from "@/interfaces/esg";
import { mockSummaryData } from "@/interfaces/emission_source";

export default function EmissionSourcesSummary() {
  // ToDo: (20260420 - Julian) 串接 API 取得 summary data
  const summaryData = mockSummaryData;

    // (20260420 - Julian) 計算總數
  const totalCount = summaryData.scopeDistribution.reduce((acc, curr) => acc + curr.count, 0);

  // (20260420 - Julian) 繪製範疇分佈圖
  const scopeChart = summaryData.scopeDistribution.map((scope) => {
    const color =
      scope.scope === EsgScope.SCOPE_1
        ? "bg-pink-200"
        : scope.scope === EsgScope.SCOPE_2
          ? "bg-orange-200"
          : "bg-indigo-200";
    return (
      <div key={scope.scope} className="flex flex-col gap-1">
        <div className="flex h-16 flex-col justify-end">
          <div
            className={`w-full rounded-t-sm ${color}`}
            style={{ height: `${(scope.count / totalCount) * 100}%` }}
          />
        </div>
        <p className="text-center text-[10px] font-bold text-gray-400">
          {scope.scope}: {scope.count}
        </p>
      </div>
    );
  });

  // (20260420 - Julian) 繪製前三大排放源
  const top3EmissionList = summaryData.top3EmissionSources.map((source, index) => (
    <li key={index} className="pl-2 not-last:mb-2">
      <div className="flex items-center justify-between font-bold text-slate-800">
        <div className="max-w-7/10 truncate">{source.name}</div>
        <div>{numberWithCommas(source.value)}</div>
      </div>
    </li>
  ));
  
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-4">
      {/* Info: (20260420 - Julian) 排放源總數 */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
        <div className="relative flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-slate-500 lg:text-sm">
            排放源總數
          </p>
          <div className="absolute -top-2 -right-2 rounded-xl bg-slate-100 p-1.5 text-slate-800">
            <Database size={20} />
          </div>
        </div>
        <p className="text-2xl font-black text-slate-800">
          10
          <span className="ml-1 text-sm font-semibold text-slate-400">
            個 ID
          </span>
        </p>
      </div>

      {/* Info: (20260420 - Julian) 預估年度總排放 */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
        <div className="relative flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-slate-500 lg:text-sm">
            預估年度總排放
          </p>
          <div className="absolute -top-2 -right-2 rounded-xl bg-orange-50 p-1.5 text-orange-500">
            <Zap size={20} />
          </div>
        </div>
        <p className="text-2xl font-black text-slate-800">
          {numberWithCommas(15420.8)}
          <span className="ml-1 text-sm font-semibold text-slate-400">
            kgCO2e
          </span>
        </p>
      </div>

      {/* Info: (20260420 - Julian) 排放量前三名 */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
        <div className="relative flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-slate-500 lg:text-sm">
            排放量前三名
          </p>
          <div className="absolute -top-2 -right-2 rounded-xl p-1.5 text-orange-400">
            <ChartColumn size={20} />
          </div>
        </div>
        <ul className="ml-4 list-outside list-decimal text-xs marker:font-bold marker:text-orange-400">
          {top3EmissionList}
        </ul>
      </div>

      {/* Info: (20260420 - Julian) 範疇分佈 */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
        <div className="relative flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-slate-500 lg:text-sm">
            範疇分佈
          </p>
          <div className="absolute -top-2 -right-2 rounded-xl p-1.5 text-gray-400">
            <ChartPie size={20} />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 items-end gap-1">
          {scopeChart}
        </div>
      </div>
    </div>
  );
}