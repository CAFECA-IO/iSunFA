import Image from 'next/image';
import { stageList, stageColorMap } from '@/constants/project';

const ProjectMilestoneBlock = () => {
  const displayMilestone = stageList.map((stage) => {
    const stageColor = stageColorMap[stage];
    return (
      <div key={stage} className="flex items-center">
        <div
          className={`flex w-100px items-center gap-6px rounded-xs border p-6px text-xs ${stageColor.border} ${stageColor.text}`}
        >
          <div className={`${stageColor.bg} h-6px w-6px rounded-full`}></div>
          <p>{stage}</p>
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
        <div className="flex flex-col gap-16px border p-10px">{displayMilestone}</div>
      </div>
      {/* Info: (20240612 - Julian) Calendar */}
      <div className="border p-10px">Calendar</div>
    </div>
  );
};

export default ProjectMilestoneBlock;
