import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useTranslation } from 'next-i18next';
import { RiGroupLine } from 'react-icons/ri';
import { LiaPiggyBankSolid } from 'react-icons/lia';

const SalarySidebar = () => {
  const { t } = useTranslation(['common', 'salary']);
  const [isExpanded, setIsExpanded] = useState(false);
  const sidebarEnterHandler = () => setIsExpanded(true);
  const sidebarLeaveHandler = () => setIsExpanded(false);

  return (
    <>
      {/* Desktop sidebar */}
      <div
        onMouseEnter={sidebarEnterHandler}
        onMouseLeave={sidebarLeaveHandler}
        className={`fixed z-10 hidden h-screen flex-col items-center md:flex ${isExpanded ? 'w-240px' : 'w-70px'} bg-surface-neutral-surface-lv2 px-12px pb-40px pt-120px transition-all duration-300 ease-in-out`}
      >
        {/* Main icon */}
        <div className="flex flex-col items-center pt-20px">
          <Image
            src={'/icons/briefcase.svg'}
            width={30}
            height={30}
            alt="briefcase_icon"
            className={`${isExpanded ? 'scale-150' : 'scale-100'} transition-all duration-300 ease-in-out`}
          />
          <p
            className={`${isExpanded ? 'visible opacity-100' : 'invisible opacity-0'} mt-20px text-sm font-semibold text-text-neutral-primary transition-all duration-300 ease-in-out`}
          >
            {t('salary:SALARY.SALARY')}
          </p>
        </div>

        <div className="my-16px flex w-full flex-col items-center text-lg">
          {/* Divider */}
          <div
            className={`${isExpanded ? 'h-10px' : 'h-20px'} w-full border-b border-divider-stroke-lv-4 transition-all duration-300 ease-in-out`}
          ></div>

          {/* Menu */}
          <div className="flex w-full flex-col items-start justify-center py-16px">
            <Link
              href={ISUNFA_ROUTE.SALARY}
              className="flex w-full items-center gap-8px py-8px pl-10px text-tabs-text-active"
            >
              <RiGroupLine size={20} />
              <p
                className={`${isExpanded ? 'w-8/10' : 'w-0'} overflow-hidden whitespace-nowrap text-left transition-all duration-300 ease-in-out`}
              >
                {t('salary:SALARY.EMPLOYEES_LIST')}
              </p>
            </Link>

            <button
              type="button"
              // ToDo: (20240802 - Julian) [Beta] Not released yet
              disabled
              className="flex w-full items-center gap-8px py-8px pl-10px text-tabs-text-default disabled:opacity-50"
            >
              <LiaPiggyBankSolid size={20} />
              <p
                className={`${isExpanded ? 'w-8/10' : 'w-0'} overflow-hidden whitespace-nowrap text-left transition-all duration-300 ease-in-out`}
              >
                {t('salary:SALARY.SALARY_LIST')}
              </p>
            </button>
            {/* </Link> */}
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div className="fixed bottom-0 z-10 grid h-72px w-screen grid-cols-3 bg-surface-neutral-surface-lv2 px-16px py-8px shadow-sidebarMobile md:hidden">
        <Link href={ISUNFA_ROUTE.SALARY} className="mx-auto p-16px text-tabs-text-active">
          <RiGroupLine size={20} />
        </Link>
        <button
          type="button"
          // ToDo: (20240802 - Julian) [Beta] Not released yet
          disabled
          className="mx-auto p-16px text-tabs-text-default disabled:opacity-50"
        >
          <LiaPiggyBankSolid size={20} />
        </button>
        {/* </Link> */}
      </div>
    </>
  );
};

export default SalarySidebar;
