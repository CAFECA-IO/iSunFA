"use client";

import { FC, useMemo } from "react";
import { PieChart as PieChartIcon } from "lucide-react";
import DashboardChartCard from "@/components/hr_management/dashboard/dashboard_chart_card";
import { DonutCanvas } from "@/components/common/donut_canvas";
import { DonutLegend } from "@/components/common/donut_legend";
import { buildCategoricalColors } from "@/constants/chart_palette";
import { useChartPalette } from "@/hooks/use_chart_palette";
import { IDistributionPoint } from "@/interfaces/hr_management";
import { useTranslation } from "@/i18n/i18n_context";

interface IDashboardDepartmentPieProps {
  data: IDistributionPoint[];
}

// Info: (20260810 - Julian) 卡片寬度容不下報表用的 200px 圓環，縮到 176px
const DONUT_SIZE = 176;
const DONUT_INNER_RADIUS = 46;
const DONUT_OUTER_RADIUS = 72;

// Info: (20260810 - Julian) 部門人數分布。
const DashboardDepartmentPie: FC<IDashboardDepartmentPieProps> = ({ data }) => {
  const { t } = useTranslation();

  const palette = useChartPalette();
  const colors = useMemo(
    () => buildCategoricalColors(palette.categorical1),
    [palette.categorical1],
  );

  const total = useMemo(
    () => data.reduce((sum, item) => sum + item.value, 0),
    [data],
  );

  const items = useMemo(
    () =>
      data.map((item) => ({
        name: item.label,
        value: item.value,
        percent: total > 0 ? Math.round((item.value / total) * 100) : 0,
      })),
    [data, total],
  );

  return (
    <DashboardChartCard
      icon={PieChartIcon}
      title={t("hr_management.dashboard.chart_department")}
    >
      <DonutCanvas
        data={items}
        colors={colors}
        size={DONUT_SIZE}
        innerRadius={DONUT_INNER_RADIUS}
        outerRadius={DONUT_OUTER_RADIUS}
        paddingAngle={3}
        showCenterLabel={false}
        valueSuffix={` ${t("hr_management.value.headcount_unit")}`}
      />

      <div className="mt-2">
        <DonutLegend items={items} colors={colors} dense showValue />
      </div>
    </DashboardChartCard>
  );
};

export default DashboardDepartmentPie;
