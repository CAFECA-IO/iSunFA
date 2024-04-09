/* eslint-disable */

import React from 'react';

interface IPasskeySupportModal {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

const PasskeySupportModal = ({ isModalVisible, modalVisibilityHandler }: IPasskeySupportModal) => {
  const isDisplayedPasskeySupportModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black bg-opacity-50">
      <div className="flex max-w-[352px] flex-col rounded-2xl border border-gray-300 bg-white shadow-xl">
        <div className="flex gap-2.5 bg-white py-4 pl-10 pr-5">
          <div className="flex flex-1 flex-col justify-center text-center text-xl font-bold text-slate-700">
            <div className="px-3.5">Passkey support summary</div>
          </div>
          <button onClick={modalVisibilityHandler} className="flex items-center justify-center">
            <img
              loading="lazy"
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/4fce4ff5e15b6cf52ee1cb3918aba1d72e12ab841c50c9c9f8c5e336ecd106ec?apiKey=0e17b0b875f041659e186639705112b1&"
              className="aspect-square w-5"
              alt=""
            />
          </button>
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
              <img
                loading="lazy"
                src="https://cdn.builder.io/api/v1/image/assets/TEMP/0ebcdca3f6298e6d35d85104df95e7cdaa15173928b6c6c7f74b2cbddb5a33ba?apiKey=0e17b0b875f041659e186639705112b1&"
                className="aspect-square w-4"
                alt=""
              />
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
              <img
                loading="lazy"
                src="https://cdn.builder.io/api/v1/image/assets/TEMP/3bfdf25423278f783436170eaf25115030f66fe7ca20508749876dbe86f30f71?apiKey=0e17b0b875f041659e186639705112b1&"
                className="aspect-square w-4"
                alt=""
              />
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
              <img
                loading="lazy"
                src="https://cdn.builder.io/api/v1/image/assets/TEMP/8ebeb6ffff53214659b55f6ee1683804d7e05cbe0ffccf8e4827220f9f7cbd16?apiKey=0e17b0b875f041659e186639705112b1&"
                className="aspect-square w-4"
                alt=""
              />
            </div>
          </div>
        </div>
        <div className="flex w-full items-center justify-center px-5 py-4 text-sm font-medium text-sky-950">
          <div
            className="rounded-md border border-blue-950 px-4 py-2 text-center"
            style={{ width: '89px' }}
          >
            Got it!
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return <div>{isDisplayedPasskeySupportModal}</div>;
};

export default PasskeySupportModal;
