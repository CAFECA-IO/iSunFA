/* eslint-disable */
import Link from 'next/link';
import React from 'react';
import { ISUNFA_ROUTE } from '../../constants/config';
import { Button } from '../button/button';
import { cn } from '../../lib/utils/common';
import { useUser } from '../../contexts/user_context';
import Image from 'next/image';
import useOuterClick from '../../lib/hooks/use_outer_click';

const NavBar = () => {
  const { user, signOut } = useUser();

  // const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);

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
      console.error('signOut error:', error);
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
            Joyce
          </div>
          <div className="flex flex-col justify-center rounded-md p-2.5">
            <div className="flex items-center justify-center">
              <img
                src="https://cdn.builder.io/api/v1/image/assets/TEMP/81424e1f4bb6c5d2f3b559ea40f9f188932a4c8bd82176e3de86e8257c95ec6e?apiKey=0e17b0b875f041659e186639705112b1&"
                className="aspect-square w-4"
              />
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-col justify-center">
          <div className="flex flex-col justify-center">
            <div className="h-px shrink-0 border border-solid border-gray-300 bg-gray-300" />
          </div>
        </div>
        <div className="mt-3 flex gap-2 rounded-md px-6 py-2.5">
          <div className="my-auto flex items-center justify-center">
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/b2440bc7dff988603a015147398e81878220ce5264999f173e13e28a3f19ba26?apiKey=0e17b0b875f041659e186639705112b1&"
              className="aspect-square w-5"
            />
          </div>
          <div className="text-base font-medium leading-6 tracking-normal text-sky-950">
            Subscription & Bills
          </div>
        </div>
        <div className="mt-3 flex gap-2 rounded-md px-6 py-2.5">
          <div className="my-auto flex items-center justify-center">
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/d483779fe7b5d1853e7ad9a6a31acef6c171fae39e7875d3e3e346af17601c37?apiKey=0e17b0b875f041659e186639705112b1&"
              className="aspect-square w-5"
            />
          </div>
          <div className="text-base font-medium leading-6 tracking-normal text-sky-950">
            Setting
          </div>
        </div>
        <div className="mt-3 flex flex-col justify-center py-2.5">
          <div className="flex flex-col justify-center">
            <div className="h-px shrink-0 border border-solid border-gray-300 bg-gray-300" />
          </div>
        </div>
        <button
          type="button"
          onClick={logOutClickHandler}
          className="mt-3 flex w-full gap-2 rounded-md px-6 py-2.5 hover:opacity-70"
        >
          <div className="my-auto flex items-center justify-center">
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/ca0dfc144be43547f4337c7f445306d81e5d800962d761f417c4dcad926c5c8a?apiKey=0e17b0b875f041659e186639705112b1&"
              className="aspect-square w-5"
            />
          </div>
          <div className="text-base font-medium leading-6 tracking-normal text-secondaryBlue2">
            Logout
          </div>
        </button>
      </div>
    </div>
  ) : null;

  const displayedLogInBtn = user ? (
    <div ref={userMenuRef}>
      <button onClick={avatarClickHandler}>
        {/* Info: avatar svg (20240408 - Shirley) */}
        {/* <svg
          xmlns="http://www.w3.org/2000/svg"
          width="55"
          height="55"
          fill="none"
          viewBox="0 0 201 200"
        >
          <path
            fill="#CDD1D9"
            d="M.5 100C.5 44.772 45.272 0 100.5 0s100 44.772 100 100-44.772 100-100 100S.5 155.228.5 100z"
          ></path>
          <g clipPath="url(#clip0_13_13411)">
            <path
              fill="#7F8A9D"
              fillRule="evenodd"
              d="M100.5 68.013c-11.942 0-21.623 9.68-21.623 21.622 0 8.151 4.51 15.249 11.17 18.934a31.953 31.953 0 00-19.976 20.439 2.286 2.286 0 002.177 2.984h56.503a2.284 2.284 0 002.176-2.984 31.956 31.956 0 00-19.975-20.439c6.661-3.685 11.171-10.782 11.171-18.934 0-11.942-9.681-21.622-21.623-21.622z"
              clipRule="evenodd"
            ></path>
          </g>
          <defs>
            <clipPath id="clip0_13_13411">
              <path fill="#fff" d="M0 0H64V64H0z" transform="translate(68.5 68)"></path>
            </clipPath>
          </defs>
        </svg> */}

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
        {/* <Link href={ISUNFA_ROUTE.LANDING_PAGE} className="hover:cursor-pointer">
          <button>
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/79eb16f9c7866b8e853d6895f4b61e254cf0997890a7f98b21eaffb1f1a2e768?apiKey=0e17b0b875f041659e186639705112b1&"
              className="my-auto aspect-[5] w-[147px] max-w-full shrink-0"
            />
          </button>
        </Link> */}

        <Link href={ISUNFA_ROUTE.LANDING_PAGE}>
          <Image src="/logo/isunfa_logo_light.svg" width={150} height={30} alt="iSunFA_logo" />
        </Link>

        {/* TODO: links on mobile (20240408 - Shirley) */}
        <div className="my-auto hidden flex-1 gap-5 max-md:flex-wrap lg:flex lg:pr-20">
          <div className="flex justify-center gap-2 rounded-md px-6 py-2.5 max-md:px-5 lg:ml-10">
            <div className="my-auto flex items-center justify-center">
              <img
                src="https://cdn.builder.io/api/v1/image/assets/TEMP/d31529544b7dc38d8d030195243241524f2df1ac1d2b511f595847c2f5b6ea0f?apiKey=0e17b0b875f041659e186639705112b1&"
                className="aspect-square w-5"
              />
            </div>
            <div className="text-base font-medium leading-6 tracking-normal text-sky-950">
              Dashboard
            </div>
          </div>
          <div className="flex justify-center gap-2 rounded-md px-6 py-2.5 max-md:px-5">
            <div className="my-auto flex items-center justify-center">
              <img
                src="https://cdn.builder.io/api/v1/image/assets/TEMP/00785578cffc6d10414ae2447b0f22fb917caedb58d13d8cbd490b0e0829c798?apiKey=0e17b0b875f041659e186639705112b1&"
                className="aspect-square w-5"
              />
            </div>
            <div className="text-base font-medium leading-6 tracking-normal text-sky-950">
              Contact us
            </div>
          </div>
        </div>
      </div>
      {/* TODO: icons on mobile (20240408 - Shirley) */}
      <div className="hidden lg:flex">
        {' '}
        <img
          src="https://cdn.builder.io/api/v1/image/assets/TEMP/2877bbab5cccb7768a604540dd0cd835d42ae35e297c9ff8683f42d4f47d452d?apiKey=0e17b0b875f041659e186639705112b1&"
          className="aspect-[0.96] w-[54px] shrink-0"
        />
        <img
          src="https://cdn.builder.io/api/v1/image/assets/TEMP/647bd813d087045224639d423f9d557bee48cba56c3c1cf8b1b3ad253b6b8444?apiKey=0e17b0b875f041659e186639705112b1&"
          className="aspect-square w-14 shrink-0"
        />
        <img
          src="https://cdn.builder.io/api/v1/image/assets/TEMP/5ff6657b0681d98b7c58359e8d3861a8b640576f5b4bd6873fa523bdb17b1110?apiKey=0e17b0b875f041659e186639705112b1&"
          className="aspect-square w-14 shrink-0"
        />
      </div>

      <div className="flex flex-col items-start justify-center">
        <div className="h-14 shrink-0" />
      </div>

      <div className="my-auto"> {displayedLogInBtn}</div>
      {/* <div className="my-auto flex justify-center gap-2 rounded-md bg-amber-400 px-6 py-2.5 max-md:px-5">
          <div className="text-base font-medium leading-6 tracking-normal text-yellow-700">
            Login
          </div>
          <div className="my-auto flex items-center justify-center">
            <img
              
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/f7da9ae0cb7bd4d6c21e7d51cd1728937f71260ad3120a353c5bf91d4664141f?apiKey=0e17b0b875f041659e186639705112b1&"
              className="aspect-square w-5"
            />
          </div>
        </div> */}
    </div>
  );
};

export default NavBar;
