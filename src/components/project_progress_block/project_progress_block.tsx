import Image from 'next/image';
import ProgressCircle from '@/components/progress_circle/progress_circle';
import { useTranslation } from 'next-i18next';

const ProjectProgressBlock = () => {
  const { t } = useTranslation('common');
  // ToDo: [Beta] (20240612 - Julian) replace with actual data
  const progress = 64;

  return (
    <div className="flex h-full flex-col items-center gap-26px rounded-lg bg-surface-neutral-surface-lv2 p-20px font-medium md:items-stretch">
      <div className="flex items-center gap-8px text-text-neutral-secondary">
        <Image src="/icons/progress.svg" width={24} height={24} alt="progress_icon" />
        <p>{t('COMMON.PROGRESS')}</p>
      </div>
      <div className="flex items-center gap-24px">
        <div className="flex items-center gap-10px">
          <div className="block h-8px w-8px rounded-full bg-surface-brand-primary"></div>
          <p>{t('PROJECT.COMPLETED')}</p>
        </div>
        <div className="flex items-center gap-10px">
          <div className="block h-8px w-8px rounded-full bg-surface-neutral-depth"></div>
          <p>{t('PROJECT.REMAINING')}</p>
        </div>
      </div>
      <div className="mx-auto flex-1">
        <ProgressCircle size={160} progress={progress} color="#FFA502" />
      </div>
    </div>
  );
};

export default ProjectProgressBlock;
