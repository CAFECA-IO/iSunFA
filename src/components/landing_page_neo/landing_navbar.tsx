import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import useOuterClick from '@/lib/hooks/use_outer_click';
import LandingI18n from '@/components/landing_page_neo/landing_i18n';
// import { useTranslation } from 'next-i18next';
import { ISUNFA_ROUTE } from '@/constants/url';

const LandingNavbar: React.FC = () => {
  //  const { t } = useTranslation('common');

  const {
    targetRef: dropdownRef,
    componentVisible: isOpen,
    setComponentVisible: setIsOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const toggleDropdown = () => setIsOpen((prev) => !prev);

  const navigationOptions = (
    <>
      <Link href={ISUNFA_ROUTE.LANDING_PAGE}>
        <button
          type="button"
          className="px-24px py-10px text-landing-page-white hover:text-landing-page-orange"
        >
          Users
        </button>
      </Link>
      <Link href={ISUNFA_ROUTE.LANDING_PAGE}>
        <button
          type="button"
          className="px-24px py-10px text-landing-page-white hover:text-landing-page-orange"
        >
          Pricing
        </button>
      </Link>
      <Link href={ISUNFA_ROUTE.LANDING_PAGE}>
        <button
          type="button"
          className="px-24px py-10px text-landing-page-white hover:text-landing-page-orange"
        >
          Faith
        </button>
      </Link>
      <Link href={ISUNFA_ROUTE.LANDING_PAGE}>
        <button
          type="button"
          className="px-24px py-10px text-landing-page-white hover:text-landing-page-orange"
        >
          Join Us
        </button>
      </Link>
      {/* ToDO: (20241204 - Julian) Button */}
      <Link href={ISUNFA_ROUTE.LANDING_PAGE}>
        <button
          type="button"
          className="px-24px py-10px text-landing-page-white hover:text-landing-page-orange"
        >
          Try it Now
        </button>
      </Link>
    </>
  );

  return (
    <nav>
      <div className="relative flex items-center justify-between rounded-sm border-b bg-landing-page-white/30 px-16px py-12px shadow-landing-nav md:px-40px lg:px-110px">
        {/* Info: (20241204 - Julian) Logo */}
        <Link href={ISUNFA_ROUTE.LANDING_PAGE} className="h-40px w-150px flex-none">
          <Image src="/logo/isunfa_logo_new.svg" alt="logo" width={141} height={40} />
        </Link>

        {/* Info: (20241204 - Julian) Language */}
        <div className="hidden lg:block">
          <LandingI18n />
        </div>

        {/* Info: (20241204 - Julian) Hamburger Button */}
        <button
          type="button"
          onClick={toggleDropdown}
          className="group flex h-44px w-44px flex-col justify-center gap-4px p-12px lg:hidden"
        >
          <div className="h-2px w-full rounded-full bg-landing-page-white group-hover:bg-landing-page-orange" />
          <div className="h-2px w-full rounded-full bg-landing-page-white group-hover:bg-landing-page-orange" />
          <div className="h-2px w-full rounded-full bg-landing-page-white group-hover:bg-landing-page-orange" />
        </button>

        {/* Info: (20241204 - Julian) Links */}
        <div className="hidden items-center gap-16px whitespace-nowrap font-bold lg:flex">
          {navigationOptions}
        </div>

        {/* Info: (20241204 - Julian) Dropdown */}
        <div
          ref={dropdownRef}
          className={`absolute right-0 flex flex-col bg-landing-page-white/30 shadow-landing-nav ${isOpen ? 'visible top-80px opacity-100' : 'invisible top-50px opacity-0'} rounded-sm border-b px-20px py-12px font-bold transition-all duration-300 ease-in-out lg:hidden`}
        >
          <LandingI18n />
          {navigationOptions}
        </div>
      </div>
    </nav>
  );
};

export default LandingNavbar;
