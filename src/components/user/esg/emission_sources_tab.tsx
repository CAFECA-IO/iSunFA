"use client";

// import { useTranslation } from "@/i18n/i18n_context";
import { numberWithCommas } from "@/lib/utils/common";
import { Database, Zap, ChartColumn, ChartPie } from "lucide-react";

  const top3EmissionSources = [
    {
      name: "台中廠區 - A 棟電表",
      value: 8420.5,
    },
    {
      name: "熱軋鋼捲採購 - 中鋼",
      value: 3250.2,
    },
    {
      name: "公司貨車 ABC-1234",
      value: 1240.8,
    },
  ];

    const scopeData = [
    {
      scope: 1,
      count: 3,
    },
    {
      scope: 2,
      count: 2,
    },
    {
      scope: 3,
      count: 5,
    },
  ];

export default function EmissionSourcesTab() {
  // const { t } = useTranslation();

  // (20260420 - Julian) 計算總數
  const totalCount = scopeData.reduce((acc, curr) => acc + curr.count, 0);

  const scopeChart = scopeData.map((scope) => {
    const color = scope.scope === 1 ? "bg-pink-100" : scope.scope === 2 ? "bg-orange-100" : "bg-indigo-100";
    return (
    <div key={scope.scope} className="flex flex-col gap-1">
      <div className="h-16 flex flex-col justify-end">
        <div
          className={`w-full rounded-t-sm ${color}`}
          style={{ height: `${scope.count / totalCount * 100}%` }}
        />
      </div>
      <p className="text-center text-[10px] font-bold text-gray-400">
        S{scope.scope}: {scope.count}
      </p>
    </div>
  )
  })

  const top3EmissionList = top3EmissionSources.map((source, index) => (
    <li key={index} className="pl-2 not-last:mb-2">
      <div className="flex items-center justify-between font-bold text-slate-800">
        <div>{source.name}</div>
        <div>{numberWithCommas(source.value)}</div>
      </div>
    </li>
  ));

  return (
    <div className="flex flex-col">
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
          <ul className="mt-4 ml-4 list-outside list-decimal text-xs marker:font-bold marker:text-orange-400">
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
          <div className="mt-4 grid items-end grid-cols-3 gap-1">
            {scopeChart}
          </div>
        </div>
      </div>
    </div>
  );
}
