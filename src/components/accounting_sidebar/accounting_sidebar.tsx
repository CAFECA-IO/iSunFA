import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { FiBookOpen, FiPlusCircle } from 'react-icons/fi';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useUserCtx } from '@/contexts/user_context';
import { useTranslation } from 'next-i18next';

const AccountingSidebar = () => {
  const { t } = useTranslation(['common', 'journal']);
  const [isExpanded, setIsExpanded] = useState(false);
  const sidebarEnterHandler = () => setIsExpanded(true);
  const sidebarLeaveHandler = () => setIsExpanded(false);

  const { pathname } = useRouter();

  const { selectedAccountBook } = useUserCtx();
  const companyName = selectedAccountBook?.name;

  const displayedCompanyName = companyName ? (
    <Link
      // Info:(20240807 - Anna) 點公司頭像，跳轉到儀表板
      href={ISUNFA_ROUTE.DASHBOARD}
      className={`my-20px flex ${isExpanded ? 'h-60px w-60px text-3xl' : 'h-40px w-40px text-2xl'} items-center justify-center rounded-full bg-avatar-surface-background-indigo font-bold text-avatar-text-in-dark-background transition-all duration-300 ease-in-out`}
    >
      {/* Info: (20240423 - Julian) Display company name's first letter */}
      {companyName.charAt(0)}
    </Link>
  ) : null;

  return (
    <>
      {/* Info: (20240423 - Julian) Desktop */}
      <div
        onMouseEnter={sidebarEnterHandler}
        onMouseLeave={sidebarLeaveHandler}
        className={`fixed z-10 hidden h-screen flex-col items-center bg-surface-neutral-surface-lv2 font-semibold md:flex ${isExpanded ? 'w-240px' : 'w-70px'} px-12px pb-40px pt-120px transition-all duration-300 ease-in-out`}
      >
        {/* Info: (20240416 - Julian) Main icon */}
        <div className="flex flex-col items-center pt-20px">
          <Image
            src={'/icons/calculator.svg'}
            width={30}
            height={30}
            alt="calculator_icon"
            className={`${isExpanded ? 'scale-150' : 'scale-100'} transition-all duration-300 ease-in-out`}
          />
          <p
            className={`${isExpanded ? 'visible opacity-100' : 'invisible opacity-0'} mt-20px text-sm text-text-neutral-primary transition-all duration-300 ease-in-out`}
          >
            {t('journal:JOURNAL.ACCOUNTING')}
          </p>

          {displayedCompanyName}
        </div>

        {/* Info: (20240423 - Julian) Menu */}
        <div className="my-16px flex w-full flex-col items-center text-lg">
          <Link
            href={ISUNFA_ROUTE.ACCOUNTING}
            className={`flex w-full items-center justify-center ${isExpanded ? 'bg-button-surface-strong-secondary p-16px text-button-text-invert hover:opacity-75' : 'p-8px text-icon-surface-single-color-primary'} rounded transition-all duration-300 ease-in-out`}
          >
            <FiPlusCircle size={24} />
            <p
              className={`${isExpanded ? 'ml-8px w-8/10' : 'w-0'} overflow-hidden whitespace-nowrap text-left text-button-text-invert transition-all duration-300 ease-in-out`}
            >
              {t('journal:JOURNAL.ADD_NEW_JOURNAL')}
            </p>
          </Link>

          {/* Info: (20240416 - Julian) Divider */}
          <hr
            className={`${isExpanded ? 'w-full' : 'w-56px'} my-20px border border-divider-stroke-lv-4 transition-all duration-300 ease-in-out`}
          />

          <Link
            href={ISUNFA_ROUTE.JOURNAL_LIST}
            className={`flex w-full items-center justify-center p-8px hover:text-tabs-text-active ${pathname.includes('journal_list') ? 'text-tabs-text-active' : 'text-icon-surface-single-color-primary'} `}
          >
            <FiBookOpen size={20} className="transition-all duration-300 ease-in-out" />
            <p
              className={`${isExpanded ? 'ml-8px w-8/10' : 'w-0'} overflow-hidden whitespace-nowrap text-left transition-all duration-300 ease-in-out`}
            >
              {t('journal:JOURNAL.JOURNAL')}
            </p>
          </Link>
        </div>
      </div>

      {/* Info: (20240423 - Julian) Mobile */}
      <div className="fixed bottom-0 z-20 grid h-72px w-screen grid-cols-3 bg-surface-neutral-surface-lv2 px-16px py-8px shadow-sidebarMobile md:hidden">
        <Link
          href={ISUNFA_ROUTE.ACCOUNTING}
          className="mx-auto p-16px text-icon-surface-single-color-primary hover:text-tabs-text-active"
        >
          <FiPlusCircle size={24} />
        </Link>
        <Link
          href={ISUNFA_ROUTE.JOURNAL_LIST}
          className="mx-auto p-16px text-icon-surface-single-color-primary hover:text-tabs-text-active"
        >
          <FiBookOpen size={24} />
        </Link>
      </div>
    </>
  );
};

export default AccountingSidebar;
