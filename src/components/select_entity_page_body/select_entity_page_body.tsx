/* eslint-disable */
import Image from 'next/image';
import React from 'react';
import { Button } from '../button/button';
import { useUserCtx } from '../../contexts/user_context';
import { useGlobalCtx } from '../../contexts/global_context';
import { DEFAULT_DISPLAYED_USER_NAME } from '@/constants/display';

const SelectEntityPageBody = () => {
  const { signIn, signedIn, username } = useUserCtx();
  const { registerModalVisibilityHandler, passKeySupportModalVisibilityHandler } = useGlobalCtx();

  const userName = signedIn ? (!!username ? username : DEFAULT_DISPLAYED_USER_NAME) : '';

  const registerClickHandler = async () => {
    registerModalVisibilityHandler();
  };

  const showPassKeySupport = () => {
    passKeySupportModalVisibilityHandler();
  };

  const logInClickHandler = async () => {
    try {
      await signIn();
    } catch (error) {
      // Deprecated: dev (20240410 - Shirley)
      // eslint-disable-next-line no-console
      console.error('signIn error in loginClickHandler:', error);
      registerClickHandler();
    }
  };

  return (
    <div className="flex gap-x-5 max-lg:flex-col">
      {/* Info: (20240513 - Julian) graphic */}
      <div className="order-2 flex w-6/12 flex-col max-lg:ml-0 max-lg:w-full lg:order-1">
        <div className="pointer-events-none -mt-20px flex grow flex-col justify-start max-lg:max-w-full md:-mt-50px lg:-mt-65px">
          <div className="relative flex h-full w-full flex-col overflow-hidden py-0 max-lg:max-w-full">
            <img src="/elements/login_bg.svg" className="size-full object-cover" />
          </div>
        </div>
      </div>
      {/* Info: (20240513 - Julian) select entity part */}
      <div className="order-1 flex w-6/12 flex-col max-lg:ml-0 max-lg:w-full lg:order-2">
        <div className="mt-16 flex grow flex-col items-center justify-center pb-20 max-lg:mt-20 max-lg:max-w-full">
          {/* Info: (20240513 - Julian) title & description */}
          <div className="flex flex-col items-center justify-center self-stretch max-lg:max-w-full">
            <div className="text-48px font-bold text-tertiaryBlue max-lg:text-4xl">
              Welcome back, <span className="text-amber-400">{userName}</span>!
            </div>
            <div className="mt-2 w-220px text-center text-base font-medium leading-6 tracking-normal text-slate-600">
              Select your Entity to log in, or create your own Entity team.
            </div>
          </div>
          {/* Info: (20240513 - Julian) entity selection */}
          <div className="mt-10 flex max-w-full flex-col justify-center max-lg:mt-10">
            {/* Info: (20240513 - Julian) user avatar */}
            <div className="flex flex-col justify-center rounded-full max-lg:mx-2.5">
              <div className="flex aspect-square flex-col items-center justify-center px-16 max-lg:px-5">
                <div className="flex items-center justify-center max-lg:mx-2">
                  <Image
                    alt="avatar"
                    src="/elements/avatar.png"
                    width={200}
                    height={200}
                    className="mx-auto aspect-square w-200px self-center"
                  />
                </div>
              </div>
            </div>
            <div className="inline-flex flex-col items-start justify-start gap-2">
              <p className="self-stretch font-barlow text-sm font-semibold leading-tight tracking-tight text-slate-700">
                My Entity List
              </p>
              <div className="inline-flex items-center justify-start self-stretch rounded-lg border border-slate-300 bg-white shadow">
                <div className="flex h-[52px] shrink grow basis-0 items-center justify-center gap-2.5 px-4 py-3.5">
                  <div className="text-center font-['Barlow'] text-base font-medium leading-normal tracking-tight text-slate-500">
                    Select an Entity
                  </div>
                  <div className="inline-flex flex-col items-center justify-center">
                    <div className="relative h-4 w-4">
                      <img
                        className="absolute left-[2.75px] top-[5px] h-1.5 w-[10.50px]"
                        src="https://via.placeholder.com/10x6"
                      />
                    </div>
                  </div>
                </div>
                <div className="w-px self-stretch bg-slate-300" />
                <div className="flex items-center justify-start gap-2.5 px-4 py-3.5">
                  <div className="inline-flex flex-col items-center justify-center">
                    <div className="relative h-5 w-5">
                      <img
                        className="absolute left-[1.75px] top-[1.75px] h-[16.50px] w-[16.50px]"
                        src="https://via.placeholder.com/16x17"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="shrink justify-start gap-2 self-stretch text-right font-['Barlow'] text-sm font-medium leading-tight tracking-tight text-blue-600">
                Add Entity to list
              </div>
            </div>

            <Button
              variant={'tertiary'}
              onClick={logInClickHandler}
              className="mx-auto mt-0 flex max-w-[400px] justify-center gap-2 py-3.5"
            >
              <div className="text-lg font-medium leading-7 tracking-normal">
                Log in with Device
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="25"
                height="24"
                fill="none"
                viewBox="0 0 25 24"
              >
                <g>
                  <path
                    className="fill-current"
                    fill="none"
                    fillRule="evenodd"
                    d="M8.664 1.001h7.677c.528 0 .982 0 1.357.03.395.033.788.104 1.167.297a3 3 0 011.311 1.311c.193.379.264.772.296 1.167.031.375.03.83.03 1.357V18.84c0 .527.001.982-.03 1.356-.032.395-.103.789-.296 1.167a3 3 0 01-1.311 1.311c-.378.193-.772.264-1.167.297-.375.03-.83.03-1.357.03H8.665c-.527 0-.982 0-1.356-.03-.395-.033-.789-.104-1.167-.297a3 3 0 01-1.311-1.31c-.193-.38-.264-.773-.296-1.168a17.9 17.9 0 01-.031-1.356V5.163c0-.528 0-.982.03-1.357.033-.395.104-.788.297-1.167A3 3 0 016.14 1.33c.378-.194.772-.265 1.167-.297.374-.03.83-.03 1.356-.03zM7.471 3.025c-.272.022-.373.06-.422.085a1 1 0 00-.437.437c-.025.05-.063.15-.085.422-.023.283-.024.656-.024 1.232v13.6c0 .577 0 .949.024 1.232.022.272.06.373.085.422a1 1 0 00.437.437c.05.025.15.063.422.085.283.023.655.024 1.232.024h7.6c.576 0 .949 0 1.232-.024.272-.022.372-.06.422-.085a1 1 0 00.437-.437c.025-.05.063-.15.085-.422.023-.283.024-.655.024-1.232v-13.6c0-.576 0-.949-.024-1.232-.022-.272-.06-.372-.085-.422a1 1 0 00-.437-.437c-.05-.025-.15-.063-.422-.085-.283-.023-.655-.024-1.232-.024h-7.6c-.577 0-.949 0-1.232.024zm3.532 14.476a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z"
                    clipRule="evenodd"
                  ></path>
                </g>
              </svg>
            </Button>
            <button
              onClick={registerClickHandler}
              type="button"
              className="mt-10 flex max-w-full flex-col justify-center self-center text-base font-semibold leading-6 tracking-normal text-darkBlue hover:opacity-70"
            >
              <div className="justify-center rounded-sm">Register my Device</div>
            </button>
          </div>
          <button
            type="button"
            //onClick={showPassKeySupport}
            className="mt-10 flex justify-center gap-1 rounded-sm px-4 py-2 hover:opacity-70 max-lg:mt-10"
          >
            <div
              //onClick={showPassKeySupport}
              className="text-sm font-medium leading-5 tracking-normal text-secondaryBlue"
            >
              Try it out
            </div>
            <div className="my-auto flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="17"
                height="16"
                fill="none"
                viewBox="0 0 17 16"
              >
                <g>
                  <path
                    fill="#001840"
                    fillRule="evenodd"
                    d="M9.128 3.294a1 1 0 011.415 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.415-1.414l2.293-2.293H3.17a1 1 0 110-2h8.252L9.128 4.708a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  ></path>
                </g>
              </svg>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectEntityPageBody;
