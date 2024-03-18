import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { BFAURL } from '../../constants/url';
import useOuterClick from '../../lib/hooks/use_outer_click';
import I18n from '../i18n/i18n';

import { TranslateFunction } from '../../interfaces/locale';

function LandingNavBar() {
  const { t }: { t: TranslateFunction } = useTranslation('common');
  // const [dropdownOpen, setDropdownOpen] = useState(false);

  // const toggleDropdown = () => {
  //   setDropdownOpen(!dropdownOpen);
  // };

  const router = useRouter();
  const { asPath } = router;

  const {
    targetRef: dropdown,
    componentVisible: dropdownOpen,
    setComponentVisible: setDropdownOpen,
  } = useOuterClick<HTMLDivElement>(false);

  // const [dropdownOpen, setDropdownOpen] = useState(false);
  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  const languages = [
    { label: 'EN', code: 'en' },
    { label: '繁', code: 'tw' },
    { label: '简', code: 'cn' },
  ];

  const changeLanguage = (code: string) => {
    router.push(asPath, asPath, { locale: code });
    setDropdownOpen(false);
  };

  /* Info:(20230814 - Julian) Scroll Position */
  const [scroll, setScroll] = useState(0);

  const handleScroll = () => {
    const position = window.scrollY;
    setScroll(position);
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  /* Info:(20230814 - Julian) Change Navbar Background Style */
  const bgStyle = scroll >= 100 ? 'bg-secondaryBlue shadow-xl' : 'bg-transparent';

  /* Info: (20230712 - Julian) close menu when click outer */
  const { targetRef, componentVisible, setComponentVisible } = useOuterClick<HTMLDivElement>(false);

  const clickMenuHandler = () => setComponentVisible(!componentVisible);

  /* Info: (20230712 - Julian) desktop navbar */
  const desktopNavBar = (
    <div
      className={`-ml-5 hidden h-80px w-screen items-center px-20 py-3 font-barlow ${bgStyle} text-white transition-all duration-300 ease-in-out lg:flex`}
    >
      <ul className="flex flex-1 items-center space-x-10">
        <li>
          <Link href={BFAURL.HOME}>
            <Image src="/logo/isunfa_logo.svg" width={140} height={40} alt="iSunFA_logo" />
          </Link>
        </li>
        <li>
          <Link href={BFAURL.COMING_SOON} className="flex space-x-2">
            <Image src="/elements/icon_wrapper.svg" width={20} height={20} alt="nav_icon" />{' '}
            <p className="text-base text-white">{t('NAV_BAR.ABOUT')}</p>
          </Link>
        </li>
        <li>
          <Link href={BFAURL.COMING_SOON} className="flex space-x-2">
            {' '}
            <Image src="/elements/icon_wrapper_1.svg" width={20} height={20} alt="nav_icon" />
            <p className="text-base text-white">{t('NAV_BAR.FEATURES')}</p>
          </Link>
        </li>
        <li>
          <Link href={BFAURL.CONTACT_US} className="flex space-x-2">
            {' '}
            <Image src="/elements/icon_wrapper_2.svg" width={20} height={20} alt="nav_icon" />
            <p className="text-base text-white"> {t('NAV_BAR.CONTACT_US')}</p>
          </Link>
        </li>
        {/* TODO: refactor i18n (20240315 - Shirley) */}
        <li>{/* <I18n /> */}</li>
      </ul>

      <ul className="mr-10 flex items-center space-x-4">
        {/* TODO: refactor i18n (20240315 - Shirley) */}
        <div ref={dropdown}>
          <li>
            <button
              className={`absolute right-18rem top-3 flex flex-col items-center justify-center space-x-2 rounded-full  font-bold hover:bg-tertiaryBlue ${dropdownOpen ? 'bg-tertiaryBlue p-4' : 'p-4'}`}
              type="button"
              onClick={toggleDropdown}
            >
              <Image src="/elements/globe.svg" width={24} height={24} alt="i18n" />
              <ul
                className={`mx-auto flex flex-col items-center justify-center space-y-4 py-8 text-center ${dropdownOpen ? 'block' : 'hidden'}`}
              >
                {languages.map((lang: { label: string; code: string }) => (
                  <li
                    key={lang.code}
                    className="mr-2 cursor-pointer font-bold text-primaryYellow hover:text-white"
                    onClick={() => changeLanguage(lang.code)}
                  >
                    {lang.label}
                  </li>
                ))}
              </ul>
            </button>
          </li>
        </div>
        <li>
          <button
            className="flex items-center space-x-2 rounded-lg bg-primaryYellow px-6 py-3 font-bold text-tertiaryBlue"
            type="button"
          >
            <p className="">{t('NAV_BAR.TRY_NOW')}</p>
            <Image src="/elements/arrow.svg" width={20} height={20} alt="arrow_right" />
          </button>
        </li>
        <li>
          {/* TODO: (20230115 - Shirley) hide the button as temporary solution */}
          {/* <Link
            href={BFAURL.APP}
            target="_blank"
            className="rounded-lg bg-primaryYellow text-secondaryBlue px-10 py-3 hover:bg-hoverWhite"
          >
            {t('NAV_BAR.LAUNCH_APP')}
          </Link> */}
        </li>
      </ul>
    </div>
  );

  /* Info: (20230712 - Julian) mobile navbar */
  const mobileNavBar = (
    <div
      ref={targetRef}
      className="relative -ml-5 flex h-80px w-screen items-center justify-center bg-secondaryBlue p-4 text-white shadow-xl lg:hidden"
    >
      {/* Info: (20230712 - Julian) hamburger */}
      <button className="absolute left-4 p-10px" onClick={clickMenuHandler} type="button">
        <Image src="/icons/hamburger.svg" width={24} height={24} alt="hamburger_icon" />
      </button>
      <div className="">
        <Link href={BFAURL.HOME}>
          <Image src="/logo/isunfa_logo_small.svg" width={50} height={60} alt="iSunFA_logo" />
        </Link>
      </div>
      <ul
        className={`absolute left-0 top-0 mt-80px flex h-screen w-80vw flex-col items-center overflow-hidden bg-secondaryBlue px-5 ${
          componentVisible ? 'visible translate-x-0' : 'invisible -translate-x-full'
        } drop-shadow-xlSide transition-all duration-300 ease-in-out`}
      >
        <li className="px-10 py-4">
          {/* ToDo: (20230727 - Julian) contact us page */}
          {/* TODO: (20230115 - Shirley) hide the button as temporary solution */}
          <Link href={BFAURL.CONTACT_US} className="px-10 py-4 hover:text-primaryYellow">
            {t('NAV_BAR.CONTACT_US')}
          </Link>
        </li>
        <li className="px-10 py-4">
          {/* TODO: (20230115 - Shirley) hide the button as temporary solution */}
          {/* <Link href={BFAURL.APP} target="_blank" className="px-10 py-4">
            {t('NAV_BAR.LAUNCH_APP')}
          </Link> */}
        </li>
        <li className="px-10 py-4">
          <I18n />
        </li>
      </ul>
    </div>
  );

  return (
    <div className="container fixed inset-x-0 top-0 z-40 mx-auto max-w-full font-inter">
      {desktopNavBar}
      {mobileNavBar}
    </div>
  );
}

export default LandingNavBar;
