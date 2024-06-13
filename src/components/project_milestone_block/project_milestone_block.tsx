import Image from 'next/image';
import { stageList, stageColorMap, ProjectStage } from '@/constants/project';
import { IMilestone } from '@/interfaces/project';
import { timestampToString } from '@/lib/utils/common';
import MilestoneCalendar from '@/components/milestone_calendar/milestone_calendar';
import { IDatePeriod } from '@/interfaces/date_period';

const dummyMilestone: IMilestone[] = [
  {
    id: 0,
    projectId: 1,
    status: stageList[0],
    startDate: 1699863143,
    endDate: 1703952000,
    createdAt: 1699863143,
    updatedAt: 1703952000,
  },
  {
    id: 1,
    projectId: 1,
    status: stageList[1],
    startDate: 1703952000,
    endDate: 1708617600,
    createdAt: 1703952000,
    updatedAt: 1708617600,
  },
  {
    id: 2,
    projectId: 1,
    status: stageList[2],
    startDate: 1708617600,
    endDate: 1712218457,
    createdAt: 1708617600,
    updatedAt: 1712218457,
  },
  {
    id: 3,
    projectId: 1,
    status: stageList[3],
    startDate: 1712218457,
    endDate: 1717776000,
    createdAt: 1712218457,
    updatedAt: 1717776000,
  },
  {
    id: 4,
    projectId: 1,
    status: stageList[4],
    startDate: 1717776000,
    endDate: 0,
    createdAt: 1717776000,
    updatedAt: 0,
  },
  {
    id: 5,
    projectId: 1,
    status: stageList[5],
    startDate: 0,
    endDate: 0,
    createdAt: 0,
    updatedAt: 0,
  },
];

const ProjectMilestoneBlock = () => {
  const getMilestonePeriod = (milestone: IMilestone) => {
    const result: IDatePeriod = {
      startTimeStamp: milestone.startDate,
      endTimeStamp: milestone.endDate,
    };
    return result;
  };

  const displayMilestoneDesktop = dummyMilestone.map((item) => {
    const stageColor = stageColorMap[item.status as ProjectStage];
    const numDays =
      item.startDate === 0 || item.endDate === 0
        ? '-'
        : Math.ceil((item.endDate - item.startDate) / 86400);

    return (
      <>
        {/* Info: (20240613 - Julian) Stage Title */}
        <div
          key={`${item.id}-stage-title`}
          className={`flex w-100px items-center gap-6px rounded-xs border p-6px text-xs ${stageColor.border} ${stageColor.text}`}
        >
          <div className={`${stageColor.bg} h-6px w-6px rounded-full`}></div>
          <p>{item.status}</p>
        </div>

        {/* Info: (20240613 - Julian) Period */}
        <div
          key={`${item.id}-period`}
          className="flex items-center justify-center gap-16px text-sm"
        >
          <p className="w-80px whitespace-normal text-right">
            {timestampToString(item.startDate).date}
          </p>
          <p className="text-text-neutral-secondary">to</p>
          <p className="w-80px whitespace-normal text-left">
            {timestampToString(item.endDate).date}
          </p>
        </div>

        {/* Info: (20240613 - Julian) Number of Days */}
        <div key={`${item.id}-num-days`} className="ml-auto flex items-center gap-8px">
          <p>{numDays}</p>
          <p className="text-text-neutral-secondary">Days</p>
        </div>
      </>
    );
  });

  const displayMilestoneMobile = dummyMilestone.map((item) => {
    const stageColor = stageColorMap[item.status as ProjectStage];

    return (
      <div className="flex items-center gap-8px">
        {/* Info: (20240613 - Julian) Stage Title */}
        <div
          key={`${item.id}-stage-title`}
          className={`flex w-100px items-center gap-6px rounded-xs border p-6px text-xs ${stageColor.border} ${stageColor.text}`}
        >
          <div className={`${stageColor.bg} h-6px w-6px rounded-full`}></div>
          <p>{item.status}</p>
        </div>

        {/* Info: (20240613 - Julian) Period */}
        <div
          key={`${item.id}-period`}
          className="flex flex-1 justify-center gap-16px text-center text-xs"
        >
          <p className="w-65px whitespace-normal text-right">
            {timestampToString(item.startDate).date}
          </p>
          <p className="text-text-neutral-secondary">to</p>
          <p className="w-65px whitespace-normal text-left">
            {timestampToString(item.endDate).date}
          </p>
        </div>
      </div>
    );
  });

  return (
    <div className="flex flex-col justify-between gap-32px rounded-lg bg-surface-neutral-surface-lv2 p-20px font-medium md:flex-row">
      {/* Info: (20240612 - Julian) Main Content */}
      <div className="flex flex-1 flex-col gap-y-16px">
        <div className="flex items-center gap-8px text-text-neutral-secondary">
          <Image src="/icons/milestone.svg" alt="Milestone Block" width={24} height={24} />
          <p>Milestone</p>
        </div>
        <div className="hidden grid-cols-3 gap-16px border-t border-divider-stroke-lv-4 p-10px md:grid">
          {displayMilestoneDesktop}
        </div>
        <div className="flex flex-col gap-16px border-t border-divider-stroke-lv-4 py-16px md:hidden">
          {displayMilestoneMobile}
        </div>
      </div>
      {/* Info: (20240612 - Julian) Calendar */}
      <div className="flex w-300px flex-col items-center py-10px md:px-10px">
        <MilestoneCalendar
          designingPeriod={getMilestonePeriod(dummyMilestone[0])}
          developingPeriod={getMilestonePeriod(dummyMilestone[1])}
          testingPeriod={getMilestonePeriod(dummyMilestone[2])}
          sellingPeriod={getMilestonePeriod(dummyMilestone[3])}
          soldPeriod={getMilestonePeriod(dummyMilestone[4])}
        />
      </div>
    </div>
  );
};

export default ProjectMilestoneBlock;
