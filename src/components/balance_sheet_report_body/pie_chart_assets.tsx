import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { ApexOptions } from 'apexcharts'; // Info: (20240726 - Anna) 導入 ApexOptions 類型

// Info: (20240726 - Anna) 動態導入 ApexCharts，以避免在服務器端渲染時執行
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface PieChartProps {
  data: number[];
  labels: string[];
  colors: string[];
}

const PieChartAssets: React.FC<PieChartProps> = ({ data, labels, colors }) => {
  const [chartOptions, setChartOptions] = useState<ApexOptions | null>(null); // Info: (20240726 - Anna) 使用 ApexOptions 類型
  const [chartSeries, setChartSeries] = useState<number[]>([]);

  useEffect(() => {
    setChartOptions({
      labels,
      colors,
      legend: {
        show: false,
      },
      dataLabels: {
        enabled: true,
        formatter(val: number) {
          return Math.round(val) + '%';
        },
        style: {
          fontSize: '14px',
          fontWeight: 'bold',
          colors: ['white'],
        },
        dropShadow: {
          enabled: false,
        },
        offsetX: 0, // Info: (20240726 - Anna) 調整 X 偏移
        offsetY: 0, // Info: (20240726 - Anna) 調整 Y 偏移以使標籤更靠近中心
      },
      plotOptions: {
        pie: {
          dataLabels: {
            offset: 0, // Info: (20240726 - Anna) 將資料標籤移近中心
            minAngleToShowLabel: 10,
          },
        },
      },
    });
    setChartSeries(data);
  }, [data, labels, colors]);

  if (!chartOptions) return null;

  return <Chart options={chartOptions} series={chartSeries} type="pie" width="300" />;
};

export default PieChartAssets;
