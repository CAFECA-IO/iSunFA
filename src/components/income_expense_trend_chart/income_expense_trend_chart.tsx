import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';
import React, { useEffect } from 'react';
import Tooltip from '@/components/tooltip/tooltip';
import { Button } from '@/components/button/button';
import { cn } from '@/lib/utils/common';
import { useGlobalCtx } from '@/contexts/global_context';
import { Period } from '@/interfaces/chart_unit';
import {
  DUMMY_INCOME_EXPENSE_TREND_CHART_DATA,
  IIncomeExpenseTrendChartData,
} from '@/interfaces/income_expense_trend_chart';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { ToastType } from '@/interfaces/toastify';
import { DEFAULT_DISPLAYED_COMPANY_ID } from '@/constants/display';
import { useUserCtx } from '@/contexts/user_context';
import { useTranslation } from 'next-i18next';

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
        const presentWidth = 290 + (windowWidth - 375) * 1.02;
        const presentHeight = 300;

        setChartWidth(presentWidth);
        setChartHeight(presentHeight);
      } else if (windowWidth < TABLET_WIDTH) {
        const presentWidth = 370;
        const presentHeight = 250;

        setChartWidth(presentWidth);
        setChartHeight(presentHeight);
      } else if (windowWidth > DESKTOP_WIDTH) {
        const presentWidth = 400 + (windowWidth - DESKTOP_WIDTH) / 2.5;
        const presentHeight = 250;

        setChartWidth(presentWidth);
        setChartHeight(presentHeight);
      } else if (windowWidth <= DESKTOP_WIDTH && windowWidth >= TABLET_WIDTH) {
        const presentWidth = 650 + (windowWidth - TABLET_WIDTH) / 1.05;
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        formatter: (value, { series, seriesIndex, dataPointIndex }) => {
          const absoluteValue = data.annotations[seriesIndex].data[dataPointIndex].absolute;
          const formattedAbsoluteValue = absoluteValue.toLocaleString(); // 使用 toLocaleString() 方法加上千分位逗號

          return `${formattedAbsoluteValue}`;
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
      series={data.annotations.map((item) => ({
        name: item.name,
        data: item.data.map((point) => point.absolute),
      }))}
      type="line"
      width={chartWidth}
      height={chartHeight}
    />
  );
};

const IncomeExpenseTrendChart = () => {
  const { t } = useTranslation('common');
  const { toastHandler } = useGlobalCtx();
  const { selectedCompany } = useUserCtx();
  const originalDataRef = React.useRef(DUMMY_INCOME_EXPENSE_TREND_CHART_DATA);
  const [selectedPeriod, setSelectedPeriod] = React.useState<Period>(Period.MONTH);
  const [data, setData] = React.useState(originalDataRef.current[selectedPeriod]);

  const {
    trigger: getProfitMarginTrendInPeriod,
    data: profitMarginTrendInPeriodData,
    success: getSuccess,
    code: getCode,
    error: getError,
  } = APIHandler<IIncomeExpenseTrendChartData>(APIName.INCOME_EXPENSE_GET_TREND_IN_PERIOD, {
    params: {
      companyId: selectedCompany?.id ?? DEFAULT_DISPLAYED_COMPANY_ID,
    },
    query: {
      period: selectedPeriod,
    },
  });

  const isNoData =
    profitMarginTrendInPeriodData?.empty || !profitMarginTrendInPeriodData || !getSuccess;

  const periodChangeHandler = (period: Period) => {
    setSelectedPeriod(period);
    getProfitMarginTrendInPeriod({
      params: {
        companyId: selectedCompany?.id ?? DEFAULT_DISPLAYED_COMPANY_ID,
      },
      query: {
        period,
      },
    });
  };

  useEffect(() => {
    if (getSuccess && profitMarginTrendInPeriodData) {
      setData(profitMarginTrendInPeriodData);
    }
    if (getSuccess === false) {
      toastHandler({
        id: `income_expense_trend-${getCode}`,
        content: `${t('DASHBOARD.FAILED_TO_GET_INCOME_EXPENSE_TREND')} ${getCode}`,
        type: ToastType.ERROR,
        closeable: true,
      });
    }
  }, [getSuccess, getCode, getError, profitMarginTrendInPeriodData]);

  const displayedChart = isNoData ? (
    <div className="mt-20">
      {' '}
      <section className="flex flex-col items-center">
        <div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="49"
            height="27"
            viewBox="0 0 49 27"
            fill="none"
          >
            <path
              d="M13 17.4956L10 14.4956"
              stroke="#002462"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M3.0001 8.49571L3 8.49561"
              stroke="#002462"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M39 17.4956L46 10.4956"
              stroke="#002462"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M26 17.4956L26 2.49561"
              stroke="#002462"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
          >
            <path
              d="M44.5716 14.6387H3.42871V37.7815C3.42871 40.6218 5.73124 42.9244 8.57157 42.9244H39.4287C42.2689 42.9244 44.5716 40.6218 44.5716 37.7815V14.6387Z"
              fill="#002462"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M5.14286 0.0671387C2.30254 0.0671387 0 2.36966 0 5.21V10.3529C0 13.1932 2.30254 15.4957 5.14286 15.4957H42.8571C45.6974 15.4957 48 13.1932 48 10.3529V5.21C48 2.36966 45.6974 0.0671387 42.8571 0.0671387H5.14286ZM18.8571 23.6386C17.6737 23.6386 16.7143 24.5979 16.7143 25.7814C16.7143 26.9649 17.6737 27.9243 18.8571 27.9243H29.1429C30.3263 27.9243 31.2857 26.9649 31.2857 25.7814C31.2857 24.5979 30.3263 23.6386 29.1429 23.6386H18.8571Z"
              fill="#FFA502"
            />
          </svg>
        </div>
        <div className="text-h6 font-semibold leading-h6 text-text-neutral-tertiary">
          {t('MY_REPORTS_SECTION.EMPTY')}
        </div>
      </section>
    </div>
  ) : (
    <div className="flex max-md:-ml-3">
      <LineChart data={data} />
    </div>
  );

  const displayedDataSection = (
    <div
      className={cn(
        'flex flex-col rounded-2xl bg-white px-5 pb-9 pt-5 max-md:max-w-full md:h-400px',
        isNoData ? 'h-400px' : 'h-500px'
      )}
    >
      <div>
        <div className="flex w-full justify-center gap-2 text-base leading-8 text-text-neutral-secondary max-md:max-w-full max-md:flex-wrap lg:justify-between lg:border-b lg:border-stroke-neutral-secondary lg:pb-2">
          <div className="lg:flex-1">
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
              <p>
                {t('PROJECT.FINANCIAL_OVERVIEW')} <br className="flex lg:hidden" />(
                {t('PROJECT.INCOME_VS_EXPENDITURE')})
              </p>
            </div>
          </div>

          <div className="hidden justify-end lg:flex">
            <Tooltip>
              <p>{t('PROJECT.TOOLTIP_MESSAGE')}</p>
            </Tooltip>
          </div>
        </div>
      </div>

      <div className="mt-2">
        <div className="flex flex-row justify-between max-md:space-y-2 md:mx-0 md:flex-row">
          <div className="my-auto text-xl font-bold leading-8 text-text-brand-primary-lv2">
            2024
          </div>
          <div className="flex space-x-5 md:space-x-5">
            <div className="">
              <Button
                disabled={isNoData}
                variant={'tertiaryOutline'}
                className={cn(
                  'disabled:border-button-text-disable disabled:bg-transparent disabled:text-button-text-disable',
                  selectedPeriod === Period.MONTH
                    ? 'bg-tertiaryBlue text-white hover:border-tertiaryBlue hover:bg-tertiaryBlue/80 hover:text-white'
                    : ''
                )}
                size={'medium'}
                onClick={() => periodChangeHandler(Period.MONTH)}
              >
                <p>
                  <span className="lg:hidden">{t('COMMON.M')}</span>
                  <span className="hidden lg:inline">{t('ADD_ASSET_MODAL.MONTH')}</span>{' '}
                </p>
              </Button>
            </div>
            <div className="">
              <Button
                disabled={isNoData}
                variant={'tertiaryOutline'}
                className={cn(
                  'disabled:border-button-text-disable disabled:bg-transparent disabled:text-button-text-disable',
                  selectedPeriod === Period.YEAR
                    ? 'bg-tertiaryBlue text-white hover:border-tertiaryBlue hover:bg-tertiaryBlue/80 hover:text-white'
                    : ''
                )}
                size={'medium'}
                onClick={() => periodChangeHandler(Period.YEAR)}
              >
                <p>
                  <span className="lg:hidden">{t('COMMON.Y')}</span>
                  <span className="hidden lg:inline">{t('ADD_ASSET_MODAL.YEAR')}</span>{' '}
                </p>
              </Button>
            </div>
          </div>
        </div>
        {displayedChart}
      </div>
    </div>
  );
  return <div>{displayedDataSection}</div>;
};

export default IncomeExpenseTrendChart;
