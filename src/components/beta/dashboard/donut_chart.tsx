import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, type ChartData } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface DonutChartProps {
  percentageForMissingCertificate: number;
  percentageForUnpostedVouchers: number;
  isChartForTotal: boolean;
}

const DonutChart = ({
  percentageForMissingCertificate,
  percentageForUnpostedVouchers,
  isChartForTotal,
}: DonutChartProps) => {
  const backgroundColorSwitch = isChartForTotal ? ['#FD853A', '#6CDEA0'] : ['#BDF0D5', '#EBE9FE'];

  const data: ChartData<'doughnut', number[], string> = {
    labels: ['Missing certificate', 'Unposted vouchers'],
    datasets: [
      {
        data: [percentageForMissingCertificate, percentageForUnpostedVouchers],
        backgroundColor: backgroundColorSwitch, // Info: (20241017 - Liz) 區塊顏色依照順序設定
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="h-120px w-120px tablet:w-100px screen1280:w-180px">
      <Doughnut
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false, // Info: (20250519 - Liz) 讓圖表填滿容器
          plugins: {
            legend: {
              display: false, // Info: (20241018 - Liz) Disable the default legend
            },
            tooltip: {
              // Info: (20241018 - Liz) 可以設定 tooltip 的顯示內容或者關閉
              // enabled: false,
            },
          },
          cutout: '20%', // Info: (20241018 - Liz) This creates the donut hole
        }}
      />
    </div>
  );
};

export default DonutChart;
