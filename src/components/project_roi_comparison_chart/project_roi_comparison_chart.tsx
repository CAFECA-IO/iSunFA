import { AiOutlineLeft, AiOutlineRight } from 'react-icons/ai';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';
import Tooltip from '@/components/tooltip/tooltip';
import {
  DEFAULT_DISPLAYED_COMPANY_ID,
  DatePickerAlign,
  ITEMS_PER_PAGE_ON_DASHBOARD,
  MILLISECONDS_IN_A_SECOND,
} from '@/constants/display';
import { getPeriodOfThisMonthInSec } from '@/lib/utils/common';
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
      id: 'project-ROI-chart',
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
        companyId: selectedCompany?.id ?? DEFAULT_DISPLAYED_COMPANY_ID,
      },
      query: {
        page: currentPage,
        perPage: ITEMS_PER_PAGE_ON_DASHBOARD,
        startDate: period.startTimeStamp,
        endDate: period.endTimeStamp,
      },
    }
  );

  useEffect(() => {
    if (listSuccess && profitComparison) {
      const {
        series: newSerices,
        categories: newCategories,
        totalPages: newTotalPages,
      } = profitComparison;
      setSeries(newSerices);
      setCategories(newCategories);
      setTotalPages(newTotalPages);
    }
    if (listSuccess === false) {
      toastHandler({
        id: `profit_comparison-${listCode}`,
        content: `Failed to get profit comparison. Error code: ${listCode}`,
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
          companyId: selectedCompany?.id ?? DEFAULT_DISPLAYED_COMPANY_ID,
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
          companyId: selectedCompany?.id ?? DEFAULT_DISPLAYED_COMPANY_ID,
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
        companyId: selectedCompany?.id ?? DEFAULT_DISPLAYED_COMPANY_ID,
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

  const displayedDataSection = (
    <div className="flex h-630px flex-col rounded-2xl bg-white px-5 pb-9 pt-5 max-md:max-w-full md:h-580px">
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
                Project-wise <br className="lg:hidden" />
                <span className="lg:hidden">Income vs. Expense</span>
                <span className="hidden lg:inline">Income vs. Expense Comparison Graph</span>
              </p>
            </div>
          </div>

          <div className="hidden justify-end lg:flex">
            <Tooltip>
              <p>
                A message which appears when a cursor is positioned over an icon, image, hyperlink,
                or other element in a graphical user interface.
              </p>
            </Tooltip>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex w-full flex-col items-start justify-start lg:flex-row lg:items-center lg:space-x-4">
          <div className="flex w-full flex-row justify-center lg:justify-start">
            <div className="my-3 flex w-150px items-stretch text-xl font-bold leading-8 text-navyBlue2 md:mx-0 md:my-auto lg:w-fit">
              {displayedDateSection}
            </div>

            {/* Info: ----- desktop version (20240419 - Shirley) ----- */}
            <div className="">
              <DatePicker
                type={DatePickerType.ICON}
                minDate={minDate}
                maxDate={maxDate}
                period={period}
                setFilteredPeriod={setPeriod}
                alignCalendar={alignCalendarPart}
              />
            </div>
          </div>

          {/* Info: prev and next button (20240419 - Shirley) */}
          <div className="hidden flex-1 justify-end space-x-2 lg:flex">
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

          {/* Info: ----- mobile version (20240419 - Shirley) ----- */}
          <div className="flex w-full flex-row justify-between lg:hidden lg:w-0">
            {/* <div>
              <DatePicker
                type={DatePickerType.ICON}
                minDate={minDate}
                maxDate={maxDate}
                period={period}
                setFilteredPeriod={setPeriod}
              />
            </div> */}

            {/* Info: prev and next button (20240419 - Shirley) */}
            {/* Deprecated: No relevant function in the latest mockup (20240618 - Shirley) */}
            {/* <div className="flex flex-1 justify-end space-x-2">
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
            </div> */}
          </div>
        </div>
      </div>

      <div className="mt-0 max-md:-ml-3 lg:mt-5">
        <ColumnChart data={data} />
      </div>
    </div>
  );
  return <div>{displayedDataSection}</div>;
};

export default ProjectRoiComparisonChart;
