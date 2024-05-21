/* eslint-disable */
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';
import React, { useEffect } from 'react';
import Tooltip from '@/components/tooltip/tooltip';
import { Button } from '@/components/button/button';
import { cn } from '@/lib/utils/common';
import { useGlobalCtx } from '@/contexts/global_context';
import { LayoutAssertion } from '@/interfaces/layout_assertion';
import { Period } from '@/interfaces/chart_unit';
import {
  DUMMY_INCOME_EXPENSE_TREND_CHART_DATA,
  IIncomeExpenseTrendChartData,
} from '@/interfaces/income_expense_trend_chart';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface LineChartProps {
  data: IIncomeExpenseTrendChartData;
}

const LineChart = ({ data }: LineChartProps) => {
  const globalCtx = useGlobalCtx();
  const [chartWidth, setChartWidth] = React.useState(580);
  const [chartHeight, setChartHeight] = React.useState(250);

  useEffect(() => {
    const handleResize = () => {
      const windowWidth = globalCtx.width;
      const windowHeight = window.innerHeight;
      const DESKTOP_WIDTH = 1024;
      const TABLET_WIDTH = 768;
      const MOBILE_WIDTH = 450;

      if (windowWidth <= MOBILE_WIDTH) {
        const presentWidth = 250;
        const presentHeight = 250;

        setChartWidth(presentWidth);
        setChartHeight(presentHeight);
      } else if (windowWidth <= TABLET_WIDTH) {
        const presentWidth = 370;
        const presentHeight = 250;

        setChartWidth(presentWidth);
        setChartHeight(presentHeight);
      } else if (windowWidth > DESKTOP_WIDTH) {
        const presentWidth = 400 + (windowWidth - DESKTOP_WIDTH) / 10;
        const presentHeight = 250;

        setChartWidth(presentWidth);
        setChartHeight(presentHeight);
      } else if (windowWidth <= DESKTOP_WIDTH && windowWidth > TABLET_WIDTH) {
        const presentWidth = 580;
        const presentHeight = 250;

        setChartWidth(presentWidth);
        setChartHeight(presentHeight);
      } else {
        const presentWidth = windowWidth / 12;
        const presentHeight = windowHeight / 3.5;

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
      // min: -15, // Adjust according to your data range
      // max: 65, // Adjust according to your data range
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
        fillColors: ['#4BD394', '#FB5C5C', '#FFA502'],
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
      colors: ['#4BD394', '#FB5C5C', '#FFA502'],
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
        // formatter: (value) => `${value}%`,
        formatter: (value, { series, seriesIndex, dataPointIndex }) => {
          console.log('in y formatter', value, series, seriesIndex, dataPointIndex);
          // const absoluteValue = series[seriesIndex][dataPointIndex];
          const absoluteValue = data.annotations[seriesIndex].data[dataPointIndex].absolute;
          const formattedAbsoluteValue = absoluteValue.toLocaleString(); // 使用 toLocaleString() 方法加上千分位逗號

          return `${value}%, ${formattedAbsoluteValue}`;
        },
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
      // series={data.series}
      series={data.annotations.map((item) => ({
        name: item.name,
        data: item.data.map((point) => point.percentage),
      }))}
      type="line"
      width={chartWidth}
      height={chartHeight}
    />
  );
};

const IncomeExpenseTrendChart = () => {
  /** Todo: (20240520 - tzuhan) API implementation when backend is ready (20240520 - tzuhan)
const { companyId } = useAccountingCtx();
*/
  const {
    /** Todo: (20240520 - tzuhan) API implementation when backend is ready (20240520 - tzuhan)
      trigger: getProfitMarginTrendInPeriod,
  */
    data: profitMarginTrendInPeriodData,
    success: getSuccess,
    code: getCode,
    error: getError,
  } = APIHandler<IIncomeExpenseTrendChartData>(
    APIName.PROFIT_GET_MARGIN_TREND_IN_PERIOD,
    {
      params: {
        companyId: '1',
      },
      query: {
        period: Period.WEEK,
      },
    },
    false, // ToDo: (20240520 - tzuhan) remove false when backend is ready (20240520 - tzuhan)
    false // ToDo: (20240520 - tzuhan) remove false when backend is ready (20240520 - tzuhan)
  );
  const [reload, setReload] = React.useState(true);
  const originalDataRef = React.useRef(DUMMY_INCOME_EXPENSE_TREND_CHART_DATA);
  const [selectedPeriod, setSelectedPeriod] = React.useState<Period>(Period.WEEK);
  const [data, setData] = React.useState(originalDataRef.current[selectedPeriod]);

  const periodChangeHandler = (period: Period) => {
    setSelectedPeriod(period);
    /**
     * Todo:  (20240520 - tzuhan)API implementation when backend is ready (20240520 - tzuhan)
    getProfitMarginTrendInPeriod({
      params: {
        companyId,
      },
      query: {
        period,
      },
    });
     */
    setReload(true);
    setData(DUMMY_INCOME_EXPENSE_TREND_CHART_DATA[period]);
  };

  useEffect(() => {
    if (reload && getSuccess && profitMarginTrendInPeriodData) {
      setReload(false);
      setData(profitMarginTrendInPeriodData);
    }
  }, [getSuccess, getCode, getError, profitMarginTrendInPeriodData]);

  const displayedDataSection = (
    <div
      id="displayedDataSection"
      className="dashboardCardShadow flex h-450px flex-col rounded-3xl bg-white px-5 pb-9 pt-5 max-md:max-w-full md:h-400px"
    >
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
                  fill="#002462"
                  fillRule="evenodd"
                  d="M9.568 10.293a1.286 1.286 0 011.817-.064l2.786 2.599a1.286 1.286 0 01-1.754 1.88L9.631 12.11a1.286 1.286 0 01-.063-1.817zM19.413 6.265c.667.243 1.01.98.768 1.648l-2.01 5.518a1.286 1.286 0 11-2.415-.88l2.009-5.518a1.286 1.286 0 011.648-.768z"
                  clipRule="evenodd"
                ></path>
                <path
                  fill="#002462"
                  fillRule="evenodd"
                  d="M2.571 1.286a1.286 1.286 0 00-2.571 0v21.428C0 23.424.576 24 1.286 24h21.428a1.286 1.286 0 000-2.571H2.571v-4.95l3.998-4.268a1.286 1.286 0 10-1.877-1.758l-2.12 2.264V1.287z"
                  clipRule="evenodd"
                ></path>
                <path
                  fill="#FFA502"
                  fillRule="evenodd"
                  d="M4.429 9.652a3.424 3.424 0 106.848 0 3.424 3.424 0 00-6.848 0zM16.427 4.563a3.426 3.426 0 106.852 0 3.426 3.426 0 00-6.852 0zM12.192 15.74a3.429 3.429 0 106.857 0 3.429 3.429 0 00-6.857 0z"
                  clipRule="evenodd"
                ></path>
              </svg>
              <p>Financial Overview (Income vs. Expenditure)</p>
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
