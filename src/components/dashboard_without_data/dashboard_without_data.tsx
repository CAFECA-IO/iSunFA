import { useTranslation } from 'next-i18next';
import Image from 'next/image';

const DashboardWithoutData = () => {
  const { t } = useTranslation('common');
  const displayedPageBody = (
    <div>
      {/* Info: (20240415 - Shirley) empty icon section */}
      <div className="flex h-screen w-full items-center justify-center">
        {' '}
        <section className="flex flex-col items-center">
          <div>
            <Image src="/icons/empty_box.svg" alt="empty_box" width={48} height={69}></Image>
          </div>
          <div className="text-h6 font-semibold leading-h6 text-text-neutral-tertiary">
            {t('common:COMMON.EMPTY')}
          </div>
        </section>
      </div>
    </div>
  );

  return <div>{displayedPageBody}</div>;
};

export default DashboardWithoutData;
