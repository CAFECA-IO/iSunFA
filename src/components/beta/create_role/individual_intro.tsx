import { ReactNode } from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';

interface IndividualIntroProps {
  children: ReactNode;
}

// Info: (20250423 - Liz) 「個人」角色介紹
const IndividualIntro = ({ children }: IndividualIntroProps) => {
  const { t } = useTranslation('dashboard');

  return (
    <>
      {/* Info: (20250522 - Liz) Desktop ver */}
      <section className="z-1 hidden flex-col gap-40px pl-60px pt-70px tablet:flex">
        <div className="flex items-center gap-24px">
          <h1 className="text-nowrap text-64px font-bold text-text-neutral-primary">
            {t('dashboard:ROLE.INDIVIDUAL')}
          </h1>
          <Image
            src="/icons/information_desk.svg"
            alt="information_desk"
            width={30}
            height={30}
          ></Image>
        </div>

        <div className="w-2/5 text-sm font-semibold text-text-neutral-secondary">
          <p>{t('dashboard:CREATE_ROLE_PAGE.INDIVIDUAL_INTRODUCTION')}</p>
          <h3 className="pt-24px text-xl font-bold text-text-neutral-primary">
            {t('dashboard:CREATE_ROLE_PAGE.COMMON_FUNCTIONS')}
          </h3>
          <p>{t('dashboard:CREATE_ROLE_PAGE.COMMON_FUNCTIONS_FOR_INDIVIDUAL')}</p>
        </div>

        {children}
      </section>

      {/* Info: (20250522 - Liz) Mobile ver */}
      <section className="flex flex-col gap-16px tablet:hidden">
        <div className="flex items-center gap-24px">
          <h1 className="text-nowrap text-2xl font-bold text-text-neutral-primary">
            {t('dashboard:ROLE.INDIVIDUAL')}
          </h1>
          <Image
            src="/icons/information_desk.svg"
            alt="information_desk"
            width={30}
            height={30}
          ></Image>
        </div>

        <div className="text-sm text-text-neutral-secondary">
          <p className="text-xs leading-5">
            {t('dashboard:CREATE_ROLE_PAGE.INDIVIDUAL_INTRODUCTION')}
          </p>

          <h3 className="pt-24px text-base font-semibold text-text-neutral-primary">
            {t('dashboard:CREATE_ROLE_PAGE.COMMON_FUNCTIONS')}
          </h3>
          <p className="text-xs leading-5">
            {t('dashboard:CREATE_ROLE_PAGE.COMMON_FUNCTIONS_FOR_INDIVIDUAL')}
          </p>
        </div>

        {children}
      </section>
    </>
  );
};

export default IndividualIntro;
