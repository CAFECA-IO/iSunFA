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

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const DUMMY_START_DATE = '2024/02/12';
const DUMMY_END_DATE = 'TODAY';

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
  const options = {
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
    fill: {
      opacity: 1,
    },
    tooltip: {
      // y: {
      //   formatter: function (val: number) {
      //     return val + ' units';
      //   },
      // },

      // x: {
      //   show: false,
      // },
      style: {
        fontFamily: 'Barlow',
        fontSize: '12px',
      },
      marker: {
        show: false,
      },
    },
  };

  return (
    <div className="rounded bg-white p-5 shadow">
      <Chart options={options} series={data.series} type="bar" height={200} />
    </div>
  );
};

const ProjectProgressChart = () => {
  const { t }: { t: TranslateFunction } = useTranslation('common');

  const minDate = new Date(DUMMY_START_DATE);
  const maxDate = new Date();

  const [period, setPeriod] = useState(default30DayPeriodInSec);
  const [series, setSeries] = useState<
    {
      name: string;
      data: number[];
    }[]
  >([]);
  const [demoToggle, setDemoToggle] = useState(true);

  const displayedYear = maxDate.getFullYear();
  const displayedMonth = period.startTimeStamp
    ? MONTH_ABR_LIST[new Date(period.startTimeStamp * MILLISECONDS_IN_A_SECOND).getMonth()]
    : MONTH_ABR_LIST[maxDate.getMonth()];

  const displayedDate = `${displayedYear} ${t(displayedMonth)}`;

  const categories = ['Designing', 'Beta Testing', 'Develop', 'Sold', 'Selling', 'Archived'];

  useEffect(() => {
    // Info: generate series when period change is done (20240418 - Shirley)
    // if (period.endTimeStamp === 0) return;
    if (demoToggle) {
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

      setDemoToggle(false);
    } else if (period.endTimeStamp !== 0) {
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

  const displayedDataSection = (
    <div className="dashboardCardShadow flex h-450px flex-col rounded-3xl bg-white px-5 pb-9 pt-5 max-md:max-w-full">
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
          <div className="my-auto text-xl font-bold leading-8 text-navyBlue2">{displayedDate}</div>
          <DatePicker
            type={DatePickerType.ICON}
            minDate={minDate}
            maxDate={maxDate}
            period={period}
            setFilteredPeriod={setPeriod}
          />
        </div>
      </div>

      <div className="mt-2 md:mt-5">
        <ColumnChart data={dummyData} />
      </div>
    </div>
  );
  return <div>{displayedDataSection}</div>;
};

export default ProjectProgressChart;
