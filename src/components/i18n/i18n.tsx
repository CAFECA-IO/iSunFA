import { useTranslation } from 'next-i18next';
import React, { Dispatch, SetStateAction, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import useOuterClick from '../../lib/hooks/use_outer_click';

type TranslateFunction = (s: string) => string;
interface II18nParams {
  langIsOpen?: boolean;
  setLangIsOpen?: Dispatch<SetStateAction<boolean>>;
}

const I18n = ({ langIsOpen, setLangIsOpen }: II18nParams) => {
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
    <div className="max-w-1920px relative mx-auto hidden lg:flex">
      <div
        id="I18nMenuDesktop"
        className={`absolute -left-16 top-6 z-20 w-150px ${
          globalVisible ? 'visible opacity-100' : 'invisible opacity-0'
        }  rounded-none bg-white shadow-dropmenu transition-all duration-300`}
      >
        <ul
          className="mx-3 py-1 pb-3 text-base text-button-text-secondary"
          aria-labelledby="i18nButton"
        >
          {internationalizationList.map((item) => (
            <li key={item.value} onClick={desktopClickHandler}>
              <Link
                id={`${item.value.toUpperCase()}ButtonDesktop`}
                scroll={false}
                locale={item.value}
                href={asPath}
                className="block rounded-none py-2 text-center hover:text-button-surface-strong-primary"
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
        openMenu ? 'visible opacity-100' : 'invisible opacity-0'
      } lg:hidden`}
    >
      <div
        id="I18nMenuMobile"
        className="absolute left-0 top-28 z-10 h-full w-screen bg-white shadow"
      >
        <ul className="text-center text-base dark:text-gray-200" aria-labelledby="i18nButton">
          {internationalizationList.map((item) => (
            <li key={item.value} onClick={mobileClickHandler}>
              <Link
                id={`${item.value.toUpperCase()}ButtonMobile`}
                scroll={false}
                locale={item.value}
                href={asPath}
                className="hover:text-tidebitTheme block rounded-none px-3 py-7 font-medium hover:cursor-pointer"
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
      <div className="hidden lg:flex">
        <div onClick={desktopClickHandler} className="hover:cursor-pointer">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            fill="none"
            viewBox="0 0 32 32"
          >
            <path
              fill="#001840"
              fillRule="evenodd"
              d="M4.038 13.001a12.36 12.36 0 00-.367 3c0 1.035.127 2.04.367 3h5.904a21.401 21.401 0 01-.271-3.02A21.4 21.4 0 019.94 13H4.039zm.688-2h5.64a21.401 21.401 0 013.366-7.124A12.353 12.353 0 004.726 11zM16.004 4.2a19.4 19.4 0 00-3.564 6.802h7.128A19.4 19.4 0 0016.004 4.2zm4.033 8.802h-8.066a19.38 19.38 0 00-.3 3 19.38 19.38 0 00.3 3h8.066c.177-.985.278-1.988.3-3a19.405 19.405 0 00-.3-3zm2.029 6a21.395 21.395 0 00.271-3.02 21.393 21.393 0 00-.271-2.98h5.904c.24.96.367 1.965.367 3s-.127 2.04-.367 3h-5.904zm-2.498 2H12.44a19.4 19.4 0 003.564 6.802A19.402 19.402 0 0019.568 21zm-5.836 7.125A21.402 21.402 0 0110.365 21H4.726a12.353 12.353 0 009.006 7.125zm4.544 0A21.402 21.402 0 0021.643 21h5.639a12.353 12.353 0 01-9.006 7.125zM27.282 11h-5.64a21.401 21.401 0 00-3.366-7.124A12.353 12.353 0 0127.282 11zm-25.611 5c0-7.916 6.417-14.333 14.333-14.333S30.337 8.085 30.337 16 23.92 30.334 16.004 30.334 1.67 23.917 1.67 16.001z"
              clipRule="evenodd"
            ></path>
          </svg>
        </div>
      </div>
      <button
        id="NavLanguageMobile"
        onClick={mobileClickHandler}
        type="button"
        className="hover:text-tidebitTheme inline-flex lg:hidden"
      >
        {t('NAV_BAR.LANGUAGE')}
      </button>
    </>
  );

  return (
    <div ref={globalRef} className="">
      {displayedI18n}
      {displayedDesktopMenu}
      {displayedMobileMenu}
    </div>
  );
};

export default I18n;
