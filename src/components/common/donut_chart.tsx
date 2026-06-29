"use client";

import React, { useMemo, useRef } from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { useTranslation } from "@/i18n/i18n_context";
import { Download, Sparkles } from "lucide-react";
import { useChartExport } from "@/hooks/use_chart_export";

export interface IDonutChartData {
  name: string;
  value: number;
}

export interface IDonutChartProps {
  title: string;
  data: IDonutChartData[];
  colors?: string[];
  onSparklesClick?: () => void;
}

// Info: (20260418 - Tzuhan) Vibrant premium palette referencing the mockups
export const DEFAULT_COLORS = [
  "#FF9800",
  "#152C5B",
  "#4F46E5",
  "#10B981",
  "#EC4899",
  "#8B5CF6",
];

interface ICustomTooltipPayload {
  name: string;
  value: number | string;
  payload: {
    percent?: number;
    [key: string]: unknown;
  };
}

interface ICustomTooltipProps {
  active?: boolean;
  payload?: ICustomTooltipPayload[];
}

const CustomTooltip = ({
  active = false,
  payload = [],
}: ICustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="z-100 rounded-xl border border-gray-100/50 bg-white/95 p-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-sm">
        <p className="text-sm font-semibold text-gray-800">{payload[0].name}</p>
        <p className="mt-0.5 text-sm text-gray-500">
          {new Intl.NumberFormat("en-US").format(Number(payload[0].value))} %
        </p>
      </div>
    );
  }
  return null;
};

export const DonutChart: React.FC<IDonutChartProps> = ({
  title,
  data,
  colors = DEFAULT_COLORS,
  onSparklesClick = undefined,
}) => {
  const { t } = useTranslation();
  const chartRef = useRef<HTMLDivElement>(null);

  // Info: (20260615 - Julian) 使用共享 Hook 管理 DonutChart 匯出
  const { exportPng, exportSvg } = useChartExport(
    () => chartRef.current,
    "donut-chart",
  );
  // Info: (20260418 - Tzuhan) Calculate total to determine percentages for the custom center text
  const total = useMemo(
    () => data.reduce((acc, current) => acc + current.value, 0),
    [data],
  );

  // Info: (20260418 - Tzuhan) Parse data for percentages
  const enrichedData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      percent: total > 0 ? Math.round((item.value / total) * 100) : 0,
    }));
  }, [data, total]);

  // Info: (20260418 - Tzuhan) Find the largest slice for the center emphasis
  const primaryItem = useMemo(() => {
    if (enrichedData.length === 0) return { name: "", percent: 0 };
    return enrichedData.reduce((prev, current) =>
      prev.value > current.value ? prev : current,
    );
  }, [enrichedData]);

  // Info: (20260418 - Tzuhan) Truncate name for center label
  const getShortName = (name: string) => {
    // Info: (20260418 - Tzuhan) If it has spaces, maybe take first word, or just substring
    if (name.length > 5) return name.substring(0, 4) + "..";
    return name;
  };

  return (
    <div
      ref={chartRef}
      className="group/donut relative my-6 flex w-full break-inside-avoid flex-col items-center gap-8 rounded-2xl border border-gray-100/60 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] ring-1 ring-black/5 transition-all duration-300 hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] md:flex-row print:break-inside-avoid"
    >
      {/* Info: (20260615 - Julian) 下載 toolbar */}
      {onSparklesClick && (
        <div className="export-exclude absolute top-4 right-4 z-10 hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white/95 px-1.5 py-1.5 shadow-sm transition-opacity duration-200 group-hover/donut:flex print:hidden">
          <button
            type="button"
            onClick={onSparklesClick}
            className="shrink-0 cursor-pointer rounded-md p-1 text-blue-600 transition-colors duration-150 hover:bg-slate-100"
            title="AI 智慧編輯 (AI Chart Editor)"
          >
            <Sparkles size={15} />
          </button>
          <div className="group/download relative shrink-0">
            <button
              type="button"
              className="shrink-0 cursor-pointer rounded-md p-1 text-orange-600 transition-colors duration-150 hover:bg-slate-100"
              title={t("chart.mermaid.download")!}
            >
              <Download size={15} />
            </button>
            <div className="absolute top-full right-0 z-20 hidden w-20 flex-col pt-1 group-hover/download:flex">
              <div className="flex flex-col rounded-md border border-slate-200 bg-white py-1 shadow-md">
                <button
                  type="button"
                  onClick={exportPng}
                  className="w-full px-2.5 py-1.5 text-left text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800"
                >
                  {t("chart.mermaid.export_png")}
                </button>
                <button
                  type="button"
                  onClick={exportSvg}
                  className="w-full px-2.5 py-1.5 text-left text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800"
                >
                  {t("chart.mermaid.export_svg")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info: (20260418 - Tzuhan) Chart Section */}
      <div className="flex w-full min-w-[220px] flex-col items-center justify-center md:w-1/3">
        {title && (
          <h3 className="mb-6 flex w-full items-center gap-2 text-left text-[17px] font-bold text-gray-800 md:text-center">
            <span className="text-orange-500">📊</span> {title}
          </h3>
        )}
        <div className="relative mx-auto h-[200px] w-[200px] shrink-0">
          {/* Info: (20260418 - Tzuhan) Custom Center UI */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl leading-none font-black tracking-tight text-[#0B1F45]">
              {primaryItem.percent}%
            </span>
            <span className="mt-1 text-xs font-semibold tracking-wider text-gray-500 uppercase">
              {getShortName(primaryItem.name)}
            </span>
          </div>
          <PieChart width={200} height={200}>
            <Pie
              data={enrichedData}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={90}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
            >
              {enrichedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                  className="drop-shadow-sm transition-opacity outline-none hover:opacity-90"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </div>
      </div>

      {/* Info: (20260418 - Tzuhan) Legend & Details Section */}
      <div className="flex w-full min-w-0 flex-col justify-center border-t border-gray-100 pt-6 md:w-2/3 md:border-t-0 md:border-l md:pt-0 md:pl-10">
        <div className="space-y-4">
          {enrichedData.map((item, index) => (
            <div key={index} className="group flex min-w-0 items-center">
              <div
                className="mr-4 h-4 w-4 shrink-0 rounded-full shadow-sm transition-transform duration-200 group-hover:scale-110"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <div className="flex min-w-0 flex-1 items-baseline justify-between gap-4">
                <span className="truncate text-sm leading-tight font-semibold text-gray-700 transition-colors group-hover:text-gray-900">
                  {item.name}
                </span>
                <div className="flex shrink-0 items-baseline gap-2">
                  <span className="text-sm font-bold text-gray-700">
                    {item.percent}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 min-w-0 border-t border-gray-50 pt-4">
          <p className="text-xs leading-relaxed font-medium wrap-break-word break-all whitespace-normal text-gray-400 md:wrap-break-word">
            {t("chart.donut_chart.note", { title })}
          </p>
        </div>
      </div>
    </div>
  );
};
