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
        formatter: (value) => `${value}%`,
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
