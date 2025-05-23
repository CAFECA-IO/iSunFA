import { useTranslation } from 'next-i18next';

// Info: (20250329 - Liz) 預設介紹
const DefaultIntro = () => {
  const { t } = useTranslation('dashboard');

  return (
    <>
      {/* Info: (20250520 - Liz) Desktop ver */}
      <section className="hidden flex-col gap-40px pl-60px pt-70px tablet:flex">
        <h1 className="text-nowrap text-64px font-bold text-text-neutral-primary">
          {t('dashboard:CREATE_ROLE_PAGE.SELECT_YOUR_ROLE')}
        </h1>
        <p className="w-2/5 text-sm font-semibold text-text-neutral-secondary">
          {t('dashboard:CREATE_ROLE_PAGE.DEFAULT_INTRODUCTION')}
        </p>
      </section>

      {/* Info: (20250520 - Liz) Mobile ver */}
      <section className="flex flex-col gap-16px tablet:hidden">
        <h1 className="text-nowrap text-2xl font-bold text-text-neutral-primary">
          {t('dashboard:CREATE_ROLE_PAGE.SELECT_YOUR_ROLE')}
        </h1>
        <p className="text-xs leading-5 text-text-neutral-secondary">
          {t('dashboard:CREATE_ROLE_PAGE.DEFAULT_INTRODUCTION')}
        </p>
      </section>
    </>
  );
};

export default DefaultIntro;
