// Deprecated: (20250212 - Liz) 這是 Alpha 版本的元件，已經不再使用，即將被刪除。
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';
import { ISUNFA_ROUTE } from '@/constants/url';
import { cn } from '@/lib/utils/common';
import { useTranslation } from 'next-i18next';
import { LiaUserEditSolid } from 'react-icons/lia';
import { RiBuildingLine } from 'react-icons/ri';
import { PiListBulletsBold, PiBookmarkSimple } from 'react-icons/pi';
import { TbBriefcase2, TbUserCheck } from 'react-icons/tb';

const SettingSidebar = () => {
  const { t } = useTranslation(['common', 'settings']);
  const router = useRouter();

  return (
    <>
      {/* Info: (20240423 - Shirley) ----- desktop version ----- */}
      <div
        className={`fixed z-10 hidden h-screen w-240px flex-col items-center bg-surface-neutral-surface-lv2 px-12px pb-40px pt-100px lg:flex`}
      >
        {/* Info: (20240423 - Shirley) Main icon */}
        <div className="flex flex-col items-center pt-0">
          <Image src={'/icons/setting.svg'} width={32} height={32} alt="setting_icon" />
          <p className={`mt-20px text-sm font-semibold text-text-neutral-primary`}>
            {t('common:NAV_BAR.SETTINGS')}
          </p>
        </div>

        <div className="my-16px flex w-full flex-col items-center text-lg">
          {/* Info: (20240423 - Shirley) Divider */}
          <div className={`h-15px w-full border-b border-divider-stroke-lv-4`}></div>

          {/* Info: (20240423 - Shirley) Menu */}
          <div className="flex w-full flex-col items-start justify-center py-16px">
            <div className="flex w-full items-center gap-8px py-8px pl-10px text-tabs-text-disable hover:cursor-default">
              {/* TODO: (20240715 - Shirley) [Beta] to be developed */}
              {/* <Link
                href={ISUNFA_ROUTE.USERS_MY_REPORTS}
                className={cn(
                  'flex w-full items-center gap-8px py-8px pl-10px',
                  router.pathname.includes(ISUNFA_ROUTE.USERS_MY_REPORTS)
                    ? 'text-tabs-text-active'
                    : 'text-tabs-text-default hover:text-tabs-text-active'
                )}
              > */}
              <LiaUserEditSolid size={20} />
              <p className={`w-8/10 overflow-hidden whitespace-nowrap text-left text-base`}>
                {t('settings:SETTINGS.PERSONAL_SETTINGS')}
              </p>
              {/* </Link> */}
            </div>

            {/* Info: (20240423 - Shirley) Divider */}
            {/* <div className={`h-12px w-full border-b border-divider-stroke-lv-4 `}></div>  // Info: (20240715 - Shirley) */}
            <div className="mt-4 flex gap-4 text-sm leading-5 tracking-normal text-divider-text-lv-1">
              <div className="flex gap-2">
                <Image src="/icons/real_home.svg" width={20} height={20} alt="setting_icon" />
                <div>{t('settings:SETTINGS.ACCOUNT_BOOK_SETTINGS')}</div>
              </div>
              <div className="my-auto h-px w-80px flex-1 shrink-0 bg-divider-stroke-lv-4" />
            </div>
            <div className="flex w-full flex-col items-start justify-center gap-2 py-2">
              <Link
                href={ISUNFA_ROUTE.COMPANY_INFO}
                className={cn(
                  'flex w-full items-center gap-8px pb-8px pl-10px pt-20px',
                  router.pathname.includes(ISUNFA_ROUTE.COMPANY_INFO)
                    ? 'text-tabs-text-active'
                    : 'text-tabs-text-default hover:text-tabs-text-active'
                )}
              >
                <RiBuildingLine size={20} />
                <p className={`w-8/10 overflow-hidden whitespace-nowrap text-left text-base`}>
                  {t('settings:SETTINGS.BASIC_INFO')}
                </p>
              </Link>

              <Link
                href={ISUNFA_ROUTE.ACCOUNTING_TITLE}
                className={cn(
                  'flex w-full items-center gap-8px py-8px pl-10px',
                  router.pathname.includes(ISUNFA_ROUTE.ACCOUNTING_TITLE)
                    ? 'text-tabs-text-active'
                    : 'text-tabs-text-default hover:text-tabs-text-active'
                )}
              >
                <PiListBulletsBold size={20} />
                <p className={`w-8/10 overflow-hidden whitespace-nowrap text-left text-base`}>
                  {t('settings:SETTINGS.ACCOUNTING_TITLE')}
                </p>
              </Link>

              <div className="flex w-full items-center gap-8px py-8px pl-10px text-tabs-text-disable hover:cursor-default">
                {/* TODO: (20240715 - Shirley) [Beta] to be developed */}
                {/* <Link
              href={ISUNFA_ROUTE.USERS_FINANCIAL_REPORTS}
              className={cn(
                'flex w-full items-center gap-8px pb-8px pl-10px pt-20px',
                router.pathname.includes(ISUNFA_ROUTE.USERS_FINANCIAL_REPORTS)
                  ? 'text-tabs-text-active'
                  : 'text-tabs-text-default hover:text-tabs-text-active'
              )}
            > */}
                <TbBriefcase2 size={20} />
                <p className={`w-8/10 overflow-hidden whitespace-nowrap text-left text-base`}>
                  {t('settings:SETTINGS.TRADING_PARTNER_LIST')}
                </p>
                {/* </Link> */}
              </div>

              <div className="flex w-full items-center gap-8px py-8px pl-10px text-tabs-text-disable hover:cursor-default">
                {/* TODO: (20240715 - Shirley) [Beta] to be developed */}
                {/* <Link
              href={ISUNFA_ROUTE.USERS_FINANCIAL_REPORTS}
              className={cn(
                'flex w-full items-center gap-8px pb-8px pl-10px pt-20px',
                router.pathname.includes(ISUNFA_ROUTE.USERS_FINANCIAL_REPORTS)
                  ? 'text-tabs-text-active'
                  : 'text-tabs-text-default hover:text-tabs-text-active'
              )}
            > */}
                <TbUserCheck size={20} />
                <p className={`w-8/10 overflow-hidden whitespace-nowrap text-left text-base`}>
                  {t('settings:SETTINGS.ADMINISTRATOR')}
                </p>
                {/* </Link> */}
              </div>

              <div className="flex w-full items-center gap-8px py-8px pl-10px text-tabs-text-disable hover:cursor-default">
                {/* TODO: (20240715 - Shirley) [Beta] to be developed */}
                {/* <Link
                href={ISUNFA_ROUTE.USERS_FINANCIAL_REPORTS}
                className={cn(
                  'flex w-full items-center gap-8px pb-8px pl-10px pt-20px',
                  router.pathname.includes(ISUNFA_ROUTE.USERS_FINANCIAL_REPORTS)
                    ? 'text-tabs-text-active'
                    : 'text-tabs-text-default hover:text-tabs-text-active'
                )}
              > */}
                <PiBookmarkSimple size={20} />
                <p className={`w-8/10 overflow-hidden whitespace-nowrap text-left text-base`}>
                  {t('settings:SETTINGS.SUBSCRIPTION_BILLS')}
                </p>
                {/* </Link> */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TODO: (20240715 - Shirley) [Beta] developing */}
      {/* Info: (20240507 - Shirley) ----- mobile version ----- */}
      <div className="fixed bottom-0 z-50 flex h-72px w-full justify-between bg-surface-neutral-surface-lv2 px-10 py-8px shadow-sidebarMobile sm:px-16 md:px-32 lg:hidden">
        <Link
          href={ISUNFA_ROUTE.COMPANY_INFO}
          className={cn(
            'flex items-center justify-center',
            router.pathname.includes(ISUNFA_ROUTE.COMPANY_INFO)
              ? 'text-tabs-text-active'
              : 'text-tabs-text-default hover:text-tabs-text-active'
          )}
        >
          <RiBuildingLine size={20} />
        </Link>

        <Link
          href={ISUNFA_ROUTE.ACCOUNTING_TITLE}
          className={cn(
            'flex items-center justify-center',
            router.pathname.includes(ISUNFA_ROUTE.ACCOUNTING_TITLE)
              ? 'text-tabs-text-active'
              : 'text-tabs-text-default hover:text-tabs-text-active'
          )}
        >
          <PiListBulletsBold size={20} />
        </Link>

        <div className="flex items-center justify-center text-tabs-text-disable">
          <TbBriefcase2 size={20} />
        </div>

        <div className="flex items-center justify-center text-tabs-text-disable">
          <TbUserCheck size={20} />
        </div>

        <div className="flex items-center justify-center text-tabs-text-disable">
          <PiBookmarkSimple size={20} />
        </div>
      </div>
    </>
  );
};

export default SettingSidebar;
