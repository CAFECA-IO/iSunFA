import dynamic from 'next/dynamic';
import React, { useEffect } from 'react';
import Tooltip from '@/components/tooltip/tooltip';
import { Button } from '@/components/button/button';
import { cn } from '@/lib/utils/common';
import { useGlobalCtx } from '@/contexts/global_context';
import { Period } from '@/interfaces/chart_unit';
import { DUMMY_PROFIT_TREND_CHART_DATA } from '@/interfaces/profit_trend_chart';
import { useTranslation } from 'next-i18next';
import type { ApexOptions } from 'apexcharts';

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
        // formatter: value => `${value}%`,  // Info: (20240416 - Shirley)
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
        // formatter: value => `${value}%`,  // Info: (20240416 - Shirley)
      },
    },

    legend: {
      show: true,
      position: 'bottom',
      horizontalAlign: 'left',

      customLegendItems: ['Profit Status'],
      fontFamily: 'Barlow',
      fontWeight: 500,
      markers: {
        fillColors: ['#FFA502'],
        // width: 20, // 標記的寬度 // Info: (20240706 - Luphia)
        // height: 12, // 標記的高度 // Info: (20240706 - Luphia)
        // radius: 0, // 標記的半徑（如果是圓形）// Info: (20240722 - Shirley)
      },
      showForSingleSeries: true,
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
    },

    series: data.series,

    tooltip: {
      enabled: true,
      onDatasetHover: {
        highlightDataSeries: false,
      },
      x: {
        show: false, // Info: (20240416 - Shirley) 在 hover 產生的 tooltip box 中，是否顯示 x 軸的值
        format: 'dd MMM',
        // formatter: value => `${value}`, // Info: (20240416 - Shirley)
      },
      y: {
        formatter: (value: unknown) => `${value}%`,
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

const ProfitTrendChart = () => {
  const { t } = useTranslation(['alpha', 'project']);
  const [selectedPeriod, setSelectedPeriod] = React.useState<Period>(Period.WEEK);
  const [data, setData] = React.useState(DUMMY_PROFIT_TREND_CHART_DATA[selectedPeriod]);

  const periodChangeHandler = (period: Period) => {
    setSelectedPeriod(period);
    setData(DUMMY_PROFIT_TREND_CHART_DATA[period]);
  };

  const displayedDataSection = (
    <div className="dashboardCardShadow flex h-450px flex-col rounded-2xl bg-surface-neutral-surface-lv2 px-5 pb-9 pt-5 max-md:max-w-full md:h-400px">
      <div className="flex w-full justify-between gap-2 border-b border-stroke-neutral-secondary pb-2 text-2xl font-bold leading-8 text-text-neutral-secondary max-md:max-w-full max-md:flex-wrap">
        <div className="flex-1">{t('project:PROFIT_TREND_CHART.PROFIT_STATUS_TREND_CHART')}</div>

        <div className="justify-end">
          <Tooltip>
            <p>{t('alpha:COMMON.TOOLTIP_MESSAGE')}</p>
          </Tooltip>
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
                type="button"
                variant={'tertiaryOutline'}
                className={cn(
                  selectedPeriod === Period.WEEK
                    ? 'bg-button-surface-strong-secondary text-button-text-invert hover:border-button-stroke-secondary hover:bg-button-surface-strong-secondary-hover hover:text-button-text-invert'
                    : ''
                )}
                size={'medium'}
                onClick={() => periodChangeHandler(Period.WEEK)}
              >
                {t('project:PROFIT_TREND_CHART.WEEK')}
              </Button>
            </div>
            <div className="">
              <Button
                type="button"
                variant={'tertiaryOutline'}
                className={cn(
                  selectedPeriod === Period.MONTH
                    ? 'bg-button-surface-strong-secondary text-button-text-invert hover:border-button-stroke-secondary hover:bg-button-surface-strong-secondary-hover hover:text-button-text-invert'
                    : ''
                )}
                size={'medium'}
                onClick={() => periodChangeHandler(Period.MONTH)}
              >
                {t('alpha:COMMON.MONTH')}
              </Button>
            </div>
            <div className="">
              <Button
                type="button"
                variant={'tertiaryOutline'}
                className={cn(
                  selectedPeriod === Period.YEAR
                    ? 'bg-button-surface-strong-secondary text-button-text-invert hover:border-button-stroke-secondary hover:bg-button-surface-strong-secondary-hover hover:text-button-text-invert'
                    : ''
                )}
                size={'medium'}
                onClick={() => periodChangeHandler(Period.YEAR)}
              >
                {t('alpha:COMMON.YEAR')}
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

export default ProfitTrendChart;
