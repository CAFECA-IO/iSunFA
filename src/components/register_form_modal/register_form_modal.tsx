/* eslint-disable */
import React from 'react';
import { RegisterFormModalProps } from '../../interfaces/modals';

interface IRegisterFormModal extends RegisterFormModalProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

const RegisterFormModal = ({
  userName,
  isModalVisible,
  modalVisibilityHandler,
}: IRegisterFormModal) => {
  const isDisplayedRegisterModal = isModalVisible ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      {/* <div className="relative mx-auto flex flex-col rounded-xl bg-white shadow-lg"> */}
      <div className="relative mx-auto flex flex-col items-center rounded-xl bg-white p-6 shadow-lg shadow-black/80 sm:w-400px sm:px-3">
        <div className="flex gap-2.5 bg-white py-4 pl-10 pr-5">
          <div className="flex flex-1 flex-col justify-center text-center">
            <div className="px-10">
              <div className="text-xl font-bold text-slate-700">Set User Name</div>
              <div className="text-xs text-slate-500">
                This username will be applied to your device.
              </div>
            </div>
          </div>
          <button onClick={modalVisibilityHandler} className="flex items-center justify-center">
            <img
              loading="lazy"
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/8c472f4cd495b3d7dd6410a53b02b3b97cc8c774cf65cf497085c4748208e204?apiKey=0e17b0b875f041659e186639705112b1&"
              className="aspect-square w-5"
              alt=""
            />
          </button>
        </div>
        <div className="flex w-full flex-col justify-center bg-white px-5 py-2.5">
          <div className="flex flex-col justify-center">
            {/* <div className="flex gap-0 rounded-lg border border-solid border-slate-300 bg-white shadow-sm">
              <div className="flex items-center justify-center px-3 py-2.5">
                <img
                  loading="lazy"
                  src="https://cdn.builder.io/api/v1/image/assets/TEMP/fa355a5dc37add21272bfcc4327b4f37821450f564be6f91f057dd6daa0b719a?apiKey=0e17b0b875f041659e186639705112b1&"
                  className="aspect-square w-4"
                  alt=""
                />
              </div>
              <div className="flex flex-1 flex-col justify-center text-base font-medium text-slate-500">
                <div className="px-3 py-2.5">Username</div>
              </div>
              <div className="h-11 w-px bg-slate-300" />
            </div> */}

            <div className="flex gap-0 rounded-lg border border-solid border-slate-300 bg-white shadow-sm">
              <div className="flex items-center justify-center px-3 py-2.5">
                <img
                  loading="lazy"
                  src="https://cdn.builder.io/api/v1/image/assets/TEMP/fa355a5dc37add21272bfcc4327b4f37821450f564be6f91f057dd6daa0b719a?apiKey=0e17b0b875f041659e186639705112b1&"
                  className="aspect-square w-4"
                  alt="Username icon"
                />
              </div>
              <div className="flex flex-1">
                <input
                  type="text"
                  className="w-full bg-white px-3 py-2.5 text-base font-medium text-slate-500 focus:outline-none"
                  placeholder="Username"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex w-full items-end justify-end bg-white px-5 py-4 text-sm font-medium text-sky-950">
          <div className="flex gap-3">
            <button onClick={modalVisibilityHandler} className="rounded-md px-4 py-2">
              Cancel
            </button>
            <button className="rounded-md bg-slate-600 px-4 py-2 text-white">Register</button>
          </div>
        </div>
      </div>
    </div>
  ) : null;
  return <div> {isDisplayedRegisterModal}</div>;
};

export default RegisterFormModal;
