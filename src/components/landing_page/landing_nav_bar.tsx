import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { RxHamburgerMenu } from 'react-icons/rx';
import { LuBuilding2, LuFileText } from 'react-icons/lu';
import { PiMedal, PiEnvelope, PiGlobe } from 'react-icons/pi';
import { FaArrowRightLong } from 'react-icons/fa6';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { TranslateFunction } from '@/interfaces/locale';
import { Button } from '@/components/button/button';
import { cn } from '@/lib/utils/common';
import { ISUNFA_ROUTE } from '@/constants/url';
import version from '@/lib/version';
import { useUserCtx } from '@/contexts/user_context';

const languages = [
  { label: 'EN', code: 'en' },
  { label: '繁', code: 'tw' },
  { label: '简', code: 'cn' },
];

interface LandingNavBarProps {
  transparentInitially?: boolean;
}

const isLinkDisabled = true; // Info: (20240719 - Liz) Audit Report 目前都是假資料所以不開放

function LandingNavBar({ transparentInitially }: LandingNavBarProps) {
  const { t }: { t: TranslateFunction } = useTranslation('landing_page');
  const { isSignIn } = useUserCtx();

  const router = useRouter();
  const { asPath } = router;
  /* Info: (20230814 - Shirley) Scroll Position */
  const [scroll, setScroll] = useState(0);

  const {
    targetRef: dropdownRef,
    componentVisible: dropdownOpen,
    setComponentVisible: setDropdownOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  /* Info: (20230712 - Shirley) close menu when click outer */
  const {
    targetRef: menuRef,
    componentVisible: menuVisible,
    setComponentVisible: setMenuVisible,
  } = useOuterClick<HTMLDivElement>(false);

  const clickMenuHandler = () => setMenuVisible(!menuVisible);

  const changeLanguage = (code: string) => {
    router.push(asPath, asPath, { locale: code });
  };

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

  /* Info:(20230814 - Shirley) Change Navbar Background Style */
  const bgStyle =
    transparentInitially && scroll <= 100 ? 'bg-transparent' : 'bg-navy-blue-600 shadow-xl';

  /* Info: (20230712 - Shirley) desktop navbar */
  const desktopNavBar = (
    <div
      className={`hidden h-80px w-screen items-center font-barlow lg:px-2 ${bgStyle} text-navy-blue-25 transition-all duration-300 ease-in-out lg:flex`}
    >
      <ul className="flex flex-1 items-center space-x-5 lg:space-x-10">
        {/* Landing Page Home */}
        <li>
          <div className="flex shrink-0 items-end justify-end space-x-2">
            <Link href={ISUNFA_ROUTE.LANDING_PAGE} className="pl-10">
              <Image src="/logo/isunfa_logo.svg" width={140} height={40} alt="iSunFA_logo" />
            </Link>
            <div className="my-auto flex flex-col justify-center self-stretch rounded-xs bg-badge-surface-soft-primary px-1 text-badge-text-primary-solid">
              <div className="flex flex-col justify-center rounded-xs px-0.1rem py-1">
                <div className="justify-center px-1 text-xs">v{version}</div>
              </div>
            </div>
          </div>
        </li>

        {/* About */}
        <li>
          <Link
            href={ISUNFA_ROUTE.ABOUT}
            className="flex items-center space-x-2 text-navy-blue-25 hover:text-orange-400"
          >
            <LuBuilding2 size={20} />
            <p className="text-base">{t('landing_page:NAV_BAR.ABOUT')}</p>
          </Link>
        </li>

        {/* Features */}
        <li>
          <Link
            href={ISUNFA_ROUTE.FEATURES}
            className="flex items-center space-x-2 text-navy-blue-25 hover:text-orange-400"
          >
            <PiMedal size={20} />
            <p className="text-base">{t('landing_page:NAV_BAR.FEATURES')}</p>
          </Link>
        </li>

        {/* Reports */}
        <li>
          {/* // Info: (20240719 - Liz) Audit Report 目前都是假資料所以不開放 */}
          {isLinkDisabled ? (
            <div
              className="flex cursor-wait items-center space-x-2 text-navy-blue-300"
              title={t('landing_page:NAV_BAR.LINK_NOT_OPEN')}
            >
              <LuFileText size={20} />
              <p className="text-base">{t('landing_page:NAV_BAR.REPORTS')}</p>
            </div>
          ) : (
            <Link
              href={ISUNFA_ROUTE.REPORTS}
              className="flex items-center space-x-2 text-navy-blue-25 hover:text-orange-400"
            >
              <LuFileText size={20} />
              <p className="text-base">{t('landing_page:NAV_BAR.REPORTS')}</p>
            </Link>
          )}
        </li>

        {/* Contact Us */}
        <li>
          <Link
            href={ISUNFA_ROUTE.CONTACT_US}
            className="flex items-center space-x-2 text-navy-blue-25 hover:text-orange-400"
          >
            <PiEnvelope size={20} />
            <p className="text-base"> {t('landing_page:NAV_BAR.CONTACT_US')}</p>
          </Link>
        </li>

        {/* TODO: (20240315 - Shirley) [Beta] refactor i18n */}
        <li>{/* <I18n /> */}</li>
      </ul>

      <ul className="flex items-center space-x-0 lg:mr-10">
        {/* TODO: (20240315 - Shirley) [Beta] refactor i18n */}
        <li>
          <div
            ref={dropdownRef}
            className={`absolute right-11rem top-3 flex flex-col items-center justify-center rounded-full font-bold lg:right-13rem ${dropdownOpen ? 'bg-navy-blue-400 py-4' : 'm-4'} hover:cursor-pointer`}
            onClick={toggleDropdown}
          >
            <PiGlobe size={24} />
            <ul
              className={`w-60px flex-col items-center justify-center space-y-0 pb-3 pt-4 text-center ${dropdownOpen ? 'flex' : 'hidden'}`}
            >
              {languages.map((lang: { label: string; code: string }) => (
                <li
                  key={lang.code}
                  className="w-full cursor-pointer px-5 py-2.5 font-bold text-orange-400 hover:text-navy-blue-25"
                  onClick={(event) => {
                    event.preventDefault();
                    changeLanguage(lang.code);
                  }}
                >
                  {lang.label}
                </li>
              ))}
            </ul>
          </div>
        </li>
        <li>
          <Link href={isSignIn ? ISUNFA_ROUTE.DASHBOARD : ISUNFA_ROUTE.LOGIN}>
            <Button
              className={`flex space-x-3 ${cn(
                'text-base leading-6 tracking-normal',
                'text-navy-blue-500',
                'hover:text-navy-blue-25'
              )}`}
            >
              <p>{t('landing_page:NAV_BAR.TRY_NOW')}</p>
              <FaArrowRightLong size={16} />
            </Button>
          </Link>
        </li>
      </ul>
    </div>
  );

  /* Info: (20230712 - Shirley) mobile navbar */
  const mobileNavBar = (
    <div
      className={`${bgStyle} flex w-screen shrink-0 items-center justify-between gap-5 p-4 pr-5 text-navy-blue-25 shadow-xl lg:hidden`}
    >
      {/* Info: (20240321 - Shirley) logo */}
      <div>
        <div className="flex items-end justify-end space-x-2">
          <Link href={ISUNFA_ROUTE.LANDING_PAGE} className="">
            <Image src="/logo/isunfa_logo.svg" width={150} height={30} alt="iSunFA_logo" />
          </Link>
          <div className="my-auto flex flex-col justify-center self-stretch rounded-xs bg-badge-surface-soft-primary px-1 text-badge-text-primary-solid">
            <div className="flex flex-col justify-center rounded-xs px-0.1rem py-1">
              <div className="justify-center px-1 text-xs">v {version}</div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-end space-x-0">
        {/* TODO: (20240315 - Shirley) [Beta] refactor i18n */}
        <div ref={dropdownRef} className="z-50">
          <div className="flex items-center">
            <div
              className={`absolute right-5rem top-5 flex flex-col items-center justify-center space-x-2 rounded-full font-bold lg:right-18rem ${dropdownOpen ? '-mr-6 -mt-4 bg-navy-blue-400 p-4' : ''} hover:cursor-pointer`}
              onClick={toggleDropdown}
            >
              <PiGlobe size={24} />
              <ul
                className={`mx-auto flex w-full flex-col items-center justify-center space-y-4 py-8 text-center ${dropdownOpen ? 'block' : 'hidden'}`}
              >
                {languages.map((lang: { label: string; code: string }) => (
                  <li
                    key={lang.code}
                    className="mr-2 w-full cursor-pointer font-bold text-orange-400 hover:text-navy-blue-25"
                    onClick={() => changeLanguage(lang.code)}
                  >
                    {lang.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        {/* Info: (20230712 - Shirley) hamburger */}
        <div ref={menuRef}>
          <button className="flex items-center" onClick={clickMenuHandler} type="button">
            <RxHamburgerMenu size={25} className="text-navy-blue-25 hover:text-orange-400" />
          </button>
        </div>
      </div>

      <ul
        className={`absolute left-0 top-0 mt-60px flex h-fit w-full flex-col items-start overflow-hidden bg-navy-blue-500 text-navy-blue-25 ${
          menuVisible ? 'translate-y-0' : '-z-10 -translate-y-140%'
        } pb-5 drop-shadow-xlSide transition-all duration-700 ease-in-out`}
      >
        {/* About */}
        <li className="w-full px-6 py-4">
          <Link
            href={ISUNFA_ROUTE.ABOUT}
            className="flex items-center space-x-2 text-navy-blue-25 hover:text-orange-400"
          >
            <LuBuilding2 size={20} />
            <p className="text-base">{t('landing_page:NAV_BAR.ABOUT')}</p>
          </Link>
        </li>

        {/* Features */}
        <li className="w-full px-6 py-4">
          <Link
            href={ISUNFA_ROUTE.FEATURES}
            className="flex items-center space-x-2 text-navy-blue-25 hover:text-orange-400"
          >
            <PiMedal size={20} />
            <p className="text-base">{t('landing_page:NAV_BAR.FEATURES')}</p>
          </Link>
        </li>

        {/* Reports */}
        <li className="w-full px-6 py-4">
          {/* // Info: (20240719 - Liz) Audit Report 目前都是假資料所以不開放 */}
          {isLinkDisabled ? (
            <div
              className="flex cursor-wait items-center space-x-2 text-navy-blue-300"
              title={t('landing_page:NAV_BAR.LINK_NOT_OPEN')}
            >
              <LuFileText size={20} />
              <p className="text-base">{t('landing_page:NAV_BAR.REPORTS')}</p>
            </div>
          ) : (
            <Link
              href={ISUNFA_ROUTE.REPORTS}
              className="flex items-center space-x-2 text-navy-blue-25 hover:text-orange-400"
            >
              <LuFileText size={20} />
              <p className="text-base">{t('landing_page:NAV_BAR.REPORTS')}</p>
            </Link>
          )}
        </li>

        {/* Contact Us */}
        <li className="w-full px-6 py-4">
          {/* Info: (20240321 - Shirley) contact us section */}
          <Link
            href={ISUNFA_ROUTE.CONTACT_US}
            className="flex items-center space-x-2 text-navy-blue-25 hover:text-orange-400"
          >
            <PiEnvelope size={20} />
            <p className="text-base"> {t('landing_page:NAV_BAR.CONTACT_US')}</p>
          </Link>
        </li>

        <li className="w-full px-6 py-4">
          <Link href={isSignIn ? ISUNFA_ROUTE.DASHBOARD : ISUNFA_ROUTE.LOGIN}>
            <Button
              className={`flex space-x-3 ${cn(
                'text-base leading-6 tracking-normal',
                'text-navy-blue-500',
                'hover:text-navy-blue-25'
              )}`}
            >
              <p>{t('landing_page:NAV_BAR.TRY_NOW')}</p>
              <FaArrowRightLong size={16} />
            </Button>
          </Link>
        </li>

        {/* TODO: (20240403 - Shirley) [Beta] separate i18n component */}
        {/* <li className="px-10 py-4"></li> */}
        {/* <li className="px-10 py-4">
          <I18n />
        </li> */}
      </ul>
    </div>
  );

  return (
    <div className="fixed inset-x-0 top-0 z-40 w-screen font-barlow">
      {desktopNavBar}
      {mobileNavBar}
    </div>
  );
}

export default LandingNavBar;
