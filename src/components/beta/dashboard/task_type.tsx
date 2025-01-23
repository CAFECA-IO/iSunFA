import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { PendingTaskIconName, TaskTitle } from '@/interfaces/pending_task';

const TaskType = ({ iconName, title }: { iconName: PendingTaskIconName; title: TaskTitle }) => {
  const { t } = useTranslation('dashboard');

  return (
    <div className="flex items-center gap-8px">
      <Image
        src={`/icons/${iconName}.svg`}
        alt={'pending_task_type_icon'}
        width={22}
        height={22}
        className="h-22px w-22px"
      ></Image>
      <h4 className="text-xs font-semibold text-text-neutral-primary">
        {t(`dashboard:DASHBOARD.${title}`)}
      </h4>
    </div>
  );
};

export default TaskType;
