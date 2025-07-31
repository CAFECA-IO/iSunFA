import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { PendingTaskIconName, TaskTitle } from '@/interfaces/pending_task';
import { cn } from '@/lib/utils/common';

interface TaskTypeProps {
  iconName: PendingTaskIconName;
  title: TaskTitle;
  alwaysNeedTitle?: boolean;
}
const TaskType = ({ iconName, title, alwaysNeedTitle }: TaskTypeProps) => {
  const { t } = useTranslation('dashboard');

  return (
    <div className="flex items-center gap-8px">
      <Image
        src={`/icons/${iconName}.svg`}
        alt={'pending_task_type_icon'}
        width={22}
        height={22}
        className="h-22px w-22px flex-none"
      />
      <h4
        className={cn('hidden text-xs font-semibold text-text-neutral-primary tablet:block', {
          block: alwaysNeedTitle,
        })}
      >
        {t(`dashboard:DASHBOARD.${title}`)}
      </h4>
    </div>
  );
};

export default TaskType;
