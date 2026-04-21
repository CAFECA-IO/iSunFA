"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Cloud, BarChart3, Target, TrendingUp, Loader2,ChartPie } from "lucide-react";
import { IEsgDashboardSummary, EsgScope } from "@/interfaces/esg";
import { useParams, usePathname } from "next/navigation";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { useTranslation } from "@/i18n/i18n_context";

interface IEsgSummaryProps {
  year?: number;
  month?: number | "";
}

export default function EsgSummary({
  year = undefined,
  month = undefined,
}: IEsgSummaryProps) {
  const params = useParams();
  const pathname = usePathname();
  const accountBookId = params?.account_book_id as string;
  const { t } = useTranslation();

  const [summaryData, setSummaryData] = useState<IEsgDashboardSummary | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Info: (20260312 - Julian) 連接到 Journal
  const journalLink = pathname.replace("esg", "journal");

  useEffect(() => {
    if (accountBookId) {
      const fetchSummary = async () => {
        try {
          setIsLoading(true);
          const query: { year?: number; month?: number } = {};
          if (year) query.year = year;
          if (month) query.month = month;

          const res = await request<IApiResponse<IEsgDashboardSummary>>(
            `/api/v1/user/account_book/${accountBookId}/esg/summary`,
            { query },
          );
          if (res.payload) {
            setSummaryData(res.payload);
          }
        } catch (error) {
          console.error("Failed to fetch ESG summary:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchSummary();
    } else {
      setIsLoading(false);
    }
  }, [accountBookId, year, month]);

  if (isLoading) {
    return (
      <div className="flex h-32 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Loader2 className="size-6 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!summaryData) {
    return (
      <div className="flex h-72 w-full flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm">
        <Cloud className="mb-2 size-8 text-slate-300" />
        <span className="text-sm font-bold">
          {t("esg_summary.no_data_prefix")}
          <Link
            href={journalLink}
            className="mx-1 text-blue-600 hover:underline"
          >
            {t("esg_summary.upload_link")}
          </Link>
          {t("esg_summary.no_data_suffix")}
        </span>
      </div>
    );
  }

  // (20260420 - Julian) 繪製範疇分佈圖
  const scopeChart = summaryData.scopeDistribution.map(({ scope, value, percentage }) => {
    const color= scope === EsgScope.SCOPE_1 ? "bg-pink-200" : scope === EsgScope.SCOPE_2 ? "bg-orange-200" : "bg-indigo-200";
    return (
    <div key={scope} className="flex flex-col gap-1">
      <div className="flex h-16 flex-col justify-end">
        <div
          className={`w-full rounded-t-sm ${color}`}
          style={{ height: `${percentage}%` }}
        />
      </div>
      <p className="text-center text-[10px] font-bold text-gray-400">
        {t(`esg_summary.${scope.toLowerCase()}`)}: {value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </p>
    </div>
  )
  });

  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-4">
      {/* Info: (20260312 - Julian) 本月總排放量 */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 lg:text-sm">
              {t("esg_summary.total_emissions")}
            </span>
            <Cloud className="h-5 w-5 shrink-0 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-slate-800">
              {summaryData.totalEmissions.value.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-500 lg:text-sm">
              {summaryData.totalEmissions.unit}
            </span>
          </div>
        </div>
        <div className="mt-4 lg:mt-8">
          <div className="inline-flex items-center rounded-full border border-green-100 bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">
            <TrendingUp className="mr-1 h-3.5 w-3.5 shrink-0" />
            {t("esg_summary.estimate_eom")}{" "}
            {summaryData.totalEmissions.estimatedEndOfMonth.toLocaleString()}{" "}
            {summaryData.totalEmissions.estimatedUnit}
          </div>
        </div>
      </div>

      {/* Info: (20260312 - Julian) 碳排放強度 */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 lg:text-sm">
              {t("esg_summary.emission_intensity")}
            </span>
            <BarChart3 className="h-5 w-5 shrink-0 text-orange-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-slate-800">
              {summaryData.emissionIntensity.value === null
                ? "N/A"
                : summaryData.emissionIntensity.value.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                    },
                  )}
            </span>
            <span className="text-xs font-bold text-slate-500 lg:text-sm">
              {summaryData.emissionIntensity.unit}
            </span>
          </div>
        </div>
        <div className="mt-4 text-xs font-bold text-slate-500 lg:mt-8">
          {t("esg_summary.better_than_industry", {
            average: summaryData.emissionIntensity.industryAverage,
          })}
        </div>
      </div>

      {/* Info: (20260312 - Julian) 各範疇分布 */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
        <div className="relative flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-slate-500 lg:text-sm">
            {t("emission_sources.summary.scope_distribution")}
          </p>
          <div className="absolute -top-2 -right-2 rounded-xl p-1.5 text-gray-400">
            <ChartPie size={20} />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 items-end gap-1">
          {scopeChart}
        </div>
      </div>

      {/* Info: (20260312 - Julian) 年度目標進度 */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 lg:text-sm">
              {t("esg_summary.annual_goal_progress")}
            </span>
            <Target className="h-5 w-5 shrink-0 text-orange-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold tracking-tight text-orange-600">
              {summaryData.goalProgress.percentage}%
            </span>
            <span className="text-sm font-bold text-slate-500">/ 100%</span>
          </div>
        </div>
        <div className="mt-4 lg:mt-8">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${summaryData.goalProgress.percentage > 100 ? "bg-red-500" : "bg-orange-500"}`}
              style={{
                width: `${Math.min(100, summaryData.goalProgress.percentage)}%`,
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
