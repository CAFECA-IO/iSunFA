import Image from 'next/image';

const ProjectMilestoneBlock = () => {
  return (
    <div className="flex flex-col justify-between gap-32px rounded-lg bg-surface-neutral-surface-lv2 p-20px font-medium md:flex-row">
      {/* Info: (20240612 - Julian) Main Content */}
      <div className="flex flex-1 flex-col gap-y-16px">
        <div className="flex items-center gap-8px text-text-neutral-secondary">
          <Image src="/icons/milestone.svg" alt="Milestone Block" width={24} height={24} />
          <p>Milestone</p>
        </div>
        <div className="border p-10px">milestone</div>
      </div>
      {/* Info: (20240612 - Julian) Calendar */}
      <div className="border p-10px">Calendar</div>
    </div>
  );
};

export default ProjectMilestoneBlock;
