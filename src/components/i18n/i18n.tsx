import { useTranslation } from 'next-i18next';
import React, { Dispatch, SetStateAction, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { VscGlobe } from 'react-icons/vsc';

type TranslateFunction = (s: string) => string;
interface II18nProps {
  langIsOpen?: boolean;
  setLangIsOpen?: Dispatch<SetStateAction<boolean>>;
}

const I18n = ({ langIsOpen, setLangIsOpen }: II18nProps) => {
  const { t }: { t: TranslateFunction } = useTranslation('common');

  const [openMenu, setOpenMenu] =
    typeof setLangIsOpen !== 'function' ? useState(false) : [langIsOpen, setLangIsOpen];

  const { asPath } = useRouter();
  const {
    targetRef: globalRef,
    componentVisible: globalVisible,
    setComponentVisible: setGlobalVisible,
  } = useOuterClick<HTMLDivElement>(false);

  const desktopClickHandler = () => {
    setGlobalVisible(!globalVisible);
  };
  const mobileClickHandler = () => {
    setOpenMenu(!openMenu);
  };

  const internationalizationList = [
    { label: 'English', value: 'en' },
    { label: '繁體中文', value: 'tw' },
    { label: '简体中文', value: 'cn' },
  ];

  const displayedDesktopMenu = (
    <div className="relative mx-auto hidden max-w-1920px lg:flex">
      <div
        id="I18nMenuDesktop"
        className={`absolute -left-16 top-30px z-20 w-150px rounded-sm ${
          globalVisible ? 'visible opacity-100' : 'invisible opacity-0'
        } rounded-none bg-white shadow-dropmenu transition-all duration-300`}
      >
        <ul className="py-1 text-base text-button-text-secondary" aria-labelledby="i18nButton">
          {internationalizationList.map((item) => (
            <li key={item.value} onClick={desktopClickHandler}>
              <Link
                id={`${item.value.toUpperCase()}ButtonDesktop`}
                scroll={false}
                locale={item.value}
                href={asPath}
                className="block rounded-none py-3 text-center hover:text-button-text-primary-hover"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const displayedMobileMenu = (
    <div
      className={`transition-all duration-300 ${
        openMenu
          ? 'visible -translate-y-7rem opacity-100'
          : 'invisible -translate-y-36rem opacity-0'
      } lg:hidden`}
    >
      <div
        id="I18nMenuMobile"
        className="absolute left-0 top-0 z-10 h-300px w-screen bg-white shadow"
      >
        <button
          onClick={mobileClickHandler}
          type="button"
          className="px-4 pt-2 text-button-text-secondary hover:text-button-text-primary-hover"
        >
          <IoIosArrowBack size={24} />
        </button>
        <ul
          className="text-center text-base text-button-text-secondary"
          aria-labelledby="i18nButton"
        >
          {internationalizationList.map((item) => (
            <li key={item.value} onClick={mobileClickHandler}>
              <Link
                id={`${item.value.toUpperCase()}ButtonMobile`}
                scroll={false}
                locale={item.value}
                href={asPath}
                className="block rounded-none px-3 py-7 font-medium text-button-text-secondary hover:cursor-pointer hover:text-button-text-primary-hover"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const displayedI18n = (
    <>
      <button
        type="button"
        onClick={desktopClickHandler}
        className="hidden p-10px text-icon-surface-single-color-primary hover:text-button-text-primary-hover disabled:text-button-text-disable laptop:flex"
      >
        <VscGlobe size={26} />
      </button>

      <button
        id="NavLanguageMobile"
        onClick={mobileClickHandler}
        type="button"
        className="flex w-screen items-center justify-between gap-8px py-10px pl-6 pr-6 text-button-text-secondary hover:text-button-text-primary-hover disabled:text-button-text-secondary disabled:opacity-50 laptop:hidden"
      >
        <div className="flex w-full items-center gap-8px">
          <VscGlobe size={20} />
          <p> {t('common:NAV_BAR.LANGUAGE')}</p>
        </div>

        <IoIosArrowForward size={20} />
      </button>
    </>
  );

  return (
    <div ref={globalRef}>
      {displayedI18n}
      {displayedDesktopMenu}
      {displayedMobileMenu}
    </div>
  );
};

export default I18n;
