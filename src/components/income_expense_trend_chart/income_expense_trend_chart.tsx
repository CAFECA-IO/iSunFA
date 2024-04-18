/* eslint-disable */
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';
import React, { useEffect } from 'react';
import Tooltip from '../tooltip/tooltip';
import { Button } from '../button/button';
import { cn } from '../../lib/utils/common';
import { useGlobalCtx } from '../../contexts/global_context';
import { LayoutAssertion } from '../../interfaces/layout_assertion';

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

const LineChart = ({ data }: LineChartProps) => {
  const globalCtx = useGlobalCtx();
  const [chartWidth, setChartWidth] = React.useState(580);
  const [chartHeight, setChartHeight] = React.useState(250);

  useEffect(() => {
    const handleResize = () => {
      const windowWidth = globalCtx.width;
      const windowHeight = window.innerHeight;

      if (windowWidth <= 768) {
        const presentWidth = windowWidth / 1.45;
        const presentHeight = windowHeight / 3.9;

        setChartWidth(presentWidth);
        setChartHeight(presentHeight);
      } else if (window.innerWidth >= 1440) {
        const presentWidth = 580;
        const presentHeight = 250;

        setChartWidth(presentWidth);
        setChartHeight(presentHeight);
      } else {
        const presentWidth = windowWidth / 1.25;
        const presentHeight = 250;

        setChartWidth(presentWidth);
        setChartHeight(presentHeight);
      }
    };
    handleResize();
  }, [globalCtx.width]);

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
    legend: {
      show: true,
      position: 'bottom',
      horizontalAlign: 'left',

      fontFamily: 'Barlow',
      fontWeight: 500,
      markers: {
        fillColors: ['#6DDBA8', '#FB7A7A'],
        width: 20, // 標記的寬度
        height: 12, // 標記的高度
        radius: 0, // 標記的半徑（如果是圓形）
      },
      showForSingleSeries: true,

      // customLegendItems: [
      //   {
      //     text: 'income',
      //     icon: 'circle',
      //     iconColor: '#6DDBA8',
      //   },
      //   {
      //     text: 'expense',
      //     icon: 'circle',
      //     iconColor: '#FB7A7A',
      //   },
      // ],
    },

    markers: {
      size: 4,
      colors: ['#002462'],
    },
    stroke: {
      curve: 'straight',
      colors: ['#6DDBA8', '#FB7A7A'],
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
      style: {
        fontFamily: 'Barlow',
        fontSize: '12px',
      },
    },
  };

  return (
    <Chart
      options={options}
      series={data.series}
      type="line"
      width={chartWidth}
      height={chartHeight}
    />
  );
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
        name: 'Income',
        data: [-10, -5, 40, 35, 0, 49, 60],
      },
      {
        name: 'Expense',
        data: [20, 15, 30, 25, 10, 35, 50],
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
        name: 'Income',
        data: [10, 5, -10, 15, 5, 19, 8, 10, 5, 40, 35, 60],
      },
      {
        name: 'Expense',
        data: [15, 10, 20, 25, 15, 30, 20, 25, 15, 35, 30, 45],
      },
    ],
  },
  year: {
    categories: ['2020', '2021', '2022', '2023', '2024'],
    series: [
      {
        name: 'Income',
        data: [-10, -5, 40, 35, 20],
      },
      {
        name: 'Expense',
        data: [15, 10, 30, 25, 35],
      },
    ],
  },
};

const IncomeExpenseTrendChart = () => {
  const [selectedPeriod, setSelectedPeriod] = React.useState<Period>(Period.WEEK);
  const [data, setData] = React.useState(dataMap[selectedPeriod]);

  const periodChangeHandler = (period: Period) => {
    setSelectedPeriod(period);
    setData(dataMap[period]);
  };

  const WEEKDAYS = ['4/1', '4/2', '4/3', '4/4', '4/5', '4/6', '4/7'];

  const dummyWeekData = {
    // categories: Array.from({ length: 7 }, (_, i) => `Day ${i + 1}`),
    categories: WEEKDAYS,
    series: [
      {
        name: 'Income',
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
        name: 'Income',
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
        name: 'Income',
        data: [-10, -5, 40, 35, 20],
        type: 'line',
      },
      // {
      //   name: 'income 2',
      //   data: [10, 5, -10, 15, 5],
      //   type: 'line',
      // },
    ],
  };

  const displayedDataSection = (
    <div className="dashboardCardShadow flex h-400px flex-col rounded-3xl bg-white px-5 pb-9 pt-5 max-md:max-w-full">
      <div>
        <div className="flex w-full justify-between gap-2 border-b border-navyBlue2 pb-2 text-2xl font-bold leading-8 text-navyBlue2 max-md:max-w-full max-md:flex-wrap">
          <div className="flex-1">Income vs. Expense Trend Chart</div>

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
          <div className="my-auto text-xl font-bold leading-8 text-slate-700">2024</div>
          <div className="flex space-x-2 md:space-x-5">
            <div className="">
              <Button
                variant={'tertiaryOutline'}
                className={cn(
                  selectedPeriod === Period.WEEK
                    ? 'bg-tertiaryBlue text-white hover:border-tertiaryBlue hover:bg-tertiaryBlue/80 hover:text-white'
                    : ''
                )}
                size={'medium'}
                onClick={() => periodChangeHandler(Period.WEEK)}
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
                onClick={() => periodChangeHandler(Period.MONTH)}
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
                onClick={() => periodChangeHandler(Period.YEAR)}
              >
                Year
              </Button>
            </div>
          </div>
        </div>
        <div className="flex max-md:-ml-3">
          <LineChart data={data} />
        </div>
      </div>
    </div>
  );
  return <div>{displayedDataSection}</div>;
};

export default IncomeExpenseTrendChart;
