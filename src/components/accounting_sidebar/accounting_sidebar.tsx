import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { FiBookOpen, FiPlusCircle } from 'react-icons/fi';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useUserCtx } from '@/contexts/user_context';

const AccountingSidebar = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const sidebarEnterHandler = () => setIsExpanded(true);
  const sidebarLeaveHandler = () => setIsExpanded(false);

  const { selectedCompany } = useUserCtx();
  const companyName = selectedCompany?.name;

  const displayedCompanyName = companyName ? (
    <Link
      href={ISUNFA_ROUTE.SELECT_COMPANY}
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
        className={`fixed z-10 hidden h-screen flex-col items-center font-semibold md:flex ${isExpanded ? 'w-240px' : 'w-70px'} bg-white px-12px pb-40px pt-120px transition-all duration-300 ease-in-out`}
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
            className={`${isExpanded ? 'visible opacity-100' : 'invisible opacity-0'} mt-20px text-sm text-secondaryBlue transition-all duration-300 ease-in-out`}
          >
            Accounting
          </p>

          {displayedCompanyName}
        </div>

        {/* Info: (20240423 - Julian) Menu */}
        <div className="my-16px flex w-full flex-col items-center text-lg">
          <Link
            href={ISUNFA_ROUTE.ACCOUNTING}
            className={`flex w-full items-center gap-8px ${isExpanded ? 'bg-tertiaryBlue p-16px text-white hover:opacity-75' : 'p-8px text-secondaryBlue'} rounded transition-all duration-300 ease-in-out`}
          >
            <FiPlusCircle size={24} />
            <p
              className={`${isExpanded ? 'w-8/10' : 'w-0'} overflow-hidden whitespace-nowrap text-left text-white transition-all duration-300 ease-in-out`}
            >
              Add New Journal
            </p>
          </Link>

          {/* Info: (20240416 - Julian) Divider */}
          <hr
            className={`${isExpanded ? 'w-full' : 'w-56px'} my-20px border border-lightGray6 transition-all duration-300 ease-in-out`}
          />

          <Link
            href={ISUNFA_ROUTE.JOURNAL_LIST}
            className="flex w-full items-center gap-8px p-8px text-secondaryBlue hover:text-primaryYellow"
          >
            <FiBookOpen size={20} className="transition-all duration-300 ease-in-out" />
            <p
              className={`${isExpanded ? 'w-8/10' : 'w-0'} overflow-hidden whitespace-nowrap text-left transition-all duration-300 ease-in-out`}
            >
              Journal
            </p>
          </Link>
        </div>
      </div>

      {/* Info: (20240423 - Julian) Mobile */}
      <div className="fixed bottom-0 z-10 grid h-72px w-screen grid-cols-3 bg-white px-16px py-8px shadow-sidebarMobile md:hidden">
        <Link
          href={ISUNFA_ROUTE.ACCOUNTING}
          className="mx-auto p-16px text-secondaryBlue hover:text-primaryYellow"
        >
          <FiPlusCircle size={24} />
        </Link>
        <Link
          href={ISUNFA_ROUTE.JOURNAL_LIST}
          className="mx-auto p-16px text-secondaryBlue hover:text-primaryYellow"
        >
          <FiBookOpen size={24} />
        </Link>
      </div>
    </>
  );
};

export default AccountingSidebar;
