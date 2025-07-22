import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { FaChevronDown } from 'react-icons/fa6';
import { BsFillRocketTakeoffFill } from 'react-icons/bs';
import useOuterClick from '@/lib/hooks/use_outer_click';
import version from '@/lib/version';
import { ISUNFA_ROUTE } from '@/constants/url';
import { LandingButton } from '@/components/landing_page_v2/landing_button';

interface IInternationalization {
  label: string;
  value: string;
}

const internationalizationList: IInternationalization[] = [
  { label: 'English', value: 'en' },
  { label: '繁體中文', value: 'tw' },
  { label: '简体中文', value: 'cn' },
];

const LandingNavbar: React.FC = () => {
  const { t } = useTranslation('landing_page_v2');
  const { asPath, locale } = useRouter();

  // Info: (20241227 - Julian) Navbar 下拉選單
  const {
    targetRef: dropdownRef,
    componentVisible: isOpen,
    setComponentVisible: setIsOpen,
  } = useOuterClick<HTMLDivElement>(false);

  // Info: (20241227 - Julian) Language 下拉選單
  const {
    targetRef: langDropdownRef,
    componentVisible: isLangOpen,
    setComponentVisible: setIsLangOpen,
  } = useOuterClick<HTMLDivElement>(false);

  // Info: (20241227 - Julian) 取得當前語言
  const internationalization =
    internationalizationList.find((item) => item.value === locale) ?? internationalizationList[0];

  const [currentLanguage, setCurrentLanguage] =
    useState<IInternationalization>(internationalization);

  // Info: (20241204 - Julian) 即時更新當前語言
  useEffect(() => {
    setCurrentLanguage(internationalization);
  }, [locale]);

  const toggleDropdown = () => setIsOpen((prev) => !prev);
  const toggleLangDropdown = () => setIsLangOpen((prev) => !prev);

  // Info: (20241227 - Julian) Language 選項
  const langOptions = internationalizationList.map((item) => (
    <Link
      id={`${item.value.toLowerCase()}_btn`}
      key={item.value}
      scroll={false}
      locale={item.value}
      href={asPath}
      onClick={() => {
        setCurrentLanguage(item);
        setIsLangOpen(false);
      }}
      className="w-full text-left"
    >
      <LandingButton type="button" variant="default">
        <div className="h-20px w-20px overflow-hidden rounded-full">
          <Image
            src={`/flags/${item.value}.svg`}
            alt={`${item.value}_icon`}
            width={24}
            height={24}
          />
        </div>
        {item.label}
      </LandingButton>
    </Link>
  ));

  const langBtn = (
    <div ref={langDropdownRef} className="relative flex flex-col gap-8px whitespace-nowrap">
      <LandingButton
        type="button"
        onClick={toggleLangDropdown}
        className="w-170px rounded-sm bg-landing-nav px-24px font-bold shadow-landing-nav"
      >
        <div className="h-20px w-20px overflow-hidden rounded-full">
          <Image
            src={`/flags/${currentLanguage.value}.svg`}
            alt={`${currentLanguage.value}_icon`}
            width={24}
            height={24}
          />
        </div>
        <div className="flex-1">{currentLanguage.label}</div>
        <div className={isLangOpen ? 'rotate-180' : 'rotate-0'}>
          <FaChevronDown />
        </div>
      </LandingButton>
    </div>
  );

  // ToDo: (20241219 - Julian) 補上正確的路徑
  const navigationOptions = (
    <>
      {/* <Link href={ISUNFA_ROUTE.LANDING_PAGE}>
        <LandingButton type="button" variant="default" disabled>
          {t('landing_page_v2:NAVBAR.USERS')}
        </LandingButton>
      </Link> */}
      <Link href={ISUNFA_ROUTE.PRICING} className="p-10px">
        <LandingButton type="button" className="w-full">
          {t('landing_page_v2:NAVBAR.PRICING')}
        </LandingButton>
      </Link>
      {/* <Link href={ISUNFA_ROUTE.LANDING_PAGE}>
        <LandingButton type="button" variant="default" disabled>
          {t('landing_page_v2:NAVBAR.FAITH')}
        </LandingButton>
      </Link> */}
      {/* <Link href={ISUNFA_ROUTE.LANDING_PAGE}>
        <LandingButton type="button" variant="default" disabled>
          {t('landing_page_v2:NAVBAR.JOIN_US')}
        </LandingButton>
      </Link> */}
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
    <nav className="z-40 w-full">
      <div className="z-50 flex items-center justify-between rounded-sm border-b bg-landing-nav px-16px py-12px shadow-landing-nav backdrop-blur-md md:inset-x-36px md:mx-36px md:px-40px lg:px-112px">
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

          {/* Info: (20241204 - Julian) Language Button */}
          <div className="hidden lg:block">{langBtn}</div>
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
      </div>

      {/* Info: (20241227 - Julian) Dropdown */}
      <div
        ref={dropdownRef}
        className={`absolute right-0 flex flex-col rounded-sm border-b bg-landing-page-white/30 px-20px py-12px font-bold shadow-landing-nav backdrop-blur-md transition-all duration-300 ease-in-out md:right-40px lg:hidden ${isOpen ? 'visible top-110px opacity-100' : 'invisible top-50px opacity-0'}`}
      >
        {/* Info: (20241227 - Julian) I18n */}
        {langBtn}
        {/* Info: (20241227 - Julian) Language Dropdown */}
        <div
          className={`grid w-full overflow-hidden rounded-sm border-b bg-landing-page-white/30 shadow-landing-nav transition-all duration-300 ease-in-out ${
            isLangOpen ? 'mt-10px grid-rows-1 opacity-100' : 'grid-rows-0 opacity-0'
          }`}
        >
          <div className="flex flex-col items-start py-12px">{langOptions}</div>
        </div>
        {/* Info: (20241227 - Julian) Navigation */}
        {navigationOptions}
      </div>

      {/* Info: (20241227 - Julian) Language Dropdown */}
      <div
        className={`absolute left-410px top-100px hidden w-170px rounded-sm border-b bg-landing-page-white/30 shadow-landing-nav transition-all duration-300 ease-in-out lg:grid ${
          isLangOpen ? 'grid-rows-1 opacity-100' : 'grid-rows-0 opacity-0'
        } overflow-hidden backdrop-blur-md`}
      >
        <div className="flex flex-col items-start py-12px">{langOptions}</div>
      </div>
    </nav>
  );
};

export default LandingNavbar;
