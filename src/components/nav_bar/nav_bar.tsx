import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import React, { useState } from 'react';
import { FiEdit, FiLayout, FiMail, FiPlusSquare, FiSettings } from 'react-icons/fi';
import { BiBuildings } from 'react-icons/bi';
import { TbLogout, TbGridDots } from 'react-icons/tb';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { GoArrowSwitch } from 'react-icons/go';
import { Button } from '@/components/button/button';
import { useUserCtx } from '@/contexts/user_context';
import { useGlobalCtx } from '@/contexts/global_context';
import Image from 'next/image';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { ISUNFA_ROUTE } from '@/constants/url';
import {
  DEFAULT_AVATAR_URL,
  DEFAULT_COMPANY_IMAGE_URL,
  DEFAULT_DISPLAYED_USER_NAME,
} from '@/constants/display';
import version from '@/lib/version';
import { useRouter } from 'next/router';
import I18n from '@/components/i18n/i18n';
import { TranslateFunction } from '@/interfaces/locale';
// Info: (20240808 - Anna) Alpha版先隱藏(小鈴鐺)
// import Notification from '@/components/notification/notification';
import Skeleton from '@/components/skeleton/skeleton';
import { UploadType } from '@/constants/file';

const NavBar = () => {
  const { t }: { t: TranslateFunction } = useTranslation('common');

  const { signedIn, signOut, username, selectedCompany, userAuth, isAuthLoading, selectCompany } =
    useUserCtx();
  const { profileUploadModalDataHandler, profileUploadModalVisibilityHandler } = useGlobalCtx();
  const router = useRouter();

  const companyName = selectedCompany?.name.split(' ')[0] ?? '';
  const abbreviateCompanyName =
    companyName.length > 10 ? companyName.slice(0, 5) + '...' : companyName;

  const [langIsOpen, setLangIsOpen] = useState(false);
  // Info: (20240808 - Anna) Alpha版先隱藏(小鈴鐺)
  // const [notificationIsOpen, setNotificationIsOpen] = useState(false);

  const {
    targetRef: userMenuRef,
    componentVisible: isUserMenuOpen,
    setComponentVisible: setIsUserMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: appMenuRef,
    componentVisible: isAppMenuOpen,
    setComponentVisible: setIsAppMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: appMenuMobileRef,
    componentVisible: isAppMenuMobileOpen,
    setComponentVisible: setIsAppMenuMobileOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: burgerMenuRef,
    componentVisible: isBurgerMenuOpen,
    setComponentVisible: setIsBurgerMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const avatarClickHandler = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const appMenuClickHandler = () => setIsAppMenuOpen(!isAppMenuOpen);
  const appMenuMobileClickHandler = () => setIsAppMenuMobileOpen(!isAppMenuMobileOpen);
  const burgerMenuClickHandler = () => {
    setIsBurgerMenuOpen(!isBurgerMenuOpen);
    setLangIsOpen(false);
    // Info: (20240808 - Anna) Alpha版先隱藏(小鈴鐺)
    // setNotificationIsOpen(false);
  };

  const profileUploadClickHandler = () => {
    profileUploadModalDataHandler(UploadType.USER);
    profileUploadModalVisibilityHandler();
  };

  const logOutClickHandler = async () => {
    setIsUserMenuOpen(false);
    signOut();
  };

  const companyChangeClickHandler = () => {
    selectCompany(null);
  };

  const redirectTo = (target: string) => {
    router.push(target);
  };

  const burgerButtonStyle =
    'h-2px rounded-full bg-button-text-secondary transition-all duration-150 ease-in-out';

  const displayedAppMenuMobile = (
    <div
      ref={appMenuMobileRef}
      className={`absolute left-0 top-0 flex gap-16px overflow-hidden lg:hidden ${isAppMenuMobileOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-10 opacity-0'} w-full flex-col items-start bg-surface-neutral-surface-lv2 px-32px py-30px text-base shadow-xl transition-all duration-300 ease-in-out`}
    >
      <button
        onClick={appMenuMobileClickHandler}
        type="button"
        className="p-16px text-button-text-secondary hover:text-button-text-primary-hover"
      >
        <IoIosArrowBack size={24} />
      </button>
      <button
        type="button"
        // ToDo: (20240802 - Julian) [Beta] Not released
        disabled
        className="mx-auto flex w-full items-center gap-16px px-24px py-10px text-button-text-secondary disabled:text-button-text-disable"
      >
        {/* <Link
          href={`${signedIn ? ISUNFA_ROUTE.PROJECT_LIST : ISUNFA_ROUTE.LOGIN}`}
          className="flex w-full items-center gap-16px px-24px py-10px text-button-text-secondary hover:text-primaryYellow"
        > */}
        <Image src={'/icons/rocket.svg'} width={30} height={30} alt="rocket_icon" />
        <p>{t('common:COMMON.PROJECT')}</p>
        {/* </Link> */}
      </button>
      <Link
        href={`${signedIn ? ISUNFA_ROUTE.JOURNAL_LIST : ISUNFA_ROUTE.LOGIN}`}
        className="flex w-full items-center gap-16px px-24px py-10px text-button-text-secondary hover:text-button-text-primary-hover"
      >
        <Image src={'/icons/calculator.svg'} width={30} height={30} alt="calculator_icon" />
        <p>{t('common:NAV_BAR.ACCOUNT')}</p>
      </Link>
      <button
        type="button"
        // TODO: (20240517 - Shirley) [Beta] temp disabled
        disabled
        className="flex w-full items-center gap-16px px-24px py-10px text-button-text-secondary disabled:text-button-text-disable disabled:hover:text-button-text-secondary"
      >
        <Image src={'/icons/document.svg'} width={30} height={30} alt="document_icon" />
        <p>{t('journal:JOURNAL.CONTRACT')}</p>
      </button>
      <button
        type="button"
        // ToDo: (20240802 - Julian) [Beta] Not released
        disabled
        className="mx-auto flex w-full items-center gap-16px px-24px py-10px text-button-text-secondary disabled:text-button-text-disable"
      >
        {/* <Link
          href={`${signedIn ? ISUNFA_ROUTE.SALARY : ISUNFA_ROUTE.LOGIN}`}
          className="flex w-full items-center gap-16px px-24px py-10px text-button-text-secondary hover:text-primaryYellow"
        > */}
        <Image src={'/icons/briefcase.svg'} width={30} height={30} alt="briefcase_icon" />
        <p>{t('salary:SALARY.SALARY')}</p>
        {/* </Link> */}
      </button>
      <Link
        href={`${signedIn ? ISUNFA_ROUTE.USERS_MY_REPORTS : ISUNFA_ROUTE.LOGIN}`}
        className="flex w-full items-center gap-16px px-24px py-10px text-button-text-secondary hover:text-button-text-primary-hover"
      >
        <Image src={'/icons/report.svg'} width={30} height={30} alt="report_icon" />
        <p>{t('report_401:REPORTS_SIDEBAR.REPORT')}</p>
      </Link>
    </div>
  );

  // Info: (20240607 - Shirley) mobile
  const displayedBurgerMenu = (
    <div
      ref={burgerMenuRef}
      className={`absolute left-0 top-75px flex justify-center gap-16px lg:hidden ${isBurgerMenuOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-10 opacity-0'} w-full flex-col items-start bg-white py-30px text-base shadow-xl transition-all duration-300 ease-in-out`}
    >
      <button
        type="button"
        onClick={appMenuMobileClickHandler}
        className={`${selectedCompany ? 'flex' : 'hidden'} w-full items-center gap-8px px-24px py-10px text-button-text-secondary hover:text-button-text-primary-hover`}
      >
        <div className="flex flex-1 items-center gap-8px">
          <TbGridDots size={20} />
          <p>{t('common:NAV_BAR.APPLICATIONS')}</p>
        </div>

        <IoIosArrowForward size={20} />
      </button>
      <Link
        href={ISUNFA_ROUTE.DASHBOARD}
        className={`${selectedCompany ? 'flex' : 'hidden'} w-full items-center gap-8px px-24px py-10px text-button-text-secondary hover:text-button-text-primary-hover`}
      >
        <FiLayout size={20} />

        <p>{t('common:NAV_BAR.DASHBOARD')}</p>
      </Link>
      <Link
        href={ISUNFA_ROUTE.CONTACT_US}
        className="flex w-full items-center gap-8px px-24px py-10px text-button-text-secondary hover:text-button-text-primary-hover"
      >
        <FiMail size={20} />
        <p>{t('common:NAV_BAR.CONTACT_US')}</p>
      </Link>

      {/* Info: (20240808 - Anna) Alpha版先隱藏(小鈴鐺) */}
      {/* <Notification
        mobileMenuIsOpen={notificationIsOpen}
        setMobileMenuIsOpen={setNotificationIsOpen}
      /> */}
      <I18n langIsOpen={langIsOpen} setLangIsOpen={setLangIsOpen} />
      {displayedAppMenuMobile}
    </div>
  );

  const displayedAppMenu = (
    <div
      className={`absolute right-0 top-52px grid w-max grid-cols-3 grid-rows-2 ${isAppMenuOpen ? 'visible opacity-100' : 'invisible opacity-0'} gap-20px rounded-3xl bg-surface-neutral-surface-lv2 p-24px text-lg font-semibold shadow-xl transition-all duration-300 ease-in-out`}
    >
      {/* Info: (20240416 - Julian) Project button */}

      <button
        type="button"
        // ToDo: (20240802 - Julian) [Beta] Not released
        disabled
        className="mx-auto flex flex-col items-center gap-8px hover:text-button-text-primary-hover disabled:text-button-text-disable"
      >
        {/* <Link
          href={`${signedIn ? ISUNFA_ROUTE.PROJECT_LIST : ISUNFA_ROUTE.LOGIN}`}
          className="flex flex-col items-center gap-8px"
        > */}
        <Image src={'/icons/rocket.svg'} width={48} height={48} alt="rocket_icon" />
        <p>{t('common:COMMON.PROJECT')}</p>
        {/* </Link> */}
      </button>

      {/* Info: (20240416 - Julian) Account button */}
      <button type="button" className="mx-auto">
        <Link
          href={`${signedIn ? ISUNFA_ROUTE.JOURNAL_LIST : ISUNFA_ROUTE.LOGIN}`}
          className="flex flex-col items-center gap-8px hover:text-button-text-primary-hover disabled:text-button-text-disable"
        >
          <Image src={'/icons/calculator.svg'} width={48} height={48} alt="calculator_icon" />
          <p>{t('common:NAV_BAR.ACCOUNT')}</p>
        </Link>
      </button>

      {/* Info: (20240416 - Julian) Contract button */}
      <button
        type="button"
        // TODO: (20240517 - Shirley) [Beta] temp disabled
        disabled
        className="flex flex-col items-center gap-8px disabled:text-button-text-disable"
      >
        <Image src={'/icons/document.svg'} width={48} height={48} alt="document_icon" />
        <p>{t('journal:JOURNAL.CONTRACT')}</p>
      </button>
      {/* Info: (20240416 - Julian) Salary button */}
      <button
        type="button"
        // ToDo: (20240802 - Julian) [Beta] Not released
        disabled
        className="mx-auto flex flex-col items-center gap-8px disabled:text-button-text-disable"
      >
        {/* <Link
          href={`${signedIn ? ISUNFA_ROUTE.SALARY : ISUNFA_ROUTE.LOGIN}`}
          className="flex flex-col items-center gap-8px"
        > */}
        <Image src={'/icons/briefcase.svg'} width={48} height={48} alt="briefcase_icon" />
        <p>{t('salary:SALARY.SALARY')}</p>
        {/* </Link> */}
      </button>
      {/* Info: (20240416 - Julian) Report button */}
      <button type="button" className="mx-auto">
        <Link
          href={`${signedIn ? ISUNFA_ROUTE.USERS_MY_REPORTS : ISUNFA_ROUTE.LOGIN}`}
          className="flex flex-col items-center gap-8px hover:text-button-text-primary-hover disabled:text-button-text-disable"
        >
          <Image src={'/icons/report.svg'} width={48} height={48} alt="report_icon" />
          <p>{t('report_401:REPORTS_SIDEBAR.REPORT')}</p>
        </Link>
      </button>
    </div>
  );

  const displayedUserMenu = (
    <div
      className={`${isUserMenuOpen ? 'visible opacity-100' : 'invisible opacity-0'} absolute right-16 top-70px z-100 transition-all duration-300 ease-in-out`}
    >
      <div className="max-w-248px flex-col rounded-2xl bg-surface-neutral-surface-lv2 p-4 shadow-xl">
        <button
          type="button"
          onClick={profileUploadClickHandler}
          className="group relative mx-auto flex h-56px w-56px items-center justify-center overflow-hidden rounded-full lg:h-fit lg:w-fit"
        >
          <Image
            alt="avatar"
            src={userAuth?.imageId ?? DEFAULT_AVATAR_URL}
            width={56}
            height={56}
            className="group-hover:brightness-50"
          />
          <FiEdit className="absolute hidden text-surface-neutral-solid-light group-hover:block" />
        </button>
        <div className="mt-3 flex justify-center gap-0 px-16">
          <div className="my-auto text-base font-semibold leading-6 tracking-normal text-button-text-secondary">
            {signedIn ? username ?? DEFAULT_DISPLAYED_USER_NAME : ''}
          </div>
          {/* Info: (20240809 - Shirley) edit name button */}
          <button
            type="button"
            // TODO: (20240517 - Shirley) [Beta] temp disabled
            disabled
            className="hidden shrink-0 flex-col justify-center rounded-xs px-2 text-button-surface-strong-secondary disabled:text-button-text-disable"
          >
            <div className="flex items-center justify-center">
              <FiEdit size={16} />
            </div>
          </button>
        </div>
        <div className="mt-3 flex flex-col justify-center">
          <div className="flex flex-col justify-center">
            <div className="h-px shrink-0 border border-solid border-divider-stroke-lv-4 bg-divider-stroke-lv-4" />
          </div>
        </div>
        <Button
          variant={'secondaryBorderless'}
          onClick={companyChangeClickHandler}
          className={`mt-3 flex w-full justify-start rounded-xs px-4 py-2.5 ${selectedCompany ? '' : 'pointer-events-none text-button-text-disable'}`}
        >
          <div className="my-auto flex items-center justify-center">
            <BiBuildings size={20} />
          </div>
          <div className="text-base font-medium leading-6 tracking-normal">
            {t('common:NAV_BAR.SWITCH_COMPANY')}
          </div>
        </Button>
        <Button
          variant={'secondaryBorderless'}
          disabled={!selectedCompany} // Info: (20240513 - Julian) 如果沒有選擇 company 就不能使用
          // Info: (20240809 - Shirley) disabled for now
          className="mt-3 hidden w-full justify-start rounded-xs px-4 py-2.5 disabled:text-button-text-disable"
        >
          <div className="my-auto flex items-center justify-center">
            <FiPlusSquare size={20} />
          </div>
          <div className="text-base font-medium leading-6 tracking-normal">
            {t('common:NAV_BAR.SUBSCRIPTION_BILLS')}
          </div>
        </Button>
        <Button
          onClick={() => redirectTo(ISUNFA_ROUTE.COMPANY_INFO)}
          variant={'secondaryBorderless'}
          disabled={!selectedCompany} // Info: (20240513 - Julian) 如果沒有選擇 company 就不能使用
          className="mt-3 flex w-full justify-start rounded-xs px-4 py-2.5 disabled:text-button-text-disable"
        >
          <div className="my-auto flex items-center justify-center">
            <FiSettings size={20} />
          </div>
          <div className="text-base font-medium leading-6 tracking-normal">
            {t('common:NAV_BAR.SETTING')}
          </div>
        </Button>
        <div className="mt-3 flex flex-col justify-center py-2.5">
          <div className="flex flex-col justify-center">
            <div className="h-px shrink-0 border border-solid border-divider-stroke-lv-4 bg-divider-stroke-lv-4" />
          </div>
        </div>
        <Button
          variant={'secondaryBorderless'}
          onClick={logOutClickHandler}
          className="mt-3 flex w-full justify-start rounded-xs px-5 py-2.5"
        >
          <div className="my-auto flex items-center justify-center">
            <TbLogout size={20} />
          </div>
          <div className="text-base font-medium leading-6 tracking-normal">
            {t('common:NAV_BAR.LOGOUT')}
          </div>
        </Button>
      </div>
    </div>
  );

  const displayedCompanyChangeBtn =
    !isAuthLoading && selectedCompany ? (
      <button
        type="button"
        onClick={companyChangeClickHandler}
        className="flex items-center gap-x-4px rounded-full bg-badge-surface-strong-secondary p-6px font-semibold text-badge-text-invert"
      >
        <Image
          alt={`${selectedCompany?.name}_icon`}
          src={selectedCompany.imageId ?? DEFAULT_COMPANY_IMAGE_URL}
          width={16}
          height={16}
          className="rounded-full"
        />
        {/* ToDo: (20240521 - Julian) [Beta] company name abbreviation */}
        <p className="text-sm">{abbreviateCompanyName}</p>
        <GoArrowSwitch size={14} />
      </button>
    ) : null;

  const displayedAvatar = isAuthLoading ? (
    <Skeleton width={44} height={40} />
  ) : signedIn ? (
    <div ref={userMenuRef}>
      <button
        type="button"
        onClick={avatarClickHandler}
        className="h-40px w-40px overflow-hidden rounded-full"
      >
        {/* Info: (20240408 - Shirley) avatar svg */}
        <Image
          alt="avatar"
          src={userAuth?.imageId ?? DEFAULT_AVATAR_URL}
          width={40}
          height={40}
          className="my-auto"
        />
      </button>
      {displayedUserMenu}
    </div>
  ) : null;

  return (
    <div className="fixed top-0 z-20 flex w-screen">
      <div className="z-60 flex h-80px w-full items-center gap-5 bg-surface-neutral-surface-lv1 px-80px py-8px shadow-navbar max-md:flex-wrap max-md:px-5 lg:h-60px">
        {/* Info: (20240417 - Julian) Burger menu */}
        <div className="block lg:hidden">
          <button
            type="button"
            className="flex h-18px w-24px flex-col items-center justify-between"
            onClick={burgerMenuClickHandler}
          >
            <span
              className={`${burgerButtonStyle} ${isBurgerMenuOpen ? 'w-6/10 -translate-x-1 translate-y-1 -rotate-40' : 'w-full translate-x-0 translate-y-0 rotate-0'}`}
            ></span>
            <span className={`${burgerButtonStyle} ${isBurgerMenuOpen ? 'w-0' : 'w-full'}`}></span>
            <span
              className={`${burgerButtonStyle} ${isBurgerMenuOpen ? 'w-6/10 -translate-x-1 -translate-y-1 rotate-40' : 'w-full translate-x-0 translate-y-0 rotate-0'}`}
            ></span>
          </button>

          {/* Info: (20240607 - Shirley) cover when burger menu is open */}
          <div
            className={`absolute bottom-5 h-7 w-7 bg-transparent ${isBurgerMenuOpen ? 'pointer-events-auto' : 'hidden'} hover:cursor-pointer`}
          ></div>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center justify-center gap-2 lg:flex-row lg:items-end lg:justify-end">
            <Link href={ISUNFA_ROUTE.LANDING_PAGE}>
              {/* Info: (20240417 - Julian) Desktop logo */}
              <Image
                src="/logo/isunfa_logo_light.svg"
                width={130}
                height={20}
                alt="iSunFA_logo"
                className="hidden lg:block"
              />
              {/* Info: (20240417 - Julian) Mobile logo */}
              <Image
                src="/logo/isunfa_logo_small_light.svg"
                width={50}
                height={40}
                alt="iSunFA_logo"
                className="block lg:hidden"
              />
            </Link>
            <div className="my-auto flex flex-col justify-center self-stretch rounded-xs bg-badge-surface-soft-primary px-1 text-badge-text-primary-solid">
              <div className="flex flex-col justify-center rounded-xs px-0.1rem py-1">
                <div className="justify-center px-1 text-xs">
                  {t('common:COMMON.V')}
                  {version}
                </div>
              </div>
            </div>
          </div>

          {/* TODO: (20240408 - Shirley) [Beta] links on mobile is hidden for the sake of no design spec */}
          <div className="my-auto hidden flex-1 gap-5 max-md:flex-wrap lg:ml-10 lg:flex">
            <Link
              href={ISUNFA_ROUTE.DASHBOARD}
              // Info: (20240513 - Julian) 如果沒有選擇 company 就不能使用
              className={`${selectedCompany ? 'flex' : 'hidden'} justify-center gap-2 rounded-xs px-3 py-2.5 text-button-text-secondary hover:text-button-text-primary-hover max-md:px-5`}
            >
              <div className="my-auto flex items-center justify-center">
                <FiLayout size={22} />
              </div>
              <div className="text-base font-medium leading-6 tracking-normal">
                {t('common:NAV_BAR.DASHBOARD')}
              </div>
            </Link>
            <Link
              href={ISUNFA_ROUTE.CONTACT_US}
              className="flex justify-center gap-2 rounded-xs px-3 py-2.5 text-button-text-secondary hover:text-button-text-primary-hover max-md:px-5"
            >
              <div className="my-auto flex items-center justify-center">
                <FiMail size={22} />
              </div>
              <div className="text-base font-medium leading-6 tracking-normal">
                {t('common:NAV_BAR.CONTACT_US')}
              </div>
            </Link>
          </div>
        </div>
        {/* Info: (20240408 - Shirley) desktop */}
        <div className="relative hidden space-x-8 text-button-text-secondary lg:flex">
          {/* Info: (20240605 - Shirley) globe (i18n) */}
          <I18n />
          {/* Info: (20240606 - Shirley) notification */}
          {/* Info: (20240808 - Anna) Alpha版先隱藏(小鈴鐺) */}
          {/* <Notification /> */}
          {/* Info: (20240606 - Shirley) app menu */}
          <div ref={appMenuRef}>
            <button
              type="button"
              onClick={appMenuClickHandler}
              className={selectedCompany ? 'flex' : 'hidden'} // Info: (20240513 - Julian) 如果沒有選擇 company 就不能使用
            >
              <Image src="/icons/app.svg" alt="app_icon" width={24} height={24} />
            </button>
            {displayedAppMenu}
          </div>
        </div>

        {/* Info: (20240802 - Shirley) hide the login button for now */}
        <div
          className={`hidden flex-col items-start justify-center ${signedIn ? 'lg:flex' : 'hidden'}`}
        >
          <div className="h-40px w-px shrink-0 bg-divider-stroke-lv-4" />
        </div>

        {/* Info: (20240521 - Julian) Company change button */}
        {displayedCompanyChangeBtn}

        {/* Info: (20240802 - Shirley) hide the login button for now */}
        {displayedAvatar}
      </div>
      {displayedBurgerMenu}
    </div>
  );
};

export default NavBar;
