import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import React, { useState } from 'react';
import { FiEdit, FiLayout, FiMail } from 'react-icons/fi';
import { TbGridDots } from 'react-icons/tb';
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
      className={`absolute left-0 top-0 flex gap-16px overflow-hidden lg:hidden ${isAppMenuMobileOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-10 opacity-0'} w-full flex-col items-start bg-white px-32px py-30px text-base shadow-xl transition-all duration-300 ease-in-out`}
    >
      <button
        onClick={appMenuMobileClickHandler}
        type="button"
        className="p-16px text-button-text-secondary hover:text-button-text-primary"
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
      <button
        type="button"
        // ToDo: (20240802 - Julian) [Beta] Not released
        // eslint-disable-next-line react/jsx-boolean-value
        disabled={true}
        className="mx-auto flex w-full items-center gap-16px px-24px py-10px text-button-text-secondary disabled:text-button-text-disable"
      >
        {/* <Link
          href={`${signedIn ? ISUNFA_ROUTE.PROJECT_LIST : ISUNFA_ROUTE.LOGIN}`}
          className="flex w-full items-center gap-16px px-24px py-10px text-button-text-secondary hover:text-primaryYellow"
        > */}
        <Image src={'/icons/rocket.svg'} width={30} height={30} alt="rocket_icon" />
        <p>{t('REPORTS_HISTORY_LIST.PROJECT')}</p>
        {/* </Link> */}
      </button>
      <Link
        href={`${signedIn ? ISUNFA_ROUTE.JOURNAL_LIST : ISUNFA_ROUTE.LOGIN}`}
        className="flex w-full items-center gap-16px px-24px py-10px text-button-text-secondary hover:text-primaryYellow"
      >
        <Image src={'/icons/calculator.svg'} width={30} height={30} alt="calculator_icon" />
        <p>{t('NAV_BAR.ACCOUNT')}</p>
      </Link>
      <button
        type="button"
        // TODO: (20240517 - Shirley) [Beta] temp disabled
        // eslint-disable-next-line react/jsx-boolean-value
        disabled={true}
        className="flex w-full items-center gap-16px px-24px py-10px text-button-text-secondary disabled:text-button-text-disable disabled:hover:text-button-text-secondary"
      >
        <Image src={'/icons/document.svg'} width={30} height={30} alt="document_icon" />
        <p>{t('JOURNAL.CONTRACT')}</p>
      </button>
      <button
        type="button"
        // ToDo: (20240802 - Julian) [Beta] Not released
        // eslint-disable-next-line react/jsx-boolean-value
        disabled={true}
        className="mx-auto flex w-full items-center gap-16px px-24px py-10px text-button-text-secondary disabled:text-button-text-disable"
      >
        {/* <Link
          href={`${signedIn ? ISUNFA_ROUTE.SALARY : ISUNFA_ROUTE.LOGIN}`}
          className="flex w-full items-center gap-16px px-24px py-10px text-button-text-secondary hover:text-primaryYellow"
        > */}
        <Image src={'/icons/briefcase.svg'} width={30} height={30} alt="briefcase_icon" />
        <p>{t('SALARY.SALARY')}</p>
        {/* </Link> */}
      </button>
      <Link
        href={`${signedIn ? ISUNFA_ROUTE.USERS_MY_REPORTS : ISUNFA_ROUTE.LOGIN}`}
        className="flex w-full items-center gap-16px px-24px py-10px text-button-text-secondary hover:text-primaryYellow"
      >
        <Image src={'/icons/report.svg'} width={30} height={30} alt="report_icon" />
        <p>{t('REPORTS_SIDEBAR.REPORT')}</p>
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
        className={`${selectedCompany ? 'flex' : 'hidden'} w-full items-center gap-8px px-24px py-10px text-button-text-secondary hover:text-primaryYellow`}
      >
        <div className="flex flex-1 items-center gap-8px">
          <TbGridDots size={20} />
          <p>{t('NAV_BAR.APPLICATIONS')}</p>
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
      <Link
        href={ISUNFA_ROUTE.DASHBOARD}
        className={`${selectedCompany ? 'flex' : 'hidden'} w-full items-center gap-8px px-24px py-10px text-button-text-secondary hover:text-primaryYellow`}
      >
        <FiLayout size={20} />

        <p>{t('NAV_BAR.DASHBOARD')}</p>
      </Link>
      <Link
        href={ISUNFA_ROUTE.CONTACT_US}
        className="flex w-full items-center gap-8px px-24px py-10px text-button-text-secondary hover:text-primaryYellow"
      >
        <FiMail size={20} />
        <p>{t('NAV_BAR.CONTACT_US')}</p>
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
      className={`absolute right-0 top-52px grid w-max grid-cols-3 grid-rows-2 ${isAppMenuOpen ? 'visible opacity-100' : 'invisible opacity-0'} gap-20px rounded-3xl bg-white p-24px text-lg font-semibold text-navyBlue2 shadow-xl transition-all duration-300 ease-in-out`}
    >
      {/* Info: (20240416 - Julian) Project button */}

      <button
        type="button"
        // ToDo: (20240802 - Julian) [Beta] Not released
        // eslint-disable-next-line react/jsx-boolean-value
        disabled={true}
        className="mx-auto flex flex-col items-center gap-8px disabled:text-button-text-disable"
      >
        {/* <Link
          href={`${signedIn ? ISUNFA_ROUTE.PROJECT_LIST : ISUNFA_ROUTE.LOGIN}`}
          className="flex flex-col items-center gap-8px"
        > */}
        <Image src={'/icons/rocket.svg'} width={48} height={48} alt="rocket_icon" />
        <p>{t('REPORTS_HISTORY_LIST.PROJECT')}</p>
        {/* </Link> */}
      </button>

      {/* Info: (20240416 - Julian) Account button */}
      <button type="button" className="mx-auto">
        <Link
          href={`${signedIn ? ISUNFA_ROUTE.JOURNAL_LIST : ISUNFA_ROUTE.LOGIN}`}
          className="flex flex-col items-center gap-8px"
        >
          <Image src={'/icons/calculator.svg'} width={48} height={48} alt="calculator_icon" />
          <p>{t('NAV_BAR.ACCOUNT')}</p>
        </Link>
      </button>

      {/* Info: (20240416 - Julian) Contract button */}
      <button
        type="button"
        // TODO: (20240517 - Shirley) [Beta] temp disabled
        // eslint-disable-next-line react/jsx-boolean-value
        disabled={true}
        className="flex flex-col items-center gap-8px disabled:text-button-text-disable"
      >
        <Image src={'/icons/document.svg'} width={48} height={48} alt="document_icon" />
        <p>{t('JOURNAL.CONTRACT')}</p>
      </button>
      {/* Info: (20240416 - Julian) Salary button */}
      <button
        type="button"
        // ToDo: (20240802 - Julian) [Beta] Not released
        // eslint-disable-next-line react/jsx-boolean-value
        disabled={true}
        className="mx-auto flex flex-col items-center gap-8px disabled:text-button-text-disable"
      >
        {/* <Link
          href={`${signedIn ? ISUNFA_ROUTE.SALARY : ISUNFA_ROUTE.LOGIN}`}
          className="flex flex-col items-center gap-8px"
        > */}
        <Image src={'/icons/briefcase.svg'} width={48} height={48} alt="briefcase_icon" />
        <p>{t('SALARY.SALARY')}</p>
        {/* </Link> */}
      </button>
      {/* Info: (20240416 - Julian) Report button */}
      <button type="button" className="mx-auto disabled:text-button-text-disable">
        <Link
          href={`${signedIn ? ISUNFA_ROUTE.USERS_MY_REPORTS : ISUNFA_ROUTE.LOGIN}`}
          className="flex flex-col items-center gap-8px"
        >
          <Image src={'/icons/report.svg'} width={48} height={48} alt="report_icon" />
          <p>{t('REPORTS_SIDEBAR.REPORT')}</p>
        </Link>
      </button>
    </div>
  );

  const displayedUserMenu = (
    <div
      className={`${isUserMenuOpen ? 'visible opacity-100' : 'invisible opacity-0'} absolute right-16 top-70px z-100 transition-all duration-300 ease-in-out`}
    >
      <div className="max-w-248px flex-col rounded-2xl bg-white p-4 shadow-xl">
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
          <FiEdit className="absolute hidden text-white group-hover:block" />
        </button>
        <div className="mt-3 flex justify-center gap-0 px-16">
          <div className="my-auto text-base font-semibold leading-6 tracking-normal text-button-text-secondary">
            {signedIn ? (username ?? DEFAULT_DISPLAYED_USER_NAME) : ''}
          </div>
          {/* Info: (20240809 - Shirley) edit name button */}
          <button
            type="button"
            // TODO: (20240517 - Shirley) [Beta] temp disabled
            // eslint-disable-next-line react/jsx-boolean-value
            disabled={true}
            className="hidden shrink-0 flex-col justify-center rounded-xs px-2 text-button-surface-strong-secondary disabled:text-button-text-disable"
          >
            <div className="flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="17"
                height="16"
                fill="none"
                viewBox="0 0 17 16"
              >
                <path
                  className="fill-current"
                  fillRule="evenodd"
                  d="M12.128.96a2.414 2.414 0 113.415 3.415L9.167 10.75l-.045.045c-.184.185-.38.382-.62.529a2.335 2.335 0 01-.674.28c-.273.065-.552.064-.812.064H5.835a1 1 0 01-1-1V9.55v-.064c0-.26 0-.539.065-.812.057-.238.151-.465.28-.674.146-.24.343-.436.528-.62l.045-.045L12.128.96zm2 1.415a.414.414 0 00-.585 0L7.167 8.75c-.121.121-.189.19-.238.243m7.2-6.618a.414.414 0 010 .586v-.586zm-9.132-.707h2.839a1 1 0 110 2h-2.8c-.577 0-.95 0-1.233.024-.271.022-.372.06-.421.085a1 1 0 00-.437.437c-.026.05-.063.15-.086.422-.023.283-.023.655-.023 1.232v5.6c0 .576 0 .949.023 1.232.023.272.06.372.086.422a1 1 0 00.437.437c.049.025.15.063.421.085.284.023.656.024 1.233.024h5.6c.576 0 .948-.001 1.232-.024.271-.022.372-.06.421-.085a1 1 0 00.438-.437c.025-.05.062-.15.085-.422.023-.283.024-.656.024-1.232v-2.8a1 1 0 112 0V11.506c0 .527 0 .982-.031 1.357-.032.395-.104.788-.296 1.167a3 3 0 01-1.312 1.31c-.378.194-.771.265-1.166.297-.375.03-.83.03-1.357.03H4.997c-.527 0-.982 0-1.357-.03-.395-.032-.788-.103-1.166-.296a3 3 0 01-1.312-1.311c-.192-.379-.264-.772-.296-1.167-.03-.375-.03-.83-.03-1.357V5.83c0-.527 0-.982.03-1.356.032-.396.104-.789.296-1.167a3 3 0 011.312-1.311c.378-.193.771-.264 1.166-.297.375-.03.83-.03 1.357-.03zm9.131 1.293L7.753 9.336l6.375-6.375zM6.884 9.047v-.001.001zm0-.001a.334.334 0 00-.04.096.61.61 0 00-.005.069 8.42 8.42 0 00-.004.34v.117h.117c.172 0 .268 0 .34-.004.064-.003.075-.007.069-.005a.333.333 0 00.095-.04m.297-.283a8.41 8.41 0 01-.243.238l.243-.238zm-.243.238a.61.61 0 01-.053.045l.053-.045z"
                  clipRule="evenodd"
                ></path>
              </svg>{' '}
            </div>
          </button>
        </div>
        <div className="mt-3 flex flex-col justify-center">
          <div className="flex flex-col justify-center">
            <div className="h-px shrink-0 border border-solid border-gray-300 bg-gray-300" />
          </div>
        </div>
        <Button
          variant={'secondaryBorderless'}
          onClick={companyChangeClickHandler}
          className={`mt-3 flex w-full justify-start rounded-xs px-4 py-2.5 ${selectedCompany ? '' : 'pointer-events-none text-button-text-disable'}`}
        >
          <div className="my-auto flex items-center justify-center">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g>
                <path
                  className="fill-current"
                  clipRule="evenodd"
                  d="M5.13956 1.75098L5.16907 1.75098H8.16907L8.19857 1.75098C8.64013 1.75096 9.01611 1.75095 9.32481 1.77618C9.64911 1.80267 9.9646 1.8607 10.2662 2.01438C10.7209 2.24607 11.0906 2.61578 11.3223 3.0705C11.476 3.37211 11.534 3.68761 11.5605 4.01191C11.5858 4.3206 11.5857 4.69657 11.5857 5.13812V5.16764V8.41764H14.8357L14.8652 8.41764C15.3068 8.41763 15.6828 8.41762 15.9915 8.44284C16.3158 8.46934 16.6313 8.52737 16.9329 8.68105C17.3876 8.91274 17.7573 9.28244 17.989 9.73717C18.1427 10.0388 18.2007 10.3543 18.2272 10.6786C18.2524 10.9873 18.2524 11.3632 18.2524 11.8048V11.8343V16.751H18.3357C18.7499 16.751 19.0857 17.0868 19.0857 17.501C19.0857 17.9152 18.7499 18.251 18.3357 18.251H17.5024H10.8357H2.5024H1.66907C1.25485 18.251 0.919067 17.9152 0.919067 17.501C0.919067 17.0868 1.25485 16.751 1.66907 16.751H1.7524V5.16764L1.7524 5.13814C1.75239 4.69658 1.75238 4.3206 1.7776 4.01191C1.80409 3.68761 1.86212 3.37211 2.0158 3.0705C2.2475 2.61578 2.6172 2.24607 3.07192 2.01438C3.37353 1.8607 3.68903 1.80267 4.01333 1.77618C4.32202 1.75095 4.69801 1.75096 5.13956 1.75098ZM3.2524 16.751H10.0857V9.16764V5.16764C10.0857 4.68856 10.0852 4.37435 10.0655 4.13405C10.0466 3.90252 10.0138 3.8064 9.98582 3.75149C9.89794 3.579 9.75771 3.43877 9.58523 3.35089C9.53032 3.32291 9.4342 3.29011 9.20266 3.27119C8.96236 3.25156 8.64815 3.25098 8.16907 3.25098H5.16907C4.68998 3.25098 4.37577 3.25156 4.13548 3.27119C3.90394 3.29011 3.80782 3.32291 3.75291 3.35089C3.58043 3.43877 3.4402 3.579 3.35231 3.75149C3.32433 3.8064 3.29153 3.90252 3.27262 4.13405C3.25298 4.37435 3.2524 4.68856 3.2524 5.16764V16.751ZM11.5857 9.91764V16.751H16.7524V11.8343C16.7524 11.3552 16.7518 11.041 16.7322 10.8007C16.7133 10.5692 16.6805 10.4731 16.6525 10.4182C16.5646 10.2457 16.4244 10.1054 16.2519 10.0176C16.197 9.98958 16.1009 9.95678 15.8693 9.93786C15.629 9.91823 15.3148 9.91764 14.8357 9.91764H11.5857ZM4.66907 5.83431C4.66907 5.4201 5.00485 5.08431 5.41907 5.08431H7.91907C8.33328 5.08431 8.66907 5.4201 8.66907 5.83431C8.66907 6.24852 8.33328 6.58431 7.91907 6.58431H5.41907C5.00485 6.58431 4.66907 6.24852 4.66907 5.83431ZM4.66907 9.16764C4.66907 8.75343 5.00485 8.41764 5.41907 8.41764H7.91907C8.33328 8.41764 8.66907 8.75343 8.66907 9.16764C8.66907 9.58186 8.33328 9.91764 7.91907 9.91764H5.41907C5.00485 9.91764 4.66907 9.58186 4.66907 9.16764ZM4.66907 12.501C4.66907 12.0868 5.00485 11.751 5.41907 11.751H7.91907C8.33328 11.751 8.66907 12.0868 8.66907 12.501C8.66907 12.9152 8.33328 13.251 7.91907 13.251H5.41907C5.00485 13.251 4.66907 12.9152 4.66907 12.501Z"
                  fill="#001840"
                />
              </g>
            </svg>
          </div>
          <div className="text-base font-medium leading-6 tracking-normal">
            {t('NAV_BAR.SWITCH_COMPANY')}
          </div>
        </Button>
        <Button
          variant={'secondaryBorderless'}
          disabled={!selectedCompany} // Info: (20240513 - Julian) 如果沒有選擇 company 就不能使用
          // Info: (20240809 - Shirley) disabled for now
          className="mt-3 hidden w-full justify-start rounded-xs px-4 py-2.5 disabled:text-button-text-disable"
        >
          <div className="my-auto flex items-center justify-center">
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
                d="M6.462 1.501h7.08c.667 0 1.226 0 1.684.037.479.04.934.124 1.365.344a3.5 3.5 0 011.53 1.53c.22.432.305.887.344 1.366.038.457.038 1.017.037 1.683v7.08c0 .666 0 1.226-.037 1.683-.04.48-.124.934-.344 1.366a3.5 3.5 0 01-1.53 1.53c-.431.22-.886.304-1.365.344-.458.037-1.018.037-1.683.037h-7.08c-.667 0-1.226 0-1.684-.037-.479-.04-.934-.124-1.366-.345a3.5 3.5 0 01-1.53-1.53c-.22-.43-.304-.886-.343-1.365-.038-.457-.038-1.017-.038-1.683v-7.08c0-.666 0-1.226.038-1.683.039-.48.124-.934.344-1.366a3.5 3.5 0 011.53-1.53c.431-.22.886-.305 1.365-.344.458-.037 1.017-.037 1.683-.037zm-1.52 2.03c-.355.03-.518.081-.62.133a1.5 1.5 0 00-.656.656c-.053.103-.104.265-.133.62-.03.367-.03.844-.03 1.561v7c0 .716 0 1.194.03 1.56.03.356.08.518.133.621a1.5 1.5 0 00.655.655c.103.053.266.104.62.133.368.03.845.031 1.561.031h7c.717 0 1.194 0 1.561-.03.355-.03.518-.081.62-.134a1.5 1.5 0 00.656-.655c.052-.103.104-.265.133-.62.03-.367.03-.845.03-1.561v-7c0-.717 0-1.194-.03-1.56-.03-.356-.08-.518-.133-.621a1.5 1.5 0 00-.656-.656c-.102-.052-.265-.103-.62-.132-.367-.03-.844-.031-1.56-.031h-7c-.717 0-1.194 0-1.561.03zm5.06 2.137a1 1 0 011 1V9h2.334a1 1 0 110 2h-2.334v2.333a1 1 0 11-2 0v-2.333H6.67a1 1 0 110-2h2.333V6.668a1 1 0 011-1z"
                clipRule="evenodd"
              ></path>
            </svg>
          </div>
          <div className="text-base font-medium leading-6 tracking-normal">
            {t('NAV_BAR.SUBSCRIPTION_BILLS')}
          </div>
        </Button>
        <Button
          onClick={() => redirectTo(ISUNFA_ROUTE.COMPANY_INFO)}
          variant={'secondaryBorderless'}
          disabled={!selectedCompany} // Info: (20240513 - Julian) 如果沒有選擇 company 就不能使用
          className="mt-3 flex w-full justify-start rounded-xs px-4 py-2.5 disabled:text-button-text-disable"
        >
          <div className="my-auto flex items-center justify-center">
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
                d="M10.002 2.668a.515.515 0 00-.515.515v.133a2.25 2.25 0 01-1.363 2.059 1 1 0 01-.239.068 2.25 2.25 0 01-2.294-.523l-.008-.007-.045-.046a.515.515 0 00-.73 0 .515.515 0 000 .73l.045.045.008.008a2.25 2.25 0 01.463 2.453 2.25 2.25 0 01-2.048 1.443h-.092a.515.515 0 000 1.03h.133a2.25 2.25 0 012.057 1.36 2.25 2.25 0 01-.452 2.476l-.008.008-.045.046a.516.516 0 000 .73.515.515 0 00.729 0l.046-.046.008-.008a2.25 2.25 0 012.452-.462 2.25 2.25 0 011.444 2.048v.091a.515.515 0 101.03 0v-.133a2.25 2.25 0 011.359-2.056 2.25 2.25 0 012.477.452l.008.007.045.046a.515.515 0 00.73 0 .516.516 0 000-.73l-.046-.045-.007-.008a2.25 2.25 0 01-.453-2.477 2.25 2.25 0 012.057-1.359H16.821a.515.515 0 000-1.03h-.133a2.25 2.25 0 01-2.06-1.364 1 1 0 01-.068-.238 2.25 2.25 0 01.523-2.294l.008-.008.045-.046a.515.515 0 000-.729.515.515 0 00-.73 0l-.045.045-.008.008a2.25 2.25 0 01-2.477.452 2.25 2.25 0 01-1.358-2.057V3.183a.515.515 0 00-.516-.515zM8.224 1.404a2.515 2.515 0 014.294 1.779v.065a.25.25 0 00.151.228l.01.004a.25.25 0 00.273-.047l.04-.04a2.514 2.514 0 014.296 1.779 2.517 2.517 0 01-.738 1.779l-.04.04a.25.25 0 00-.047.273c.02.046.037.093.05.141a.25.25 0 00.181.08h.127a2.515 2.515 0 010 5.031h-.066a.25.25 0 00-.227.152l-.005.01a.25.25 0 00.048.273l.04.04a2.515 2.515 0 11-3.558 3.558l-.04-.04a.25.25 0 00-.274-.048l-.01.005a.25.25 0 00-.15.227v.126a2.515 2.515 0 11-5.031 0v-.052a.25.25 0 00-.164-.221 1.024 1.024 0 01-.058-.024.25.25 0 00-.273.048l-.04.04a2.515 2.515 0 01-4.296-1.78 2.515 2.515 0 01.737-1.778l.04-.04a.25.25 0 00.048-.274l-.004-.01a.25.25 0 00-.228-.151h-.126a2.515 2.515 0 010-5.03h.052a.25.25 0 00.222-.164l.023-.058a.25.25 0 00-.047-.274l-.04-.04a2.515 2.515 0 010-3.558l.707.707-.708-.707a2.515 2.515 0 013.559 0l.04.04a.25.25 0 00.273.048 1 1 0 01.141-.05.25.25 0 00.081-.182v-.126c0-.667.265-1.307.737-1.779zM16.61 16.55l-.707-.707.707.707zm-6.609-8.048a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm-3.5 1.5a3.5 3.5 0 117 0 3.5 3.5 0 01-7 0z"
                clipRule="evenodd"
              ></path>
            </svg>
          </div>
          <div className="text-base font-medium leading-6 tracking-normal">
            {t('NAV_BAR.SETTING')}
          </div>
        </Button>
        <div className="mt-3 flex flex-col justify-center py-2.5">
          <div className="flex flex-col justify-center">
            <div className="h-px shrink-0 border border-solid border-gray-300 bg-gray-300" />
          </div>
        </div>
        <Button
          variant={'secondaryBorderless'}
          onClick={logOutClickHandler}
          className="mt-3 flex w-full justify-start rounded-xs px-5 py-2.5"
        >
          <div className="my-auto flex items-center justify-center">
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
                d="M7.89 3.552c-.158-.042-.382-.05-1.22-.05h-.418c-.596 0-.993 0-1.3.02-.297.02-.436.057-.524.093a1.5 1.5 0 00-.811.812c-.037.088-.073.227-.093.524-.021.307-.022.704-.022 1.3v7.5c0 .596.001.993.022 1.3.02.298.056.437.093.524a1.5 1.5 0 00.811.812c.088.036.227.072.525.093.306.02.703.021 1.3.021h.416c.84 0 1.063-.009 1.222-.051a1.5 1.5 0 001.06-1.06c.043-.16.051-.383.051-1.222a1 1 0 112 0v.126c.001.65.001 1.165-.119 1.613a3.5 3.5 0 01-2.475 2.475c-.448.12-.962.12-1.613.12H6.22c-.554 0-1.02 0-1.403-.027-.4-.027-.781-.086-1.153-.24A3.5 3.5 0 011.77 16.34c-.154-.371-.213-.753-.24-1.153-.027-.383-.027-.848-.027-1.403V6.218c0-.554 0-1.02.027-1.403.027-.4.086-.781.24-1.153a3.5 3.5 0 011.894-1.894c.372-.155.754-.214 1.153-.24C5.2 1.5 5.666 1.5 6.22 1.5h.576c.65 0 1.165 0 1.613.12a3.5 3.5 0 012.475 2.474l-.966.26.966-.26c.12.449.12.963.12 1.613v.126a1 1 0 11-2 0c0-.839-.01-1.062-.052-1.221a1.5 1.5 0 00-1.06-1.06zm4.739 1.575a1 1 0 011.414 0l4.166 4.167a1 1 0 010 1.414l-4.166 4.167a1 1 0 01-1.414-1.414l2.46-2.46H7.501a1 1 0 110-2h7.586l-2.46-2.46a1 1 0 010-1.414z"
                clipRule="evenodd"
              ></path>
            </svg>
          </div>
          <div className="text-base font-medium leading-6 tracking-normal">
            {t('NAV_BAR.LOGOUT')}
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
        <p className="text-sm">{selectedCompany?.name.split(' ')[0]}</p>
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
            <div className="my-auto flex flex-col justify-center self-stretch rounded-xs bg-primaryYellow3 px-1 text-primaryYellow2">
              <div className="flex flex-col justify-center rounded-xs px-0.1rem py-1">
                <div className="justify-center px-1 text-xs">
                  {t('COMMON.V')}
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
              className={`${selectedCompany ? 'flex' : 'hidden'} justify-center gap-2 rounded-xs px-3 py-2.5 text-button-text-secondary hover:text-primaryYellow max-md:px-5`}
            >
              <div className="my-auto flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 20 20"
                >
                  <g>
                    <path
                      className={`fill-current`}
                      fillRule="evenodd"
                      d="M6.462 1.501h7.08c.667 0 1.226 0 1.684.037.479.04.934.125 1.365.345a3.5 3.5 0 011.53 1.53l-.891.453.891-.454c.22.432.305.887.344 1.366.038.458.038 1.017.037 1.683v7.08c0 .666 0 1.226-.037 1.684-.04.478-.124.933-.344 1.365a3.5 3.5 0 01-1.53 1.53c-.431.22-.886.305-1.365.344-.458.037-1.018.037-1.683.037h-7.08c-.667 0-1.226 0-1.684-.037-.479-.04-.934-.124-1.366-.344l.454-.891-.454.89a3.5 3.5 0 01-1.53-1.529c-.22-.432-.304-.887-.343-1.365-.038-.458-.038-1.018-.038-1.684v-7.08c0-.666 0-1.225.038-1.683.039-.479.124-.934.344-1.366a3.5 3.5 0 011.53-1.53c.431-.22.886-.304 1.365-.344.458-.037 1.017-.037 1.683-.037zm-2.96 7v5c0 .717.001 1.194.031 1.56.03.356.08.518.133.621a1.5 1.5 0 00.655.656c.103.052.266.103.62.132.368.03.845.031 1.561.031v-8h-3zm4-2h-4c0-.716.001-1.194.031-1.56.03-.356.08-.518.133-.62a1.5 1.5 0 01.655-.656c.103-.053.266-.104.62-.133.368-.03.845-.03 1.561-.03h7c.717 0 1.194 0 1.561.03.355.029.518.08.62.133a1.5 1.5 0 01.656.655c.052.103.104.265.133.62.03.367.03.845.03 1.561h-9zm1 2v8h5c.717 0 1.194 0 1.561-.03.355-.03.518-.081.62-.133a1.5 1.5 0 00.656-.656c.052-.103.104-.265.133-.62.03-.367.03-.844.03-1.56v-5h-8z"
                      clipRule="evenodd"
                    ></path>
                  </g>
                </svg>
              </div>
              <div className="text-base font-medium leading-6 tracking-normal">
                {t('NAV_BAR.DASHBOARD')}
              </div>
            </Link>
            <Link
              href={ISUNFA_ROUTE.CONTACT_US}
              className="flex justify-center gap-2 rounded-xs px-3 py-2.5 text-button-text-secondary hover:text-primaryYellow max-md:px-5"
            >
              <div className="my-auto flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 20 20"
                >
                  <g>
                    <path
                      className={`fill-current`}
                      fillRule="evenodd"
                      d="M5.629 2.334H14.376c.666 0 1.225 0 1.683.038.479.039.934.124 1.366.344a3.5 3.5 0 011.53 1.53c.209.41.296.843.337 1.296.047.152.055.31.03.462.014.375.014.804.014 1.29v5.414c0 .666 0 1.225-.038 1.683-.039.479-.124.934-.344 1.366a3.5 3.5 0 01-1.53 1.53c-.431.22-.886.304-1.365.343-.458.038-1.017.038-1.683.038H5.629c-.666 0-1.225 0-1.683-.038-.48-.039-.934-.124-1.366-.344a3.5 3.5 0 01-1.53-1.53c-.22-.431-.304-.886-.344-1.365C.67 13.933.67 13.374.67 12.708V7.294c0-.486 0-.915.015-1.29a1 1 0 01.028-.462c.042-.453.13-.885.339-1.297a3.5 3.5 0 011.53-1.53c.431-.22.886-.304 1.365-.343.458-.038 1.017-.038 1.683-.038zm-2.96 5.421v4.913c0 .716 0 1.194.03 1.56.03.355.081.518.134.62a1.5 1.5 0 00.655.656c.103.053.265.104.62.133.367.03.845.03 1.561.03h8.667c.716 0 1.194 0 1.56-.03.355-.029.518-.08.62-.133a1.5 1.5 0 00.656-.655c.053-.103.104-.266.133-.62.03-.367.03-.845.03-1.561V7.755l-5.23 3.661a58.34 58.34 0 00-.103.073c-.445.313-.87.61-1.355.732a2.666 2.666 0 01-1.29 0c-.485-.121-.91-.42-1.354-.732l-.103-.073-5.23-3.66zm14.58-2.38l-6.29 4.403c-.62.433-.719.483-.795.502a.667.667 0 01-.323 0c-.076-.019-.176-.069-.794-.502l-6.29-4.403c.022-.101.049-.17.076-.222a1.5 1.5 0 01.655-.655c.103-.053.265-.104.62-.133.367-.03.845-.03 1.561-.03h8.667c.716 0 1.194 0 1.56.03.355.03.518.08.62.133a1.5 1.5 0 01.656.655c.027.053.053.12.077.222z"
                      clipRule="evenodd"
                    ></path>
                  </g>
                </svg>
              </div>
              <div className="text-base font-medium leading-6 tracking-normal">
                {t('NAV_BAR.CONTACT_US')}
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
          <div className="h-40px w-px shrink-0 bg-lightGray6" />
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
