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
import { ChartData, ChartOptions } from 'chart.js';

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

  return <Line data={chartData} options={chartOptions} />;
};

export default LineChart;
