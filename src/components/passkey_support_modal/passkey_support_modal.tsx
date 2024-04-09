/* eslint-disable */

import React from 'react';
import { Button } from '../button/button';

interface IPasskeySupportModal {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

const PasskeySupportModal = ({ isModalVisible, modalVisibilityHandler }: IPasskeySupportModal) => {
  const isDisplayedPasskeySupportModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative mx-auto flex flex-col items-start rounded-xl bg-white pb-6 pt-2 shadow-lg shadow-black/80 sm:w-400px sm:px-3">
        {/* <div className="flex max-w-[352px] flex-col rounded-2xl border border-gray-300 bg-white shadow-xl"> */}
        <div className="absolute right-3 top-3">
          <button onClick={modalVisibilityHandler} className="flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="30"
              height="30"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                fill="#314362"
                fillRule="evenodd"
                d="M6.296 6.294a1 1 0 011.414 0l4.293 4.293 4.293-4.293a1 1 0 111.414 1.414l-4.293 4.293 4.293 4.293a1 1 0 11-1.414 1.414l-4.293-4.293-4.293 4.293a1 1 0 01-1.414-1.414l4.293-4.293-4.293-4.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              ></path>
            </svg>
          </button>
        </div>
        <div className="mx-auto flex bg-white pb-4 pt-4">
          <div className="flex w-full flex-1 flex-col justify-between text-center text-xl font-bold text-slate-700">
            <div className="">Passkey support summary</div>
          </div>
        </div>
        <div className="flex w-full flex-col justify-center">
          <div className="flex items-center gap-1 px-5">
            <div className="flex items-center justify-center">
              <img
                loading="lazy"
                src="https://cdn.builder.io/api/v1/image/assets/TEMP/ee4af403cbb6082baadbb2e0c5aa581fcdf9d39fc8a6e87fa933509ed66e1240?apiKey=0e17b0b875f041659e186639705112b1&"
                className="aspect-square w-4"
                alt=""
              />
            </div>
            <div className="flex flex-1 flex-col justify-center text-xs text-slate-500">
              Android OS9 or later
            </div>
            <div className="flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="none"
                viewBox="0 0 16 16"
              >
                <g clipPath="url(#clip0_137_8118)">
                  <path
                    fill="#4BD394"
                    d="M6 10.78L3.687 8.467a.664.664 0 10-.94.94l2.786 2.786c.26.26.68.26.94 0l7.054-7.053a.664.664 0 10-.94-.94L6 10.78z"
                  ></path>
                </g>
                <defs>
                  <clipPath id="clip0_137_8118">
                    <path fill="#fff" d="M0 0H16V16H0z"></path>
                  </clipPath>
                </defs>
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 px-5">
            <div className="flex items-center justify-center">
              <img
                loading="lazy"
                src="https://cdn.builder.io/api/v1/image/assets/TEMP/a76bdf6789717d5c8a173c1830b6818ea5c0184110f6491b6bd966e1452c6167?apiKey=0e17b0b875f041659e186639705112b1&"
                className="aspect-square w-4"
                alt=""
              />
            </div>
            <div className="flex flex-1 flex-col justify-center text-xs text-slate-500">
              MacOS 13.5 or later
            </div>
            <div className="flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="none"
                viewBox="0 0 16 16"
              >
                <g clipPath="url(#clip0_137_8118)">
                  <path
                    fill="#4BD394"
                    d="M6 10.78L3.687 8.467a.664.664 0 10-.94.94l2.786 2.786c.26.26.68.26.94 0l7.054-7.053a.664.664 0 10-.94-.94L6 10.78z"
                  ></path>
                </g>
                <defs>
                  <clipPath id="clip0_137_8118">
                    <path fill="#fff" d="M0 0H16V16H0z"></path>
                  </clipPath>
                </defs>
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 px-5">
            <div className="flex items-center justify-center">
              <img
                loading="lazy"
                src="https://cdn.builder.io/api/v1/image/assets/TEMP/1b622d343745a1986a911bbb53cbdb13c1ef6ffc3a9161b8a5cb02d880537e4f?apiKey=0e17b0b875f041659e186639705112b1&"
                className="aspect-square w-4"
                alt=""
              />
            </div>
            <div className="flex flex-1 flex-col justify-center text-xs text-slate-500">
              iOS 16 & iPadOS 16 or later
            </div>
            <div className="flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="none"
                viewBox="0 0 16 16"
              >
                <g clipPath="url(#clip0_137_8118)">
                  <path
                    fill="#4BD394"
                    d="M6 10.78L3.687 8.467a.664.664 0 10-.94.94l2.786 2.786c.26.26.68.26.94 0l7.054-7.053a.664.664 0 10-.94-.94L6 10.78z"
                  ></path>
                </g>
                <defs>
                  <clipPath id="clip0_137_8118">
                    <path fill="#fff" d="M0 0H16V16H0z"></path>
                  </clipPath>
                </defs>
              </svg>
            </div>
          </div>
        </div>
        <div className="flex w-full items-center justify-center px-5 pb-0 pt-6 text-sm font-medium">
          <button
            type="button"
            onClick={modalVisibilityHandler}
            className="w-[89px] rounded-md  border border-navyBlue2 px-4 py-2 text-center text-navyBlue2 hover:border-primaryYellow hover:text-primaryYellow"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return <div>{isDisplayedPasskeySupportModal}</div>;
};

export default PasskeySupportModal;
