/* eslint-disable */
import React from 'react';
import { Button } from '../button/button';
import { BOOKMARK_LIST } from '../../constants/config';
import { useDashboard } from '../../contexts/dashboard_context';

interface IAddBookmarkModal {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

const AddBookmarkModal = ({ isModalVisible, modalVisibilityHandler }: IAddBookmarkModal) => {
  const { bookmarkList, bookmarkListHandler } = useDashboard();
  const addBtnClickHandler = () => {
    const bookmark = ['Contract', 'Employees', 'Accounting'];
    bookmarkListHandler('Contract');
  };

  const isDisplayedAddBookmarkModal = isModalVisible ? (
    <div className=" fixed inset-0 z-70 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative mx-auto flex flex-col items-center rounded-xl bg-white p-6 shadow-lg shadow-black/80 sm:w-400px sm:px-3">
        <div className="flex gap-2.5 bg-white px-8 py-4">
          <div className="flex flex-1 flex-col justify-center text-center">
            <div className="flex flex-col justify-center">
              <div className="justify-center self-center text-xl font-bold leading-8 text-slate-700">
                Add My Favorites
              </div>
              <div className="text-xs leading-5 tracking-normal text-slate-500">
                Select frequently used functions to be added to the favorites list.
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
            <div className="flex flex-col justify-center">
              <div className="flex gap-0 rounded-lg border border-solid border-slate-300 bg-white shadow-sm">
                <div className="h-11 w-px shrink-0 bg-slate-300" />
                <div className="flex flex-1 flex-col justify-center text-base font-medium leading-6 tracking-normal text-slate-500">
                  <div className="items-start justify-center px-3 py-2.5">
                    Please select functions{' '}
                  </div>
                </div>
                <div className="my-auto flex flex-col justify-center px-3 py-2.5">
                  <div className="flex items-center justify-center">
                    <img
                      loading="lazy"
                      src="https://cdn.builder.io/api/v1/image/assets/TEMP/572e02dcc6b9b487a917fb0aba7aae71712fa4990066c30acaa40cf61f01c018?apiKey=0e17b0b875f041659e186639705112b1&"
                      className="aspect-square w-5"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex w-full flex-col items-end justify-center whitespace-nowrap bg-white px-5 py-4 text-sm font-medium leading-5 tracking-normal">
          <div className="flex gap-3">
            <button
              onClick={modalVisibilityHandler}
              className="rounded-md px-4 py-2 text-secondaryBlue hover:text-primaryYellow"
            >
              Cancel
            </button>{' '}
            <Button variant={'tertiary'} onClick={addBtnClickHandler}>
              Add
            </Button>{' '}
          </div>
        </div>
      </div>
    </div>
  ) : null;
  return <>{isDisplayedAddBookmarkModal}</>;
};

export default AddBookmarkModal;
