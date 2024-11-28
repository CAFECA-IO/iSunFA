import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, type ChartData } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface DonutChartProps {
  percentageForMissingCertificate: number;
  percentageForUnpostedVouchers: number;
  percentageForUnarchivedCustomerData: number;
  isChartForTotal: boolean;
}

const DonutChart = ({
  percentageForMissingCertificate,
  percentageForUnpostedVouchers,
  percentageForUnarchivedCustomerData,
  isChartForTotal,
}: DonutChartProps) => {
  const backgroundColorSwitch = isChartForTotal
    ? ['#FD853A', '#6CDEA0', '#9B8AFB']
    : ['#BDF0D5', '#EBE9FE', '#FFEAD5'];

  const data: ChartData<'doughnut', number[], string> = {
    labels: ['Missing certificate', 'Unposted vouchers', 'Unarchived customer data'],
    datasets: [
      {
        data: [
          percentageForMissingCertificate,
          percentageForUnpostedVouchers,
          percentageForUnarchivedCustomerData,
        ],
        backgroundColor: backgroundColorSwitch, // Info: (20241017 - Liz) 區塊顏色依照順序設定
        borderWidth: 0,
      },
    ],
  };

  return (
    <Doughnut
      data={data}
      options={{
        responsive: true,
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
  );
};

export default DonutChart;
