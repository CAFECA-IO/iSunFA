"use client";

import { useState, useEffect } from "react";
import { Cloud, BarChart3, Target, TrendingUp, Loader2 } from "lucide-react";
import { IEsgDashboardSummary, EsgScope } from "@/interfaces/esg";
import { useParams } from "next/navigation";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";

export default function EsgSummary() {
  const params = useParams();
  const accountBookId = params?.account_book_id as string;

  const [summaryData, setSummaryData] = useState<IEsgDashboardSummary | null>(
    null,
  );

  useEffect(() => {
    if (accountBookId) {
      const fetchSummary = async () => {
        try {
          const res = await request<IApiResponse<IEsgDashboardSummary>>(
            `/api/v1/user/account_book/${accountBookId}/esg/summary`,
          );
          if (res.payload) {
            setSummaryData(res.payload);
          }
        } catch (error) {
          console.error("Failed to fetch ESG summary:", error);
        }
      };
      fetchSummary();
    }
  }, [accountBookId]);

  if (!summaryData) {
    return (
      <div className="flex h-32 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    );
  }

  const renderScopeProgress = (scope: EsgScope) => {
    const title =
      scope === EsgScope.SCOPE_1
        ? "Scope 1"
        : scope === EsgScope.SCOPE_2
          ? "Scope 2"
          : "Scope 3";
    const color =
      scope === EsgScope.SCOPE_1
        ? "bg-blue-500"
        : scope === EsgScope.SCOPE_2
          ? "bg-amber-400"
          : "bg-orange-500";
    const data =
      scope === EsgScope.SCOPE_1
        ? summaryData.scopeDistribution.scope1
        : scope === EsgScope.SCOPE_2
          ? summaryData.scopeDistribution.scope2
          : summaryData.scopeDistribution.scope3;

    const value = data.value;
    const unit = data.unit;
    const percentage = data.percentage;

    return (
      <div>
        <div className="mb-1.5 flex justify-between text-[11px] font-bold">
          <span className="text-slate-600">{title}</span>
          <span className="text-slate-800">
            {value} {unit}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${color}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {/* Info: (20260312 - Julian) 本月總排放量 */}
      <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-500">
              本月總排放量
            </span>
            <Cloud className="h-5 w-5 text-green-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[32px] font-black tracking-tight text-slate-800">
              {summaryData.totalEmissions.value.toLocaleString()}
            </span>
            <span className="text-sm font-bold text-slate-500">
              {summaryData.totalEmissions.unit}
            </span>
          </div>
        </div>
        <div className="mt-8">
          <div className="inline-flex items-center rounded-full border border-green-100 bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">
            <TrendingUp className="mr-1 h-3.5 w-3.5" />
            預估月底:{" "}
            {summaryData.totalEmissions.estimatedEndOfMonth.toLocaleString()}{" "}
            {summaryData.totalEmissions.estimatedUnit}
          </div>
        </div>
      </div>

      {/* Info: (20260312 - Julian) 碳排放強度 */}
      <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-500">碳排放強度</span>
            <BarChart3 className="h-5 w-5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[32px] font-black tracking-tight text-slate-800">
              {summaryData.emissionIntensity.value.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </span>
            <span className="text-sm font-bold text-slate-500">
              {summaryData.emissionIntensity.unit}
            </span>
          </div>
        </div>
        <div className="mt-8 text-xs font-bold text-slate-500">
          優於產業平均 ({summaryData.emissionIntensity.industryAverage})
        </div>
      </div>

      {/* Info: (20260312 - Julian) 各範疇分布 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 text-center text-sm font-bold text-slate-500">
          各範疇分布 (SCOPE)
        </div>
        <div className="flex flex-col gap-2">
          {renderScopeProgress(EsgScope.SCOPE_1)}
          {renderScopeProgress(EsgScope.SCOPE_2)}
          {renderScopeProgress(EsgScope.SCOPE_3)}
        </div>
      </div>

      {/* Info: (20260312 - Julian) 年度目標進度 */}
      <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-500">
              年度目標進度
            </span>
            <Target className="h-5 w-5 text-red-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-[32px] font-black tracking-tight text-red-500">
              {summaryData.goalProgress.percentage}%
            </span>
            <span className="text-sm font-bold text-slate-500">/ 100%</span>
          </div>
        </div>
        <div className="mt-8">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-green-400"
              style={{ width: `${summaryData.goalProgress.percentage}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
