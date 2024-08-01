import { AiOutlineLeft, AiOutlineRight } from 'react-icons/ai';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';
import Tooltip from '@/components/tooltip/tooltip';
import {
  DatePickerAlign,
  ITEMS_PER_PAGE_ON_DASHBOARD,
  MILLISECONDS_IN_A_SECOND,
} from '@/constants/display';
import { cn, getPeriodOfThisMonthInSec } from '@/lib/utils/common';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { Button } from '@/components/button/button';
import {
  DUMMY_START_DATE,
  IProjectROIComparisonChartDataWithPagination,
} from '@/interfaces/project_roi_comparison_chart';
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
  seriesData: number[][];
}

interface ColumnChartProps {
  data: ColumnChartData;
}

const ColumnChart = ({ data }: ColumnChartProps) => {
  const { layoutAssertion } = useGlobalCtx();

  const options: ApexOptions = {
    chart: {
      id: 'project-income-expense-chart',
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
        columnWidth: '55%',
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: layoutAssertion === LayoutAssertion.MOBILE ? 5 : 2,
      colors: ['transparent'], // Info: 讓每一個欄位裡面的 column 有空隙的方式 (20240419 - Shirley)
    },

    colors: ['#4BD394B2', '#FB5C5CB2'],
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
    yaxis: {
      title: {
        // text: 'Values (units)',
      },
      labels: {
        style: {
          colors: '#919EB4',
          fontFamily: 'Barlow',
          fontSize: '12px',
        },
      },
    },
    legend: {
      show: true,
      position: 'bottom',
      horizontalAlign: 'left',

      fontFamily: 'Barlow',
      fontWeight: 500,
      markers: {
        fillColors: ['#4BD394B2', '#FB5C5CB2'],
        // width: 20, // 標記的寬度
        // height: 12, // 標記的高度
        // radius: 0, // 標記的半徑（如果是圓形）
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
      y: {
        formatter: function t(val: number) {
          return val + ' K';
        },
      },
    },
  };

  const series = [
    {
      name: 'Income',
      data: data.seriesData[0],
    },
    {
      name: 'Expense',
      data: data.seriesData[1],
    },
  ];

  return <Chart options={options} series={series} type="bar" height={400} />;
};

const defaultSelectedPeriodInSec = getPeriodOfThisMonthInSec();

const ProjectRoiComparisonChart = () => {
  const { t } = useTranslation('common');
  const { selectedCompany } = useUserCtx();
  const { toastHandler, layoutAssertion } = useGlobalCtx();

  const minDate = new Date(DUMMY_START_DATE);
  const maxDate = new Date();

  const [period, setPeriod] = useState(defaultSelectedPeriodInSec);
  const [series, setSeries] = useState<number[][]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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
    layoutAssertion === LayoutAssertion.DESKTOP ? '' : '-translate-x-70%';

  const {
    trigger: listProjectProfitComparison,
    data: profitComparison,
    success: listSuccess,
    code: listCode,
    error: listError,
  } = APIHandler<IProjectROIComparisonChartDataWithPagination>(
    APIName.PROJECT_LIST_PROFIT_COMPARISON,
    {
      params: {
        companyId: selectedCompany?.id ?? FREE_COMPANY_ID,
      },
      query: {
        page: currentPage,
        perPage: ITEMS_PER_PAGE_ON_DASHBOARD,
        startDate: period.startTimeStamp,
        endDate: period.endTimeStamp,
      },
    },
    true
  );

  const isNoData = profitComparison?.empty || !profitComparison || !listSuccess;

  useEffect(() => {
    if (listSuccess && profitComparison) {
      const {
        series: newSeries,
        categories: newCategories,
        totalPages: newTotalPages,
      } = profitComparison;
      setSeries(newSeries);
      setCategories(newCategories);
      setTotalPages(newTotalPages);
    }
    if (listSuccess === false) {
      toastHandler({
        id: `profit_comparison-${listCode}`,
        content: `${t('DASHBOARD.FAILED_TO_GET_PROFIT_COMPARISON')} ${listCode}`,
        type: ToastType.ERROR,
        closeable: true,
      });
    }
  }, [listSuccess, listCode, listError, profitComparison, currentPage]);

  const data = {
    categories,
    seriesData: series,
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      listProjectProfitComparison({
        params: {
          companyId: selectedCompany?.id ?? FREE_COMPANY_ID,
        },
        query: {
          page: currentPage + 1,
          perPage: ITEMS_PER_PAGE_ON_DASHBOARD,
          startDate: period.startTimeStamp,
          endDate: period.endTimeStamp,
        },
      });
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      listProjectProfitComparison({
        params: {
          companyId: selectedCompany?.id ?? FREE_COMPANY_ID,
        },
        query: {
          page: currentPage - 1,
          perPage: ITEMS_PER_PAGE_ON_DASHBOARD,
          startDate: period.startTimeStamp,
          endDate: period.endTimeStamp,
        },
      });
    }
  };

  useEffect(() => {
    listProjectProfitComparison({
      params: {
        companyId: selectedCompany?.id ?? FREE_COMPANY_ID,
      },
      query: {
        page: currentPage - 1,
        perPage: ITEMS_PER_PAGE_ON_DASHBOARD,
        startDate: period.startTimeStamp,
        endDate: period.endTimeStamp,
      },
    });
  }, [period]);

  const displayedDateSection = (
    <div className="my-auto text-xl font-bold leading-5 tracking-normal text-text-brand-primary-lv2">
      {displayedYear}{' '}
      <span className="text-sm font-semibold leading-5 tracking-normal text-text-brand-secondary-lv1">
        {displayedDate}
      </span>{' '}
    </div>
  );

  const displayedChart = isNoData ? (
    <div className="mt-28 lg:mt-40">
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
    <div className="mt-0 max-md:-ml-3 lg:mt-5">
      <ColumnChart data={data} />
    </div>
  );

  const displayedDataSection = (
    <div
      className={cn(
        'flex flex-col rounded-2xl bg-white px-5 pb-9 pt-5 max-md:max-w-full md:h-580px',
        isNoData ? 'h-580px' : 'h-580px'
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
                  fillRule="evenodd"
                  d="M17.138.378c.368-.369.922-.48 1.404-.28l3.647 1.513c.653.27.965 1.018.698 1.673l-1.488 3.647a1.286 1.286 0 01-2.377.01l-.589-1.407-14.807 6.33a1.286 1.286 0 11-1.01-2.365L17.44 3.162l-.578-1.38a1.286 1.286 0 01.275-1.404z"
                  clipRule="evenodd"
                ></path>
                <path
                  fill="#002462"
                  fillRule="evenodd"
                  d="M21.857 9.393a1.714 1.714 0 011.715 1.715v12a.857.857 0 01-.858.857H18.43a.857.857 0 01-.857-.857v-12a1.715 1.715 0 011.714-1.715h2.571zm-8.571 2.572A1.714 1.714 0 0115 13.679v9.429a.857.857 0 01-.857.857H9.857A.857.857 0 019 23.108v-9.429a1.714 1.714 0 011.714-1.714h2.572zm-7.36 3.073a1.714 1.714 0 00-1.212-.502H2.143a1.714 1.714 0 00-1.714 1.715v6.857c0 .473.383.857.857.857h4.286a.857.857 0 00.857-.857V16.25c0-.455-.18-.891-.502-1.213z"
                  clipRule="evenodd"
                ></path>
              </svg>
              <p className="text-base lg:text-sm xl:text-base">
                {t('PROJECT.PROJECT_WISE')} <br className="lg:hidden" />
                <span className="lg:hidden">{t('PROJECT.INCOME_VS_EXPENSE')}</span>
                <span className="hidden lg:inline">
                  {t('PROJECT.INCOME_VS_EXPENSE_COMPARISON_GRAPH')}
                </span>
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

      <div className="mt-5">
        <div className="flex w-full flex-col items-start justify-start lg:flex-row lg:items-center lg:space-x-4">
          <div className="flex w-full flex-row justify-center gap-5 lg:justify-start">
            <div className="my-3 flex w-150px items-stretch text-xl font-bold leading-8 text-navyBlue2 md:mx-0 md:my-auto lg:w-fit">
              {displayedDateSection}
            </div>

            {/* Info: ----- desktop version (20240419 - Shirley) ----- */}
            <div className="hidden lg:flex">
              <DatePicker
                disabled={isNoData}
                type={DatePickerType.ICON_PERIOD}
                minDate={minDate}
                maxDate={maxDate}
                period={period}
                setFilteredPeriod={setPeriod}
                alignCalendar={alignCalendarPart}
                calenderClassName={customCalendarAlignment}
              />
            </div>
          </div>

          {/* Info: prev and next button (20240419 - Shirley) */}
          <div className="hidden flex-1 justify-end space-x-2 lg:flex">
            <Button
              disabled={currentPage === 1 || isNoData}
              onClick={goToPrevPage}
              variant={'tertiaryOutline'}
              className="rounded-xs border border-secondaryBlue p-3 text-secondaryBlue hover:border-primaryYellow hover:text-primaryYellow disabled:border-lightGray disabled:text-lightGray disabled:hover:border-lightGray disabled:hover:text-lightGray"
            >
              <AiOutlineLeft size={15} />
            </Button>

            <Button
              disabled={currentPage === totalPages || isNoData}
              onClick={goToNextPage}
              variant={'tertiaryOutline'}
              className="rounded-xs border border-secondaryBlue p-3 text-secondaryBlue hover:border-primaryYellow hover:text-primaryYellow disabled:border-lightGray disabled:text-lightGray disabled:hover:border-lightGray disabled:hover:text-lightGray"
            >
              <AiOutlineRight size={15} />
            </Button>
          </div>

          {/* Info: ----- mobile version (20240419 - Shirley) ----- */}
          <div className="flex w-full flex-row justify-between lg:hidden lg:w-0">
            <div>
              <DatePicker
                disabled={isNoData}
                type={DatePickerType.ICON_PERIOD}
                minDate={minDate}
                maxDate={maxDate}
                period={period}
                setFilteredPeriod={setPeriod}
              />
            </div>

            {/* Info: prev and next button (20240419 - Shirley) */}
            {/* Deprecated: No relevant function in the latest mockup (20240618 - Shirley) */}
            <div className="flex flex-1 justify-end space-x-2">
              <Button
                disabled={currentPage === 1}
                onClick={goToPrevPage}
                variant={'tertiaryOutline'}
                className="rounded-xs border border-secondaryBlue p-3 text-secondaryBlue hover:border-primaryYellow hover:text-primaryYellow disabled:border-lightGray disabled:text-lightGray disabled:hover:border-lightGray disabled:hover:text-lightGray"
              >
                <AiOutlineLeft size={15} />
              </Button>

              <Button
                disabled={currentPage === totalPages}
                onClick={goToNextPage}
                variant={'tertiaryOutline'}
                className="rounded-xs border border-secondaryBlue p-3 text-secondaryBlue hover:border-primaryYellow hover:text-primaryYellow disabled:border-lightGray disabled:text-lightGray disabled:hover:border-lightGray disabled:hover:text-lightGray"
              >
                <AiOutlineRight size={15} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {displayedChart}
    </div>
  );
  return <div>{displayedDataSection}</div>;
};

export default ProjectRoiComparisonChart;
