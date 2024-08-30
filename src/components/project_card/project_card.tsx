import Image from 'next/image';
import Link from 'next/link';
import { ProjectStage, stageColorMap } from '@/constants/project';
import { IProject } from '@/interfaces/project';
import { numberWithCommas } from '@/lib/utils/common';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useTranslation } from 'next-i18next';

interface IProjectCardProps {
  project: IProject;
}

const ProjectCard = ({ project }: IProjectCardProps) => {
  const { t } = useTranslation([
    'common',
    'project',
    'journal',
    'kyc',
    'report_401',
    'salary',
    'setting',
    'terms',
  ]);
  const { name, contractAmount, income, expense, profit, stage, members } = project;

  const stageColor = stageColorMap[stage as ProjectStage].bg ?? 'bg-surface-neutral-mute';

  // Info: (2024607 - Julian) 最多顯示 7 位成員，超過的部分用「+n」表示
  const displayMembers =
    members.length > 7 ? (
      <>
        {members.slice(0, 7).map((member) => (
          <Image
            src={member.imageId}
            width={24}
            height={24}
            key={member.name}
            alt="member_avatar"
            className="rounded-full border-2 border-avatar-stroke-primary"
          />
        ))}
        <div className="flex h-24px w-24px items-center justify-center rounded-full border-2 border-avatar-stroke-primary bg-avatar-surface-background-number text-xs text-avatar-text-primary">
          +{members.length - 7}
        </div>
      </>
    ) : (
      members.map((member) => (
        <Image
          src={member.imageId}
          width={24}
          height={24}
          key={member.name}
          alt="member_avatar"
          className="rounded-full border-2 border-avatar-stroke-primary"
        />
      ))
    );

  return (
    <Link
      href={`${ISUNFA_ROUTE.PROJECT_LIST}/${project.id}/dashboard`}
      className="relative flex w-full flex-none flex-col gap-y-16px overflow-hidden rounded-sm bg-surface-neutral-surface-lv1 p-16px shadow-md"
    >
      <div className="flex items-center gap-x-8px">
        {/* Info: (2024606 - Julian) Title */}
        <h2 className="text-2xl font-bold text-text-neutral-primary">{name}</h2>
        <div className="flex h-24px w-24px items-center justify-center rounded-full bg-badge-surface-soft-primary text-xs text-badge-text-primary-solid">
          {contractAmount}
        </div>
      </div>
      {/* Info: (2024606 - Julian) Members, -space-x-6px is for the overlap */}
      <div className="flex items-center -space-x-6px">{displayMembers}</div>
      {/* Info: (2024606 - Julian) Divider */}
      <hr className="border-divider-stroke-lv-4" />
      {/* Info: (2024606 - Julian) Content */}
      <div className="flex flex-col gap-y-14px text-sm">
        <div className="flex items-center gap-x-16px">
          <p className="w-52px text-text-neutral-tertiary">{t('project:PROJECT.INCOME')}</p>
          <p className="font-semibold text-text-neutral-primary">{numberWithCommas(income)}</p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-x-16px">
            <p className="w-52px text-text-neutral-tertiary">{t('project:PROJECT.EXPENSE')}</p>
            <p className="font-semibold text-text-neutral-primary">{numberWithCommas(expense)}</p>
          </div>
          <div className="flex items-center gap-x-16px">
            <p className="text-text-neutral-tertiary">{t('project:PROJECT.PROFIT')}</p>
            <p className="font-semibold text-text-neutral-primary">{numberWithCommas(profit)}</p>
          </div>
        </div>
      </div>
      {/* Info: (2024606 - Julian) Status */}
      <div
        className={`absolute -right-4 rounded-xs ${stageColor} ${stage === ProjectStage.ARCHIVED ? 'text-text-neutral-mute' : 'text-badge-text-invert'} py-4px pl-12px pr-28px text-xs`}
      >
        {t(`project:STAGE_NAME_MAP.${stage.toUpperCase().replace(/ /g, '_')}`)}
      </div>
    </Link>
  );
};

export default ProjectCard;
