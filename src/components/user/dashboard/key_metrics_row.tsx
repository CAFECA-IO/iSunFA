import { useTranslation } from "@/i18n/i18n_context";
import {
  Wallet,
  TrendingUp,
  AlertCircle,
  Trophy,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { BarChart, Bar, ResponsiveContainer } from "recharts";
import { MoneyUtil } from "@/lib/utils/money";

interface IKeyMetricsRowProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentData: any;
}

export const KeyMetricsRow = ({ currentData }: IKeyMetricsRowProps) => {
  const { t } = useTranslation();
  const currentFunds =
    currentData.fundsData?.length > 0
      ? currentData.fundsData[currentData.fundsData.length - 1].value
      : 0;

  // Info: (20260118 - Luphia) Determine Revenue Status
  const getRevenueStatus = (rate: number) => {
    // Info: (20260118 - Luphia) Significantly Exceeded: Now Blue (was Yellow)
    if (rate >= 120)
      return {
        key: "exceeded_significantly",
        icon: Trophy,
        color: "text-blue-600",
        bg: "bg-blue-50",
        barColor: "#3B82F6",
      };
    if (rate >= 80)
      return {
        key: "close",
        icon: CheckCircle2,
        color: "text-yellow-600",
        bg: "bg-yellow-50",
        barColor: "#EAB308",
      };
    // Info: (20260118 - Luphia) Exceeded (Normal)
    if (rate >= 100)
      return {
        key: "exceeded",
        icon: TrendingUp,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        barColor: "#10B981",
      };
    return {
      key: "too_low",
      icon: AlertCircle,
      color: "text-red-600",
      bg: "bg-red-50",
      barColor: "#EF4444",
    };
  };

  const getExpenditureStatus = (rate: number) => {
    if (rate > 100)
      return {
        key: "critical",
        icon: AlertCircle,
        color: "text-red-600",
        bg: "bg-red-50",
        barColor: "#EF4444",
      };
    if (rate > 90)
      return {
        key: "warning",
        icon: AlertTriangle,
        color: "text-orange-600",
        bg: "bg-orange-50",
        barColor: "#F97316",
      };
    return {
      key: "normal",
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      barColor: "#10B981",
    };
  };

  const revStatus = getRevenueStatus(currentData.metrics.revenueAchievement);
  const RevIcon = revStatus.icon;
  const expStatus = getExpenditureStatus(currentData.metrics.expenditureRate);
  const ExpIcon = expStatus.icon;

  return (
    <div className="grid h-auto grid-cols-1 gap-6 md:h-48 md:grid-cols-3">
      {/* Info: (20260118 - Luphia) 1. Available Funds (Candlestick Chart) */}
      <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white shadow-lg">
        <div className="z-10 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">
              {t("dashboard.available_funds")}
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                ${MoneyUtil.formatDynamic(currentFunds, 0)}
              </span>
              <div
                className={`flex items-center text-xs font-medium ${currentData.metrics.fundsTrend.startsWith("+") ? "text-emerald-400" : "text-red-400"}`}
              >
                {currentData.metrics.fundsTrend.startsWith("+") ? (
                  <TrendingUp className="mr-1 h-3 w-3" />
                ) : (
                  <AlertCircle className="mr-1 h-3 w-3" />
                )}
                {currentData.metrics.fundsTrend}
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-white/10 p-1.5 backdrop-blur-md">
            <Wallet className="h-4 w-4 text-white" />
          </div>
        </div>
        <div className="mt-4 flex h-24 w-full items-end">
          <svg
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            className="overflow-visible"
          >
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {currentData.fundsData.map((d: any, i: number) => {
              const count = currentData.fundsData.length;
              const x = (i / count) * 100;
              const width = (1 / count) * 100;

              // Info: (20260118 - Luphia) Calculate Y scale based on min/max of current data window
              const allHighs = currentData.fundsData.map(
                (item: { high: number }) => item.high,
              );
              const allLows = currentData.fundsData.map(
                (item: { low: number }) => item.low,
              );
              const minVal = Math.min(...allLows);
              const maxVal = Math.max(...allHighs);
              const range = maxVal - minVal || 1;

              // Info: (20260118 - Luphia) Add 10% vertical padding
              const paddedMin = minVal - range * 0.1;
              const paddedMax = maxVal + range * 0.1;
              const paddedRange = paddedMax - paddedMin;

              const getY = (val: number) =>
                ((paddedMax - val) / paddedRange) * 100;

              const isUp = d.close >= d.open;
              const color = isUp ? "#10B981" : "#EF4444";

              const highY = getY(d.high);
              const lowY = getY(d.low);
              const openY = getY(d.open);
              const closeY = getY(d.close);

              const bodyTop = Math.min(openY, closeY);
              const bodyHeight = Math.abs(openY - closeY);
              // Info: (20260118 - Luphia) Ensure minimal height for viability
              const renderBodyHeight = Math.max(bodyHeight, 1);

              return (
                <g key={i}>
                  {/* Info: (20260118 - Luphia) Wick */}
                  <line
                    x1={`${x + width / 2}%`}
                    y1={`${highY}%`}
                    x2={`${x + width / 2}%`}
                    y2={`${lowY}%`}
                    stroke={color}
                    strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke"
                  />
                  {/* Info: (20260118 - Luphia) Body */}
                  <rect
                    x={`${x + width * 0.15}%`}
                    y={`${bodyTop}%`}
                    width={`${width * 0.7}%`}
                    height={`${renderBodyHeight}%`}
                    fill={color}
                    rx="1"
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Info: (20260118 - Luphia) 2. Revenue Analysis (Combined Card) */}
      <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="z-10 flex items-start justify-between">
          <div className="flex flex-col">
            <p className="text-xs font-medium tracking-wider text-gray-500 uppercase">
              {t("dashboard.revenue_analysis")}
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-2xl font-bold text-gray-900">
                $
                {MoneyUtil.formatDynamic(currentData.metrics.revenueCurrent, 0)}
              </p>
              <span className="text-xs text-gray-400">
                / $
                {MoneyUtil.formatDynamic(currentData.metrics.revenueTarget, 0)}
              </span>
            </div>
            <p
              className={`mt-1 text-xs font-medium ${currentData.metrics.revenueTrendVal >= 0 ? "text-emerald-600" : "text-red-600"}`}
            >
              {currentData.metrics.revenueTrend}{" "}
              <span className="font-normal text-gray-400">
                {t("dashboard.vs_previous_period")}
              </span>
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            {/* Info: (20260118 - Luphia) Revenue Status Badge */}
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${revStatus.bg} ${revStatus.color} border border-transparent whitespace-nowrap shadow-sm`}
            >
              <RevIcon className="h-4 w-4 shrink-0" />
              <span className="text-xs font-bold">
                {t(`dashboard.revenue_status.${revStatus.key}`)}
              </span>
            </div>
          </div>
        </div>

        <div className="z-10 mt-4 flex items-end justify-between">
          {/* Info: (20260118 - Luphia) Achievement % */}
          <div className="flex flex-col">
            <p className={`text-sm font-bold ${revStatus.color}`}>
              {currentData.metrics.revenueAchievement.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Info: (20260118 - Luphia) Background Chart */}
        <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-20 opacity-10">
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={1}
            minHeight={1}
          >
            <BarChart data={currentData.revenueData}>
              <Bar
                dataKey="value"
                fill={revStatus.barColor}
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Info: (20260118 - Luphia) 3. Expenditure Analysis (New Card) */}
      <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="z-10 flex items-start justify-between">
          <div className="flex flex-col">
            <p className="text-xs font-medium tracking-wider text-gray-500 uppercase">
              {t("dashboard.expenditure_analysis")}
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-2xl font-bold text-gray-900">
                $
                {MoneyUtil.formatDynamic(
                  currentData.metrics.expenditureCurrent,
                  0,
                )}
              </p>
              <span className="text-xs text-gray-400">
                / $
                {MoneyUtil.formatDynamic(
                  currentData.metrics.expenditureBudget,
                  0,
                )}
              </span>
            </div>
            <p
              className={`mt-1 text-xs font-medium ${currentData.metrics.expenditureTrendVal <= 0 ? "text-emerald-600" : "text-red-600"}`}
            >
              {currentData.metrics.expenditureTrend}{" "}
              <span className="font-normal text-gray-400">
                {t("dashboard.vs_previous_period")}
              </span>
            </p>
          </div>

          {/* Info: (20260118 - Luphia) Status Badge */}
          <div
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${expStatus.bg} ${expStatus.color} border border-transparent whitespace-nowrap shadow-sm`}
          >
            <ExpIcon className="h-4 w-4 shrink-0" />
            <span className="text-xs font-bold">
              {t(`dashboard.expenditure_status.${expStatus.key}`)}
            </span>
          </div>
        </div>

        <div className="z-10 mt-4 flex items-end justify-between">
          <p className={`text-sm font-bold ${expStatus.color}`}>
            {currentData.metrics.expenditureRate.toFixed(1)}%
          </p>
        </div>

        {/* Info: (20260118 - Luphia) Background Chart */}
        <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-20 opacity-10">
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={1}
            minHeight={1}
          >
            <BarChart data={currentData.expenditureData}>
              <Bar
                dataKey="value"
                fill={expStatus.barColor}
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
