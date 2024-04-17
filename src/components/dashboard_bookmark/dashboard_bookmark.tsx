import React from 'react';
import useStateRef from 'react-usestateref';
import { Button } from '../button/button';
import { useGlobalCtx } from '../../contexts/global_context';
import { useDashboardCtx } from '../../contexts/dashboard_context';

const DashboardBookmark = () => {
  const { addBookmarkModalVisibilityHandler } = useGlobalCtx();
  const { bookmarkList, removeBookmark } = useDashboardCtx();
  const [tempSelectedList, setTempSelectedList] = useStateRef<string[]>([]);

  const buttonSelectedHandler = (name: string) => {
    bookmarkList[name].tempSelectedOnSection = !bookmarkList[name].tempSelectedOnSection;

    if (bookmarkList[name].tempSelectedOnSection) {
      setTempSelectedList((prev: string[]) => [...prev, name]);
    } else {
      setTempSelectedList((prev: string[]) => prev.filter((item: string) => item !== name));
    }
  };

  const removeBtnClickHandler = () => {
    Object.entries(bookmarkList).forEach(([key, value]) => {
      if (value.tempSelectedOnSection) {
        removeBookmark(key);
      }
    });
    setTempSelectedList([]);
  };

  const addBtnClickHandler = () => {
    addBookmarkModalVisibilityHandler();
    setTempSelectedList([]);
    Object.keys(bookmarkList).forEach((key: string) => {
      bookmarkList[key] = { ...bookmarkList[key], tempSelectedOnSection: false };
    });
  };

  const displayedBookmarkList = Object.entries(bookmarkList)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .filter(([key, value]) => value.added)
    .map(([key, value]) => {
      return (
        <Button
          key={key}
          onClick={() => buttonSelectedHandler(bookmarkList[key].name)}
          type="button"
          className={`${value.tempSelectedOnSection ? 'border-tertiaryBlue2 bg-lightGray3 text-secondaryBlue hover:bg-tertiaryBlue2/50' : 'border-transparent bg-tertiaryBlue text-white hover:bg-tertiaryBlue2'} flex justify-center gap-2 rounded-md border px-8 py-3.5 max-md:px-5`}
        >
          <div className="my-auto flex items-center justify-center">{bookmarkList[key].icon}</div>
          <div className="text-lg font-medium leading-7 tracking-normal">
            {bookmarkList[key].name}
          </div>
        </Button>
      );
    });

  const displayedRemoveOrAddButton =
    tempSelectedList.length > 0 ? (
      <Button
        onClick={removeBtnClickHandler}
        className={`${tempSelectedList.length > 0 ? `bg-tertiaryBlue text-white hover:bg-tertiaryBlue/80` : `bg-transparent hover:bg-tertiaryBlue hover:text-white`} my-auto flex flex-col justify-center rounded-md border border-solid border-tertiaryBlue p-4 text-tertiaryBlue`}
      >
        <div className="flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="none"
            viewBox="0 0 20 20"
          >
            <g clipPath="url(#clip0_340_150763)">
              <path
                fill="#FCFDFF"
                fillRule="evenodd"
                d="M9.306.918H10.7c.441 0 .817 0 1.126.025.324.026.64.084.941.238.455.232.825.602 1.056 1.056.154.302.212.617.239.942.024.296.025.654.025 1.072h3.416a.75.75 0 110 1.5h-.916v8.615c0 .673 0 1.224-.037 1.672-.038.463-.118.881-.317 1.272a3.25 3.25 0 01-1.42 1.42c-.391.2-.81.28-1.273.318-.448.036-.998.036-1.672.036H8.138c-.674 0-1.224 0-1.672-.036-.463-.038-.882-.119-1.272-.318a3.25 3.25 0 01-1.42-1.42c-.2-.39-.28-.81-.318-1.272-.037-.448-.037-.999-.037-1.672V5.75h-.917a.75.75 0 010-1.5H5.92c0-.418.001-.776.025-1.072.027-.325.085-.64.239-.942a2.417 2.417 0 011.056-1.056c.301-.154.617-.212.941-.238.309-.025.685-.025 1.126-.025zM6.67 5.75H4.92v8.583c0 .713 0 1.202.032 1.581.03.37.085.57.159.714.168.33.435.597.765.765l-.34.668.34-.668c.144.073.343.129.713.159.38.03.869.031 1.581.031h3.667c.712 0 1.201 0 1.58-.031.371-.03.57-.086.714-.16a1.75 1.75 0 00.765-.764c.073-.144.129-.343.16-.714.03-.379.03-.868.03-1.58V5.75H6.67zm5.917-1.5H7.419c0-.433.002-.724.02-.95.02-.232.052-.328.08-.383a.917.917 0 01.4-.4c.056-.028.152-.061.383-.08.24-.02.555-.02 1.034-.02h1.333c.48 0 .793 0 1.034.02.231.019.327.052.382.08a.917.917 0 01.4.4c.029.055.062.151.08.383.019.226.02.517.02.95zm-4.25 4.583a.75.75 0 01.75.75v4.167a.75.75 0 01-1.5 0V9.584a.75.75 0 01.75-.75zm3.333 0a.75.75 0 01.75.75v4.167a.75.75 0 01-1.5 0V9.584a.75.75 0 01.75-.75z"
                clipRule="evenodd"
              ></path>
            </g>
            <defs>
              <clipPath id="clip0_340_150763">
                <path fill="#fff" d="M0 0H20V20H0z"></path>
              </clipPath>
            </defs>
          </svg>
        </div>
      </Button>
    ) : (
      // {/* Info: add button (20240411 - Shirley) */}
      <Button
        onClick={addBtnClickHandler}
        className={`${tempSelectedList.length > 0 ? `bg-tertiaryBlue text-white hover:bg-tertiaryBlue/80` : `bg-transparent hover:bg-tertiaryBlue hover:text-white`} my-auto flex flex-col justify-center rounded-md border border-solid border-tertiaryBlue p-4 text-tertiaryBlue`}
      >
        <div className="flex items-center justify-center">
          {tempSelectedList.length > 0 ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              fill="none"
              viewBox="0 0 20 20"
            >
              <g clipPath="url(#clip0_340_150763)">
                <path
                  fill="#FCFDFF"
                  fillRule="evenodd"
                  d="M9.306.918H10.7c.441 0 .817 0 1.126.025.324.026.64.084.941.238.455.232.825.602 1.056 1.056.154.302.212.617.239.942.024.296.025.654.025 1.072h3.416a.75.75 0 110 1.5h-.916v8.615c0 .673 0 1.224-.037 1.672-.038.463-.118.881-.317 1.272a3.25 3.25 0 01-1.42 1.42c-.391.2-.81.28-1.273.318-.448.036-.998.036-1.672.036H8.138c-.674 0-1.224 0-1.672-.036-.463-.038-.882-.119-1.272-.318a3.25 3.25 0 01-1.42-1.42c-.2-.39-.28-.81-.318-1.272-.037-.448-.037-.999-.037-1.672V5.75h-.917a.75.75 0 010-1.5H5.92c0-.418.001-.776.025-1.072.027-.325.085-.64.239-.942a2.417 2.417 0 011.056-1.056c.301-.154.617-.212.941-.238.309-.025.685-.025 1.126-.025zM6.67 5.75H4.92v8.583c0 .713 0 1.202.032 1.581.03.37.085.57.159.714.168.33.435.597.765.765l-.34.668.34-.668c.144.073.343.129.713.159.38.03.869.031 1.581.031h3.667c.712 0 1.201 0 1.58-.031.371-.03.57-.086.714-.16a1.75 1.75 0 00.765-.764c.073-.144.129-.343.16-.714.03-.379.03-.868.03-1.58V5.75H6.67zm5.917-1.5H7.419c0-.433.002-.724.02-.95.02-.232.052-.328.08-.383a.917.917 0 01.4-.4c.056-.028.152-.061.383-.08.24-.02.555-.02 1.034-.02h1.333c.48 0 .793 0 1.034.02.231.019.327.052.382.08a.917.917 0 01.4.4c.029.055.062.151.08.383.019.226.02.517.02.95zm-4.25 4.583a.75.75 0 01.75.75v4.167a.75.75 0 01-1.5 0V9.584a.75.75 0 01.75-.75zm3.333 0a.75.75 0 01.75.75v4.167a.75.75 0 01-1.5 0V9.584a.75.75 0 01.75-.75z"
                  clipRule="evenodd"
                ></path>
              </g>
              <defs>
                <clipPath id="clip0_340_150763">
                  <path fill="#fff" d="M0 0H20V20H0z"></path>
                </clipPath>
              </defs>
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M10.0025 3.16776C10.5548 3.16776 11.0025 3.61547 11.0025 4.16776V9.00109H15.8359C16.3881 9.00109 16.8359 9.4488 16.8359 10.0011C16.8359 10.5534 16.3881 11.0011 15.8359 11.0011H11.0025V15.8344C11.0025 16.3867 10.5548 16.8344 10.0025 16.8344C9.45024 16.8344 9.00252 16.3867 9.00252 15.8344V11.0011H4.16919C3.6169 11.0011 3.16919 10.5534 3.16919 10.0011C3.16919 9.4488 3.6169 9.00109 4.16919 9.00109H9.00252V4.16776C9.00252 3.61547 9.45024 3.16776 10.0025 3.16776Z"
                className="fill-current"
              />
            </svg>
          )}
        </div>
      </Button>
    );

  return (
    <div>
      <div className="dashboardBookmarkShadow mt-12 flex w-full gap-5 rounded-3xl bg-white px-6 py-6 max-lg:flex-wrap max-md:mt-10 max-md:max-w-full max-md:px-5">
        <div className="flex flex-1 flex-wrap gap-5">{displayedBookmarkList}</div>
        {/* Info: remove or add button (20240411 - Shirley) */}
        {displayedRemoveOrAddButton}
      </div>
    </div>
  );
};

export default DashboardBookmark;
