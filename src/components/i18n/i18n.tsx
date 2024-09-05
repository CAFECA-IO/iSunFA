import { useTranslation } from 'next-i18next';
import React, { Dispatch, SetStateAction, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import Link from 'next/link';
import useOuterClick from '@/lib/hooks/use_outer_click';

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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              className="fill-current"
              fillRule="evenodd"
              d="M15.533 5.47a.75.75 0 010 1.061l-5.47 5.47 5.47 5.47a.75.75 0 11-1.06 1.06l-6-6a.75.75 0 010-1.06l6-6a.75.75 0 011.06 0z"
              clipRule="evenodd"
            ></path>
          </svg>
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
      <button type="button" onClick={desktopClickHandler} className="hidden lg:flex">
        <Image src="/icons/globe.svg" alt="globe" width={24} height={24} />
      </button>

      <button
        id="NavLanguageMobile"
        onClick={mobileClickHandler}
        type="button"
        className="flex w-screen items-center justify-between gap-8px py-10px pl-6 pr-6 text-button-text-secondary hover:text-button-text-primary-hover disabled:text-button-text-secondary disabled:opacity-50 lg:hidden"
      >
        <div className="flex w-full items-center gap-8px">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="none"
            viewBox="0 0 20 20"
          >
            <path
              className="fill-current"
              fillRule="evenodd"
              d="M2.622 8.251a7.605 7.605 0 000 3.5h3.445a13.502 13.502 0 01-.148-1.766 13.5 13.5 0 01.148-1.734H2.622zm.527-1.5h3.233a13.501 13.501 0 011.915-4.14A7.598 7.598 0 003.15 6.75zm6.853-3.926a12 12 0 00-2.06 3.926h4.12a12 12 0 00-2.06-3.926zm2.416 5.426H7.587c-.098.575-.155 1.16-.168 1.75a12 12 0 00.168 1.75h4.83c.099-.575.155-1.16.168-1.75-.013-.59-.069-1.175-.167-1.75zm1.52 3.5a13.51 13.51 0 00.147-1.766 13.508 13.508 0 00-.148-1.734h3.446a7.605 7.605 0 010 3.5h-3.446zm-1.876 1.5h-4.12a12 12 0 002.06 3.926 12 12 0 002.06-3.926zm-3.765 4.141a13.502 13.502 0 01-1.915-4.14H3.149a7.598 7.598 0 005.148 4.14zm3.41 0a13.501 13.501 0 001.916-4.14h3.233a7.598 7.598 0 01-5.149 4.14zm5.149-10.64h-3.233a13.5 13.5 0 00-1.916-4.142 7.598 7.598 0 015.149 4.141zM.919 10.001A9.083 9.083 0 1119.086 10a9.083 9.083 0 01-18.167 0z"
              clipRule="evenodd"
            ></path>
          </svg>
          <p> {t('common:NAV_BAR.LANGUAGE')}</p>
        </div>

        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          fill="none"
          viewBox="0 0 20 20"
        >
          <path
            className="fill-current"
            fillRule="evenodd"
            d="M6.972 4.47a.75.75 0 011.06 0l5 5a.75.75 0 010 1.061l-5 5a.75.75 0 01-1.06-1.06l4.47-4.47-4.47-4.47a.75.75 0 010-1.06z"
            clipRule="evenodd"
          ></path>
        </svg>
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
