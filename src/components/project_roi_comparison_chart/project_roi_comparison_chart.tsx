/* eslint-disable */
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';
import Tooltip from '../tooltip/tooltip';
import { MILLISECONDS_IN_A_SECOND, MONTH_ABR_LIST } from '../../constants/display';
import { getPeriodOfThisMonthInSec } from '../../lib/utils/common';
import { useTranslation } from 'react-i18next';
import { TranslateFunction } from '../../interfaces/locale';
import DatePicker, { DatePickerType } from '../date_picker/date_picker';
import { AiOutlineLeft, AiOutlineRight } from 'react-icons/ai';
import { Button } from '../button/button';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface ColumnChartData {
  categories: string[];
  seriesData: number[][];
}

interface ColumnChartProps {
  data: ColumnChartData;
}

const ColumnChart = ({ data }: ColumnChartProps) => {
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
        horizontal: false,
        columnWidth: '55%',
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 2,
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
        formatter: function (val: number) {
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

  return <Chart options={options} series={series} type="bar" height={350} />;
};

const DUMMY_START_DATE = '2024/02/12';
const defaultSelectedPeriodInSec = getPeriodOfThisMonthInSec();

const ProjectRoiComparisonChart = () => {
  const { t }: { t: TranslateFunction } = useTranslation('common');

  const minDate = new Date(DUMMY_START_DATE);
  const maxDate = new Date();

  const [period, setPeriod] = useState(defaultSelectedPeriodInSec);
  const [series, setSeries] = useState<number[][]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const displayedYear = maxDate.getFullYear();
  const displayedMonth = period.startTimeStamp
    ? MONTH_ABR_LIST[new Date(period.startTimeStamp * MILLISECONDS_IN_A_SECOND).getMonth()]
    : MONTH_ABR_LIST[maxDate.getMonth()];

  const displayedDate = `${displayedYear} ${t(displayedMonth)}`;

  const categories = [
    'iSunFA',
    'BAIFA',
    'iSunOne',
    'TideBitEx',
    'ProjectE',
    'ProjectF',
    'ProjectG',
    'ProjectH',
    'ProjectI',
    'ProjectJ',
  ];

  useEffect(() => {
    if (period.endTimeStamp !== 0) {
      const newSeries = [
        Array.from({ length: categories.length }, () => Math.floor(Math.random() * 150) + 100),
        Array.from({ length: categories.length }, () => Math.floor(Math.random() * 150) + 100),
      ];

      setSeries(newSeries);
    }
  }, [period.endTimeStamp, period.startTimeStamp]);

  const itemsPerPage = 6;
  const totalPages = Math.ceil(categories.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCategories = categories.slice(startIndex, endIndex);
  const paginatedSeriesData = series.map((series: number[]) => series.slice(startIndex, endIndex));

  const dummyData = {
    categories: paginatedCategories,
    seriesData: paginatedSeriesData,
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const displayedDataSection = (
    <div className="dashboardCardShadow flex h-550px flex-col rounded-3xl bg-white px-5 pb-9 pt-5 max-md:max-w-full">
      <div>
        <div className="flex w-full justify-between gap-2 border-b border-navyBlue2 pb-2 text-2xl font-bold leading-8 text-navyBlue2 max-md:max-w-full max-md:flex-wrap">
          <div className="flex-1">Project ROI Comparison Graph</div>

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
        <div className="flex w-full flex-col items-start justify-start md:flex-row md:items-center md:space-x-4">
          <div className="my-auto flex w-100px items-stretch text-xl font-bold leading-8 text-navyBlue2 md:mx-2 lg:w-fit">
            {displayedDate}
          </div>

          <div className="hidden lg:block">
            <DatePicker
              type={DatePickerType.ICON}
              minDate={minDate}
              maxDate={maxDate}
              period={period}
              setFilteredPeriod={setPeriod}
            />
          </div>

          {/* Info: prev and next button (20240419 - Shirley) */}
          {/* Info: desktop version (20240419 - Shirley) */}
          <div className="hidden flex-1 justify-end space-x-2 lg:flex">
            <Button
              disabled={currentPage === 1}
              onClick={goToPrevPage}
              variant={'tertiaryOutline'}
              className="rounded-md border border-secondaryBlue p-3 text-secondaryBlue hover:border-primaryYellow hover:text-primaryYellow disabled:border-lightGray disabled:text-lightGray disabled:hover:border-lightGray disabled:hover:text-lightGray"
            >
              <AiOutlineLeft size={15} />
            </Button>

            <Button
              disabled={currentPage === totalPages}
              onClick={goToNextPage}
              variant={'tertiaryOutline'}
              className="rounded-md border border-secondaryBlue p-3 text-secondaryBlue hover:border-primaryYellow hover:text-primaryYellow disabled:border-lightGray disabled:text-lightGray disabled:hover:border-lightGray disabled:hover:text-lightGray"
            >
              <AiOutlineRight size={15} />
            </Button>
          </div>

          {/* Info: mobile version (20240419 - Shirley) */}
          <div className="flex w-full flex-row justify-between lg:hidden lg:w-0">
            <div>
              <DatePicker
                type={DatePickerType.ICON}
                minDate={minDate}
                maxDate={maxDate}
                period={period}
                setFilteredPeriod={setPeriod}
              />
            </div>

            {/* Info: prev and next button (20240419 - Shirley) */}
            <div className="flex flex-1 justify-end space-x-2">
              <Button
                disabled={currentPage === 1}
                onClick={goToPrevPage}
                variant={'tertiaryOutline'}
                className="rounded-md border border-secondaryBlue p-3 text-secondaryBlue hover:border-primaryYellow hover:text-primaryYellow disabled:border-lightGray disabled:text-lightGray disabled:hover:border-lightGray disabled:hover:text-lightGray"
              >
                <AiOutlineLeft size={15} />
              </Button>

              <Button
                disabled={currentPage === totalPages}
                onClick={goToNextPage}
                variant={'tertiaryOutline'}
                className="rounded-md border border-secondaryBlue p-3 text-secondaryBlue hover:border-primaryYellow hover:text-primaryYellow disabled:border-lightGray disabled:text-lightGray disabled:hover:border-lightGray disabled:hover:text-lightGray"
              >
                <AiOutlineRight size={15} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 max-md:-ml-3 md:mt-10">
        <ColumnChart data={dummyData} />
      </div>
    </div>
  );
  return <div>{displayedDataSection}</div>;
};

export default ProjectRoiComparisonChart;
