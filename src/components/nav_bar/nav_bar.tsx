/* eslint-disable */
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { FaChevronRight, FaChevronLeft } from 'react-icons/fa';
import { FiLayout, FiMail, FiBell } from 'react-icons/fi';
import { TbGridDots } from 'react-icons/tb';
import { PiGlobe } from 'react-icons/pi';
import { Button } from '../button/button';
import { cn } from '../../lib/utils/common';
import { useUserCtx } from '../../contexts/user_context';
import Image from 'next/image';
import useOuterClick from '../../lib/hooks/use_outer_click';
import { ISUNFA_ROUTE } from '../../constants/url';
import { DEFAULT_DISPLAYED_USER_NAME } from '../../constants/display';
import version from '../../lib/version';

const NavBar = () => {
  const { credential: credential, signedIn, signOut, username } = useUserCtx();

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
    try {
      await signOut();
    } catch (error) {
      // Deprecated: dev (20240410 - Shirley)
      // eslint-disable-next-line no-console
      console.error('logOutClickHandler error:', error);
    }
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
      <Link
        href={''}
        className="flex w-full items-center gap-16px px-24px py-10px text-button-text-secondary hover:text-primaryYellow"
      >
        <Image src={'/icons/rocket.svg'} width={30} height={30} alt="rocket_icon" />
        <p>Project</p>
      </Link>
      <Link
        href={ISUNFA_ROUTE.ACCOUNTING}
        className="flex w-full items-center gap-16px px-24px py-10px text-button-text-secondary hover:text-primaryYellow"
      >
        <Image src={'/icons/calculator.svg'} width={30} height={30} alt="calculator_icon" />
        <p>Account</p>
      </Link>
      <Link
        href={''}
        className="flex w-full items-center gap-16px px-24px py-10px text-button-text-secondary hover:text-primaryYellow"
      >
        <Image src={'/icons/document.svg'} width={30} height={30} alt="document_icon" />
        <p>Contract</p>
      </Link>
      <Link
        href={ISUNFA_ROUTE.SALARY}
        className="flex w-full items-center gap-16px px-24px py-10px text-button-text-secondary hover:text-primaryYellow"
      >
        <Image src={'/icons/briefcase.svg'} width={30} height={30} alt="briefcase_icon" />
        <p>Salary</p>
      </Link>
      <Link
        href={ISUNFA_ROUTE.USERS_FINANCIAL_REPORTS}
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
      className={`absolute left-0 top-90px z-50 flex gap-16px lg:hidden ${isBurgerMenuOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-10 opacity-0'} w-full flex-col items-start bg-white px-16px py-30px text-base shadow-xl transition-all duration-300 ease-in-out`}
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
        type="button"
        className="flex w-full items-center gap-8px px-24px py-10px text-button-text-secondary hover:text-primaryYellow"
      >
        <div className="flex flex-1 items-center gap-8px">
          <FiBell size={20} />
          <p>Notification</p>
        </div>
        <FaChevronRight />
      </button>
      <button
        type="button"
        className="flex w-full items-center gap-8px px-24px py-10px text-button-text-secondary hover:text-primaryYellow"
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
      className={`absolute right-0 top-20 grid w-max grid-cols-3 grid-rows-2 ${isAppMenuOpen ? 'visible opacity-100' : 'invisible opacity-0'} gap-x-48px gap-y-32px rounded-3xl bg-white p-24px text-lg font-semibold text-navyBlue2 shadow-xl transition-all duration-300 ease-in-out`}
    >
      {/* Info: (20240416 - Julian) Project button */}
      <button className="flex flex-col items-center gap-8px">
        <Image src={'/icons/rocket.svg'} width={90} height={90} alt="rocket_icon" />
        <p>Project</p>
      </button>
      {/* Info: (20240416 - Julian) Account button */}
      <Link href={ISUNFA_ROUTE.ACCOUNTING}>
        <button className="flex flex-col items-center gap-8px">
          <Image src={'/icons/calculator.svg'} width={90} height={90} alt="calculator_icon" />
          <p>Account</p>
        </button>
      </Link>
      {/* Info: (20240416 - Julian) Contract button */}
      <button className="flex flex-col items-center gap-8px">
        <Image src={'/icons/document.svg'} width={90} height={90} alt="document_icon" />
        <p>Contract</p>
      </button>
      {/* Info: (20240416 - Julian) Salary button */}
      <Link href={ISUNFA_ROUTE.SALARY}>
        <button className="flex flex-col items-center gap-8px">
          <Image src={'/icons/briefcase.svg'} width={90} height={90} alt="briefcase_icon" />
          <p>Salary</p>
        </button>
      </Link>
      {/* Info: (20240416 - Julian) Report button */}
      <Link href={ISUNFA_ROUTE.USERS_FINANCIAL_REPORTS}>
        <button className="flex flex-col items-center gap-8px">
          <Image src={'/icons/report.svg'} width={90} height={90} alt="report_icon" />
          <p>Report</p>
        </button>
      </Link>
    </div>
  );

  const displayedUserMenu = isUserMenuOpen ? (
    <div className="absolute right-10 top-20 z-50">
      <div className="max-w-248px flex-col rounded-2xl bg-white p-4 shadow-xl">
        <img
          srcSet="https://cdn.builder.io/api/v1/image/assets/TEMP/a7d6ae28b20ae9f8039f351ff2014cd414f4bdb3f62c8e6e14e9d5a5c7a391cf?apiKey=0e17b0b875f041659e186639705112b1&width=100 100w, https://cdn.builder.io/api/v1/image/assets/TEMP/a7d6ae28b20ae9f8039f351ff2014cd414f4bdb3f62c8e6e14e9d5a5c7a391cf?apiKey=0e17b0b875f041659e186639705112b1&width=200 200w, https://cdn.builder.io/api/v1/image/assets/TEMP/a7d6ae28b20ae9f8039f351ff2014cd414f4bdb3f62c8e6e14e9d5a5c7a391cf?apiKey=0e17b0b875f041659e186639705112b1&width=400 400w, https://cdn.builder.io/api/v1/image/assets/TEMP/a7d6ae28b20ae9f8039f351ff2014cd414f4bdb3f62c8e6e14e9d5a5c7a391cf?apiKey=0e17b0b875f041659e186639705112b1&width=800 800w, https://cdn.builder.io/api/v1/image/assets/TEMP/a7d6ae28b20ae9f8039f351ff2014cd414f4bdb3f62c8e6e14e9d5a5c7a391cf?apiKey=0e17b0b875f041659e186639705112b1&width=1200 1200w, https://cdn.builder.io/api/v1/image/assets/TEMP/a7d6ae28b20ae9f8039f351ff2014cd414f4bdb3f62c8e6e14e9d5a5c7a391cf?apiKey=0e17b0b875f041659e186639705112b1&width=1600 1600w, https://cdn.builder.io/api/v1/image/assets/TEMP/a7d6ae28b20ae9f8039f351ff2014cd414f4bdb3f62c8e6e14e9d5a5c7a391cf?apiKey=0e17b0b875f041659e186639705112b1&width=2000 2000w, https://cdn.builder.io/api/v1/image/assets/TEMP/a7d6ae28b20ae9f8039f351ff2014cd414f4bdb3f62c8e6e14e9d5a5c7a391cf?apiKey=0e17b0b875f041659e186639705112b1&"
          className="mx-auto aspect-square w-16 self-center"
        />
        <div className="mt-3 flex justify-center gap-0 px-16">
          <div className="my-auto text-base font-semibold leading-6 tracking-normal text-button-text-secondary">
            {signedIn ? (!!username ? username : DEFAULT_DISPLAYED_USER_NAME) : ''}
          </div>
          <button className="flex shrink-0 flex-col justify-center rounded-xs p-2.5">
            <div className="flex items-center justify-center">
              <img
                src="https://cdn.builder.io/api/v1/image/assets/TEMP/81424e1f4bb6c5d2f3b559ea40f9f188932a4c8bd82176e3de86e8257c95ec6e?apiKey=0e17b0b875f041659e186639705112b1&"
                className="aspect-square w-4"
              />
            </div>
          </button>
        </div>
        <div className="mt-3 flex flex-col justify-center">
          <div className="flex flex-col justify-center">
            <div className="h-px shrink-0 border border-solid border-gray-300 bg-gray-300" />
          </div>
        </div>
        <button className="mt-3 flex gap-2 rounded-xs px-4 py-2.5">
          <div className="my-auto flex items-center justify-center">
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/b2440bc7dff988603a015147398e81878220ce5264999f173e13e28a3f19ba26?apiKey=0e17b0b875f041659e186639705112b1&"
              className="aspect-square w-5"
            />
          </div>
          <div className="text-base font-medium leading-6 tracking-normal text-button-text-secondary">
            Subscription & Bills
          </div>
        </button>
        <button className="mt-3 flex gap-2 rounded-xs px-4 py-2.5">
          <div className="my-auto flex items-center justify-center">
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/d483779fe7b5d1853e7ad9a6a31acef6c171fae39e7875d3e3e346af17601c37?apiKey=0e17b0b875f041659e186639705112b1&"
              className="aspect-square w-5"
            />
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
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/ca0dfc144be43547f4337c7f445306d81e5d800962d761f417c4dcad926c5c8a?apiKey=0e17b0b875f041659e186639705112b1&"
              className="aspect-square w-5"
            />
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
        <img
          srcSet="https://cdn.builder.io/api/v1/image/assets/TEMP/a7d6ae28b20ae9f8039f351ff2014cd414f4bdb3f62c8e6e14e9d5a5c7a391cf?apiKey=0e17b0b875f041659e186639705112b1&width=100 100w, https://cdn.builder.io/api/v1/image/assets/TEMP/a7d6ae28b20ae9f8039f351ff2014cd414f4bdb3f62c8e6e14e9d5a5c7a391cf?apiKey=0e17b0b875f041659e186639705112b1&width=200 200w, https://cdn.builder.io/api/v1/image/assets/TEMP/a7d6ae28b20ae9f8039f351ff2014cd414f4bdb3f62c8e6e14e9d5a5c7a391cf?apiKey=0e17b0b875f041659e186639705112b1&width=400 400w, https://cdn.builder.io/api/v1/image/assets/TEMP/a7d6ae28b20ae9f8039f351ff2014cd414f4bdb3f62c8e6e14e9d5a5c7a391cf?apiKey=0e17b0b875f041659e186639705112b1&width=800 800w, https://cdn.builder.io/api/v1/image/assets/TEMP/a7d6ae28b20ae9f8039f351ff2014cd414f4bdb3f62c8e6e14e9d5a5c7a391cf?apiKey=0e17b0b875f041659e186639705112b1&width=1200 1200w, https://cdn.builder.io/api/v1/image/assets/TEMP/a7d6ae28b20ae9f8039f351ff2014cd414f4bdb3f62c8e6e14e9d5a5c7a391cf?apiKey=0e17b0b875f041659e186639705112b1&width=1600 1600w, https://cdn.builder.io/api/v1/image/assets/TEMP/a7d6ae28b20ae9f8039f351ff2014cd414f4bdb3f62c8e6e14e9d5a5c7a391cf?apiKey=0e17b0b875f041659e186639705112b1&width=2000 2000w, https://cdn.builder.io/api/v1/image/assets/TEMP/a7d6ae28b20ae9f8039f351ff2014cd414f4bdb3f62c8e6e14e9d5a5c7a391cf?apiKey=0e17b0b875f041659e186639705112b1&"
          className="mx-auto aspect-square w-14 self-center"
        />
      </button>
      {displayedUserMenu}
    </div>
  ) : (
    <Link href={ISUNFA_ROUTE.LOGIN}>
      <Button className="bg-button-surface-strong-primary">
        <p className={cn('text-base leading-6 tracking-normal text-button-text-primary-solid')}>
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
      <div className="z-60 flex w-full gap-5 bg-surface-neutral-surface-lv1 px-10 py-3 shadow-navbar max-md:flex-wrap max-md:px-5">
        {/* Info: (20240417 - Julian) Burger menu */}
        <div className="my-auto block lg:hidden">
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

        <div className="my-auto flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center justify-center gap-2 lg:flex-row lg:items-end lg:justify-end">
            <Link href={ISUNFA_ROUTE.LANDING_PAGE}>
              {/* Info: (20240417 - Julian) Desktop logo */}
              <Image
                src="/logo/isunfa_logo_light.svg"
                width={150}
                height={30}
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
          <div className="my-auto hidden flex-1 gap-5 max-md:flex-wrap lg:flex lg:pr-20">
            <Link
              href={`${signedIn ? ISUNFA_ROUTE.DASHBOARD : ISUNFA_ROUTE.LOGIN}`}
              className="flex justify-center gap-2 rounded-xs px-6 py-2.5 text-button-text-secondary hover:text-primaryYellow max-md:px-5 lg:ml-10"
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
              className="flex justify-center gap-2 rounded-xs px-6 py-2.5 text-button-text-secondary hover:text-primaryYellow max-md:px-5"
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
          {' '}
          <button>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              fill="none"
              viewBox="0 0 32 32"
            >
              <g>
                <path
                  className="fill-current"
                  fill="none"
                  fillRule="evenodd"
                  d="M4.038 13.001a12.36 12.36 0 00-.367 3c0 1.035.127 2.04.367 3h5.904a21.398 21.398 0 01-.271-3.02c.02-1.004.112-2 .27-2.98H4.039zm.688-2h5.64a21.401 21.401 0 013.366-7.124A12.353 12.353 0 004.726 11zM16.004 4.2a19.4 19.4 0 00-3.564 6.802h7.128A19.4 19.4 0 0016.004 4.2zm4.033 8.802h-8.066a19.405 19.405 0 00-.3 3c.022 1.012.123 2.015.3 3h8.066c.177-.985.278-1.988.3-3a19.405 19.405 0 00-.3-3zm2.029 6a21.393 21.393 0 00.271-3.02 21.393 21.393 0 00-.271-2.98h5.904c.24.96.367 1.965.367 3s-.127 2.04-.367 3h-5.904zm-2.498 2H12.44a19.4 19.4 0 003.564 6.802A19.4 19.4 0 0019.568 21zm-5.836 7.125A21.401 21.401 0 0110.365 21H4.726a12.353 12.353 0 009.006 7.125zm4.544 0A21.403 21.403 0 0021.643 21h5.639a12.353 12.353 0 01-9.006 7.125zM27.282 11h-5.64a21.403 21.403 0 00-3.366-7.124A12.353 12.353 0 0127.282 11zm-25.611 5c0-7.916 6.417-14.333 14.333-14.333S30.337 8.085 30.337 16 23.92 30.334 16.004 30.334 1.67 23.917 1.67 16.001z"
                  clipRule="evenodd"
                ></path>
              </g>
            </svg>
          </button>
          <button>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              fill="none"
              viewBox="0 0 32 32"
            >
              <g>
                <path
                  className="fill-current"
                  fill="none"
                  fillRule="evenodd"
                  d="M9.64 4.304a9 9 0 0115.364 6.364c0 3.943.992 6.579 2.05 8.279l.011.019c.48.77.854 1.372 1.105 1.808.126.218.235.42.315.593.039.087.08.188.112.294a1.3 1.3 0 01.055.476 1.644 1.644 0 01-.19.681c-.144.26-.343.422-.478.522-.265.197-.579.244-.701.262-.179.026-.387.04-.609.049-.44.017-1.054.017-1.83.017H7.163c-.776 0-1.389 0-1.83-.017a5.859 5.859 0 01-.608-.05c-.122-.017-.436-.064-.701-.261a1.646 1.646 0 01-.478-.522 1.645 1.645 0 01-.19-.681 1.3 1.3 0 01.055-.476c.031-.106.073-.207.112-.294.08-.174.189-.375.314-.593a72.46 72.46 0 011.105-1.808l.012-.02c1.058-1.7 2.05-4.336 2.05-8.278A9 9 0 019.64 4.304zm6.364-.636a7 7 0 00-7 7c0 4.298-1.087 7.303-2.351 9.335a86.37 86.37 0 00-1.017 1.656c.38.009.887.009 1.553.009h17.63c.665 0 1.173 0 1.552-.01a86.131 86.131 0 00-1.016-1.655c-1.264-2.032-2.351-5.037-2.351-9.335a7 7 0 00-7-7zm11.01 17.951a.118.118 0 01.023-.005l-.022.005zM4.97 21.614c.001 0 .01.001.023.005a.108.108 0 01-.023-.005zm6.756 5.725a1 1 0 011.412-.088 4.313 4.313 0 002.866 1.083c1.1 0 2.101-.408 2.866-1.083a1 1 0 111.323 1.5 6.313 6.313 0 01-4.19 1.583 6.313 6.313 0 01-4.189-1.583 1 1 0 01-.088-1.412z"
                  clipRule="evenodd"
                ></path>
              </g>
            </svg>
          </button>
          <button onClick={appMenuClickHandler}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              fill="none"
              viewBox="0 0 32 32"
            >
              <g>
                <path
                  className="fill-current"
                  fill="none"
                  fillRule="evenodd"
                  d="M6.67 6.334a.333.333 0 100 .667.333.333 0 000-.667zm-2.333.334a2.333 2.333 0 114.667 0 2.333 2.333 0 01-4.667 0zm11.667-.334a.333.333 0 100 .667.333.333 0 000-.667zm-2.333.334a2.333 2.333 0 114.666 0 2.333 2.333 0 01-4.666 0zm11.666-.334a.333.333 0 100 .667.333.333 0 000-.667zm-2.333.334a2.333 2.333 0 114.667 0 2.333 2.333 0 01-4.667 0zm-16.333 9a.333.333 0 100 .666.333.333 0 000-.666zM4.337 16a2.333 2.333 0 114.667 0 2.333 2.333 0 01-4.667 0zm11.667-.333a.333.333 0 100 .666.333.333 0 000-.666zM13.67 16a2.333 2.333 0 114.666 0 2.333 2.333 0 01-4.666 0zm11.666-.333a.333.333 0 100 .666.333.333 0 000-.666zM23.004 16a2.333 2.333 0 114.666 0 2.333 2.333 0 01-4.666 0zm-16.333 9a.333.333 0 100 .667.333.333 0 000-.667zm-2.334.333a2.333 2.333 0 114.667 0 2.333 2.333 0 01-4.667 0zm11.667-.333a.333.333 0 100 .667.333.333 0 000-.667zm-2.333.333a2.333 2.333 0 114.666 0 2.333 2.333 0 01-4.666 0zm11.666-.333a.333.333 0 100 .667.333.333 0 000-.667zm-2.333.333a2.333 2.333 0 114.667 0 2.333 2.333 0 01-4.667 0z"
                  clipRule="evenodd"
                ></path>
              </g>
            </svg>
          </button>
          {displayedAppMenu}
        </div>

        <div className="hidden flex-col items-start justify-center lg:flex">
          <div className="h-14 shrink-0" />
        </div>

        <div className="my-auto">{displayedLogInBtn}</div>
      </div>
      {displayedBurgerMenu}
    </div>
  );
};

export default NavBar;
