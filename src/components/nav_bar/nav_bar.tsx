/* eslint-disable */
import Link from 'next/link';
import React from 'react';
import { ISUNFA_ROUTE } from '../../constants/config';
import { Button } from '../button/button';
import { cn } from '../../lib/utils/common';

const NavBar = () => {
  return (
    <div className="flex gap-5 bg-white px-20 py-3 shadow-xl shadow-black max-md:flex-wrap max-md:px-5">
      <div className="my-auto flex flex-1">
        <img
          loading="lazy"
          src="https://cdn.builder.io/api/v1/image/assets/TEMP/79eb16f9c7866b8e853d6895f4b61e254cf0997890a7f98b21eaffb1f1a2e768?apiKey=0e17b0b875f041659e186639705112b1&"
          className="my-auto aspect-[5] w-[147px] max-w-full shrink-0"
        />

        {/* TODO: links on mobile (20240408 - Shirley) */}
        <div className="my-auto hidden flex-1 gap-5 max-md:flex-wrap lg:flex lg:pr-20">
          <div className="flex justify-center gap-2 rounded-md px-6 py-2.5 max-md:px-5">
            <div className="my-auto flex items-center justify-center">
              <img
                loading="lazy"
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
                loading="lazy"
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
          loading="lazy"
          src="https://cdn.builder.io/api/v1/image/assets/TEMP/2877bbab5cccb7768a604540dd0cd835d42ae35e297c9ff8683f42d4f47d452d?apiKey=0e17b0b875f041659e186639705112b1&"
          className="aspect-[0.96] w-[54px] shrink-0"
        />
        <img
          loading="lazy"
          src="https://cdn.builder.io/api/v1/image/assets/TEMP/647bd813d087045224639d423f9d557bee48cba56c3c1cf8b1b3ad253b6b8444?apiKey=0e17b0b875f041659e186639705112b1&"
          className="aspect-square w-14 shrink-0"
        />
        <img
          loading="lazy"
          src="https://cdn.builder.io/api/v1/image/assets/TEMP/5ff6657b0681d98b7c58359e8d3861a8b640576f5b4bd6873fa523bdb17b1110?apiKey=0e17b0b875f041659e186639705112b1&"
          className="aspect-square w-14 shrink-0"
        />
      </div>

      <div className="flex flex-col items-start justify-center">
        <div className="h-14 shrink-0" />
      </div>

      <div className="my-auto">
        {' '}
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
      </div>
      {/* <div className="my-auto flex justify-center gap-2 rounded-md bg-amber-400 px-6 py-2.5 max-md:px-5">
          <div className="text-base font-medium leading-6 tracking-normal text-yellow-700">
            Login
          </div>
          <div className="my-auto flex items-center justify-center">
            <img
              loading="lazy"
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/f7da9ae0cb7bd4d6c21e7d51cd1728937f71260ad3120a353c5bf91d4664141f?apiKey=0e17b0b875f041659e186639705112b1&"
              className="aspect-square w-5"
            />
          </div>
        </div> */}
    </div>
  );
};

export default NavBar;
