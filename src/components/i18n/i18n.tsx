import { useTranslation } from 'next-i18next';
import React, { Dispatch, SetStateAction, useState } from 'react';
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
    <div className="max-w-1920px relative mx-auto hidden lg:flex">
      <div
        id="I18nMenuDesktop"
        className={`absolute -left-16 top-6 z-20 w-150px ${
          globalVisible ? 'visible opacity-100' : 'invisible opacity-0'
        }  rounded-none bg-white shadow-dropmenu transition-all duration-300`}
      >
        <ul
          className="mx-0 py-1 pb-3 text-base text-button-text-secondary"
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
                className="block rounded-none px-3 py-7 font-medium hover:cursor-pointer"
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
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              className="fill-current"
              fillRule="evenodd"
              clipRule="evenodd"
              d="M3.02388 9.25114C2.90079 9.81491 2.83594 10.4005 2.83594 11.0011C2.83594 11.6018 2.90079 12.1874 3.02388 12.7511H6.47228C6.39399 12.1804 6.34826 11.6031 6.33615 11.022C6.33587 11.0081 6.33587 10.9942 6.33615 10.9803C6.34826 10.3992 6.39399 9.82191 6.47228 9.25114H3.02388ZM3.7459 7.25114H6.8868C7.29111 5.80379 7.91098 4.42273 8.72736 3.15561C6.56065 3.78287 4.76484 5.28338 3.7459 7.25114ZM11.0026 3.39268C10.1114 4.56077 9.4281 5.86623 8.97597 7.25114H13.0292C12.5771 5.86623 11.8938 4.56077 11.0026 3.39268ZM13.5113 9.25114H8.49394C8.40247 9.82741 8.34939 10.412 8.33617 11.0011C8.34939 11.5903 8.40247 12.1749 8.49394 12.7511H13.5113C13.6027 12.1749 13.6558 11.5903 13.669 11.0011C13.6558 10.412 13.6027 9.82741 13.5113 9.25114ZM15.5329 12.7511C15.6112 12.1804 15.6569 11.6031 15.6691 11.022C15.6693 11.0081 15.6693 10.9942 15.6691 10.9803C15.6569 10.3992 15.6112 9.82191 15.5329 9.25114H18.9813C19.1044 9.81491 19.1693 10.4005 19.1693 11.0011C19.1693 11.6018 19.1044 12.1874 18.9813 12.7511H15.5329ZM13.0292 14.7511H8.97597C9.4281 16.136 10.1114 17.4415 11.0026 18.6096C11.8938 17.4415 12.5771 16.136 13.0292 14.7511ZM8.72735 18.8467C7.91098 17.5795 7.29111 16.1985 6.8868 14.7511H3.7459C4.76484 16.7189 6.56065 18.2194 8.72735 18.8467ZM13.2779 18.8467C14.0942 17.5795 14.7141 16.1985 15.1184 14.7511H18.2593C17.2404 16.7189 15.4446 18.2194 13.2779 18.8467ZM18.2593 7.25114H15.1184C14.7141 5.80379 14.0942 4.42273 13.2779 3.15561C15.4446 3.78287 17.2404 5.28338 18.2593 7.25114ZM0.835938 11.0011C0.835938 5.38624 5.38771 0.834473 11.0026 0.834473C16.6175 0.834473 21.1693 5.38624 21.1693 11.0011C21.1693 16.616 16.6175 21.1678 11.0026 21.1678C5.38771 21.1678 0.835938 16.616 0.835938 11.0011Z"
              fill="#001840"
            />
          </svg>
        </div>
      </div>
      <button
        id="NavLanguageMobile"
        onClick={mobileClickHandler}
        type="button"
        className="inline-flex lg:hidden"
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
