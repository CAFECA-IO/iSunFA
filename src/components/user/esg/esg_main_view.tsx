import {
  Leaf,
  Download,
  Cloud,
  BarChart3,
  Target,
  TrendingUp,
} from "lucide-react";
import EsgTableSection from "@/components/user/esg/esg_table_section";
import { mockDashboardSummary } from "@/interfaces/esg";

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
        <button className="flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
          <Download className="mr-2 h-4 w-4" />
          匯出 ESG 申報表
        </button>
      </div>

      {/* Info: (20260312 - Julian) Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {/* Card 1 */}
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
                {mockDashboardSummary.totalEmissions.value.toLocaleString()}
              </span>
              <span className="text-sm font-bold text-slate-500">
                {mockDashboardSummary.totalEmissions.unit}
              </span>
            </div>
          </div>
          <div className="mt-8">
            <div className="inline-flex items-center rounded-full border border-green-100 bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">
              <TrendingUp className="mr-1 h-3.5 w-3.5" />
              預估月底:{" "}
              {mockDashboardSummary.totalEmissions.estimatedEndOfMonth.toLocaleString()}{" "}
              {mockDashboardSummary.totalEmissions.estimatedUnit}
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-500">
                碳排放強度
              </span>
              <BarChart3 className="h-5 w-5 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[32px] font-black tracking-tight text-slate-800">
                {mockDashboardSummary.emissionIntensity.value.toLocaleString(
                  undefined,
                  { minimumFractionDigits: 2 },
                )}
              </span>
              <span className="text-sm font-bold text-slate-500">
                {mockDashboardSummary.emissionIntensity.unit}
              </span>
            </div>
          </div>
          <div className="mt-8 text-xs font-bold text-slate-500">
            優於產業平均 (
            {mockDashboardSummary.emissionIntensity.industryAverage})
          </div>
        </div>

        {/* Card 3 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 text-center text-sm font-bold text-slate-500">
            各範疇分布 (SCOPE)
          </div>
          <div className="flex flex-col gap-3.5">
            {/* Scope 1 */}
            <div>
              <div className="mb-1.5 flex justify-between text-[11px] font-bold">
                <span className="text-slate-600">Scope 1</span>
                <span className="text-slate-800">
                  {mockDashboardSummary.scopeDistribution.scope1.value}{" "}
                  {mockDashboardSummary.scopeDistribution.scope1.unit}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{
                    width: `${mockDashboardSummary.scopeDistribution.scope1.percentage}%`,
                  }}
                ></div>
              </div>
            </div>
            {/* Scope 2 */}
            <div>
              <div className="mb-1.5 flex justify-between text-[11px] font-bold">
                <span className="text-slate-600">Scope 2</span>
                <span className="text-slate-800">
                  {mockDashboardSummary.scopeDistribution.scope2.value.toLocaleString()}{" "}
                  {mockDashboardSummary.scopeDistribution.scope2.unit}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-amber-400"
                  style={{
                    width: `${mockDashboardSummary.scopeDistribution.scope2.percentage}%`,
                  }}
                ></div>
              </div>
            </div>
            {/* Scope 3 */}
            <div>
              <div className="mb-1.5 flex justify-between text-[11px] font-bold">
                <span className="text-slate-600">Scope 3</span>
                <span className="text-slate-800">
                  {mockDashboardSummary.scopeDistribution.scope3.value}{" "}
                  {mockDashboardSummary.scopeDistribution.scope3.unit}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-orange-500"
                  style={{
                    width: `${mockDashboardSummary.scopeDistribution.scope3.percentage}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4 */}
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
                {mockDashboardSummary.goalProgress.percentage}%
              </span>
              <span className="text-sm font-bold text-slate-500">/ 100%</span>
            </div>
          </div>
          <div className="mt-8">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-green-400"
                style={{
                  width: `${mockDashboardSummary.goalProgress.percentage}%`,
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Info: (20260312 - Julian) Table Section */}
      <EsgTableSection />
    </div>
  );
}
