import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { VscGlobe } from 'react-icons/vsc';
import { Dispatch, SetStateAction } from 'react';

const INTERNATIONALIZATION_LIST = [
  { label: 'English', value: 'en' },
  { label: '繁體中文', value: 'tw' },
  { label: '简体中文', value: 'cn' },
];

interface I18nProps {
  isMenuVisible: boolean;
  setIsMenuVisible: Dispatch<SetStateAction<boolean>>;
  toggleI18nMenu?: () => void;
}

const I18n = ({
  isMenuVisible,
  setIsMenuVisible,
  toggleI18nMenu = () => setIsMenuVisible((prev) => !prev),
}: I18nProps) => {
  const { t } = useTranslation(['dashboard']);
  const closeMenu = () => {
    setIsMenuVisible(false);
  };

  const { asPath } = useRouter();

  const displayedDesktopMenu = (
    <div
      id="I18nMenuDesktop"
      className={`absolute start-1/2 top-full z-50 mt-10px w-150px -translate-x-1/2 rounded-sm ${
        isMenuVisible ? 'visible opacity-100' : 'invisible opacity-0'
      } bg-white shadow-dropmenu transition-all duration-300`}
    >
      <ul className="py-1 text-base text-button-text-secondary" aria-labelledby="i18nButton">
        {INTERNATIONALIZATION_LIST.map((item) => (
          <li key={item.value} onClick={closeMenu}>
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
  );

  const displayedMobileMenu = (
    <div
      className={`transition-all duration-300 ${
        isMenuVisible
          ? 'visible -translate-y-7rem opacity-100'
          : 'invisible -translate-y-36rem opacity-0'
      } lg:hidden`}
    >
      <div
        id="I18nMenuMobile"
        className="absolute left-0 top-0 z-10 h-300px w-screen bg-white shadow"
      >
        <button
          onClick={closeMenu}
          type="button"
          className="px-4 pt-2 text-button-text-secondary hover:text-button-text-primary-hover"
        >
          <IoIosArrowBack size={24} />
        </button>
        <ul
          className="text-center text-base text-button-text-secondary"
          aria-labelledby="i18nButton"
        >
          {INTERNATIONALIZATION_LIST.map((item) => (
            <li key={item.value} onClick={closeMenu}>
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
        onClick={toggleI18nMenu}
        className="hidden p-10px text-icon-surface-single-color-primary hover:text-button-text-primary-hover disabled:text-button-text-disable laptop:flex"
      >
        <VscGlobe size={26} />
      </button>

      <button
        id="NavLanguageMobile"
        onClick={toggleI18nMenu}
        type="button"
        className="flex w-screen items-center justify-between gap-8px py-10px pl-6 pr-6 text-button-text-secondary hover:text-button-text-primary-hover disabled:text-button-text-secondary disabled:opacity-50 laptop:hidden"
      >
        <div className="flex w-full items-center gap-8px">
          <VscGlobe size={20} />
          <p>{t('dashboard:HEADER.LANGUAGE')}</p>
        </div>

        <IoIosArrowForward size={20} />
      </button>
    </>
  );

  return (
    <div className="relative">
      {displayedI18n}
      {displayedDesktopMenu}
      {displayedMobileMenu}
    </div>
  );
};

export default I18n;
