import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';
import { ISUNFA_ROUTE } from '@/constants/url';
import { cn } from '@/lib/utils/common';
import { useTranslation } from 'next-i18next';

const SettingSidebar = () => {
  const { t } = useTranslation('common');
  const router = useRouter();

  return (
    <>
      {/* Info: ----- desktop version (20240423 - Shirley) ----- */}
      <div
        className={`fixed z-10 hidden h-screen w-240px flex-col items-center bg-white px-12px pb-40px pt-100px lg:flex`}
      >
        {/* Info: Main icon (20240423 - Shirley) */}
        <div className="flex flex-col items-center pt-0">
          <Image src={'/icons/setting.svg'} width={32} height={32} alt="setting_icon" />
          {/* <p className={`mt-20px text-sm font-semibold text-secondaryBlue opacity-100`}>Setting</p> */}
          <p className={`mt-20px text-sm font-semibold text-secondaryBlue opacity-100`}>
            {t('NAV_BAR.SETTING')}
          </p>
        </div>

        <div className="my-16px flex w-full flex-col items-center text-lg">
          {/* Info: Divider (20240423 - Shirley) */}
          <div className={`h-15px w-full border-b border-divider-stroke-lv-4`}></div>

          {/* Info: Menu (20240423 - Shirley) */}
          <div className="flex w-full flex-col items-start justify-center py-16px">
            <div className="flex w-full items-center gap-8px py-8px pl-10px text-tabs-text-disable hover:cursor-default">
              {/* TODO: [Beta] to be developed (20240715 - Shirley) */}
              {/* <Link
                href={ISUNFA_ROUTE.USERS_MY_REPORTS}
                className={cn(
                  'flex w-full items-center gap-8px py-8px pl-10px',
                  router.pathname.includes(ISUNFA_ROUTE.USERS_MY_REPORTS)
                    ? 'text-tabs-text-active'
                    : 'text-tabs-text-default hover:text-tabs-text-active'
                )}
              > */}{' '}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="none"
                viewBox="0 0 20 20"
              >
                <g>
                  <path
                    className="stroke-current"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M7.5 12.917H6.25c-1.163 0-1.744 0-2.217.143a3.333 3.333 0 00-2.222 2.222c-.144.473-.144 1.055-.144 2.218M12.084 6.25a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM9.167 17.5l2.585-.738c.123-.036.185-.053.243-.08a.831.831 0 00.145-.085c.051-.038.097-.084.188-.175l5.38-5.38a1.473 1.473 0 00-2.083-2.084l-5.38 5.381a1.753 1.753 0 00-.175.188.84.84 0 00-.085.145c-.027.058-.044.12-.08.243L9.167 17.5z"
                  ></path>
                </g>
              </svg>
              <p className={`w-8/10 overflow-hidden whitespace-nowrap text-left text-base`}>
                {/* Personal Setting */}
                {t('SETTING.PERSONAL_SETTING')}
              </p>
              {/* </Link> */}
            </div>

            {/* Info: Divider (20240423 - Shirley) */}
            {/* <div className={`h-12px w-full border-b border-lightGray6 `}></div> */}
            <div className="mt-4 flex gap-4 text-sm leading-5 tracking-normal text-divider-text-lv-1">
              <div className="flex gap-2">
                <Image src="/icons/real_home.svg" width={20} height={20} alt="setting_icon" />
                {/* <div>Company Setting</div> */}
                <div>{t('SETTING.COMPANY_SETTING')}</div>
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 20 20"
                >
                  <path
                    className="stroke-current"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M10.834 9.167h4c.933 0 1.4 0 1.756.181.314.16.569.415.729.729.181.356.181.823.181 1.756V17.5m-6.666 0V5.167c0-.934 0-1.4-.182-1.757a1.667 1.667 0 00-.728-.728C9.567 2.5 9.1 2.5 8.167 2.5h-3c-.933 0-1.4 0-1.757.182-.313.16-.568.414-.728.728-.182.357-.182.823-.182 1.757V17.5m15.834 0H1.667m3.75-11.667h2.5m-2.5 3.334h2.5m-2.5 3.333h2.5"
                  ></path>
                </svg>

                <p className={`w-8/10 overflow-hidden whitespace-nowrap text-left text-base`}>
                  {/* Basic Info{' '} */}
                  {t('SETTING.BASIC_INFO')}{' '}
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 20 20"
                >
                  <g>
                    <path
                      className="stroke-current"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M17.5 10h-10m10-5h-10m10 10h-10m-3.333-5A.833.833 0 112.5 10a.833.833 0 011.667 0zm0-5A.833.833 0 112.5 5a.833.833 0 011.667 0zm0 10A.833.833 0 112.5 15a.833.833 0 011.667 0z"
                    ></path>
                  </g>
                </svg>

                <p className={`w-8/10 overflow-hidden whitespace-nowrap text-left text-base`}>
                  {/* Accounting Title{' '} */}
                  {t('SETTING.ACCOUNTING_TITLE')}{' '}
                </p>
              </Link>

              <div className="flex w-full items-center gap-8px py-8px pl-10px text-tabs-text-disable hover:cursor-default">
                {/* TODO: [Beta] to be developed (20240715 - Shirley) */}
                {/* <Link
              href={ISUNFA_ROUTE.USERS_FINANCIAL_REPORTS}
              className={cn(
                'flex w-full items-center gap-8px pb-8px pl-10px pt-20px',
                router.pathname.includes(ISUNFA_ROUTE.USERS_FINANCIAL_REPORTS)
                  ? 'text-tabs-text-active'
                  : 'text-tabs-text-default hover:text-tabs-text-active'
              )}
            > */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 20 20"
                >
                  <g>
                    <path
                      className="stroke-current"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M13.334 5.833c0-.775 0-1.162-.085-1.48a2.5 2.5 0 00-1.768-1.768C11.163 2.5 10.775 2.5 10 2.5c-.776 0-1.163 0-1.481.085a2.5 2.5 0 00-1.768 1.768c-.085.318-.085.705-.085 1.48M4.334 17.5h11.333c.933 0 1.4 0 1.757-.182.313-.16.568-.414.728-.728.182-.357.182-.823.182-1.757V8.5c0-.933 0-1.4-.182-1.757a1.667 1.667 0 00-.728-.728c-.357-.182-.824-.182-1.757-.182H4.334c-.934 0-1.4 0-1.757.182-.314.16-.569.415-.728.728-.182.357-.182.824-.182 1.757v6.333c0 .934 0 1.4.182 1.757.16.314.414.569.728.728.357.182.823.182 1.757.182z"
                    ></path>
                  </g>
                </svg>

                <p className={`w-8/10 overflow-hidden whitespace-nowrap text-left text-base`}>
                  {/* Trading Partner List{' '} */}
                  {t('SETTING.TRADING_PARTNER_LIST')}{' '}
                </p>
                {/* </Link> */}
              </div>

              <div className="flex w-full items-center gap-8px py-8px pl-10px text-tabs-text-disable hover:cursor-default">
                {/* TODO: [Beta] to be developed (20240715 - Shirley) */}
                {/* <Link
              href={ISUNFA_ROUTE.USERS_FINANCIAL_REPORTS}
              className={cn(
                'flex w-full items-center gap-8px pb-8px pl-10px pt-20px',
                router.pathname.includes(ISUNFA_ROUTE.USERS_FINANCIAL_REPORTS)
                  ? 'text-tabs-text-active'
                  : 'text-tabs-text-default hover:text-tabs-text-active'
              )}
            > */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 20 20"
                >
                  <g>
                    <path
                      className="stroke-current"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M10 12.917H6.25c-1.163 0-1.744 0-2.217.143a3.333 3.333 0 00-2.222 2.222c-.144.473-.144 1.055-.144 2.218M13.334 15L15 16.667l3.334-3.334m-6.25-7.083a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                    ></path>
                  </g>
                </svg>
                <p className={`w-8/10 overflow-hidden whitespace-nowrap text-left text-base`}>
                  {/* Administrator{' '} */}
                  {t('SETTING.ADMINISTRATOR')}{' '}
                </p>
                {/* </Link> */}
              </div>

              <div className="flex w-full items-center gap-8px py-8px pl-10px text-tabs-text-disable hover:cursor-default">
                {/* TODO: [Beta] to be developed (20240715 - Shirley) */}
                {/* <Link
                href={ISUNFA_ROUTE.USERS_FINANCIAL_REPORTS}
                className={cn(
                  'flex w-full items-center gap-8px pb-8px pl-10px pt-20px',
                  router.pathname.includes(ISUNFA_ROUTE.USERS_FINANCIAL_REPORTS)
                    ? 'text-tabs-text-active'
                    : 'text-tabs-text-default hover:text-tabs-text-active'
                )}
              > */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 20 20"
                >
                  <g>
                    <path
                      className="stroke-current"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M3.333 6.5c0-1.4 0-2.1.272-2.635a2.5 2.5 0 011.093-1.093C5.233 2.5 5.933 2.5 7.333 2.5h5.333c1.4 0 2.1 0 2.635.272a2.5 2.5 0 011.093 1.093c.272.535.272 1.235.272 2.635v11l-2.291-1.667L12.29 17.5 10 15.833 7.708 17.5l-2.083-1.667L3.333 17.5v-11z"
                    ></path>
                  </g>
                </svg>

                <p className={`w-8/10 overflow-hidden whitespace-nowrap text-left text-base`}>
                  {/* Subscription&Bills{' '} */}
                  {t('SETTING.SUBSCRIPTION_BILLS')}{' '}
                </p>
                {/* </Link> */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TODO: [Beta] developing (20240715 - Shirley) */}
      {/* Info: ----- mobile version (20240507 - Shirley) ----- */}
      <div className="fixed bottom-0 z-50 flex h-72px w-full justify-between bg-white px-10 py-8px shadow-sidebarMobile sm:px-16 md:px-32 lg:hidden">
        <Link
          href={ISUNFA_ROUTE.COMPANY_INFO}
          className={cn(
            'flex items-center justify-center',
            router.pathname.includes(ISUNFA_ROUTE.COMPANY_INFO)
              ? 'text-tabs-text-active'
              : 'text-tabs-text-default hover:text-tabs-text-active'
          )}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="none"
            viewBox="0 0 20 20"
          >
            <path
              className="stroke-current"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M10.834 9.167h4c.933 0 1.4 0 1.756.181.314.16.569.415.729.729.181.356.181.823.181 1.756V17.5m-6.666 0V5.167c0-.934 0-1.4-.182-1.757a1.667 1.667 0 00-.728-.728C9.567 2.5 9.1 2.5 8.167 2.5h-3c-.933 0-1.4 0-1.757.182-.313.16-.568.414-.728.728-.182.357-.182.823-.182 1.757V17.5m15.834 0H1.667m3.75-11.667h2.5m-2.5 3.334h2.5m-2.5 3.333h2.5"
            ></path>
          </svg>
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="none"
            viewBox="0 0 20 20"
          >
            <g>
              <path
                className="stroke-current"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M17.5 10h-10m10-5h-10m10 10h-10m-3.333-5A.833.833 0 112.5 10a.833.833 0 011.667 0zm0-5A.833.833 0 112.5 5a.833.833 0 011.667 0zm0 10A.833.833 0 112.5 15a.833.833 0 011.667 0z"
              ></path>
            </g>
          </svg>
        </Link>

        <div className="flex items-center justify-center text-tabs-text-disable">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="none"
            viewBox="0 0 20 20"
          >
            <g>
              <path
                className="stroke-current"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M13.334 5.833c0-.775 0-1.162-.085-1.48a2.5 2.5 0 00-1.768-1.768C11.163 2.5 10.775 2.5 10 2.5c-.776 0-1.163 0-1.481.085a2.5 2.5 0 00-1.768 1.768c-.085.318-.085.705-.085 1.48M4.334 17.5h11.333c.933 0 1.4 0 1.757-.182.313-.16.568-.414.728-.728.182-.357.182-.823.182-1.757V8.5c0-.933 0-1.4-.182-1.757a1.667 1.667 0 00-.728-.728c-.357-.182-.824-.182-1.757-.182H4.334c-.934 0-1.4 0-1.757.182-.314.16-.569.415-.728.728-.182.357-.182.824-.182 1.757v6.333c0 .934 0 1.4.182 1.757.16.314.414.569.728.728.357.182.823.182 1.757.182z"
              ></path>
            </g>
          </svg>
        </div>

        <div className="flex items-center justify-center text-tabs-text-disable">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="none"
            viewBox="0 0 20 20"
          >
            <g>
              <path
                className="stroke-current"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M10 12.917H6.25c-1.163 0-1.744 0-2.217.143a3.333 3.333 0 00-2.222 2.222c-.144.473-.144 1.055-.144 2.218M13.334 15L15 16.667l3.334-3.334m-6.25-7.083a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
              ></path>
            </g>
          </svg>
        </div>

        <div className="flex items-center justify-center text-tabs-text-disable">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="none"
            viewBox="0 0 20 20"
          >
            <g>
              <path
                className="stroke-current"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M3.333 6.5c0-1.4 0-2.1.272-2.635a2.5 2.5 0 011.093-1.093C5.233 2.5 5.933 2.5 7.333 2.5h5.333c1.4 0 2.1 0 2.635.272a2.5 2.5 0 011.093 1.093c.272.535.272 1.235.272 2.635v11l-2.291-1.667L12.29 17.5 10 15.833 7.708 17.5l-2.083-1.667L3.333 17.5v-11z"
              ></path>
            </g>
          </svg>
        </div>
      </div>
    </>
  );
};

export default SettingSidebar;
