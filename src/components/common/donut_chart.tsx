'use client';

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useTranslation } from '@/i18n/i18n_context';

export interface IDonutChartData {
  name: string;
  value: number;
}

export interface IDonutChartProps {
  title: string;
  data: IDonutChartData[];
  colors?: string[];
}

// Info: (20260418 - Tzuhan) Vibrant premium palette referencing the mockups
const DEFAULT_COLORS = ['#FF9800', '#152C5B', '#4F46E5', '#10B981', '#EC4899', '#8B5CF6'];

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

const CustomTooltip = ({ active = false, payload = [] }: ICustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100/50">
        <p className="text-sm font-semibold text-gray-800">{payload[0].name}</p>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Intl.NumberFormat('en-US').format(Number(payload[0].value))} ({
            payload[0].payload.percent ?? 0
          }%)
        </p>
      </div>
    );
  }
  return null;
};

export const DonutChart: React.FC<IDonutChartProps> = ({ title, data, colors = DEFAULT_COLORS }) => {
  const { t } = useTranslation();
  // Info: (20260418 - Tzuhan) Calculate total to determine percentages for the custom center text
  const total = useMemo(() => data.reduce((acc, current) => acc + current.value, 0), [data]);

  // Info: (20260418 - Tzuhan) Parse data for percentages
  const enrichedData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      percent: total > 0 ? Math.round((item.value / total) * 100) : 0,
    }));
  }, [data, total]);

  // Info: (20260418 - Tzuhan) Find the largest slice for the center emphasis
  const primaryItem = useMemo(() => {
    if (enrichedData.length === 0) return { name: '', percent: 0 };
    return enrichedData.reduce((prev, current) => (prev.value > current.value ? prev : current));
  }, [enrichedData]);

  // Info: (20260418 - Tzuhan) Truncate name for center label
  const getShortName = (name: string) => {
    // Info: (20260418 - Tzuhan) If it has spaces, maybe take first word, or just substring
    if (name.length > 5) return name.substring(0, 4) + '..';
    return name;
  };

  return (
    <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-gray-100/60 p-6 my-6 w-full transition-all duration-300 hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] ring-1 ring-black/5 flex flex-col md:flex-row items-center gap-8 break-inside-avoid print:break-inside-avoid">
      {/* Info: (20260418 - Tzuhan) Chart Section */}
      <div className="w-full md:w-1/3 flex flex-col items-center justify-center min-w-[220px]">
        {title && (
          <h3 className="text-[17px] font-bold text-gray-800 mb-6 w-full text-left md:text-center flex items-center gap-2">
            <span className="text-orange-500">📊</span> {title}
          </h3>
        )}
        <div className="relative w-[200px] h-[200px] flex-shrink-0 mx-auto">
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
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} className="drop-shadow-sm outline-none hover:opacity-90 transition-opacity" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
          {/* Info: (20260418 - Tzuhan) Custom Center UI */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-black text-[#0B1F45] tracking-tight leading-none">
              {primaryItem.percent}%
            </span>
            <span className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wider">
              {getShortName(primaryItem.name)}
            </span>
          </div>
        </div>
      </div>

      {/* Info: (20260418 - Tzuhan) Legend & Details Section */}
      <div className="w-full md:w-2/3 flex flex-col justify-center border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 md:pl-10 min-w-0">
        <div className="space-y-4">
          {enrichedData.map((item, index) => (
            <div key={index} className="flex items-center group min-w-0">
              <div
                className="w-4 h-4 rounded-full mr-4 flex-shrink-0 shadow-sm transition-transform group-hover:scale-110 duration-200"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <div className="flex-1 flex justify-between items-baseline gap-4 min-w-0">
                <span className="text-gray-700 font-semibold text-sm leading-tight group-hover:text-gray-900 transition-colors truncate">
                  {item.name}
                </span>
                <div className="flex items-baseline gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-400">
                    {new Intl.NumberFormat('en-US').format(item.value)}
                  </span>
                  <span className="font-bold text-gray-700 text-sm">
                    {item.percent}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 pt-4 border-t border-gray-50 min-w-0">
          <p className="text-xs text-gray-400 font-medium leading-relaxed break-words whitespace-normal break-all md:break-words">
            {t("common.donut_chart.note", { title })}
          </p>
        </div>
      </div>
    </div>
  );
};
