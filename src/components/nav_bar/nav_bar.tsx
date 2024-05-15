/* eslint-disable */
import Link from 'next/link';
import React from 'react';
import { FaChevronRight, FaChevronLeft } from 'react-icons/fa';
import { FiLayout, FiMail, FiBell } from 'react-icons/fi';
import { TbGridDots } from 'react-icons/tb';
import { PiGlobe } from 'react-icons/pi';
import { Button } from '../button/button';
import { cn } from '@/lib/utils/common';
import { useUserCtx } from '@/contexts/user_context';
import Image from 'next/image';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { ISUNFA_ROUTE } from '@/constants/url';
import { DEFAULT_DISPLAYED_USER_NAME } from '@/constants/display';
import version from '@/lib/version';

const NavBar = () => {
  const { credential: credential, signedIn, signOut, username, isSelectCompany } = useUserCtx();

  const burgerButtonStyle =
    'h-2px rounded-full bg-button-text-secondary transition-all duration-150 ease-in-out';

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
  const burgerMenuClickHandler = () => setIsBurgerMenuOpen(!isBurgerMenuOpen);

  const logOutClickHandler = async () => {
    setIsUserMenuOpen(false);
    signOut();
  };

  const displayedAppMenuMobile = (
    <div
      ref={appMenuMobileRef}
      className={`absolute left-0 top-0 flex gap-16px overflow-hidden lg:hidden ${isAppMenuMobileOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-10 opacity-0'} w-full flex-col items-start bg-white px-32px py-30px text-base shadow-xl transition-all duration-300 ease-in-out`}
    >
      <button
        onClick={appMenuMobileClickHandler}
        type="button"
        className="p-16px text-button-text-secondary hover:text-primaryYellow"
      >
        <FaChevronLeft />
      </button>
      {/* TODO: temp disabled (20240507 - Shirley) */}
      <button
        disabled={true}
        className="flex w-full items-center gap-16px px-24px py-10px text-button-text-secondary hover:text-primaryYellow disabled:opacity-50 disabled:hover:text-button-text-secondary"
      >
        <Image src={'/icons/rocket.svg'} width={30} height={30} alt="rocket_icon" />
        <p>Project</p>
      </button>
      <Link
        href={ISUNFA_ROUTE.ACCOUNTING}
        className="flex w-full items-center gap-16px px-24px py-10px text-button-text-secondary hover:text-primaryYellow"
      >
        <Image src={'/icons/calculator.svg'} width={30} height={30} alt="calculator_icon" />
        <p>Account</p>
      </Link>
      {/* TODO: temp disabled (20240507 - Shirley) */}
      <button
        disabled={true}
        className="flex w-full items-center gap-16px px-24px py-10px text-button-text-secondary hover:text-primaryYellow disabled:opacity-50 disabled:hover:text-button-text-secondary"
      >
        <Image src={'/icons/document.svg'} width={30} height={30} alt="document_icon" />
        <p>Contract</p>
      </button>
      <Link
        href={ISUNFA_ROUTE.SALARY}
        className="flex w-full items-center gap-16px px-24px py-10px text-button-text-secondary hover:text-primaryYellow"
      >
        <Image src={'/icons/briefcase.svg'} width={30} height={30} alt="briefcase_icon" />
        <p>Salary</p>
      </Link>
      <Link
        href={ISUNFA_ROUTE.USERS_MY_REPORTS}
        className="flex w-full items-center gap-16px px-24px py-10px text-button-text-secondary hover:text-primaryYellow"
      >
        <Image src={'/icons/report.svg'} width={30} height={30} alt="report_icon" />
        <p>Report</p>
      </Link>
    </div>
  );

  const displayedBurgerMenu = (
    <div
      ref={burgerMenuRef}
      className={`absolute left-0 top-75px z-50 flex gap-16px lg:hidden ${isBurgerMenuOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-10 opacity-0'} w-full flex-col items-start bg-white px-16px py-30px text-base shadow-xl transition-all duration-300 ease-in-out`}
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
        <FaChevronRight />
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
      <button
        disabled={true}
        type="button"
        className="flex w-full items-center gap-8px px-24px py-10px text-button-text-secondary hover:text-primaryYellow disabled:text-button-text-secondary disabled:opacity-50"
      >
        <div className="flex flex-1 items-center gap-8px">
          <FiBell size={20} />
          <p>Notification</p>
        </div>
        <FaChevronRight />
      </button>
      <button
        disabled={true}
        type="button"
        className="flex w-full items-center gap-8px px-24px py-10px text-button-text-secondary hover:text-primaryYellow disabled:text-button-text-secondary disabled:opacity-50"
      >
        <div className="flex flex-1 items-center gap-8px">
          <PiGlobe size={20} />
          <p>Language</p>
        </div>
        <FaChevronRight />
      </button>
      {displayedAppMenuMobile}
    </div>
  );

  const displayedAppMenu = (
    <div
      ref={appMenuRef}
      className={`absolute right-0 top-45px grid w-max grid-cols-3 grid-rows-2 ${isAppMenuOpen ? 'visible opacity-100' : 'invisible opacity-0'} gap-20px rounded-3xl bg-white p-24px text-lg font-semibold text-navyBlue2 shadow-xl transition-all duration-300 ease-in-out`}
    >
      {/* Info: (20240416 - Julian) Project button */}
      {/* TODO: temp disabled (20240507 - Shirley) */}
      <button
        disabled={true}
        className="flex flex-col items-center gap-8px px-20px disabled:opacity-50"
      >
        <Image src={'/icons/rocket.svg'} width={48} height={48} alt="rocket_icon" />
        <p>Project</p>
      </button>
      {/* Info: (20240416 - Julian) Account button */}
      <Link href={ISUNFA_ROUTE.ACCOUNTING} className="mx-auto">
        <button className="flex flex-col items-center gap-8px">
          <Image src={'/icons/calculator.svg'} width={48} height={48} alt="calculator_icon" />
          <p>Account</p>
        </button>
      </Link>
      {/* Info: (20240416 - Julian) Contract button */}
      {/* TODO: temp disabled (20240507 - Shirley) */}
      <button disabled={true} className="flex flex-col items-center gap-8px disabled:opacity-50">
        <Image src={'/icons/document.svg'} width={48} height={48} alt="document_icon" />
        <p>Contract</p>
      </button>
      {/* Info: (20240416 - Julian) Salary button */}
      <Link href={ISUNFA_ROUTE.SALARY} className="mx-auto">
        <button className="flex flex-col items-center gap-8px">
          <Image src={'/icons/briefcase.svg'} width={48} height={48} alt="briefcase_icon" />
          <p>Salary</p>
        </button>
      </Link>
      {/* Info: (20240416 - Julian) Report button */}
      <Link href={ISUNFA_ROUTE.USERS_MY_REPORTS} className="mx-auto">
        <button className="flex flex-col items-center gap-8px">
          <Image src={'/icons/report.svg'} width={48} height={48} alt="report_icon" />
          <p>Report</p>
        </button>
      </Link>
    </div>
  );

  const displayedUserMenu = isUserMenuOpen ? (
    <div className="absolute right-16 top-70px z-50">
      <div className="max-w-248px flex-col rounded-2xl bg-white p-4 shadow-xl">
        <Image
          alt="avatar"
          src="/elements/avatar.png"
          width={56}
          height={56}
          className="mx-auto aspect-square w-16 self-center"
        />

        <div className="mt-3 flex justify-center gap-0 px-16">
          <div className="my-auto text-base font-semibold leading-6 tracking-normal text-button-text-secondary">
            {signedIn ? (!!username ? username : DEFAULT_DISPLAYED_USER_NAME) : ''}
          </div>
          <button
            disabled={true}
            className="flex shrink-0 flex-col justify-center rounded-xs px-2.5 disabled:opacity-50"
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
        <Link
          href={ISUNFA_ROUTE.SELECT_COMPANY}
          className={`mt-3 flex gap-2 rounded-xs px-4 py-2.5 ${isSelectCompany ? '' : 'pointer-events-none opacity-50'}`}
        >
          <div className="my-auto flex items-center justify-center">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g clip-path="url(#clip0_1966_131937)">
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
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
        </Link>
        <button
          disabled={!isSelectCompany} // Info: (20240513 - Julian) 如果沒有選擇 company 就不能使用
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
          disabled={!isSelectCompany} // Info: (20240513 - Julian) 如果沒有選擇 company 就不能使用
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
  ) : null;

  const displayedLogInBtn = signedIn ? (
    <div ref={userMenuRef}>
      <button onClick={avatarClickHandler}>
        {/* Info: avatar svg (20240408 - Shirley) */}

        <Image alt="avatar" src="/elements/avatar.png" width={40} height={40} className="my-auto" />
      </button>
      {displayedUserMenu}
    </div>
  ) : (
    <Link href={ISUNFA_ROUTE.LOGIN}>
      <Button className="h-40px bg-button-surface-strong-primary">
        <p className={cn('text-sm leading-6 tracking-normal text-button-text-primary-solid')}>
          Login
          {/* {t('login')} */}
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
              <div className="text-base font-medium leading-6 tracking-normal">Dashboard</div>
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
              <div className="text-base font-medium leading-6 tracking-normal">Contact us</div>
            </Link>
          </div>
        </div>
        {/* Info: icons on mobile are hidden (20240408 - Shirley) */}
        <div className="relative hidden space-x-8 text-button-text-secondary lg:flex">
          <button disabled={true} className="disabled:opacity-50">
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
          </button>
          <button disabled={true} className="disabled:opacity-50">
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
                d="M6.40674 2.73828C7.62572 1.51929 9.27902 0.834473 11.0029 0.834473C12.7268 0.834473 14.3801 1.51929 15.5991 2.73828C16.8181 3.95727 17.5029 5.61057 17.5029 7.33447C17.5029 9.98963 18.17 11.7445 18.8648 12.8611L18.8766 12.8801C19.2033 13.4052 19.4628 13.8222 19.6381 14.1263C19.7259 14.2787 19.8072 14.4277 19.8679 14.5613C19.8982 14.6281 19.9328 14.7114 19.9601 14.8028C19.9825 14.8782 20.0266 15.0432 20.0101 15.245C19.9995 15.3742 19.9727 15.6027 19.841 15.8397C19.7094 16.0767 19.5295 16.2202 19.4254 16.2974C19.179 16.4802 18.8981 16.5216 18.8084 16.5348L18.8031 16.5356C18.6634 16.5563 18.5065 16.5664 18.3509 16.5724C18.042 16.5845 17.6152 16.5845 17.0877 16.5845H17.0631H4.94271H4.91814C4.39062 16.5845 3.96386 16.5845 3.65492 16.5724C3.49932 16.5664 3.34242 16.5563 3.2028 16.5356L3.1975 16.5348C3.1078 16.5216 2.82689 16.4802 2.58046 16.2974C2.47634 16.2202 2.29647 16.0767 2.16481 15.8397C2.03315 15.6027 2.00637 15.3742 1.99581 15.245C1.9793 15.0432 2.02334 14.8782 2.0458 14.8028C2.07304 14.7114 2.10764 14.6281 2.13794 14.5613C2.19863 14.4277 2.27993 14.2787 2.36777 14.1263C2.54304 13.8222 2.80258 13.4051 3.12937 12.8799L3.14108 12.8611C3.83589 11.7445 4.50293 9.98963 4.50293 7.33447C4.50293 5.61057 5.18775 3.95726 6.40674 2.73828ZM11.0029 2.83447C9.80946 2.83447 8.66486 3.30858 7.82095 4.15249C6.97704 4.99641 6.50293 6.141 6.50293 7.33447C6.50293 10.3447 5.74084 12.4687 4.83917 13.9178C4.68028 14.1731 4.54302 14.3937 4.42593 14.584C4.57934 14.5844 4.75095 14.5845 4.94271 14.5845H17.0631C17.2549 14.5845 17.4265 14.5844 17.5799 14.584C17.4628 14.3937 17.3256 14.1731 17.1667 13.9178C16.265 12.4687 15.5029 10.3447 15.5029 7.33447C15.5029 6.141 15.0288 4.99641 14.1849 4.15249C13.341 3.30858 12.1964 2.83447 11.0029 2.83447ZM7.82785 18.5894C8.19332 18.1753 8.82526 18.1359 9.23933 18.5014C9.71002 18.9168 10.3259 19.1678 11.0029 19.1678C11.6799 19.1678 12.2958 18.9168 12.7665 18.5014C13.1806 18.1359 13.8125 18.1753 14.178 18.5894C14.5435 19.0035 14.5041 19.6354 14.09 20.0009C13.268 20.7264 12.1858 21.1678 11.0029 21.1678C9.82009 21.1678 8.73791 20.7264 7.91586 20.0009C7.50179 19.6354 7.46239 19.0035 7.82785 18.5894Z"
                fill="#001840"
              />
            </svg>
          </button>
          <button onClick={appMenuClickHandler}>
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

        <div className="my-auto">{displayedLogInBtn}</div>
      </div>
      {displayedBurgerMenu}
    </div>
  );
};

export default NavBar;
