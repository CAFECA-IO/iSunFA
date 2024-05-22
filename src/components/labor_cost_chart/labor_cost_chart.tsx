import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';
import Tooltip from '@/components/tooltip/tooltip';
import { generateRandomLaborCostData } from '@/interfaces/labor_cost_chart';
import { useGlobalCtx } from '@/contexts/global_context';
import useStateRef from 'react-usestateref';
import { DUMMY_START_DATE } from '@/interfaces/project_progress_chart';
import { getPeriodOfThisMonthInSec } from '@/lib/utils/common';
import { MILLISECONDS_IN_A_SECOND } from '@/constants/display';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface PieChartData {
  categories: string[];
  series: number[];
}

interface PieChartProps {
  data: PieChartData;
}

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
        const presentWidth = 260;
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
    colors: ['#9B8AFB', '#FD853A', '#FD6F8E', '#8098F9', '#6CDEA0', '#F670C7'],

    labels: data.categories,
    legend: {
      position: legendPosition,
      offsetY,
      offsetX: -30,
      markers: {
        width: 20, // 標記的寬度
        height: 12, // 標記的高度
        radius: 0, // 標記的半徑（如果是圓形）
      },
      width: space, // Info: 讓 legend 跟 pie chart 之間的距離拉開 (20240522 - Shirley)
      height: 140,
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

const defaultSelectedPeriodInSec = getPeriodOfThisMonthInSec();

const LaborCostChart = () => {
  // TODO: 串上 API (20240522 - Shirley)
  const minDate = new Date(DUMMY_START_DATE);
  const maxDate = new Date();
  const [period, setPeriod] = useState(defaultSelectedPeriodInSec);
  const [series, setSeries] = useState<number[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

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

  useEffect(() => {
    // Info: generate series when period change is done (20240418 - Shirley)
    if (period.endTimeStamp !== 0) {
      const randomNum = Math.floor(Math.random() * 10);
      const newData = generateRandomLaborCostData(randomNum);
      setSeries(newData.series);
      setCategories(newData.categories);
    }
  }, [period.endTimeStamp, period.startTimeStamp]);

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

  const displayedDataSection = (
    <div className="flex h-550px flex-col rounded-2xl bg-white px-5 pb-9 pt-5 max-md:max-w-full md:h-400px">
      <div>
        <div className="flex w-full justify-between gap-2 border-b border-stroke-neutral-secondary pb-2 text-base leading-8 text-text-neutral-secondary max-md:max-w-full max-md:flex-wrap">
          <div className="flex-1">
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
              <p>Labor cost</p>
            </div>
          </div>

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

      <div className="mt-5">
        <div className="flex flex-col justify-start max-md:space-y-2 md:mx-0 md:flex-row md:space-x-5">
          <div className="my-auto text-xl font-bold leading-8 text-text-brand-primary-lv2">
            {displayedDateSection}
          </div>
          <div className="w-10">
            <DatePicker
              type={DatePickerType.ICON}
              minDate={minDate}
              maxDate={maxDate}
              period={period}
              setFilteredPeriod={setPeriod}
            />
          </div>
          <div className="flex space-x-2 md:space-x-5">
            <div className=""></div>
            <div className=""></div>
            <div className=""></div>
          </div>
        </div>
        <div className="relative">
          {' '}
          <div className="absolute top-5 font-semibold text-text-brand-secondary-lv1">
            Onboarding Projects
          </div>
          <div className="ml-0 flex pt-14 max-md:ml-0 md:pt-5">
            <PieChart data={data} />
          </div>
        </div>
      </div>
    </div>
  );
  return <div>{displayedDataSection}</div>;
};

export default LaborCostChart;
