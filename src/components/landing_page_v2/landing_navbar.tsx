import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BsFillRocketTakeoffFill } from 'react-icons/bs';
import useOuterClick from '@/lib/hooks/use_outer_click';
import LandingI18n from '@/components/landing_page_v2/landing_i18n';
import { LandingButton } from '@/components/landing_page_v2/landing_button';
import version from '@/lib/version';
import { useTranslation } from 'next-i18next';
import { ISUNFA_ROUTE } from '@/constants/url';

const LandingNavbar: React.FC = () => {
  const { t } = useTranslation('common');

  const {
    targetRef: dropdownRef,
    componentVisible: isOpen,
    setComponentVisible: setIsOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const toggleDropdown = () => setIsOpen((prev) => !prev);

  // ToDo: (20241219 - Julian) 補上正確的路徑
  const navigationOptions = (
    <>
      <Link href={ISUNFA_ROUTE.LANDING_PAGE}>
        <LandingButton type="button" variant="default">
          {t('landing_page_v2:NAVBAR.USERS')}
        </LandingButton>
      </Link>
      <Link href={ISUNFA_ROUTE.LANDING_PAGE}>
        <LandingButton type="button" variant="default">
          {t('landing_page_v2:NAVBAR.PRICING')}
        </LandingButton>
      </Link>
      <Link href={ISUNFA_ROUTE.LANDING_PAGE}>
        <LandingButton type="button" variant="default">
          {t('landing_page_v2:NAVBAR.FAITH')}
        </LandingButton>
      </Link>
      <Link href={ISUNFA_ROUTE.LANDING_PAGE}>
        <LandingButton type="button" variant="default">
          {t('landing_page_v2:NAVBAR.JOIN_US')}
        </LandingButton>
      </Link>
      {/* ToDO: (20241204 - Julian) Button */}
      <Link href={ISUNFA_ROUTE.DASHBOARD}>
        <LandingButton type="button" variant="primary" className="w-full">
          <BsFillRocketTakeoffFill size={20} />
          <p>{t('landing_page_v2:NAVBAR.TRY_IT_NOW')}</p>
        </LandingButton>
      </Link>
    </>
  );

  return (
    <nav className="fixed inset-x-0 z-50 flex items-center justify-between rounded-sm border-b bg-landing-nav px-16px py-12px shadow-landing-nav backdrop-blur-md md:inset-x-36px md:px-40px lg:px-112px">
      <div className="flex items-center gap-16px">
        {/* Info: (20241204 - Julian) Logo */}
        <Link href={ISUNFA_ROUTE.LANDING_PAGE} className="h-40px w-150px flex-none">
          <Image src="/logo/isunfa_logo_new.svg" alt="logo" width={141} height={40} />
        </Link>
        {/* Info: (20241218 - Julian) Version */}
        <div className="rounded-xs bg-badge-surface-soft-primary px-8px py-2px">
          <p className="whitespace-nowrap text-xs font-medium text-badge-text-primary-solid">
            v {version}
          </p>
        </div>
      </div>

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
      <div className="hidden items-center justify-between whitespace-nowrap font-bold lg:flex">
        {navigationOptions}
      </div>

      {/* Info: (20241204 - Julian) Dropdown */}
      <div
        ref={dropdownRef}
        className={`absolute right-0 flex flex-col rounded-sm border-b bg-landing-page-white/30 px-20px py-12px font-bold shadow-landing-nav transition-all duration-300 ease-in-out lg:hidden ${isOpen ? 'visible top-80px opacity-100' : 'invisible top-50px opacity-0'}`}
      >
        <LandingI18n />
        {navigationOptions}
      </div>
    </nav>
  );
};

export default LandingNavbar;
