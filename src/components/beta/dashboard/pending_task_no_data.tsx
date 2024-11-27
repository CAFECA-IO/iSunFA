import Image from 'next/image';
import { useTranslation } from 'next-i18next';

const PendingTaskNoData = () => {
  const { t } = useTranslation('dashboard');

  return (
    <section className="flex flex-col gap-24px">
      <h3 className="text-xl font-bold text-text-neutral-secondary">
        {t('dashboard:DASHBOARD.PENDING_TASKS')}
      </h3>
      <div className="flex flex-col items-center">
        <Image src={'/images/empty.svg'} alt="empty_image" width={120} height={134.787}></Image>
        <p className="text-base font-medium text-text-neutral-mute">
          {t('dashboard:DASHBOARD.NO_DATA')}
        </p>
      </div>
    </section>
  );
};

export default PendingTaskNoData;
