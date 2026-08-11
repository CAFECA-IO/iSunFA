"use client";

import { FC, useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import DashboardChartCard from "@/components/hr_management/dashboard/dashboard_chart_card";
import { HistogramCanvas } from "@/components/chart/histogram_canvas";
import {
  STRUCTURE_DIMENSION_I18N_KEY,
  STRUCTURE_DIMENSIONS,
  StructureDimension,
} from "@/constants/hr_management";
import { IDistributionPoint } from "@/interfaces/hr_management";
import { useTranslation } from "@/i18n/i18n_context";

interface IDashboardStructureChartProps {
  tenure: IDistributionPoint[];
  age: IDistributionPoint[];
}

const CARD_LAYOUT = {
  viewWidth: 440,
  viewHeight: 250,
  marginTop: 26,
  marginRight: 8,
  marginBottom: 34,
  marginLeft: 34,
  tickCount: 4,
};

// Info: (20260810 - Julian) 年資與年齡結構。兩個維度共用同一張圖、用切換鈕換資料，而不是並排兩張。
const DashboardStructureChart: FC<IDashboardStructureChartProps> = ({
  tenure,
  age,
}) => {
  const { t } = useTranslation();
  const [dimension, setDimension] = useState<StructureDimension>(
    StructureDimension.TENURE,
  );

  const bins = useMemo(() => {
    const source = dimension === StructureDimension.TENURE ? tenure : age;
    return source.map((point) => ({ label: point.label, count: point.value }));
  }, [dimension, tenure, age]);

  return (
    <DashboardChartCard
      icon={BarChart3}
      title={t("hr_management.dashboard.chart_structure")}
      action={
        <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5">
          {STRUCTURE_DIMENSIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setDimension(item)}
              aria-pressed={dimension === item}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                dimension === item
                  ? "bg-white text-orange-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t(STRUCTURE_DIMENSION_I18N_KEY[item])}
            </button>
          ))}
        </div>
      }
    >
      <div className="h-56 w-full">
        <HistogramCanvas bins={bins} {...CARD_LAYOUT} />
      </div>
    </DashboardChartCard>
  );
};

export default DashboardStructureChart;
