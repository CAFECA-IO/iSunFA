import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { ITeam } from '@/interfaces/team';
import { ISUNFA_ROUTE } from '@/constants/url';

const TeamItem: React.FC<ITeam> = ({ id, name, imageId, planType, role }) => {
  const { t } = useTranslation(['team']);

  return (
    <Link
      href={`${ISUNFA_ROUTE.TEAM_PAGE}/${id}`}
      className="group relative flex items-center gap-lv-7 overflow-hidden rounded-sm border-2 border-stroke-neutral-quaternary bg-surface-neutral-surface-lv2 px-lv-5 py-lv-3"
    >
      {/* Info: (20250226 - Julian) Hover background */}
      <div className="absolute left-0 top-0 h-full w-full bg-surface-brand-primary-5 opacity-0 group-hover:opacity-100"></div>
      {/* Icon: (20250217 - Julian) Avatar */}
      <div className="h-60px w-60px shrink-0 place-content-center overflow-hidden rounded-sm border border-stroke-neutral-quaternary bg-surface-neutral-main-background">
        <Image src={imageId} width={60} height={60} alt="team_avatar" />
      </div>
      <div className="flex flex-1 flex-col items-center gap-lv-2 tablet:flex-row tablet:gap-lv-4">
        {/* Info: (20250217 - Julian) Team name */}
        <div className="max-w-200px flex-1 truncate text-xl font-semibold text-text-brand-secondary-lv2 tablet:max-w-full">
          {name.value}
        </div>
        {/* Info: (20250217 - Julian) Tags */}
        <div className="flex gap-8px tablet:gap-lv-4">
          <div className="rounded-full bg-badge-surface-strong-secondary px-8px py-4px text-xs font-medium text-badge-text-invert">
            {t(`team:MY_ACCOUNT_PAGE.PLAN_${planType.value.toUpperCase()}`)}
          </div>
          <div className="rounded-full bg-badge-surface-soft-primary px-8px py-4px text-xs font-medium text-badge-text-primary-solid">
            {t(`team:MY_ACCOUNT_PAGE.ROLE_${role.toUpperCase()}`)}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default TeamItem;
