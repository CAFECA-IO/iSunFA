/* eslint-disable */
import React, { useContext, useEffect, useRef } from 'react';
import { RegisterFormModalProps } from '../../interfaces/modals';
import { UserContext, useUser } from '../../contexts/user_context';
import { Button } from '../button/button';
import { DEFAULT_DISPLAYED_USER_NAME } from '../../constants/display';

interface IRegisterFormModal {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

const RegisterFormModal = ({ isModalVisible, modalVisibilityHandler }: IRegisterFormModal) => {
  const { signUp } = useUser();
  const inputRef = useRef<HTMLInputElement>(null);

  const registerClickHandler = async () => {
    const name = inputRef.current?.value || DEFAULT_DISPLAYED_USER_NAME;
    signUp({ username: name });
    inputRef.current?.value && (inputRef.current.value = '');
    modalVisibilityHandler();
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [isModalVisible]);

  const isDisplayedRegisterModal = isModalVisible ? (
    <div className=" fixed inset-0 z-70 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative mx-auto flex flex-col items-center rounded-xl bg-white p-6 shadow-lg shadow-black/80 sm:w-400px sm:px-3">
        <div className="flex gap-2.5 bg-white py-4 pl-10 pr-5">
          <div className="flex flex-1 flex-col justify-center text-center">
            <div className="space-y-2 px-0">
              <div className="text-xl font-bold text-slate-700">Set User Name</div>
              <div className="text-xs text-lightGray4">
                This username will be applied to your device.
              </div>
            </div>
          </div>
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
          </div>{' '}
        </div>
        <div className="flex w-full flex-col justify-center bg-white px-5 py-2.5">
          <div className="flex flex-col justify-center">
            <div className="flex gap-0 rounded-lg border border-solid border-lightGray3 bg-white shadow-sm">
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
                  ref={inputRef}
                  type="text"
                  className="w-full bg-white px-3 py-2.5 text-base font-medium text-lightGray4 focus:outline-none"
                  placeholder="Username"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex w-full items-end justify-end bg-white px-5 py-4 text-sm font-medium">
          <div className="flex gap-3">
            {/* TODO: button component (20240409 - Shirley) */}
            <button
              onClick={modalVisibilityHandler}
              className="rounded-md px-4 py-2 text-secondaryBlue hover:text-primaryYellow"
            >
              Cancel
            </button>
            <Button variant={'tertiary'} onClick={registerClickHandler}>
              Register
            </Button>
          </div>
        </div>
      </div>
    </div>
  ) : null;
  return <div> {isDisplayedRegisterModal}</div>;
};

export default RegisterFormModal;
