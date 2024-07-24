// pie_chart.tsx
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts'; // 导入 ApexOptions 类型

// 动态导入 ApexCharts，以避免在服务器端渲染时执行
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface PieChartProps {
  data: number[];
}

const PieChart: React.FC<PieChartProps> = ({ data }) => {
  const [chartOptions, setChartOptions] = useState<ApexOptions | null>(null); // 使用 ApexOptions 类型
  const [chartSeries, setChartSeries] = useState<number[]>([]);

  useEffect(() => {
    setChartOptions({
      labels: ['資產', '負債', '權益'],
      colors: ['#FD6F8E', '#53B1FD', '#9B8AFB'],
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
        offsetX: 0, // Adjust the X offset
        offsetY: 0, // Adjust the Y offset to move labels closer to the center
      },
      plotOptions: {
        pie: {
          dataLabels: {
            offset: -20, // Move the data labels closer to the center
            minAngleToShowLabel: 10,
          },
        },
      },
    });
    setChartSeries(data);
  }, [data]);

  if (!chartOptions) return null;

  return <Chart options={chartOptions} series={chartSeries} type="pie" width="300" />;
};

export default PieChart;
