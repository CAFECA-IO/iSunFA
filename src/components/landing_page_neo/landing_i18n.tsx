import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { FaChevronDown } from 'react-icons/fa6';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { LandingButton } from '@/components/landing_page_neo/landing_button';
import Link from 'next/link';

interface IInternationalization {
  label: string;
  value: string;
}

const internationalizationList: IInternationalization[] = [
  { label: 'English', value: 'en' },
  { label: '繁體中文', value: 'tw' },
  { label: '简体中文', value: 'cn' },
];

const LandingI18n: React.FC = () => {
  const { asPath, locale } = useRouter();

  const {
    targetRef: dropdownRef,
    componentVisible: isOpen,
    setComponentVisible: setIsOpen,
  } = useOuterClick<HTMLDivElement>(false);

  // Info: (20241204 - Julian) Get the current language
  const internationalization =
    internationalizationList.find((item) => item.value === locale) ?? internationalizationList[0];

  const [currentLanguage, setCurrentLanguage] =
    useState<IInternationalization>(internationalization);

  // Info: (20241204 - Julian) 即時更新當前語言
  useEffect(() => {
    setCurrentLanguage(internationalization);
  }, [locale]);

  const toggleDropdown = () => setIsOpen((prev) => !prev);

  const langOptions = internationalizationList.map((item) => (
    <Link
      id={`${item.value.toLowerCase()}_btn`}
      key={item.value}
      scroll={false}
      locale={item.value}
      href={asPath}
      onClick={() => {
        setCurrentLanguage(item);
        setIsOpen(false);
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

  return (
    <div ref={dropdownRef} className="relative flex flex-col gap-8px whitespace-nowrap">
      <LandingButton
        type="button"
        onClick={toggleDropdown}
        className="w-170px rounded-sm bg-landing-page-white/30 px-24px font-bold shadow-landing-nav"
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
        <div className={isOpen ? 'rotate-180' : 'rotate-0'}>
          <FaChevronDown />
        </div>
      </LandingButton>

      {/* Info: (20241204 - Julian) Dropdown */}
      <div
        className={`grid w-full overflow-hidden bg-landing-page-white/30 shadow-landing-nav backdrop-blur-md ${
          isOpen ? 'grid-rows-1 opacity-100' : 'grid-rows-0 opacity-0'
        } rounded-sm border-b transition-all duration-300 ease-in-out lg:absolute lg:top-50px`}
      >
        <div className="flex flex-col items-start py-12px">{langOptions}</div>
      </div>
    </div>
  );
};

export default LandingI18n;
