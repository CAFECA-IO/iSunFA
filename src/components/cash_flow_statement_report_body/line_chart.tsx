import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface LineChartProps {
  data: number[];
  labels: string[];
}

const LineChart: React.FC<LineChartProps> = ({ data, labels }) => {
  const [chartData, setChartData] = useState<ChartData<'line'>>({
    labels: [],
    datasets: [],
  });
  const [chartOptions, setChartOptions] = useState<ChartOptions<'line'>>({});

  useEffect(() => {
    setChartData({
      labels,
      datasets: [
        {
          label: 'A和B比例關係',
          data,
          fill: false,
          backgroundColor: '#002462',
          borderColor: '#FFA502',
          pointBackgroundColor: '#002462',
          pointBorderWidth: 0,
          pointRadius: 4,
          borderWidth: 2,
        },
      ],
    });

    setChartOptions({
      responsive: true, // Info: (20250520 - Anna) 讓圖表根據外層容器的寬度動態縮放
      maintainAspectRatio: false, // Info: (20250520 - Anna) 允許定義高度
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          grid: {
            display: true,
            color: 'rgba(0,0,0,0.1)',
          },
          ticks: {
            color: '#919EB4',
          },
        },
        y: {
          grid: {
            display: true,
            color: 'rgba(0,0,0,0.1)',
          },
          ticks: {
            color: '#919EB4',
          },
        },
      },
    });
  }, [data, labels]);

  return (
    <div className="w-full">
      <Line data={chartData} options={chartOptions} />
    </div>
  );
};

export default LineChart;
