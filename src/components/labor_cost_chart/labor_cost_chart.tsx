import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';
import Tooltip from '@/components/tooltip/tooltip';
import { ILaborCostChartData } from '@/interfaces/labor_cost_chart';
import { useGlobalCtx } from '@/contexts/global_context';
import useStateRef from 'react-usestateref';
import { DUMMY_START_DATE } from '@/interfaces/project_progress_chart';
import { DatePickerAlign, MILLISECONDS_IN_A_SECOND } from '@/constants/display';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { ToastType } from '@/interfaces/toastify';
import { cn, getTodayPeriodInSec } from '@/lib/utils/common';
import { useUserCtx } from '@/contexts/user_context';
import { LayoutAssertion } from '@/interfaces/layout_assertion';
import { useTranslation } from 'next-i18next';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface PieChartData {
  categories: string[];
  series: number[];
}

interface PieChartProps {
  data: PieChartData;
}

const originalColors = ['#EBE9FE', '#FFEAD5', '#FFE4E8', '#E0EAFF', '#BDF0D5', '#FCE7F6'];
// const hoverColors = ['#9B8AFB', '#FD853A', '#FD6F8E', '#8098F9', '#6CDEA0', '#F670C7'];
// TODO: (20240523 - Shirley) implement hover colors

const PieChart = ({ data }: PieChartProps) => {
  const globalCtx = useGlobalCtx();
  const [chartWidth, setChartWidth] = useStateRef(580);
  const [chartHeight, setChartHeight] = useStateRef(250);
  const [space, setSpace] = useStateRef<number | undefined>(200);
  const [legendPosition, setLegendPosition] = useStateRef<'left' | 'bottom' | 'right'>('left');
  const [offsetY, setOffsetY] = useStateRef<number | undefined>(60);

  useEffect(() => {
    const handleResize = () => {
      const windowWidth = globalCtx.width;
      const windowHeight = window.innerHeight;
      const DESKTOP_WIDTH = 1024;
      const TABLET_WIDTH = 768;
      const MOBILE_WIDTH = 450;

      if (windowWidth <= MOBILE_WIDTH) {
        const presentWidth = 290 + (windowWidth - 375);
        const presentHeight = 350;

        setLegendPosition('bottom');
        setSpace(130);
        setOffsetY(0);
        setChartWidth(presentWidth);
        setChartHeight(presentHeight);
      } else if (windowWidth <= TABLET_WIDTH) {
        const presentWidth = 450;
        const presentHeight = 350;

        setLegendPosition('left');
        setSpace(150);
        setOffsetY(60);
        setChartWidth(presentWidth);
        setChartHeight(presentHeight);
      } else if (windowWidth > DESKTOP_WIDTH) {
        const presentWidth = 400;
        const presentHeight = 250;

        setSpace(130);
        setOffsetY(60);

        setChartWidth(presentWidth);
        setChartHeight(presentHeight);
      } else if (windowWidth <= DESKTOP_WIDTH && windowWidth > TABLET_WIDTH) {
        const presentWidth = 400;
        const presentHeight = 250;

        setSpace(130);
        setOffsetY(60);
        setChartWidth(presentWidth);
        setChartHeight(presentHeight);
      } else {
        const presentWidth = windowWidth / 12;
        const presentHeight = windowHeight / 3.5;

        setOffsetY(60);
        setChartWidth(presentWidth);
        setChartHeight(presentHeight);
      }
    };
    handleResize();
  }, [globalCtx.width]);

  const options: ApexOptions = {
    series: data.series,
    chart: {
      id: 'labor-cost-chart',
      type: 'pie',
    },
    colors: originalColors,
    labels: data.categories,
    legend: {
      position: legendPosition,
      offsetY,
      offsetX: -30,
      markers: {
        // width: 20, // Info: (20240706 - Luphia)
        // height: 12, // Info: (20240706 - Luphia)
        // radius: 0, // Info: (20240722 - Shirley)
      },
      width: space, // Info: (20240522 - Shirley) 讓 legend 跟 pie chart 之間的距離拉開
      height: 140,
    },
    tooltip: {
      enabled: true,
      y: {
        formatter: (value: number) => {
          return `${value.toString()}`;
        },

        // Info: (20240523 - Shirley) 自己去算百分比然後顯示在 tooltip 上
        // formatter: (value: number, { seriesIndex, w }: { seriesIndex: number; w: any }) => {
        //   const total = data.series.reduce((a: number, b: number) => a + b, 0);
        //   const percent = Math.round((value / total) * 100);
        //   return `${percent.toFixed(2)}%`;
        // },
        // title: {
        //   formatter: function () {
        //     return '';
        //   },
        // },
      },
      style: {
        fontFamily: 'Barlow',
        fontSize: '12px',
      },
      fillSeriesColor: false,
      fixed: {
        enabled: true,
        position: 'topRight',
      },
      theme: 'dark',
    },
    dataLabels: {
      enabled: true,
      style: {
        colors: ['#001840'],
      },
      dropShadow: {
        enabled: false,
      },
    },
    fill: {
      colors: originalColors,
    },
    states: {
      hover: {
        filter: {
          type: 'darken',
          value: 0.85,
        },
      },
      active: {
        allowMultipleDataPointsSelection: false,
        filter: {
          type: 'darken',
          value: 0.85,
        },
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
        },
        expandOnClick: true,
      },
    },
  };

  return (
    <Chart
      options={options}
      series={options.series}
      type="pie"
      width={chartWidth}
      height={chartHeight}
    />
  );
};

const defaultSelectedPeriodInSec = getTodayPeriodInSec();

const LaborCostChart = () => {
  const { t } = useTranslation('common');
  const { layoutAssertion } = useGlobalCtx();

  // TODO: (20240618 - Shirley) 改成 company startDate
  const minDate = new Date(DUMMY_START_DATE);
  const maxDate = new Date();
  const [period, setPeriod] = useState(defaultSelectedPeriodInSec);
  const [series, setSeries] = useState<number[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const { toastHandler } = useGlobalCtx();
  const { isAuthLoading, selectedCompany } = useUserCtx();
  const hasCompanyId = isAuthLoading === false && !!selectedCompany?.id;
  const {
    trigger: getLaborCostChartData,
    data: laborCostData,
    success: getSuccess,
    code: getCode,
    error: getError,
  } = APIHandler<ILaborCostChartData>(
    APIName.LABOR_COST_CHART,
    {
      params: {
        companyId: selectedCompany?.id,
      },
      query: {
        date: new Date(period.endTimeStamp * MILLISECONDS_IN_A_SECOND).toISOString().slice(0, 10),
      },
    },
    hasCompanyId
  );

  const isNoData = laborCostData?.empty || !laborCostData || !getSuccess;

  const displayedYear = maxDate.getFullYear();

  const displayedDate = (() => {
    const startDate = period.startTimeStamp
      ? new Date(period.startTimeStamp * MILLISECONDS_IN_A_SECOND)
      : new Date();

    const endDate = period.endTimeStamp
      ? new Date(period.endTimeStamp * MILLISECONDS_IN_A_SECOND)
      : new Date();

    const startDateStr = `${(startDate.getMonth() + 1).toString().padStart(2, '0')}/${startDate.getDate().toString().padStart(2, '0')}`;
    const endDateStr = `${(endDate.getMonth() + 1).toString().padStart(2, '0')}/${endDate.getDate().toString().padStart(2, '0')}`;

    return startDateStr === endDateStr ? `${startDateStr}` : `${startDateStr} ~ ${endDateStr}`;
  })();

  const alignCalendarPart =
    layoutAssertion === LayoutAssertion.DESKTOP ? DatePickerAlign.LEFT : DatePickerAlign.CENTER;

  const customCalendarAlignment =
    layoutAssertion === LayoutAssertion.DESKTOP ? '' : '-translate-x-65%';

  useEffect(() => {
    if (getSuccess && laborCostData) {
      const { series: newSeries, categories: newCategories } = laborCostData;
      setSeries(newSeries);
      setCategories(newCategories);
    }
    if (getSuccess === false) {
      toastHandler({
        id: `labor-cost-chart-${getCode}`,
        content: `${t('DASHBOARD.FAILED_TO_GET_LABOR_COST')} ${getCode}`,
        type: ToastType.ERROR,
        closeable: true,
      });
    }
  }, [getSuccess, getCode, getError]);

  useEffect(() => {
    if (!hasCompanyId) return;
    getLaborCostChartData({
      params: {
        companyId: selectedCompany?.id,
      },
      query: {
        date: new Date(period.endTimeStamp * MILLISECONDS_IN_A_SECOND).toISOString().slice(0, 10),
      },
    });
  }, [period]);

  const data = {
    categories,
    series,
  };

  const displayedChart = isNoData ? (
    <div className="flex w-full flex-col items-center justify-between gap-5 font-barlow lg:flex-row lg:items-start lg:gap-0">
      <div className="mt-3 lg:mt-10">
        <p className="font-semibold text-text-brand-secondary-lv1">
          {t('LABOR_COST_CHART.ONBOARDING_PROJECTS')}
        </p>
      </div>
      <div className="lg:mr-10">
        {' '}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="200"
          height="200"
          fill="none"
          viewBox="0 0 200 200"
        >
          <circle cx="100" cy="100" r="100" fill="#D9D9D9"></circle>
          <text x="100" y="105" fill="#fff" fontSize="20" textAnchor="middle" fontFamily="">
            {t('PROJECT.NO_DATA')}
          </text>
        </svg>
      </div>
    </div>
  ) : (
    <div className="relative">
      {' '}
      <div className="absolute left-1/2 top-5 w-150px -translate-x-1/2 text-center font-semibold text-text-brand-secondary-lv1 md:left-0 md:translate-x-0">
        {t('LABOR_COST_CHART.ONBOARDING_PROJECTS')}
      </div>
      <div className="ml-0 flex pt-16 max-md:ml-0 md:pt-0 lg:pt-5">
        <PieChart data={data} />
      </div>
    </div>
  );

  const displayedDateSection = (
    <div className="my-auto text-xl font-bold leading-5 tracking-normal text-text-brand-primary-lv2">
      {displayedYear}{' '}
      <span className="text-sm font-semibold leading-5 tracking-normal text-text-brand-secondary-lv1">
        {displayedDate}
      </span>{' '}
    </div>
  );

  const displayedDataSection = (
    <div
      className={cn(
        'flex flex-col rounded-2xl bg-white px-5 pb-9 pt-5 max-md:max-w-full md:h-400px',
        isNoData ? 'h-400px' : 'h-520px'
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
              <p>{t('LABOR_COST_CHART.LABOR_COST')}</p>
            </div>
          </div>

          <div className="hidden justify-end lg:flex">
            <Tooltip>
              <p>{t('PROJECT.TOOLTIP_MESSAGE')}</p>
            </Tooltip>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="mx-0 flex flex-row justify-center gap-5 lg:justify-start">
          <div className="my-auto text-xl font-bold leading-8 text-text-brand-primary-lv2">
            {displayedDateSection}{' '}
          </div>
          <div className="w-10">
            {' '}
            <DatePicker
              disabled={isNoData}
              type={DatePickerType.ICON_DATE}
              minDate={minDate}
              maxDate={maxDate}
              period={period}
              setFilteredPeriod={setPeriod}
              alignCalendar={alignCalendarPart}
              calenderClassName={customCalendarAlignment}
            />
          </div>
        </div>
        {displayedChart}
      </div>
    </div>
  );
  return <div>{displayedDataSection}</div>;
};

export default LaborCostChart;
