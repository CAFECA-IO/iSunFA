/* eslint-disable */
import React, { useEffect, useState } from 'react';
import DatePicker, { DatePickerType } from '../date_picker/date_picker';
import {
  MILLISECONDS_IN_A_SECOND,
  MONTH_ABR_LIST,
  default30DayPeriodInSec,
} from '../../constants/display';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';
import { TranslateFunction } from '../../interfaces/locale';
import { useTranslation } from 'react-i18next';
import Tooltip from '../tooltip/tooltip';
import { getPeriodOfThisMonthInSec } from '../../lib/utils/common';

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
        horizontal: false,
        columnWidth: '55%',
      },
    },
    dataLabels: {
      enabled: false,
    },

    stroke: {
      show: false,
      width: 2,
      colors: ['#002462B2'],
    },
    colors: ['#002462B2'],

    xaxis: {
      categories: data.categories,
      // categories: ['Designing', 'Beta Testing', 'Develop', 'Sold', 'Selling', 'Archived'],
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
    legend: {
      show: true,
      position: 'bottom',
      horizontalAlign: 'left',

      customLegendItems: ['Projects'],
      fontFamily: 'Barlow',
      fontWeight: 500,
      markers: {
        fillColors: ['#002462B2'],
        width: 20, // 標記的寬度
        height: 12, // 標記的高度
        radius: 0, // 標記的半徑（如果是圓形）
      },
      showForSingleSeries: true,
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
      // y: {
      //   formatter: function (val: number) {
      //     return val + ' units';
      //   },
      // },

      // x: {
      //   show: false,
      // },
    },
  };

  return <Chart options={options} series={data.series} type="bar" height={200} />;
};

const DUMMY_START_DATE = '2024/02/12';
const defaultSelectedPeriodInSec = getPeriodOfThisMonthInSec();

const ProjectProgressChart = () => {
  const { t }: { t: TranslateFunction } = useTranslation('common');

  const minDate = new Date(DUMMY_START_DATE);
  const maxDate = new Date();

  const [period, setPeriod] = useState(defaultSelectedPeriodInSec);
  const [series, setSeries] = useState<
    {
      name: string;
      data: number[];
    }[]
  >([]);

  const displayedYear = maxDate.getFullYear();

  // Deprecate: 在還沒有選好 endTimestamp 顯示 2024 May 的做法 (20240523 - Shirley)
  // const displayedMonth = period.startTimeStamp
  //   ? MONTH_ABR_LIST[new Date(period.startTimeStamp * MILLISECONDS_IN_A_SECOND).getMonth()]
  //   : MONTH_ABR_LIST[maxDate.getMonth()];
  // const displayedYearAndMonth = `${displayedYear} ${t(displayedMonth)}`;

  const displayedDate = (() => {
    const startDate = period.startTimeStamp
      ? new Date(period.startTimeStamp * MILLISECONDS_IN_A_SECOND)
      : new Date();

    // Deprecate: 在還沒有選好 endTimestamp 顯示 2024 May 的做法 (20240523 - Shirley)
    // if (!period.endTimeStamp) {
    //   return displayedYearAndMonth;
    // }

    const endDate = period.endTimeStamp
      ? new Date(period.endTimeStamp * MILLISECONDS_IN_A_SECOND)
      : new Date();

    const startDateStr = `${(startDate.getMonth() + 1).toString().padStart(2, '0')}/${startDate.getDate().toString().padStart(2, '0')}`;
    const endDateStr = `${(endDate.getMonth() + 1).toString().padStart(2, '0')}/${endDate.getDate().toString().padStart(2, '0')}`;

    return startDateStr === endDateStr ? `${startDateStr}` : `${startDateStr} ~ ${endDateStr}`;
  })();

  const categories = ['Designing', 'Beta Testing', 'Develop', 'Sold', 'Selling', 'Archived'];

  useEffect(() => {
    // Info: generate series when period change is done (20240418 - Shirley)
    if (period.endTimeStamp !== 0) {
      const newSeries = [
        {
          name: 'Units',
          data: [
            Math.floor(Math.random() * 200),
            Math.floor(Math.random() * 200),
            Math.floor(Math.random() * 200),
            Math.floor(Math.random() * 200),
            Math.floor(Math.random() * 200),
            Math.floor(Math.random() * 200),
          ],
        },
      ];
      setSeries(newSeries);
    }
  }, [period.endTimeStamp, period.startTimeStamp]);

  const dummyData = {
    categories,
    series: series,
  };

  const displayedDateSection = (
    <div className="text-neutral-primary my-auto text-xl font-bold leading-5 tracking-normal">
      {displayedYear}{' '}
      <span className="text-sm font-semibold leading-5 tracking-normal">{displayedDate}</span>{' '}
    </div>
  );

  const displayedDataSection = (
    <div className="dashboardCardShadow flex h-400px flex-col rounded-3xl bg-white px-5 pb-9 pt-5 max-md:max-w-full">
      <div>
        <div className="flex w-full justify-between gap-2 border-b border-navyBlue2 pb-2 text-2xl font-bold leading-8 text-navyBlue2 max-md:max-w-full max-md:flex-wrap">
          <div className="flex-1">Project Progress Chart</div>

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
          <div className="my-auto text-xl font-bold leading-8 text-navyBlue2 md:mx-2">
            {displayedDateSection}
          </div>
          <div>
            <DatePicker
              type={DatePickerType.ICON}
              minDate={minDate}
              maxDate={maxDate}
              period={period}
              setFilteredPeriod={setPeriod}
            />
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

export default ProjectProgressChart;
