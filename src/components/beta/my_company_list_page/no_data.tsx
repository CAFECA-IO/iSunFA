import Image from 'next/image';
import { useTranslation } from 'react-i18next';

const NoData = () => {
  const { t } = useTranslation(['company']);

  return (
    <section className="flex flex-auto flex-col items-center justify-center gap-16px">
      <Image src={'/images/empty.svg'} alt="empty" width={120} height={134.787}></Image>

      <div className="text-center text-base font-medium text-text-neutral-mute">
        <p>{t('company:PAGE_BODY.NO_COMPANY_DATA_AVAILABLE')}</p>
        <p>{t('company:PAGE_BODY.PLEASE_ADD_A_NEW_COMPANY')}</p>
      </div>
    </section>
  );
};

export default NoData;
