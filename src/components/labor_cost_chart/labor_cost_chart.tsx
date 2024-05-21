import React from 'react';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';
import Tooltip from '@/components/tooltip/tooltip';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface PieChartData {
  categories: string[];
  series: number[];
}

interface PieChartProps {
  data: PieChartData;
}

const PieChart = ({ data }: PieChartProps) => {
  const options: ApexOptions = {
    series: data.series, // 210
    chart: {
      id: 'labor-cost-chart',
      width: 500,
      type: 'pie',
    },
    colors: ['#9B8AFB', '#FD853A', '#FD6F8E', '#8098F9', '#6CDEA0', '#F670C7'],
    labels: data.categories,
    legend: {
      position: 'left',
      offsetY: 50,
      markers: {
        width: 20, // 標記的寬度
        height: 12, // 標記的高度
        radius: 0, // 標記的半徑（如果是圓形）
      },
      // width: 200,
    },

    // responsive: [
    //   {
    //     breakpoint: 480,
    //     options: {
    //       chart: {
    //         width: 200,
    //       },
    //       legend: {
    //         position: 'bottom',
    //       },
    //     },
    //   },
    // ],
  };

  return <Chart options={options} series={options.series} type="pie" width={400} />;
};

const LaborCostChart = () => {
  const data = {
    categories: [
      'Team A',
      'Team B',
      'Team C',
      'Team D',
      'Team E',
      'Team F',
      'Team G',
      'Team H',
      'Team I',
      'Team J',
      'Team K',
      'Team L',
      'Team M',
      'Team N',
      'Team O',
      'Team P',
      'Team Q',
      'Team R',
      'Team S',
      'Team T',
      'Team U',
      'Team V',
      'Team W',
      'Team X',
      'Team Y',
      'Team Z',
    ],
    series: [
      10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200,
      210, 220, 230, 240, 250, 260,
    ], // 210
  };

  const displayedDataSection = (
    <div className="dashboardCardShadow flex h-450px flex-col rounded-2xl bg-white px-5 pb-9 pt-5 max-md:max-w-full md:h-400px">
      <div>
        <div className="flex w-full justify-between gap-2 border-b border-stroke-neutral-secondary pb-2 text-base leading-8 text-text-neutral-secondary max-md:max-w-full max-md:flex-wrap">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  fill="#FFA502"
                  d="M12 14.553A11.983 11.983 0 00.59 22.877a.857.857 0 00.815 1.12h21.189a.857.857 0 00.816-1.12A11.982 11.982 0 0012 14.553z"
                ></path>
                <path
                  fill="#002462"
                  d="M12 .004a8.109 8.109 0 100 16.217A8.109 8.109 0 0012 .004z"
                ></path>
                <path
                  fill="#FFA502"
                  fillRule="evenodd"
                  d="M4.282 5.666a8.115 8.115 0 0115.683.96.857.857 0 01-.836 1.02h-.054a7.905 7.905 0 01-5.299-2.03 7.905 7.905 0 01-5.298 2.03 7.9 7.9 0 01-3.791-.963.857.857 0 01-.405-1.017zm4.864 3.927a1.071 1.071 0 011.44.47c.156.307.653.622 1.414.622.761 0 1.258-.315 1.414-.622a1.071 1.071 0 111.91.97c-.663 1.305-2.125 1.795-3.324 1.795-1.198 0-2.66-.49-3.324-1.794a1.071 1.071 0 01.47-1.441z"
                  clipRule="evenodd"
                ></path>
              </svg>
              <p>Labor cost</p>
            </div>
          </div>

          <div className="justify-end">
            <Tooltip>
              <p>
                A message which appears when a cursor is positioned over an icon, image, hyperlink,
                or other element in a graphical user interface.
              </p>
            </Tooltip>
          </div>
        </div>
      </div>

      <div className="mt-2">
        <div className="flex flex-col justify-between max-md:space-y-2 md:mx-2 md:flex-row">
          <div className="my-auto text-xl font-bold leading-8 text-text-brand-primary-lv2">
            2024
          </div>
          <div className="flex space-x-2 md:space-x-5">
            <div className=""></div>
            <div className=""></div>
            <div className=""></div>
          </div>
        </div>
        <div className="relative">
          {' '}
          <div className="absolute top-5 font-semibold text-text-brand-secondary-lv1">
            Onboarding Projects
          </div>
          <div className="flex max-md:-ml-3">
            <PieChart data={data} />
          </div>
        </div>
      </div>
    </div>
  );
  return <div>{displayedDataSection}</div>;
};

export default LaborCostChart;
