import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import React, { useState } from 'react';
import { FiLayout, FiMail } from 'react-icons/fi';
import { TbGridDots } from 'react-icons/tb';
import { GoArrowSwitch } from 'react-icons/go';
import { Button } from '@/components/button/button';
import { cn } from '@/lib/utils/common';
import { useUserCtx } from '@/contexts/user_context';
import Image from 'next/image';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { ISUNFA_ROUTE } from '@/constants/url';
import { DEFAULT_AVATAR_URL, DEFAULT_DISPLAYED_USER_NAME } from '@/constants/display';
import version from '@/lib/version';
import { useRouter } from 'next/router';
import I18n from '@/components/i18n/i18n';
import { TranslateFunction } from '@/interfaces/locale';
import Notification from '@/components/notification/notification';
import Skeleton from '@/components/skeleton/skeleton';

const NavBar = () => {
  const { t }: { t: TranslateFunction } = useTranslation('common');

  const { signedIn, signOut, username, selectedCompany, selectCompany, userAuth, isAuthLoading } =
    useUserCtx();
  const router = useRouter();

  const [langIsOpen, setLangIsOpen] = useState(false);
  const [notificationIsOpen, setNotificationIsOpen] = useState(false);

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
    setNotificationIsOpen(false);
  };

  const logOutClickHandler = async () => {
    setIsUserMenuOpen(false);
    signOut();
  };

  const companyChangeClickHandler = () => {
    selectCompany(null);
    router.push(ISUNFA_ROUTE.SELECT_COMPANY);
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
        </svg>{' '}
      </button>
      <Link
        href={`${signedIn ? ISUNFA_ROUTE.PROJECT_LIST : ISUNFA_ROUTE.LOGIN}`}
        className="flex w-full items-center gap-16px px-24px py-10px text-button-text-secondary hover:text-primaryYellow"
      >
        <Image src={'/icons/rocket.svg'} width={30} height={30} alt="rocket_icon" />
        <p>Project</p>
      </Link>
      <Link
        href={`${signedIn ? ISUNFA_ROUTE.JOURNAL_LIST : ISUNFA_ROUTE.LOGIN}`}
        className="flex w-full items-center gap-16px px-24px py-10px text-button-text-secondary hover:text-primaryYellow"
      >
        <Image src={'/icons/calculator.svg'} width={30} height={30} alt="calculator_icon" />
        <p>Account</p>
      </Link>
      <button
        type="button"
        // TODO: temp disabled (20240517 - Shirley)
        // eslint-disable-next-line react/jsx-boolean-value
        disabled={true}
        className="flex w-full items-center gap-16px px-24px py-10px text-button-text-secondary hover:text-primaryYellow disabled:opacity-50 disabled:hover:text-button-text-secondary"
      >
        <Image src={'/icons/document.svg'} width={30} height={30} alt="document_icon" />
        <p>Contract</p>
      </button>
      <Link
        href={`${signedIn ? ISUNFA_ROUTE.SALARY : ISUNFA_ROUTE.LOGIN}`}
        className="flex w-full items-center gap-16px px-24px py-10px text-button-text-secondary hover:text-primaryYellow"
      >
        <Image src={'/icons/briefcase.svg'} width={30} height={30} alt="briefcase_icon" />
        <p>Salary</p>
      </Link>
      <Link
        href={`${signedIn ? ISUNFA_ROUTE.USERS_MY_REPORTS : ISUNFA_ROUTE.LOGIN}`}
        className="flex w-full items-center gap-16px px-24px py-10px text-button-text-secondary hover:text-primaryYellow"
      >
        <Image src={'/icons/report.svg'} width={30} height={30} alt="report_icon" />
        <p>Report</p>
      </Link>
    </div>
  );

  // Info: mobile (20240607 - Shirley)
  const displayedBurgerMenu = (
    <div
      ref={burgerMenuRef}
      className={`absolute left-0 top-75px flex justify-center gap-16px lg:hidden ${isBurgerMenuOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-10 opacity-0'} w-full flex-col items-start bg-white py-30px text-base shadow-xl transition-all duration-300 ease-in-out`}
    >
      <button
        type="button"
        onClick={appMenuMobileClickHandler}
        className="flex w-full items-center gap-8px px-24px py-10px text-button-text-secondary hover:text-primaryYellow"
      >
        <div className="flex flex-1 items-center gap-8px">
          <TbGridDots size={20} />
          <p>Applications</p>
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
        </svg>{' '}
      </button>
      <Link
        href={`${signedIn ? ISUNFA_ROUTE.DASHBOARD : ISUNFA_ROUTE.LOGIN}`}
        className="flex w-full items-center gap-8px px-24px py-10px text-button-text-secondary hover:text-primaryYellow"
      >
        <FiLayout size={20} />

        <p>Dashboard</p>
      </Link>
      <Link
        href={ISUNFA_ROUTE.CONTACT_US}
        className="flex w-full items-center gap-8px px-24px py-10px text-button-text-secondary hover:text-primaryYellow"
      >
        <FiMail size={20} />
        <p>Contact us</p>
      </Link>

      <Notification
        mobileMenuIsOpen={notificationIsOpen}
        setMobileMenuIsOpen={setNotificationIsOpen}
      />

      <I18n langIsOpen={langIsOpen} setLangIsOpen={setLangIsOpen} />
      {displayedAppMenuMobile}
    </div>
  );

  const displayedAppMenu = (
    <div
      ref={appMenuRef}
      className={`absolute right-0 top-45px grid w-max grid-cols-3 grid-rows-2 ${isAppMenuOpen ? 'visible opacity-100' : 'invisible opacity-0'} gap-20px rounded-3xl bg-white p-24px text-lg font-semibold text-navyBlue2 shadow-xl transition-all duration-300 ease-in-out`}
    >
      {/* Info: (20240416 - Julian) Project button */}
      <Link
        href={`${signedIn ? ISUNFA_ROUTE.PROJECT_LIST : ISUNFA_ROUTE.LOGIN}`}
        className="mx-auto"
      >
        <button type="button" className="flex flex-col items-center gap-8px">
          <Image src={'/icons/rocket.svg'} width={48} height={48} alt="rocket_icon" />
          <p>Project</p>
        </button>
      </Link>
      {/* Info: (20240416 - Julian) Account button */}
      <Link
        href={`${signedIn ? ISUNFA_ROUTE.JOURNAL_LIST : ISUNFA_ROUTE.LOGIN}`}
        className="mx-auto"
      >
        <button type="button" className="flex flex-col items-center gap-8px">
          <Image src={'/icons/calculator.svg'} width={48} height={48} alt="calculator_icon" />
          <p>Account</p>
        </button>
      </Link>
      {/* Info: (20240416 - Julian) Contract button */}
      <button
        type="button"
        // TODO: temp disabled (20240517 - Shirley)
        // eslint-disable-next-line react/jsx-boolean-value
        disabled={true}
        className="flex flex-col items-center gap-8px disabled:opacity-50"
      >
        <Image src={'/icons/document.svg'} width={48} height={48} alt="document_icon" />
        <p>Contract</p>
      </button>
      {/* Info: (20240416 - Julian) Salary button */}
      <Link href={`${signedIn ? ISUNFA_ROUTE.SALARY : ISUNFA_ROUTE.LOGIN}`} className="mx-auto">
        <button type="button" className="flex flex-col items-center gap-8px">
          <Image src={'/icons/briefcase.svg'} width={48} height={48} alt="briefcase_icon" />
          <p>Salary</p>
        </button>
      </Link>
      {/* Info: (20240416 - Julian) Report button */}
      <Link
        href={`${signedIn ? ISUNFA_ROUTE.USERS_MY_REPORTS : ISUNFA_ROUTE.LOGIN}`}
        className="mx-auto"
      >
        <button type="button" className="flex flex-col items-center gap-8px">
          <Image src={'/icons/report.svg'} width={48} height={48} alt="report_icon" />
          <p>Report</p>
        </button>
      </Link>
    </div>
  );

  const displayedUserMenu = (
    <div
      className={`${isUserMenuOpen ? 'visible opacity-100' : 'invisible opacity-0'} absolute right-16 top-70px z-100 transition-all duration-300 ease-in-out`}
    >
      <div className="max-w-248px flex-col rounded-2xl bg-white p-4 shadow-xl">
        <Image
          alt="avatar"
          src={userAuth?.imageId ?? DEFAULT_AVATAR_URL}
          width={56}
          height={56}
          className="mx-auto aspect-square w-16 self-center"
        />{' '}
        <div className="group absolute inset-0 left-1/2 top-1.3rem h-3.3rem w-3.3rem -translate-x-1/2 rounded-full hover:cursor-pointer">
          {/* Info: black cover (20240605 - Shirley) */}
          <div className="h-3.3rem w-3.3rem rounded-full bg-black opacity-0 transition-opacity group-hover:opacity-50"></div>
          {/* Info: edit icon (20240605 - Shirley) */}
          <div className="absolute left-1/3 top-4 opacity-0 group-hover:opacity-100">
            {' '}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              fill="none"
              viewBox="0 0 20 20"
            >
              <path
                fill="#FCFDFF"
                fillRule="evenodd"
                d="M14.712 1.377a2.768 2.768 0 113.914 3.915l-7.969 7.969-.053.052c-.235.236-.46.462-.732.628a2.666 2.666 0 01-.77.32c-.311.074-.63.074-.963.074H6.67a1 1 0 01-1-1v-1.396-.075c0-.333 0-.651.074-.962.065-.272.173-.532.319-.77.167-.273.392-.498.628-.733l.053-.053 7.969-7.969zm2.5 1.415c-.3-.3-.786-.3-1.086 0L8.157 10.76c-.322.321-.363.372-.39.415a.667.667 0 00-.08.193c-.011.05-.018.115-.018.57v.395h.396c.455 0 .52-.006.57-.018a.667.667 0 00.192-.08c.044-.027.094-.068.416-.39l7.969-7.969c.3-.3.3-.786 0-1.085zM5.629 2.334h3.54a1 1 0 110 2h-3.5c-.716 0-1.194.001-1.56.031-.356.03-.518.08-.62.133a1.5 1.5 0 00-.656.655c-.053.103-.104.266-.133.62-.03.368-.03.845-.03 1.561v7c0 .717 0 1.194.03 1.561.029.355.08.518.133.62l-.891.454.89-.454a1.5 1.5 0 00.656.656c.103.052.265.104.62.133.367.03.845.03 1.561.03h7c.717 0 1.194 0 1.56-.03.356-.03.518-.08.621-.133a1.5 1.5 0 00.656-.656c.052-.102.103-.265.132-.62.03-.367.031-.844.031-1.56v-3.5a1 1 0 112 0v3.54c0 .665 0 1.225-.037 1.683-.04.479-.124.933-.344 1.365a3.5 3.5 0 01-1.53 1.53c-.432.22-.887.305-1.365.344-.458.037-1.018.037-1.684.037H5.63c-.666 0-1.225 0-1.683-.037-.479-.04-.934-.124-1.366-.344a3.5 3.5 0 01-1.53-1.53c-.22-.431-.304-.886-.344-1.365C.67 15.6.67 15.04.67 14.375v-7.08c0-.667 0-1.226.037-1.684.04-.479.125-.934.345-1.366a3.5 3.5 0 011.53-1.53c.431-.22.886-.304 1.365-.343.458-.038 1.017-.038 1.683-.038z"
                clipRule="evenodd"
              ></path>
            </svg>
          </div>
        </div>
        <div className="mt-3 flex justify-center gap-0 px-16">
          <div className="my-auto text-base font-semibold leading-6 tracking-normal text-button-text-secondary">
            {signedIn ? username ?? DEFAULT_DISPLAYED_USER_NAME : ''}
          </div>
          <button
            type="button"
            // TODO: temp disabled (20240517 - Shirley)
            // eslint-disable-next-line react/jsx-boolean-value
            disabled={true}
            className="flex shrink-0 flex-col justify-center rounded-xs px-2 disabled:opacity-50"
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
                  fill="#001840"
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
        <button
          type="button"
          onClick={companyChangeClickHandler}
          className={`mt-3 flex gap-2 rounded-xs px-4 py-2.5 ${selectedCompany ? '' : 'pointer-events-none opacity-50'}`}
        >
          <div className="my-auto flex items-center justify-center">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g clipPath="url(#clip0_1966_131937)">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M5.13956 1.75098L5.16907 1.75098H8.16907L8.19857 1.75098C8.64013 1.75096 9.01611 1.75095 9.32481 1.77618C9.64911 1.80267 9.9646 1.8607 10.2662 2.01438C10.7209 2.24607 11.0906 2.61578 11.3223 3.0705C11.476 3.37211 11.534 3.68761 11.5605 4.01191C11.5858 4.3206 11.5857 4.69657 11.5857 5.13812V5.16764V8.41764H14.8357L14.8652 8.41764C15.3068 8.41763 15.6828 8.41762 15.9915 8.44284C16.3158 8.46934 16.6313 8.52737 16.9329 8.68105C17.3876 8.91274 17.7573 9.28244 17.989 9.73717C18.1427 10.0388 18.2007 10.3543 18.2272 10.6786C18.2524 10.9873 18.2524 11.3632 18.2524 11.8048V11.8343V16.751H18.3357C18.7499 16.751 19.0857 17.0868 19.0857 17.501C19.0857 17.9152 18.7499 18.251 18.3357 18.251H17.5024H10.8357H2.5024H1.66907C1.25485 18.251 0.919067 17.9152 0.919067 17.501C0.919067 17.0868 1.25485 16.751 1.66907 16.751H1.7524V5.16764L1.7524 5.13814C1.75239 4.69658 1.75238 4.3206 1.7776 4.01191C1.80409 3.68761 1.86212 3.37211 2.0158 3.0705C2.2475 2.61578 2.6172 2.24607 3.07192 2.01438C3.37353 1.8607 3.68903 1.80267 4.01333 1.77618C4.32202 1.75095 4.69801 1.75096 5.13956 1.75098ZM3.2524 16.751H10.0857V9.16764V5.16764C10.0857 4.68856 10.0852 4.37435 10.0655 4.13405C10.0466 3.90252 10.0138 3.8064 9.98582 3.75149C9.89794 3.579 9.75771 3.43877 9.58523 3.35089C9.53032 3.32291 9.4342 3.29011 9.20266 3.27119C8.96236 3.25156 8.64815 3.25098 8.16907 3.25098H5.16907C4.68998 3.25098 4.37577 3.25156 4.13548 3.27119C3.90394 3.29011 3.80782 3.32291 3.75291 3.35089C3.58043 3.43877 3.4402 3.579 3.35231 3.75149C3.32433 3.8064 3.29153 3.90252 3.27262 4.13405C3.25298 4.37435 3.2524 4.68856 3.2524 5.16764V16.751ZM11.5857 9.91764V16.751H16.7524V11.8343C16.7524 11.3552 16.7518 11.041 16.7322 10.8007C16.7133 10.5692 16.6805 10.4731 16.6525 10.4182C16.5646 10.2457 16.4244 10.1054 16.2519 10.0176C16.197 9.98958 16.1009 9.95678 15.8693 9.93786C15.629 9.91823 15.3148 9.91764 14.8357 9.91764H11.5857ZM4.66907 5.83431C4.66907 5.4201 5.00485 5.08431 5.41907 5.08431H7.91907C8.33328 5.08431 8.66907 5.4201 8.66907 5.83431C8.66907 6.24852 8.33328 6.58431 7.91907 6.58431H5.41907C5.00485 6.58431 4.66907 6.24852 4.66907 5.83431ZM4.66907 9.16764C4.66907 8.75343 5.00485 8.41764 5.41907 8.41764H7.91907C8.33328 8.41764 8.66907 8.75343 8.66907 9.16764C8.66907 9.58186 8.33328 9.91764 7.91907 9.91764H5.41907C5.00485 9.91764 4.66907 9.58186 4.66907 9.16764ZM4.66907 12.501C4.66907 12.0868 5.00485 11.751 5.41907 11.751H7.91907C8.33328 11.751 8.66907 12.0868 8.66907 12.501C8.66907 12.9152 8.33328 13.251 7.91907 13.251H5.41907C5.00485 13.251 4.66907 12.9152 4.66907 12.501Z"
                  fill="#001840"
                />
              </g>
              <defs>
                <clipPath id="clip0_1966_131937">
                  <rect width="20" height="20" fill="white" />
                </clipPath>
              </defs>
            </svg>
          </div>
          <div className="text-base font-medium leading-6 tracking-normal text-button-text-secondary">
            Switch Company
          </div>
        </button>
        <button
          type="button"
          disabled={!selectedCompany} // Info: (20240513 - Julian) 如果沒有選擇 company 就不能使用
          className="mt-3 flex gap-2 rounded-xs px-4 py-2.5 disabled:opacity-50"
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
                fill="#001840"
                fillRule="evenodd"
                d="M6.462 1.501h7.08c.667 0 1.226 0 1.684.037.479.04.934.124 1.365.344a3.5 3.5 0 011.53 1.53c.22.432.305.887.344 1.366.038.457.038 1.017.037 1.683v7.08c0 .666 0 1.226-.037 1.683-.04.48-.124.934-.344 1.366a3.5 3.5 0 01-1.53 1.53c-.431.22-.886.304-1.365.344-.458.037-1.018.037-1.683.037h-7.08c-.667 0-1.226 0-1.684-.037-.479-.04-.934-.124-1.366-.345a3.5 3.5 0 01-1.53-1.53c-.22-.43-.304-.886-.343-1.365-.038-.457-.038-1.017-.038-1.683v-7.08c0-.666 0-1.226.038-1.683.039-.48.124-.934.344-1.366a3.5 3.5 0 011.53-1.53c.431-.22.886-.305 1.365-.344.458-.037 1.017-.037 1.683-.037zm-1.52 2.03c-.355.03-.518.081-.62.133a1.5 1.5 0 00-.656.656c-.053.103-.104.265-.133.62-.03.367-.03.844-.03 1.561v7c0 .716 0 1.194.03 1.56.03.356.08.518.133.621a1.5 1.5 0 00.655.655c.103.053.266.104.62.133.368.03.845.031 1.561.031h7c.717 0 1.194 0 1.561-.03.355-.03.518-.081.62-.134a1.5 1.5 0 00.656-.655c.052-.103.104-.265.133-.62.03-.367.03-.845.03-1.561v-7c0-.717 0-1.194-.03-1.56-.03-.356-.08-.518-.133-.621a1.5 1.5 0 00-.656-.656c-.102-.052-.265-.103-.62-.132-.367-.03-.844-.031-1.56-.031h-7c-.717 0-1.194 0-1.561.03zm5.06 2.137a1 1 0 011 1V9h2.334a1 1 0 110 2h-2.334v2.333a1 1 0 11-2 0v-2.333H6.67a1 1 0 110-2h2.333V6.668a1 1 0 011-1z"
                clipRule="evenodd"
              ></path>
            </svg>
          </div>
          <div className="text-base font-medium leading-6 tracking-normal text-button-text-secondary">
            Subscription & Bills
          </div>
        </button>
        <button
          type="button"
          disabled={!selectedCompany} // Info: (20240513 - Julian) 如果沒有選擇 company 就不能使用
          className="mt-3 flex gap-2 rounded-xs px-4 py-2.5 disabled:opacity-50"
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
                fill="#001840"
                fillRule="evenodd"
                d="M10.002 2.668a.515.515 0 00-.515.515v.133a2.25 2.25 0 01-1.363 2.059 1 1 0 01-.239.068 2.25 2.25 0 01-2.294-.523l-.008-.007-.045-.046a.515.515 0 00-.73 0 .515.515 0 000 .73l.045.045.008.008a2.25 2.25 0 01.463 2.453 2.25 2.25 0 01-2.048 1.443h-.092a.515.515 0 000 1.03h.133a2.25 2.25 0 012.057 1.36 2.25 2.25 0 01-.452 2.476l-.008.008-.045.046a.516.516 0 000 .73.515.515 0 00.729 0l.046-.046.008-.008a2.25 2.25 0 012.452-.462 2.25 2.25 0 011.444 2.048v.091a.515.515 0 101.03 0v-.133a2.25 2.25 0 011.359-2.056 2.25 2.25 0 012.477.452l.008.007.045.046a.515.515 0 00.73 0 .516.516 0 000-.73l-.046-.045-.007-.008a2.25 2.25 0 01-.453-2.477 2.25 2.25 0 012.057-1.359H16.821a.515.515 0 000-1.03h-.133a2.25 2.25 0 01-2.06-1.364 1 1 0 01-.068-.238 2.25 2.25 0 01.523-2.294l.008-.008.045-.046a.515.515 0 000-.729.515.515 0 00-.73 0l-.045.045-.008.008a2.25 2.25 0 01-2.477.452 2.25 2.25 0 01-1.358-2.057V3.183a.515.515 0 00-.516-.515zM8.224 1.404a2.515 2.515 0 014.294 1.779v.065a.25.25 0 00.151.228l.01.004a.25.25 0 00.273-.047l.04-.04a2.514 2.514 0 014.296 1.779 2.517 2.517 0 01-.738 1.779l-.04.04a.25.25 0 00-.047.273c.02.046.037.093.05.141a.25.25 0 00.181.08h.127a2.515 2.515 0 010 5.031h-.066a.25.25 0 00-.227.152l-.005.01a.25.25 0 00.048.273l.04.04a2.515 2.515 0 11-3.558 3.558l-.04-.04a.25.25 0 00-.274-.048l-.01.005a.25.25 0 00-.15.227v.126a2.515 2.515 0 11-5.031 0v-.052a.25.25 0 00-.164-.221 1.024 1.024 0 01-.058-.024.25.25 0 00-.273.048l-.04.04a2.515 2.515 0 01-4.296-1.78 2.515 2.515 0 01.737-1.778l.04-.04a.25.25 0 00.048-.274l-.004-.01a.25.25 0 00-.228-.151h-.126a2.515 2.515 0 010-5.03h.052a.25.25 0 00.222-.164l.023-.058a.25.25 0 00-.047-.274l-.04-.04a2.515 2.515 0 010-3.558l.707.707-.708-.707a2.515 2.515 0 013.559 0l.04.04a.25.25 0 00.273.048 1 1 0 01.141-.05.25.25 0 00.081-.182v-.126c0-.667.265-1.307.737-1.779zM16.61 16.55l-.707-.707.707.707zm-6.609-8.048a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm-3.5 1.5a3.5 3.5 0 117 0 3.5 3.5 0 01-7 0z"
                clipRule="evenodd"
              ></path>
            </svg>
          </div>
          <div className="text-base font-medium leading-6 tracking-normal text-button-text-secondary">
            Setting
          </div>
        </button>
        <div className="mt-3 flex flex-col justify-center py-2.5">
          <div className="flex flex-col justify-center">
            <div className="h-px shrink-0 border border-solid border-gray-300 bg-gray-300" />
          </div>
        </div>
        <button
          type="button"
          onClick={logOutClickHandler}
          className="mt-3 flex w-full gap-2 rounded-xs px-4 py-2.5 hover:opacity-70"
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
                fill="#001840"
                fillRule="evenodd"
                d="M7.89 3.552c-.158-.042-.382-.05-1.22-.05h-.418c-.596 0-.993 0-1.3.02-.297.02-.436.057-.524.093a1.5 1.5 0 00-.811.812c-.037.088-.073.227-.093.524-.021.307-.022.704-.022 1.3v7.5c0 .596.001.993.022 1.3.02.298.056.437.093.524a1.5 1.5 0 00.811.812c.088.036.227.072.525.093.306.02.703.021 1.3.021h.416c.84 0 1.063-.009 1.222-.051a1.5 1.5 0 001.06-1.06c.043-.16.051-.383.051-1.222a1 1 0 112 0v.126c.001.65.001 1.165-.119 1.613a3.5 3.5 0 01-2.475 2.475c-.448.12-.962.12-1.613.12H6.22c-.554 0-1.02 0-1.403-.027-.4-.027-.781-.086-1.153-.24A3.5 3.5 0 011.77 16.34c-.154-.371-.213-.753-.24-1.153-.027-.383-.027-.848-.027-1.403V6.218c0-.554 0-1.02.027-1.403.027-.4.086-.781.24-1.153a3.5 3.5 0 011.894-1.894c.372-.155.754-.214 1.153-.24C5.2 1.5 5.666 1.5 6.22 1.5h.576c.65 0 1.165 0 1.613.12a3.5 3.5 0 012.475 2.474l-.966.26.966-.26c.12.449.12.963.12 1.613v.126a1 1 0 11-2 0c0-.839-.01-1.062-.052-1.221a1.5 1.5 0 00-1.06-1.06zm4.739 1.575a1 1 0 011.414 0l4.166 4.167a1 1 0 010 1.414l-4.166 4.167a1 1 0 01-1.414-1.414l2.46-2.46H7.501a1 1 0 110-2h7.586l-2.46-2.46a1 1 0 010-1.414z"
                clipRule="evenodd"
              ></path>
            </svg>
          </div>
          <div className="text-base font-medium leading-6 tracking-normal text-tertiaryBlue">
            Logout
          </div>
        </button>
      </div>
    </div>
  );

  const displayedCompanyChangeBtn = selectedCompany ? (
    <button
      type="button"
      onClick={companyChangeClickHandler}
      className="flex items-center gap-x-4px rounded-full bg-badge-surface-strong-secondary p-6px font-semibold text-badge-text-invert"
    >
      {/* ToDo: (20240516 - Julian) icon */}
      <Image
        alt={`${selectedCompany?.name}_icon`}
        src={'/entities/happy.png'}
        width={16}
        height={16}
        className="rounded-full"
      />
      {/* ToDo: (20240521 - Julian) company name abbreviation */}
      <p className="text-sm">{selectedCompany?.name.split(' ')[0]}</p>
      <GoArrowSwitch size={14} />
    </button>
  ) : null;

  const displayedLogInBtn = isAuthLoading ? (
    <Skeleton width={44} height={40} />
  ) : signedIn ? (
    <div ref={userMenuRef} className="">
      <button type="button" onClick={avatarClickHandler} className="">
        {/* Info: avatar svg (20240408 - Shirley) */}
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
  ) : (
    <Link href={ISUNFA_ROUTE.LOGIN}>
      {/* Info: desktop version (20240530 - Shirley) */}
      <Button className="hidden h-40px bg-button-surface-strong-primary lg:flex">
        <p className={cn('text-sm leading-6 tracking-normal text-button-text-primary-solid')}>
          {t('NAV_BAR.LOGIN')}
        </p>

        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          fill="none"
          viewBox="0 0 20 20"
        >
          <g>
            <path
              className={cn(`fill-current`, `text-button-text-primary-solid`)}
              fillRule="evenodd"
              d="M8.21 1.501H13.542c.667 0 1.226 0 1.684.037.479.04.934.125 1.365.345l-.454.89.454-.89a3.5 3.5 0 011.53 1.53c.22.431.305.886.344 1.365.038.458.038 1.017.037 1.683v7.08c0 .666 0 1.226-.037 1.684-.04.478-.124.933-.344 1.365a3.5 3.5 0 01-1.53 1.53c-.431.22-.886.305-1.365.344-.458.037-1.018.037-1.683.037H8.21c-.65 0-1.165.001-1.613-.12a3.5 3.5 0 01-2.475-2.474c-.12-.448-.12-.963-.12-1.613v-.126a1 1 0 112 0c0 .84.009 1.063.052 1.221l-.961.258.96-.258a1.5 1.5 0 001.061 1.061c.159.043.382.051 1.222.051h5.166c.717 0 1.194 0 1.561-.03.355-.03.518-.081.62-.133a1.5 1.5 0 00.656-.656c.052-.103.104-.265.133-.62.03-.367.03-.844.03-1.56v-7c0-.717 0-1.195-.03-1.561-.03-.356-.08-.518-.133-.62l.891-.455-.891.454a1.5 1.5 0 00-.656-.655c-.102-.053-.265-.104-.62-.133-.367-.03-.844-.03-1.56-.03H8.335c-.84 0-1.063.008-1.222.05a1.5 1.5 0 00-1.06 1.06c-.043.16-.052.383-.052 1.222a1 1 0 11-2 0v-.126c0-.65 0-1.164.12-1.613A3.5 3.5 0 016.597 1.62c.448-.12.962-.12 1.613-.119zm1.085 4.46a1 1 0 011.415 0l3.333 3.333a1 1 0 010 1.414l-3.333 3.333a1 1 0 11-1.415-1.414l1.627-1.626h-8.42a1 1 0 110-2h8.42L9.295 7.375a1 1 0 010-1.414z"
              clipRule="evenodd"
            ></path>
          </g>
        </svg>
      </Button>

      {/* Info: mobile version (20240530 - Shirley) */}
      <Button className="flex h-40px bg-button-surface-strong-primary px-3 lg:hidden">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          fill="none"
          viewBox="0 0 20 20"
        >
          <g>
            <path
              className={cn(`fill-current`, `text-button-text-primary-solid`)}
              fillRule="evenodd"
              d="M8.21 1.501H13.542c.667 0 1.226 0 1.684.037.479.04.934.125 1.365.345l-.454.89.454-.89a3.5 3.5 0 011.53 1.53c.22.431.305.886.344 1.365.038.458.038 1.017.037 1.683v7.08c0 .666 0 1.226-.037 1.684-.04.478-.124.933-.344 1.365a3.5 3.5 0 01-1.53 1.53c-.431.22-.886.305-1.365.344-.458.037-1.018.037-1.683.037H8.21c-.65 0-1.165.001-1.613-.12a3.5 3.5 0 01-2.475-2.474c-.12-.448-.12-.963-.12-1.613v-.126a1 1 0 112 0c0 .84.009 1.063.052 1.221l-.961.258.96-.258a1.5 1.5 0 001.061 1.061c.159.043.382.051 1.222.051h5.166c.717 0 1.194 0 1.561-.03.355-.03.518-.081.62-.133a1.5 1.5 0 00.656-.656c.052-.103.104-.265.133-.62.03-.367.03-.844.03-1.56v-7c0-.717 0-1.195-.03-1.561-.03-.356-.08-.518-.133-.62l.891-.455-.891.454a1.5 1.5 0 00-.656-.655c-.102-.053-.265-.104-.62-.133-.367-.03-.844-.03-1.56-.03H8.335c-.84 0-1.063.008-1.222.05a1.5 1.5 0 00-1.06 1.06c-.043.16-.052.383-.052 1.222a1 1 0 11-2 0v-.126c0-.65 0-1.164.12-1.613A3.5 3.5 0 016.597 1.62c.448-.12.962-.12 1.613-.119zm1.085 4.46a1 1 0 011.415 0l3.333 3.333a1 1 0 010 1.414l-3.333 3.333a1 1 0 11-1.415-1.414l1.627-1.626h-8.42a1 1 0 110-2h8.42L9.295 7.375a1 1 0 010-1.414z"
              clipRule="evenodd"
            ></path>
          </g>
        </svg>
      </Button>
    </Link>
  );

  return (
    <div className="fixed top-0 z-20 flex w-screen">
      <div className="z-60 flex h-80px w-full items-center gap-5 bg-surface-neutral-surface-lv1 px-80px py-8px shadow-navbar  max-md:flex-wrap max-md:px-5 lg:h-60px">
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
              className={`${burgerButtonStyle} ${isBurgerMenuOpen ? 'w-6/10 -translate-x-1 -translate-y-1 rotate-40' : ' w-full translate-x-0 translate-y-0 rotate-0'}`}
            ></span>
          </button>

          {/* Info: cover when burger menu is open (202400607 - Shirley) */}
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
                <div className="justify-center px-1 text-xs">V{version}</div>
              </div>
            </div>
          </div>

          {/* TODO: links on mobile is hidden for the sake of no design spec (20240408 - Shirley) */}
          <div className="my-auto hidden flex-1 gap-5 max-md:flex-wrap lg:flex">
            <Link
              href={`${signedIn ? ISUNFA_ROUTE.DASHBOARD : ISUNFA_ROUTE.LOGIN}`}
              className="flex justify-center gap-2 rounded-xs px-3 py-2.5 text-button-text-secondary hover:text-primaryYellow max-md:px-5 lg:ml-10"
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
        {/* Info: desktop (20240408 - Shirley) */}
        <div className="relative hidden space-x-8 text-button-text-secondary lg:flex">
          {/* Info: globe (i18n) (20240605 - Shirley) */}
          <I18n />
          {/* Info: notification (20240606 - Shirley) */}
          <Notification />
          {/* Info: app menu (20240606 - Shirley) */}
          <button type="button" onClick={appMenuClickHandler}>
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
                d="M4.58659 4.66772C4.63261 4.66772 4.66992 4.63041 4.66992 4.58439C4.66992 4.53837 4.63261 4.50106 4.58659 4.50106C4.54056 4.50106 4.50326 4.53837 4.50326 4.58439C4.50326 4.63041 4.54056 4.66772 4.58659 4.66772ZM2.66992 4.58439C2.66992 3.52585 3.52804 2.66772 4.58659 2.66772C5.64513 2.66772 6.50326 3.52585 6.50326 4.58439C6.50326 5.64294 5.64513 6.50106 4.58659 6.50106C3.52804 6.50106 2.66992 5.64294 2.66992 4.58439ZM11.0033 4.66772C11.0493 4.66772 11.0866 4.63041 11.0866 4.58439C11.0866 4.53837 11.0493 4.50106 11.0033 4.50106C10.9572 4.50106 10.9199 4.53837 10.9199 4.58439C10.9199 4.63041 10.9572 4.66772 11.0033 4.66772ZM9.08659 4.58439C9.08659 3.52585 9.94471 2.66772 11.0033 2.66772C12.0618 2.66772 12.9199 3.52585 12.9199 4.58439C12.9199 5.64294 12.0618 6.50106 11.0033 6.50106C9.94471 6.50106 9.08659 5.64294 9.08659 4.58439ZM17.4199 4.66772C17.4659 4.66772 17.5033 4.63041 17.5033 4.58439C17.5033 4.53837 17.4659 4.50106 17.4199 4.50106C17.3739 4.50106 17.3366 4.53837 17.3366 4.58439C17.3366 4.63041 17.3739 4.66772 17.4199 4.66772ZM15.5033 4.58439C15.5033 3.52585 16.3614 2.66772 17.4199 2.66772C18.4785 2.66772 19.3366 3.52585 19.3366 4.58439C19.3366 5.64294 18.4785 6.50106 17.4199 6.50106C16.3614 6.50106 15.5033 5.64294 15.5033 4.58439ZM4.58659 11.0844C4.63261 11.0844 4.66992 11.0471 4.66992 11.0011C4.66992 10.955 4.63261 10.9177 4.58659 10.9177C4.54056 10.9177 4.50326 10.955 4.50326 11.0011C4.50326 11.0471 4.54056 11.0844 4.58659 11.0844ZM2.66992 11.0011C2.66992 9.94251 3.52804 9.08439 4.58659 9.08439C5.64513 9.08439 6.50326 9.94251 6.50326 11.0011C6.50326 12.0596 5.64513 12.9177 4.58659 12.9177C3.52804 12.9177 2.66992 12.0596 2.66992 11.0011ZM11.0033 11.0844C11.0493 11.0844 11.0866 11.0471 11.0866 11.0011C11.0866 10.955 11.0493 10.9177 11.0033 10.9177C10.9572 10.9177 10.9199 10.955 10.9199 11.0011C10.9199 11.0471 10.9572 11.0844 11.0033 11.0844ZM9.08659 11.0011C9.08659 9.94251 9.94471 9.08439 11.0033 9.08439C12.0618 9.08439 12.9199 9.94251 12.9199 11.0011C12.9199 12.0596 12.0618 12.9177 11.0033 12.9177C9.94471 12.9177 9.08659 12.0596 9.08659 11.0011ZM17.4199 11.0844C17.4659 11.0844 17.5033 11.0471 17.5033 11.0011C17.5033 10.955 17.4659 10.9177 17.4199 10.9177C17.3739 10.9177 17.3366 10.955 17.3366 11.0011C17.3366 11.0471 17.3739 11.0844 17.4199 11.0844ZM15.5033 11.0011C15.5033 9.94251 16.3614 9.08439 17.4199 9.08439C18.4785 9.08439 19.3366 9.94251 19.3366 11.0011C19.3366 12.0596 18.4785 12.9177 17.4199 12.9177C16.3614 12.9177 15.5033 12.0596 15.5033 11.0011ZM4.58659 17.5011C4.63261 17.5011 4.66992 17.4637 4.66992 17.4177C4.66992 17.3717 4.63261 17.3344 4.58659 17.3344C4.54056 17.3344 4.50326 17.3717 4.50326 17.4177C4.50326 17.4637 4.54056 17.5011 4.58659 17.5011ZM2.66992 17.4177C2.66992 16.3592 3.52804 15.5011 4.58659 15.5011C5.64513 15.5011 6.50326 16.3592 6.50326 17.4177C6.50326 18.4763 5.64513 19.3344 4.58659 19.3344C3.52804 19.3344 2.66992 18.4763 2.66992 17.4177ZM11.0033 17.5011C11.0493 17.5011 11.0866 17.4637 11.0866 17.4177C11.0866 17.3717 11.0493 17.3344 11.0033 17.3344C10.9572 17.3344 10.9199 17.3717 10.9199 17.4177C10.9199 17.4637 10.9572 17.5011 11.0033 17.5011ZM9.08659 17.4177C9.08659 16.3592 9.94471 15.5011 11.0033 15.5011C12.0618 15.5011 12.9199 16.3592 12.9199 17.4177C12.9199 18.4763 12.0618 19.3344 11.0033 19.3344C9.94471 19.3344 9.08659 18.4763 9.08659 17.4177ZM17.4199 17.5011C17.4659 17.5011 17.5033 17.4637 17.5033 17.4177C17.5033 17.3717 17.4659 17.3344 17.4199 17.3344C17.3739 17.3344 17.3366 17.3717 17.3366 17.4177C17.3366 17.4637 17.3739 17.5011 17.4199 17.5011ZM15.5033 17.4177C15.5033 16.3592 16.3614 15.5011 17.4199 15.5011C18.4785 15.5011 19.3366 16.3592 19.3366 17.4177C19.3366 18.4763 18.4785 19.3344 17.4199 19.3344C16.3614 19.3344 15.5033 18.4763 15.5033 17.4177Z"
                fill="#001840"
              />
            </svg>
          </button>
          {displayedAppMenu}
        </div>

        <div className="hidden flex-col items-start justify-center lg:flex">
          <div className="h-40px w-px shrink-0 bg-lightGray6" />
        </div>

        {/* Info: (20240521 - Julian) Company change button */}
        {displayedCompanyChangeBtn}

        {displayedLogInBtn}
      </div>
      {displayedBurgerMenu}
    </div>
  );
};

export default NavBar;
