"use client";

import { FC } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import DashboardChartCard from "@/components/hr_management/dashboard/dashboard_chart_card";
import { useChartPalette } from "@/hooks/use_chart_palette";
import { ITrendPoint } from "@/interfaces/hr_management";
import { useTranslation } from "@/i18n/i18n_context";

interface IDashboardTrendChartProps {
  data: ITrendPoint[];
}

/**
 * Info: (20260810 - Julian) 近 12 個月的新進與離職。
 *
 * X 軸只顯示月份數字（1–12）：12 個「2026-08」在這個寬度會互相重疊而被
 * recharts 自動抽掉一半，變成刻度時有時無；年份改由 tooltip 補完。
 */
const DashboardTrendChart: FC<IDashboardTrendChartProps> = ({ data }) => {
  const { t } = useTranslation();
  // Info: (20260810 - Julian) 數列色沿用專案的 series1 / series2，不另立一組
  const palette = useChartPalette();

  return (
    <DashboardChartCard
      icon={TrendingUp}
      title={t("hr_management.dashboard.chart_trend")}
      hint={t("hr_management.dashboard.chart_trend_hint")}
    >
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
          >
            <CartesianGrid
              stroke={palette.grid}
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tickFormatter={(month: string) => String(Number(month.slice(5)))}
              tick={{ fill: palette.label, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: palette.grid }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: palette.label, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "0.75rem",
                border: `1px solid ${palette.grid}`,
                fontSize: "0.75rem",
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              height={24}
              iconType="plainline"
              wrapperStyle={{ fontSize: "0.75rem" }}
            />
            <Line
              type="monotone"
              dataKey="hired"
              name={t("hr_management.dashboard.chart_trend_hired")}
              stroke={palette.series2}
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="resigned"
              name={t("hr_management.dashboard.chart_trend_resigned")}
              stroke={palette.series1}
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </DashboardChartCard>
  );
};

export default DashboardTrendChart;
