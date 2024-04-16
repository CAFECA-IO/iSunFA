/* eslint-disable */
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';
import React from 'react';
import Tooltip from '../tooltip/tooltip';
import { Button } from '../button/button';
import { cn } from '../../lib/utils/common';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface LineChartData {
  categories: string[];
  series: {
    name: string;
    data: number[];
  }[];
}

interface LineChartProps {
  data: LineChartData;
}

const LineChart: React.FC<LineChartProps> = ({ data }) => {
  const options: ApexOptions = {
    chart: {
      id: 'profit-trend-chart',
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
    },
    xaxis: {
      categories: data.categories,
      tooltip: {
        enabled: false,
      },
      labels: {
        style: {
          colors: '#919EB4',
          fontFamily: 'Barlow',
          fontSize: '12px',
        },
        // formatter: value => `${value}%`,
      },
    },
    yaxis: {
      min: -15, // Adjust according to your data range
      max: 65, // Adjust according to your data range
      forceNiceScale: false, // Turn off nice scale to use exact min/max values
      labels: {
        style: {
          colors: '#919EB4',
          fontFamily: 'Barlow',
          fontSize: '12px',
        },
        // formatter: value => `${value}%`,
      },
    },

    markers: {
      size: 4,
      colors: ['#002462'],
    },
    stroke: {
      curve: 'straight',
      colors: ['#FFA502'],
      width: 2,
    },
    grid: {
      show: true,
      yaxis: {
        lines: {
          show: true,
        },
      },
      xaxis: {
        lines: {
          show: true,
        },
      },
      padding: {
        // left: 50,
        // right: 50,
      },
    },
    // title: {
    //   text: 'Profit Status',
    //   align: 'left',
    //   style: {
    //     fontSize: '16px',
    //     color: '#002462',
    //     fontFamily: 'Barlow',
    //     fontWeight: 600,
    //   },
    // },
    // subtitle: {
    //   text: 'Profit Status Trend',
    //   align: 'left',
    //   style: {
    //     fontSize: '12px',
    //     color: '#919EB4',
    //     fontFamily: 'Barlow',
    //   },
    // },

    series: data.series,

    tooltip: {
      enabled: true,
      onDatasetHover: {
        highlightDataSeries: false,
      },
      x: {
        show: false, // Info: 在 hover 產生的 tooltip box 中，是否顯示 x 軸的值 (20240416 - Shirley)
        format: 'dd MMM',
        // formatter: value => `${value}`,
      },
      y: {
        formatter: value => `${value}%`,
      },
      marker: {
        show: false,
      },
    },
  };

  return <Chart options={options} series={data.series} type="line" width={580} height={250} />;
};

enum Period {
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

// Dummy data definitions
const dataMap = {
  week: {
    categories: ['4/1', '4/2', '4/3', '4/4', '4/5', '4/6', '4/7'],
    series: [
      {
        name: 'profit status',
        data: [-10, -5, 40, 35, 0, 49, 60],
      },
    ],
  },
  month: {
    categories: [
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
      'Jan',
      'Feb',
      'Mar',
      'Apr',
    ],
    series: [
      {
        name: 'profit status',
        data: [10, 5, -10, 15, 5, 19, 8, 10, 5, 40, 35, 60],
      },
    ],
  },
  year: {
    categories: ['2020', '2021', '2022', '2023', '2024'],
    series: [
      {
        name: 'profit status',
        data: [-10, -5, 40, 35, 20],
      },
    ],
  },
};

const ProfitTrendChart = () => {
  const [selectedPeriod, setSelectedPeriod] = React.useState<Period>(Period.WEEK);
  const [data, setData] = React.useState(dataMap[selectedPeriod]);

  const handlePeriodChange = (period: Period) => {
    setSelectedPeriod(period);
    setData(dataMap[period]);
  };

  const WEEKDAYS = ['4/1', '4/2', '4/3', '4/4', '4/5', '4/6', '4/7'];

  const dummyWeekData = {
    // categories: Array.from({ length: 7 }, (_, i) => `Day ${i + 1}`),
    categories: WEEKDAYS,
    series: [
      {
        name: 'profit status',
        data: [-10, -5, 40, 35, 0, 49, 60],
      },
    ],
  };

  const MONTHS = [
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
    'Jan',
    'Feb',
    'Mar',
    'Apr',
  ];

  const dummyMonthData = {
    // categories: Array.from({ length: 12 }, (_, i) => MONTHS[i]),
    categories: MONTHS,
    series: [
      {
        name: 'profit status',
        data: [10, 5, -10, 15, 5, 19, 8, 10, 5, 40, 35, 60],
      },
    ],
  };

  const YEARS = ['2020', '2021', '2022', '2023', '2024'];

  const dummyYearData = {
    // categories: Array.from({ length: 5 }, (_, i) => YEARS[i]),
    categories: YEARS,
    series: [
      {
        name: 'profit status',
        data: [-10, -5, 40, 35, 20],
        type: 'line',
      },
      // {
      //   name: 'profit status 2',
      //   data: [10, 5, -10, 15, 5],
      //   type: 'line',
      // },
    ],
  };

  const displayedDataSection = (
    <div className="flex h-400px flex-col rounded-3xl bg-white px-5 pb-9 pt-5 shadow-xl max-md:max-w-full">
      <div>
        <div className="flex w-full justify-between gap-2 border-b border-navyBlue2 pb-2 text-2xl font-bold leading-8 text-navyBlue2 max-md:max-w-full max-md:flex-wrap">
          <div>Profit Status Trend Chart</div>

          <Tooltip>
            <p>
              A message which appears when a cursor is positioned over an icon, image, hyperlink, or
              other element in a graphical user interface.
            </p>
          </Tooltip>
        </div>
      </div>

      <div className="mt-2">
        <div className="mx-2 flex justify-between">
          <div className="my-auto text-xl font-bold leading-8 text-slate-700">2024</div>
          <div className="flex space-x-2">
            <div className="">
              <Button
                variant={'tertiaryOutline'}
                className={cn(
                  selectedPeriod === Period.WEEK
                    ? 'bg-tertiaryBlue text-white hover:border-tertiaryBlue hover:bg-tertiaryBlue/80 hover:text-white'
                    : ''
                )}
                size={'medium'}
                onClick={() => handlePeriodChange(Period.WEEK)}
              >
                Week
              </Button>
            </div>
            <div className="">
              <Button
                variant={'tertiaryOutline'}
                className={cn(
                  selectedPeriod === Period.MONTH
                    ? 'bg-tertiaryBlue text-white hover:border-tertiaryBlue hover:bg-tertiaryBlue/80 hover:text-white'
                    : ''
                )}
                size={'medium'}
                onClick={() => handlePeriodChange(Period.MONTH)}
              >
                Month
              </Button>
            </div>
            <div className="">
              <Button
                variant={'tertiaryOutline'}
                className={cn(
                  selectedPeriod === Period.YEAR
                    ? 'bg-tertiaryBlue text-white hover:border-tertiaryBlue hover:bg-tertiaryBlue/80 hover:text-white'
                    : ''
                )}
                size={'medium'}
                onClick={() => handlePeriodChange(Period.YEAR)}
              >
                Year
              </Button>
            </div>
          </div>
        </div>
        {/* TODO: RWD (20240416 - Shirley) */}
        <div className="hidden md:flex">
          {/* <LineChart data={dummyWeekData} /> */}
          {/* <LineChart data={dummyMonthData} /> */}
          <LineChart data={data} />
        </div>
      </div>
    </div>
  );
  return <div>{displayedDataSection}</div>;
};

export default ProfitTrendChart;
