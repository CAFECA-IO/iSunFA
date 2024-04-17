/* eslint-disable */
import Link from 'next/link';
import React from 'react';
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

  const {
    targetRef: userMenuRef,
    componentVisible: isUserMenuOpen,
    setComponentVisible: setIsUserMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const avatarClickHandler = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

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

  const displayedUserMenu = isUserMenuOpen ? (
    <div className="absolute right-10 top-20 z-50">
      <div className="max-w-[248px] flex-col rounded-2xl bg-white p-4 shadow-xl">
        <img
          srcSet="https://cdn.builder.io/api/v1/image/assets/TEMP/a7d6ae28b20ae9f8039f351ff2014cd414f4bdb3f62c8e6e14e9d5a5c7a391cf?apiKey=0e17b0b875f041659e186639705112b1&width=100 100w, https://cdn.builder.io/api/v1/image/assets/TEMP/a7d6ae28b20ae9f8039f351ff2014cd414f4bdb3f62c8e6e14e9d5a5c7a391cf?apiKey=0e17b0b875f041659e186639705112b1&width=200 200w, https://cdn.builder.io/api/v1/image/assets/TEMP/a7d6ae28b20ae9f8039f351ff2014cd414f4bdb3f62c8e6e14e9d5a5c7a391cf?apiKey=0e17b0b875f041659e186639705112b1&width=400 400w, https://cdn.builder.io/api/v1/image/assets/TEMP/a7d6ae28b20ae9f8039f351ff2014cd414f4bdb3f62c8e6e14e9d5a5c7a391cf?apiKey=0e17b0b875f041659e186639705112b1&width=800 800w, https://cdn.builder.io/api/v1/image/assets/TEMP/a7d6ae28b20ae9f8039f351ff2014cd414f4bdb3f62c8e6e14e9d5a5c7a391cf?apiKey=0e17b0b875f041659e186639705112b1&width=1200 1200w, https://cdn.builder.io/api/v1/image/assets/TEMP/a7d6ae28b20ae9f8039f351ff2014cd414f4bdb3f62c8e6e14e9d5a5c7a391cf?apiKey=0e17b0b875f041659e186639705112b1&width=1600 1600w, https://cdn.builder.io/api/v1/image/assets/TEMP/a7d6ae28b20ae9f8039f351ff2014cd414f4bdb3f62c8e6e14e9d5a5c7a391cf?apiKey=0e17b0b875f041659e186639705112b1&width=2000 2000w, https://cdn.builder.io/api/v1/image/assets/TEMP/a7d6ae28b20ae9f8039f351ff2014cd414f4bdb3f62c8e6e14e9d5a5c7a391cf?apiKey=0e17b0b875f041659e186639705112b1&"
          className="mx-auto aspect-square w-16 self-center"
        />
        <div className="mt-3 flex justify-center gap-0 px-16">
          <div className="my-auto text-base font-semibold leading-6 tracking-normal text-secondaryBlue">
            {signedIn ? (!!username ? username : DEFAULT_DISPLAYED_USER_NAME) : ''}
          </div>
          <button className="flex shrink-0 flex-col justify-center rounded-md p-2.5">
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
        <button className="mt-3 flex gap-2 rounded-md px-4 py-2.5">
          <div className="my-auto flex items-center justify-center">
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/b2440bc7dff988603a015147398e81878220ce5264999f173e13e28a3f19ba26?apiKey=0e17b0b875f041659e186639705112b1&"
              className="aspect-square w-5"
            />
          </div>
          <div className="text-base font-medium leading-6 tracking-normal text-secondaryBlue">
            Subscription & Bills
          </div>
        </button>
        <button className="mt-3 flex gap-2 rounded-md px-4 py-2.5">
          <div className="my-auto flex items-center justify-center">
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/d483779fe7b5d1853e7ad9a6a31acef6c171fae39e7875d3e3e346af17601c37?apiKey=0e17b0b875f041659e186639705112b1&"
              className="aspect-square w-5"
            />
          </div>
          <div className="text-base font-medium leading-6 tracking-normal text-secondaryBlue">
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
          className="mt-3 flex w-full gap-2 rounded-md px-4 py-2.5 hover:opacity-70"
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
      <Button className="">
        <p className={cn('text-base leading-6 tracking-normal text-primaryYellow2')}>
          Login
          {/* {t('login')} */}
          {/* Info: arrow-right svg (20240408 - Shirley) */}
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
              className={cn(`fill-current`, `text-primaryYellow2`)}
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
    <div className="flex gap-5 bg-white px-20 py-3 drop-shadow-xl max-md:flex-wrap max-md:px-5">
      <div className="my-auto flex flex-1 items-center">
        <div className="flex items-end justify-end space-x-2">
          <Link href={ISUNFA_ROUTE.LANDING_PAGE} className="">
            <Image src="/logo/isunfa_logo_light.svg" width={150} height={30} alt="iSunFA_logo" />
          </Link>
          <div className="my-auto flex flex-col justify-center self-stretch rounded-md bg-primaryYellow3 px-1 text-primaryYellow2">
            <div className="flex flex-col justify-center rounded-sm px-0.1rem py-1">
              <div className="justify-center px-1 text-xs">V{version}</div>
            </div>
          </div>
        </div>

        {/* TODO: links on mobile is hidden for the sake of no design spec (20240408 - Shirley) */}
        <div className="my-auto hidden flex-1 gap-5 max-md:flex-wrap lg:flex lg:pr-20">
          <Link
            href={`${signedIn ? ISUNFA_ROUTE.DASHBOARD : ISUNFA_ROUTE.LOGIN}`}
            className="flex justify-center gap-2 rounded-md px-6 py-2.5 text-secondaryBlue hover:text-primaryYellow max-md:px-5 lg:ml-10"
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
            className="flex justify-center gap-2 rounded-md px-6 py-2.5 text-secondaryBlue hover:text-primaryYellow max-md:px-5"
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
      {/* TODO: icons on mobile (20240408 - Shirley) */}
      <div className="hidden lg:flex">
        {' '}
        <button>
          <img
            src="https://cdn.builder.io/api/v1/image/assets/TEMP/2877bbab5cccb7768a604540dd0cd835d42ae35e297c9ff8683f42d4f47d452d?apiKey=0e17b0b875f041659e186639705112b1&"
            className="aspect-[0.96] w-[54px] shrink-0"
          />
        </button>
        <button>
          <img
            src="https://cdn.builder.io/api/v1/image/assets/TEMP/647bd813d087045224639d423f9d557bee48cba56c3c1cf8b1b3ad253b6b8444?apiKey=0e17b0b875f041659e186639705112b1&"
            className="aspect-square w-14 shrink-0"
          />
        </button>
        <button>
          <img
            src="https://cdn.builder.io/api/v1/image/assets/TEMP/5ff6657b0681d98b7c58359e8d3861a8b640576f5b4bd6873fa523bdb17b1110?apiKey=0e17b0b875f041659e186639705112b1&"
            className="aspect-square w-14 shrink-0"
          />
        </button>
      </div>

      <div className="flex flex-col items-start justify-center">
        <div className="h-14 shrink-0" />
      </div>

      <div className="my-auto">{displayedLogInBtn}</div>
    </div>
  );
};

export default NavBar;
