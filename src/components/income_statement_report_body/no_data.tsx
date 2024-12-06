import { useTranslation } from 'next-i18next';
import Image from 'next/image';

const NoData = () => {
  const { t } = useTranslation('reports');
  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <Image src="/elements/empty.png" alt="No data image" width={120} height={135} />
      <div>
        <p className="text-neutral-300">{t('reports:REPORT.NO_DATA_AVAILABLE')}</p>
        <p className="text-neutral-300">{t('reports:REPORT.PLEASE_SELECT_PERIOD')}</p>
      </div>
    </div>
  );
};

export default NoData;
