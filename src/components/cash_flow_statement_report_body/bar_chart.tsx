import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface BarChartProps {
  data: number[];
  labels: string[];
}

const BarChart: React.FC<BarChartProps> = ({ data, labels }) => {
  const [chartData, setChartData] = useState<ChartData<'bar'>>({
    labels: [],
    datasets: [],
  });
  const [chartOptions, setChartOptions] = useState<ChartOptions<'bar'>>({});

  useEffect(() => {
    setChartData({
      labels,
      datasets: [
        {
          backgroundColor: '#FFA502B2',
          borderColor: '#FFA502B2',
          data,
          barThickness: 20,
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
        y: {
          suggestedMax: 100,
          grid: {
            color: 'rgba(0,0,0,0.1)',
          },
          ticks: {
            color: '#919EB4',
            stepSize: 25,
            font: {
              size: 12,
            },
          },
        },
        x: {
          grid: {
            color: 'rgba(0,0,0,0.1)',
          },
          ticks: {
            color: '#304872',
            callback: (value, index) => labels[index].split(' '),
            maxRotation: 0,
            minRotation: 0,
            autoSkip: false,
            font: {
              size: 12,
              weight: 500,
            },
          },
        },
      },
      layout: {
        padding: {
          top: 30,
          bottom: 30,
        },
      },
    });
  }, [data, labels]);

  return <Bar data={chartData} options={chartOptions} height={300} />;
};

export default BarChart;
