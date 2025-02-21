import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useGlobalCtx } from '@/contexts/global_context';
import { cn } from '@/lib/utils/common';
import { useTranslation } from 'next-i18next';

const ReportsSidebar = () => {
  const { t } = useTranslation(['reports']);
  const router = useRouter();
  const { embedCodeModalVisibilityHandler } = useGlobalCtx();

  const [isExpanded, setIsExpanded] = useState(false);
  const sidebarEnterHandler = () => setIsExpanded(true);
  const sidebarLeaveHandler = () => setIsExpanded(false);

  return (
    <>
      {/* Info: (20240423 - Shirley) ----- desktop version ----- */}
      <div
        onMouseEnter={sidebarEnterHandler}
        onMouseLeave={sidebarLeaveHandler}
        className={`fixed z-10 hidden h-screen flex-col items-center lg:flex ${isExpanded ? 'w-240px' : 'w-70px'} bg-surface-neutral-surface-lv2 px-12px pb-40px pt-120px transition-all duration-300 ease-in-out`}
      >
        {/* Info: (20240423 - Shirley) Main icon */}
        <div className="flex flex-col items-center pt-20px">
          <Image
            src={'/icons/report.svg'}
            width={30}
            height={30}
            alt="report_icon"
            className={`${isExpanded ? 'scale-150' : 'scale-100'} transition-all duration-300 ease-in-out`}
          />
          <p
            className={`${isExpanded ? 'visible opacity-100' : 'invisible opacity-0'} mt-20px text-sm font-semibold text-text-neutral-primary transition-all duration-300 ease-in-out`}
          >
            {t('reports:REPORTS_SIDEBAR.REPORT')}
          </p>
        </div>

        <div className="my-16px flex w-full flex-col items-center text-lg">
          <button
            type="button"
            onClick={embedCodeModalVisibilityHandler}
            // ToDo: (20240802 - Julian) [Beta] Not released yet
            disabled
            className={`flex w-full items-center gap-8px disabled:opacity-50 ${isExpanded ? 'bg-text-neutral-primary py-14px pl-28px text-button-text-invert hover:opacity-75' : 'py-8px pl-8px text-button-text-secondary-hover'} rounded-xs transition-all duration-300 ease-in-out`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                className="fill-current"
                fill="none"
                fillRule="evenodd"
                d="M14.22 2.025a1 1 0 01.76 1.193l-4 18a1 1 0 11-1.953-.434l4-18a1 1 0 011.193-.76zM7.71 6.294a1 1 0 010 1.414l-4.293 4.293 4.293 4.293a1 1 0 11-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414l4.293-4.293-4.293-4.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              ></path>
            </svg>
            <p
              className={`${isExpanded ? 'w-8/10' : 'w-0'} overflow-hidden whitespace-nowrap text-button-text-invert transition-all duration-300 ease-in-out`}
            >
              {t('reports:REPORTS_SIDEBAR.GET_EMBED_CODE')}
            </p>
          </button>

          {/* Info: (20240423 - Shirley) Divider */}
          <div
            className={`${isExpanded ? 'h-12px' : 'h-15px'} w-full border-b border-divider-stroke-lv-4 transition-all duration-300 ease-in-out`}
          ></div>

          {/* Info: (20240423 - Shirley) Menu */}
          <div className="flex w-full flex-col items-start justify-center py-16px">
            <Link
              href={ISUNFA_ROUTE.USERS_MY_REPORTS}
              className={cn(
                'flex w-full items-center gap-8px py-8px pl-10px',
                router.pathname.includes(ISUNFA_ROUTE.USERS_MY_REPORTS)
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
                  className="stroke-current transition-all duration-300 ease-in-out"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M11.667 9.167h-5M8.334 12.5H6.667m6.667-6.667H6.667m10 2.917V5.667c0-1.4 0-2.1-.273-2.635a2.5 2.5 0 00-1.092-1.093c-.535-.272-1.235-.272-2.635-.272H7.334c-1.4 0-2.1 0-2.635.272a2.5 2.5 0 00-1.093 1.093c-.272.534-.272 1.234-.272 2.635v8.666c0 1.4 0 2.1.272 2.635a2.5 2.5 0 001.093 1.093c.534.272 1.234.272 2.635.272h2.25m8.75 0l-1.25-1.25M17.916 15a2.917 2.917 0 11-5.833 0 2.917 2.917 0 015.833 0z"
                ></path>
              </svg>
              <p
                className={`${isExpanded ? 'w-8/10' : 'w-0'} overflow-hidden whitespace-nowrap text-left text-base transition-all duration-300 ease-in-out`}
              >
                {t('reports:REPORTS_SIDEBAR.MY_REPORTS')}
              </p>
            </Link>

            {/* Info: (20240423 - Shirley) Divider */}
            <div
              className={`${isExpanded ? 'h-12px' : 'h-15px'} w-full border-b border-divider-stroke-lv-4 transition-all duration-300 ease-in-out`}
            ></div>

            <Link
              href={ISUNFA_ROUTE.USERS_FINANCIAL_REPORTS}
              className={cn(
                'flex w-full items-center gap-8px pb-8px pl-10px pt-20px',
                router.pathname.includes(ISUNFA_ROUTE.USERS_FINANCIAL_REPORTS)
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
                  className="stroke-current transition-all duration-300 ease-in-out"
                  stroke="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M11.667 7.5H9.583a1.25 1.25 0 100 2.5h.834a1.25 1.25 0 110 2.5H8.333M10 6.667V7.5m0 5v.833M15 10h.008M5 10h.008M1.667 6.833v6.334c0 .933 0 1.4.181 1.756.16.314.415.569.729.729.356.181.823.181 1.756.181h11.334c.933 0 1.4 0 1.756-.181.314-.16.569-.415.729-.729.181-.356.181-.823.181-1.756V6.833c0-.933 0-1.4-.181-1.756a1.667 1.667 0 00-.729-.729c-.356-.181-.823-.181-1.756-.181H4.333c-.933 0-1.4 0-1.756.181-.314.16-.569.415-.729.729-.181.356-.181.823-.181 1.756zM15.417 10a.417.417 0 11-.833 0 .417.417 0 01.833 0zm-10 0a.417.417 0 11-.834 0 .417.417 0 01.834 0z"
                ></path>
              </svg>

              <p
                className={`${isExpanded ? 'w-8/10' : 'w-0'} overflow-hidden whitespace-nowrap text-left text-base transition-all duration-300 ease-in-out`}
              >
                {t('reports:REPORTS_SIDEBAR.FINANCIAL_REPORTS')}
              </p>
            </Link>

            {/* Info: (20240802 - Julian) */}
            {/* <Link
              href={ISUNFA_ROUTE.USERS_ANALYSES_REPORTS}
              className={cn(
                'flex w-full items-center gap-8px py-8px pl-10px',
                router.pathname.includes(ISUNFA_ROUTE.USERS_ANALYSES_REPORTS)
                  ? 'text-tabs-text-active'
                  : 'text-tabs-text-default hover:text-tabs-text-active'
              )}
            > */}
            <button
              type="button"
              // ToDo: (20240802 - Julian) [Beta] Not released yet
              disabled
              className="flex w-full items-center gap-8px py-8px pl-10px text-tabs-text-default disabled:opacity-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="none"
                viewBox="0 0 20 20"
              >
                <path
                  className="stroke-current transition-all duration-300 ease-in-out"
                  stroke="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M11.667 1.891v3.442c0 .467 0 .7.09.879.08.156.208.284.365.364.178.09.411.09.878.09h3.442M6.667 12.5V15m6.666-4.167V15M10 8.75V15m6.667-6.677v6.01c0 1.4 0 2.1-.273 2.635a2.5 2.5 0 01-1.092 1.093c-.535.272-1.235.272-2.635.272H7.333c-1.4 0-2.1 0-2.635-.272a2.5 2.5 0 01-1.092-1.093c-.273-.535-.273-1.235-.273-2.635V5.667c0-1.4 0-2.1.273-2.635a2.5 2.5 0 011.092-1.093c.535-.272 1.235-.272 2.635-.272h2.677c.611 0 .917 0 1.205.069a2.5 2.5 0 01.722.299c.253.155.469.37.901.803l2.657 2.657c.432.432.649.649.803.9.137.225.238.468.3.724.069.287.069.593.069 1.204z"
                ></path>
              </svg>

              <p
                className={`${isExpanded ? 'w-8/10' : 'w-0'} overflow-hidden whitespace-nowrap text-left text-base transition-all duration-300 ease-in-out`}
              >
                {t('reports:COMMON.ANALYSIS_REPORTS')}
              </p>
            </button>
            {/* </Link> */}
          </div>
        </div>
      </div>

      {/* Info: (20240507 - Shirley) ----- mobile version ----- */}
      <div className="fixed bottom-0 z-50 grid h-72px w-screen grid-cols-4 bg-surface-neutral-surface-lv2 px-16px py-8px shadow-sidebarMobile lg:hidden">
        <Link
          href={ISUNFA_ROUTE.USERS_MY_REPORTS}
          className={cn(
            'mx-auto p-16px',
            router.pathname.includes(ISUNFA_ROUTE.USERS_MY_REPORTS)
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
              d="M11.667 9.167h-5M8.334 12.5H6.667m6.667-6.667H6.667m10 2.917V5.667c0-1.4 0-2.1-.273-2.635a2.5 2.5 0 00-1.092-1.093c-.535-.272-1.235-.272-2.635-.272H7.334c-1.4 0-2.1 0-2.635.272a2.5 2.5 0 00-1.093 1.093c-.272.534-.272 1.234-.272 2.635v8.666c0 1.4 0 2.1.272 2.635a2.5 2.5 0 001.093 1.093c.534.272 1.234.272 2.635.272h2.25m8.75 0l-1.25-1.25M17.916 15a2.917 2.917 0 11-5.833 0 2.917 2.917 0 015.833 0z"
            ></path>
          </svg>
        </Link>

        <button
          type="button"
          onClick={embedCodeModalVisibilityHandler}
          // ToDo: (20240802 - Julian) [Beta] Not released yet
          disabled
          className="mx-auto p-16px text-button-text-secondary-hover disabled:opacity-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              className="fill-current"
              fill="none"
              fillRule="evenodd"
              d="M14.22 2.025a1 1 0 01.76 1.193l-4 18a1 1 0 11-1.953-.434l4-18a1 1 0 011.193-.76zM7.71 6.294a1 1 0 010 1.414l-4.293 4.293 4.293 4.293a1 1 0 11-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414l4.293-4.293-4.293-4.293a1 1 0 010-1.414z"
              clipRule="evenodd"
            ></path>
          </svg>
        </button>
        <Link
          href={ISUNFA_ROUTE.USERS_FINANCIAL_REPORTS}
          className={cn(
            'mx-auto p-16px',
            router.pathname.includes(ISUNFA_ROUTE.USERS_FINANCIAL_REPORTS)
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
              stroke="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M11.667 7.5H9.583a1.25 1.25 0 100 2.5h.834a1.25 1.25 0 110 2.5H8.333M10 6.667V7.5m0 5v.833M15 10h.008M5 10h.008M1.667 6.833v6.334c0 .933 0 1.4.181 1.756.16.314.415.569.729.729.356.181.823.181 1.756.181h11.334c.933 0 1.4 0 1.756-.181.314-.16.569-.415.729-.729.181-.356.181-.823.181-1.756V6.833c0-.933 0-1.4-.181-1.756a1.667 1.667 0 00-.729-.729c-.356-.181-.823-.181-1.756-.181H4.333c-.933 0-1.4 0-1.756.181-.314.16-.569.415-.729.729-.181.356-.181.823-.181 1.756zM15.417 10a.417.417 0 11-.833 0 .417.417 0 01.833 0zm-10 0a.417.417 0 11-.834 0 .417.417 0 01.834 0z"
            ></path>
          </svg>
        </Link>
        {/* Info: (20240802 - Julian) */}
        {/* <Link
          href={ISUNFA_ROUTE.USERS_ANALYSES_REPORTS}
          className={cn(
            'mx-auto p-16px',
            router.pathname.includes(ISUNFA_ROUTE.USERS_ANALYSES_REPORTS)
              ? 'text-tabs-text-active'
              : 'text-tabs-text-default hover:text-tabs-text-active'
          )}
        > */}
        <button
          type="button"
          // ToDo: (20240802 - Julian) [Beta] Not released yet
          disabled
          className="mx-auto p-16px text-tabs-text-default disabled:opacity-50"
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
              stroke="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M11.667 1.891v3.442c0 .467 0 .7.09.879.08.156.208.284.365.364.178.09.411.09.878.09h3.442M6.667 12.5V15m6.666-4.167V15M10 8.75V15m6.667-6.677v6.01c0 1.4 0 2.1-.273 2.635a2.5 2.5 0 01-1.092 1.093c-.535.272-1.235.272-2.635.272H7.333c-1.4 0-2.1 0-2.635-.272a2.5 2.5 0 01-1.092-1.093c-.273-.535-.273-1.235-.273-2.635V5.667c0-1.4 0-2.1.273-2.635a2.5 2.5 0 011.092-1.093c.535-.272 1.235-.272 2.635-.272h2.677c.611 0 .917 0 1.205.069a2.5 2.5 0 01.722.299c.253.155.469.37.901.803l2.657 2.657c.432.432.649.649.803.9.137.225.238.468.3.724.069.287.069.593.069 1.204z"
            ></path>
          </svg>
        </button>
        {/* </Link> */}
      </div>
    </>
  );
};

export default ReportsSidebar;
