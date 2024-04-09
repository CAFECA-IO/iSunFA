/* eslint-disable */
import React from 'react';
import { RegisterFormModalProps } from '../../interfaces/modals';

interface IRegisterModal extends RegisterFormModalProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

const RegisterModal = ({ userName, isModalVisible, modalVisibilityHandler }: IRegisterModal) => {
  const isDisplayedRegisterModal = isModalVisible ? (
    <div className="flex max-w-[407px] flex-col rounded-2xl border border-solid border-gray-300 bg-white shadow-xl">
      <div className="flex gap-2.5 bg-white py-4 pl-10 pr-5">
        <div className="flex flex-1 flex-col justify-center text-center">
          <div className="flex flex-col justify-center px-10">
            <div className="justify-center self-center text-xl font-bold leading-8 text-slate-700">
              Set User Name
            </div>
            <div className="text-xs leading-5 tracking-normal text-slate-500">
              This username will be applied to your device.
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center self-start">
          <img
            loading="lazy"
            src="https://cdn.builder.io/api/v1/image/assets/TEMP/8c472f4cd495b3d7dd6410a53b02b3b97cc8c774cf65cf497085c4748208e204?apiKey=0e17b0b875f041659e186639705112b1&"
            className="aspect-square w-5"
          />
        </div>
      </div>
      <div className="flex w-full flex-col justify-center bg-white px-5 py-2.5">
        <div className="flex flex-col justify-center">
          <div className="flex flex-col justify-center">
            <div className="flex gap-0 rounded-lg border border-solid border-slate-300 bg-white shadow-sm">
              <div className="my-auto flex flex-col justify-center px-3 py-2.5">
                <div className="flex items-center justify-center">
                  <img
                    loading="lazy"
                    src="https://cdn.builder.io/api/v1/image/assets/TEMP/fa355a5dc37add21272bfcc4327b4f37821450f564be6f91f057dd6daa0b719a?apiKey=0e17b0b875f041659e186639705112b1&"
                    className="aspect-square w-4"
                  />
                </div>
              </div>
              <div className="flex flex-1 flex-col justify-center whitespace-nowrap text-base font-medium leading-6 tracking-normal text-slate-500">
                <div className="items-start justify-center px-3 py-2.5">Username</div>
              </div>
              <div className="h-11 w-px shrink-0 bg-slate-300" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex w-full flex-col items-end justify-center whitespace-nowrap bg-white px-5 py-4 text-sm font-medium leading-5 tracking-normal">
        <div className="flex gap-3">
          <div className="justify-center rounded-md px-4 py-2 text-sky-950">Cancel</div>
          <div className="justify-center rounded-md bg-slate-600 px-4 py-2 text-white">
            Register
          </div>
        </div>
      </div>
    </div>
  ) : null;
  return <div> {isDisplayedRegisterModal}</div>;
};

export default RegisterModal;
