import React from 'react';
import Image from 'next/image';
import { ITeam } from '@/interfaces/team';

const TeamItem: React.FC<ITeam> = ({ name, profile, planType }) => {
  // ToDo: (20250217 - Julian) 缺少 my role 的資料

  return (
    <div className="flex items-center gap-lv-7 rounded-sm border-2 border-stroke-neutral-quaternary bg-surface-neutral-surface-lv2 px-lv-5 py-lv-3">
      {/* Icon: (20250217 - Julian) Avatar */}
      <div className="h-60px w-60px overflow-hidden rounded-sm border border-stroke-neutral-quaternary">
        <Image src={profile.value} width={60} height={60} alt="team_avatar" />
      </div>
      <div className="flex flex-1 items-center gap-lv-4">
        {/* Info: (20250217 - Julian) Team name */}
        <div className="flex-1 text-xl font-semibold text-text-brand-secondary-lv2">
          {name.value}
        </div>
        {/* Info: (20250217 - Julian) Tags */}
        <div className="rounded-full bg-badge-surface-strong-secondary px-lv-3 py-2px font-medium text-badge-text-invert">
          {planType.value}
        </div>
        <div className="rounded-full bg-badge-surface-soft-primary px-lv-3 py-2px font-medium text-badge-text-primary-solid">
          &#123;my role&#125;
        </div>
      </div>
    </div>
  );
};

export default TeamItem;
