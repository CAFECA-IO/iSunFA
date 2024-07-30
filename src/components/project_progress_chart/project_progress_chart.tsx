import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { DatePickerAlign, MILLISECONDS_IN_A_SECOND } from '@/constants/display';
// import { TranslateFunction } from '@/interfaces/locale';
import Tooltip from '@/components/tooltip/tooltip';
import { getTodayPeriodInSec } from '@/lib/utils/common';
import {
  DUMMY_CATEGORIES,
  DUMMY_START_DATE,
  IProjectProgressChartData,
} from '@/interfaces/project_progress_chart';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useGlobalCtx } from '@/contexts/global_context';
import { ToastType } from '@/interfaces/toastify';
import { useUserCtx } from '@/contexts/user_context';
import { LayoutAssertion } from '@/interfaces/layout_assertion';
import { useTranslation } from 'next-i18next';
import { FREE_COMPANY_ID } from '@/constants/config';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface ColumnChartData {
  categories: string[];
  series: {
    name: string;
    data: number[];
  }[];
}

interface ColumnChartProps {
  data: ColumnChartData;
}

const ColumnChart = ({ data }: ColumnChartProps) => {
  const { layoutAssertion } = useGlobalCtx();

  const options: ApexOptions = {
    chart: {
      id: 'project-progress-chart',
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: layoutAssertion === LayoutAssertion.MOBILE,
        columnWidth: '30%',
      },
    },
    dataLabels: {
      enabled: false,
    },

    stroke: {
      show: false,
      width: 2,
      colors: ['#FFA502B2'],
    },
    colors: ['#FFA502B2'],

    xaxis: {
      categories: data.categories,
      labels: {
        style: {
          colors: '#304872',
          fontFamily: 'Barlow',
          fontSize: '12px',
          fontWeight: 500,
        },
      },
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

    yaxis: {
      title: {
        // text: 'Units',
      },
      labels: {
        style: {
          colors: '#919EB4',
          fontFamily: 'Barlow',
          fontSize: '12px',
        },
      },
    },
    // Info: 顯示圖例 (20240522 - Shirley)
    // legend: {
    //   show: true,
    //   position: 'bottom',
    //   horizontalAlign: 'left',

    //   customLegendItems: ['Projects'],
    //   fontFamily: 'Barlow',
    //   fontWeight: 500,
    //   markers: {
    //     fillColors: ['#FFA502B2'],
    //     width: 20, // 標記的寬度
    //     height: 12, // 標記的高度
    //     radius: 0, // 標記的半徑（如果是圓形）
    //   },
    //   showForSingleSeries: true,
    // },
    fill: {
      opacity: 1,
    },
    tooltip: {
      style: {
        fontFamily: 'Barlow',
        fontSize: '12px',
      },
      marker: {
        show: false,
      },
      // y: {
      //   formatter: function (val: number) {
      //     return val + ' units';
      //   },
      // },
      y: {
        formatter(val: number) {
          return val.toString();
        },

        title: {
          formatter() {
            return '';
          },
        },
      },

      x: {
        show: false,
      },

      fillSeriesColor: false,
      followCursor: false,
      fixed: {
        enabled: false,
        position: 'topRight',
        offsetX: 0,
        offsetY: 0,
      },
    },
  };

  return <Chart options={options} series={data.series} type="bar" height={230} />;
};

const defaultSelectedPeriodInSec = getTodayPeriodInSec();

const ProjectProgressChart = () => {
  const { toastHandler, layoutAssertion } = useGlobalCtx();
  const { selectedCompany } = useUserCtx();
  const { t } = useTranslation('common');

  // const { t }: { t: TranslateFunction } = useTranslation('common');
  // TODO: 改成 company startDate (20240618 - Shirley)
  const minDate = new Date(DUMMY_START_DATE);
  const maxDate = new Date();

  const [period, setPeriod] = useState(defaultSelectedPeriodInSec);
  const [series, setSeries] = useState<
    {
      name: string;
      data: number[];
    }[]
  >([]);
  const [categories, setCategories] = useState<string[]>([]);

  const displayedYear = maxDate.getFullYear();

  const {
    trigger: listProjectProgress,
    data: projectProgress,
    success: listSuccess,
    code: listCode,
    error: listError,
  } = APIHandler<IProjectProgressChartData>(APIName.PROJECT_LIST_PROGRESS, {
    params: {
      companyId: selectedCompany?.id ?? FREE_COMPANY_ID,
    },
    query: {
      date: new Date(period.endTimeStamp * MILLISECONDS_IN_A_SECOND).toISOString().slice(0, 10),
    },
  });

  const isNoData = projectProgress?.empty || !projectProgress || !listSuccess;

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
    if (listSuccess && projectProgress) {
      const { series: s, categories: c } = projectProgress;
      setCategories(c);
      setSeries(s);
    } else if (listSuccess === false) {
      setCategories(DUMMY_CATEGORIES);
      toastHandler({
        id: `project-progress-chart-${listCode}`,
        content: `${t('DASHBOARD.FAILED_TO_GET_PROJECT_PROGRESS_DATA')} ${listCode}`,
        type: ToastType.ERROR,
        closeable: true,
      });
    }
  }, [listSuccess, listCode, listError, projectProgress]);

  useEffect(() => {
    listProjectProgress({
      params: {
        companyId: selectedCompany?.id ?? FREE_COMPANY_ID,
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

  const displayedDateSection = (
    <div className="my-auto text-xl font-bold leading-5 tracking-normal text-text-brand-primary-lv2">
      {displayedYear}{' '}
      <span className="text-sm font-semibold leading-5 tracking-normal text-text-brand-secondary-lv1">
        {displayedDate}
      </span>{' '}
    </div>
  );

  const displayedChart = isNoData ? (
    <div className="relative -ml-3 mt-5 md:mt-5 lg:mt-0">
      <ColumnChart data={data} />
      <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2">
        <p className="text-xl font-bold text-text-neutral-mute">{t('PROJECT.NO_DATA')}</p>
      </div>
    </div>
  ) : (
    <div className="-ml-3 mt-5 md:mt-5 lg:mt-0">
      <ColumnChart data={data} />
    </div>
  );

  const displayedDataSection = (
    <div className="flex h-400px flex-col rounded-3xl bg-white px-5 pb-9 pt-5 max-md:max-w-full lg:h-360px">
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
                  fillRule="evenodd"
                  d="M17.138.378c.368-.369.922-.48 1.404-.28l3.647 1.513c.653.27.965 1.018.698 1.673l-1.488 3.647a1.286 1.286 0 01-2.377.01l-.589-1.407-14.807 6.33a1.286 1.286 0 11-1.01-2.365L17.44 3.162l-.578-1.38a1.286 1.286 0 01.275-1.404z"
                  clipRule="evenodd"
                ></path>
                <path
                  fill="#002462"
                  fillRule="evenodd"
                  d="M21.857 9.393a1.714 1.714 0 011.715 1.715v12a.857.857 0 01-.858.857H18.43a.857.857 0 01-.857-.857v-12a1.715 1.715 0 011.714-1.715h2.571zm-8.571 2.572A1.714 1.714 0 0115 13.679v9.429a.857.857 0 01-.857.857H9.857A.857.857 0 019 23.108v-9.429a1.714 1.714 0 011.714-1.714h2.572zm-7.36 3.073a1.714 1.714 0 00-1.212-.502H2.143A1.714 1.714 0 00.429 16.25v6.858c0 .473.383.857.857.857h4.286a.857.857 0 00.857-.857V16.25c0-.454-.18-.89-.502-1.212z"
                  clipRule="evenodd"
                ></path>
              </svg>
              <p>{t('PROJECT.PROJECT_STAGE_CHART')}</p>
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
      </div>

      {displayedChart}
    </div>
  );
  return <div>{displayedDataSection}</div>;
};

export default ProjectProgressChart;
