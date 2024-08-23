import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';
import Image from 'next/image';
import { useGlobalCtx } from '@/contexts/global_context';
import { LayoutAssertion } from '@/interfaces/layout_assertion';
import { useTranslation } from 'next-i18next';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

// ToDo: (20240612 - Julian) [Beta] data format
const data = {
  categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  seriesData: [
    [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200],
    [200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300],
  ],
};

const ProjectMonthlySalesBlock = () => {
  const { t: translate } = useTranslation('common');
  const { layoutAssertion } = useGlobalCtx();

  const options: ApexOptions = {
    chart: {
      id: 'project-monthly-sales-chart',
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
      events: {
        click: undefined,
      },
    },

    plotOptions: {
      bar: {
        horizontal: layoutAssertion === LayoutAssertion.MOBILE,
        columnWidth: '55%',
        borderRadius: 3,
      },
    },

    dataLabels: {
      enabled: false,
    },

    stroke: {
      show: true,
      width: layoutAssertion === LayoutAssertion.MOBILE ? 5 : 2,
      colors: ['transparent'], // Info: (20240419 - Shirley) 讓每一個欄位裡面的 column 有空隙的方式
    },

    colors: ['#ffa50266', '#FFB632'],

    xaxis: {
      categories: data.categories,
      labels: {
        style: {
          colors: '#7F8A9D',
          fontFamily: 'Barlow',
          fontSize: '12px',
          fontWeight: 500,
        },
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },

    yaxis: {
      show: layoutAssertion === LayoutAssertion.MOBILE,
    },

    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'left',
      fontFamily: 'Barlow',
      fontSize: '16px',
      fontWeight: 500,
      markers: {
        fillColors: ['#ffa50266', '#FFB632'],
        // width: 8, // 標記的寬度 // Info: (20240706 - Luphia)
        // height: 8, // 標記的高度 // Info: (20240706 - Luphia)
        // radius: 4, // 標記的半徑（如果是圓形）// Info: (20240722 - Shirley)
      },
    },

    grid: {
      show: false,
    },

    fill: {
      opacity: 1,
    },

    tooltip: {
      style: {
        fontFamily: 'Barlow',
        fontSize: '12px',
      },
      marker: {
        show: true,
      },

      shared: true,
      followCursor: false,
      intersect: false,
      inverseOrder: true,
      // Info: (20240622 - Julian)
      // custom: function t({ series, seriesIndex, dataPointIndex, w }) {
      //   const currentYear = series[1][dataPointIndex];
      //   const passYear = series[0][dataPointIndex];
      //   return `<div class="flex items-center gap-10px">
      //               <div class="flex items-center flex-col">
      //                   <p class="text-16px font-medium text-text-neutral-primary">$ ${currentYear} K</p>
      //               </div>
      //               <div class="flex items-center flex-col">
      //                   <p class="text-16px font-medium text-text-neutral-primary">$ ${passYear} K</p>
      //               </div>
      //           </div>`;
      // },
      hideEmptySeries: true,
      fillSeriesColor: false,

      y: {
        formatter: function t(val: number) {
          return val + ' K';
        },
      },
    },
  };

  const series = [
    {
      // name: 'Pass Year', // Info: (20240715 - Anna)
      name: translate('DASHBOARD.PASS_YEAR'),
      data: data.seriesData[0],
    },
    {
      // name: 'Current Year', // Info: (20240715 - Anna)
      name: translate('DASHBOARD.CURRENT_YEAR'),
      data: data.seriesData[1],
    },
  ];

  return (
    <div className="flex flex-col items-center gap-30px rounded-lg bg-surface-neutral-surface-lv2 px-16px py-20px md:items-stretch md:px-40px">
      {/* Info: (20240614 - Julian) Title */}
      <div className="flex gap-8px font-medium text-text-neutral-secondary">
        <Image src="/icons/shopping.svg" width={24} height={24} alt="shopping_icon" />
        <p>{translate('PROJECT.MONTHLY_SALES')}</p>
      </div>
      {/* Info: (20240614 - Julian) Chart */}
      <Chart options={options} series={series} type="bar" height={400} />
    </div>
  );
};

export default ProjectMonthlySalesBlock;
