import Image from 'next/image';
import { useTranslation } from 'next-i18next';

const NoTeamInfo = () => {
  const { t } = useTranslation(['team']);

  return (
    <section className="flex flex-auto flex-col items-center justify-center gap-16px">
      <Image src={'/images/empty.svg'} alt="empty" width={120} height={134.787}></Image>

      <div className="text-center text-base font-medium text-text-neutral-mute">
        <p>{t('team:TEAM_INFO_PAGE.NO_TEAM_INFORMATION_AVAILABLE')}</p>
        <p>{t('team:TEAM_INFO_PAGE.PLEASE_CREATE_NEW_TEAM')}</p>
      </div>
    </section>
  );
};

export default NoTeamInfo;
