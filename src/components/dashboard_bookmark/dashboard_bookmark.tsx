import { useRouter } from 'next/router';
import React, { useRef, useState, useEffect } from 'react';
import useStateRef from 'react-usestateref';
import { Button } from '@/components/button/button';
import { useGlobalCtx } from '@/contexts/global_context';
import { useDashboardCtx } from '@/contexts/dashboard_context';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';
import { BOOKMARK_SCROLL_STEP } from '@/constants/config';

const DashboardBookmark = () => {
  const router = useRouter();

  const { addBookmarkModalVisibilityHandler } = useGlobalCtx();
  const { bookmarkList, removeBookmark } = useDashboardCtx();
  const [tempSelectedList, setTempSelectedList] = useStateRef<string[]>([]);
  const [isEditing, setIsEditing] = useStateRef<boolean>(false);
  const [isAtScrollStart, setIsAtScrollStart] = useState(true);
  const [isAtScrollEnd, setIsAtScrollEnd] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const checkScrollPosition = () => {
    if (!containerRef.current) return;

    /* Info: (20240522 - Julian)
    `scroll.current.scrollWidth` 是整個 scroll bar 的寬度，元素的總滾動寬度，包括看不見的部分。
    `scroll.current.scrollLeft` 是目前捲軸的位置，當前元素的水平滾動偏移量，表示元素滾動條的左邊距離元素左邊的距離。改變這個值可以使元素水平滾動。
    `scroll.current.clientWidth` 個屬性表示元素內部可視區域的寬度，不包括滾動條、邊框和外邊距的寬度。
    */

    const isAtEnd =
      containerRef.current.scrollWidth - containerRef.current.scrollLeft <=
      containerRef.current.clientWidth;
    const isAtStart = containerRef.current.scrollLeft === 0;

    setIsAtScrollEnd(isAtEnd);
    setIsAtScrollStart(isAtStart);
  };

  const slide = (shift: number) => {
    if (containerRef.current) {
      containerRef.current.scrollLeft += shift;
      checkScrollPosition();
    }
  };

  useEffect(() => {
    // Info: 如果書籤不夠多，就不需要顯示往右滑的按鈕 (20240603 - Shirley)
    if (
      containerRef.current &&
      containerRef.current.scrollWidth - containerRef.current.scrollLeft <=
        containerRef.current.clientWidth
    ) {
      setIsAtScrollEnd(true);
    } else {
      setIsAtScrollEnd(false);
    }

    const handleScroll = () => {
      checkScrollPosition();
    };

    // Info: (20240522 - Julian) 複製一份當前的 containerRef.current，避免在 useEffect 的 cleanup function 執行後，containerRef.current 變成 null
    const currentContainerRef = containerRef.current;
    currentContainerRef?.addEventListener('scroll', handleScroll);

    return () => currentContainerRef?.removeEventListener('scroll', handleScroll);
  }, [bookmarkList]); // Info: 如果書籤不夠多，就不需要顯示往右滑的按鈕 (20240603 - Shirley)

  const slideLeft = () => slide(-BOOKMARK_SCROLL_STEP);
  const slideRight = () => slide(BOOKMARK_SCROLL_STEP);

  const buttonSelectedHandler = (name: string) => {
    if (!isEditing) {
      // 如果不在編輯模式，點選按鈕跳轉到其 link 頁面
      router.push(bookmarkList[name].link);
    } else {
      // 如果在編輯模式，切換按鈕的選中狀態
      bookmarkList[name].tempSelectedOnSection = !bookmarkList[name].tempSelectedOnSection;

      if (bookmarkList[name].tempSelectedOnSection) {
        setTempSelectedList((prev: string[]) => [...prev, name]);
      } else {
        setTempSelectedList((prev: string[]) => prev.filter((item: string) => item !== name));
      }
    }
  };

  const editBtnClickHandler = () => {
    setIsEditing(!isEditing);
  };

  const cancelEditBtnClickHandler = () => {
    setIsEditing(false);
    setTempSelectedList([]);
    Object.keys(bookmarkList).forEach((key: string) => {
      bookmarkList[key] = { ...bookmarkList[key], tempSelectedOnSection: false };
    });
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
          className={`flex justify-center gap-2 rounded-full border px-5 py-5 lg:px-8 lg:py-2 ${value.tempSelectedOnSection ? 'border-tertiaryBlue2 bg-lightGray3 text-secondaryBlue hover:bg-tertiaryBlue2/50' : 'border-transparent bg-tertiaryBlue text-white hover:bg-tertiaryBlue2'}`}
        >
          <div className="my-auto flex items-center justify-center">{bookmarkList[key].icon}</div>
          <div className="hidden text-lg font-medium leading-7 tracking-normal lg:inline">
            {bookmarkList[key].name}
          </div>
        </Button>
      );
    });

  const displayedRemoveOrAddButton = !isEditing ? (
    <div className="relative">
      <Button
        size={'medium'}
        variant={'tertiaryOutline'}
        onClick={editBtnClickHandler}
        className="my-auto flex flex-col justify-center rounded-full p-4"
      >
        {' '}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          fill="none"
          viewBox="0 0 20 20"
        >
          <path
            className="fill-current"
            fill="none"
            fillRule="evenodd"
            d="M14.889 1.554a2.518 2.518 0 113.56 3.56l-7.968 7.97-.047.046c-.242.243-.447.448-.692.598-.217.133-.452.23-.699.29-.28.067-.57.067-.912.066H6.669a.75.75 0 01-.75-.75V11.94v-.066c0-.343 0-.632.067-.912.06-.247.157-.483.29-.699.15-.246.355-.45.597-.692l.047-.047 7.969-7.969zm2.5 1.06a1.018 1.018 0 00-1.44 0l-7.968 7.97c-.314.313-.38.387-.427.462a.917.917 0 00-.11.265c-.02.085-.025.185-.025.628v.645h.646c.443 0 .542-.004.628-.025a.917.917 0 00.265-.11c.075-.046.148-.113.462-.426l7.969-7.969a1.018 1.018 0 000-1.44zm-11.751-.03h3.531a.75.75 0 110 1.5h-3.5c-.712 0-1.201.001-1.58.032-.371.03-.57.086-.714.16a1.75 1.75 0 00-.765.764c-.073.144-.129.343-.16.713-.03.38-.03.869-.03 1.581v7c0 .713 0 1.202.03 1.581.031.37.087.57.16.714.168.33.435.597.765.765.144.073.343.129.713.159.38.03.869.031 1.581.031h7c.713 0 1.202 0 1.581-.031.37-.03.57-.086.714-.16a1.75 1.75 0 00.764-.764c.074-.144.13-.343.16-.714.03-.379.031-.868.031-1.58v-3.5a.75.75 0 011.5 0v3.53c0 .674 0 1.225-.036 1.673-.038.463-.119.881-.318 1.272a3.25 3.25 0 01-1.42 1.42c-.391.2-.81.28-1.273.318-.447.036-.998.036-1.671.036H5.638c-.674 0-1.224 0-1.672-.036-.463-.038-.882-.119-1.272-.318a3.25 3.25 0 01-1.42-1.42c-.2-.39-.28-.81-.318-1.272-.037-.448-.037-.999-.037-1.672V7.303c0-.673 0-1.224.037-1.672.038-.463.118-.881.317-1.272a3.25 3.25 0 011.42-1.42c.391-.2.81-.28 1.273-.318.448-.037.998-.037 1.672-.037z"
            clipRule="evenodd"
          ></path>
        </svg>
      </Button>
    </div>
  ) : tempSelectedList.length > 0 ? (
    <div className="relative">
      <Button
        size={'medium'}
        onClick={removeBtnClickHandler}
        className={`my-auto flex flex-col justify-center rounded-full border border-solid border-tertiaryBlue bg-tertiaryBlue p-4 text-tertiaryBlue hover:bg-tertiaryBlue/80`}
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
      <Button
        onClick={cancelEditBtnClickHandler}
        className="absolute -right-2 -top-2 rounded-full bg-white px-1 py-1 text-icon-surface-single-color-primary shadow-revertBtn hover:bg-white hover:text-icon-surface-single-color-primary"
      >
        {' '}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="none"
          viewBox="0 0 16 16"
        >
          <path
            className="fill-current"
            fill="none"
            fillRule="evenodd"
            d="M5.437 3.073a.75.75 0 010 1.06L4.113 5.457h6.978a3.68 3.68 0 010 7.36h-2.93a.75.75 0 010-1.5h2.93a2.18 2.18 0 000-4.36H4.113l1.324 1.324a.75.75 0 01-1.061 1.06L1.772 6.739a.75.75 0 010-1.061l2.604-2.604a.75.75 0 011.06 0z"
            clipRule="evenodd"
          ></path>
        </svg>
      </Button>
    </div>
  ) : (
    // {/* Info: add button (20240411 - Shirley) */}
    <div className="relative">
      <Button
        size={'medium'}
        onClick={addBtnClickHandler}
        className={`my-auto flex flex-col justify-center rounded-full border border-solid border-tertiaryBlue bg-tertiaryBlue p-4 text-white hover:bg-tertiaryBlue/80`}
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
                className="fill-current"
                fill="none"
                fillRule="evenodd"
                d="M14.889 1.554a2.518 2.518 0 113.56 3.56l-7.968 7.97-.047.046c-.242.243-.447.448-.692.598-.217.133-.452.23-.699.29-.28.067-.57.067-.912.066H6.669a.75.75 0 01-.75-.75V11.94v-.066c0-.343 0-.632.067-.912.06-.247.157-.483.29-.699.15-.246.355-.45.597-.692l.047-.047 7.969-7.969zm2.5 1.06a1.018 1.018 0 00-1.44 0l-7.968 7.97c-.314.313-.38.387-.427.462a.917.917 0 00-.11.265c-.02.085-.025.185-.025.628v.645h.646c.443 0 .542-.004.628-.025a.917.917 0 00.265-.11c.075-.046.148-.113.462-.426l7.969-7.969a1.018 1.018 0 000-1.44zm-11.751-.03h3.531a.75.75 0 110 1.5h-3.5c-.712 0-1.201.001-1.58.032-.371.03-.57.086-.714.16a1.75 1.75 0 00-.765.764c-.073.144-.129.343-.16.713-.03.38-.03.869-.03 1.581v7c0 .713 0 1.202.03 1.581.031.37.087.57.16.714.168.33.435.597.765.765.144.073.343.129.713.159.38.03.869.031 1.581.031h7c.713 0 1.202 0 1.581-.031.37-.03.57-.086.714-.16a1.75 1.75 0 00.764-.764c.074-.144.13-.343.16-.714.03-.379.031-.868.031-1.58v-3.5a.75.75 0 011.5 0v3.53c0 .674 0 1.225-.036 1.673-.038.463-.119.881-.318 1.272a3.25 3.25 0 01-1.42 1.42c-.391.2-.81.28-1.273.318-.447.036-.998.036-1.671.036H5.638c-.674 0-1.224 0-1.672-.036-.463-.038-.882-.119-1.272-.318a3.25 3.25 0 01-1.42-1.42c-.2-.39-.28-.81-.318-1.272-.037-.448-.037-.999-.037-1.672V7.303c0-.673 0-1.224.037-1.672.038-.463.118-.881.317-1.272a3.25 3.25 0 011.42-1.42c.391-.2.81-.28 1.273-.318.448-.037.998-.037 1.672-.037z"
                clipRule="evenodd"
              ></path>
            </svg>
          )}
        </div>
      </Button>
      <Button
        onClick={cancelEditBtnClickHandler}
        className="absolute -right-2 -top-2 rounded-full bg-white px-1 py-1 text-icon-surface-single-color-primary shadow-revertBtn hover:bg-white hover:text-icon-surface-single-color-primary"
      >
        {' '}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="none"
          viewBox="0 0 16 16"
        >
          <path
            className="fill-current"
            fill="none"
            fillRule="evenodd"
            d="M5.437 3.073a.75.75 0 010 1.06L4.113 5.457h6.978a3.68 3.68 0 010 7.36h-2.93a.75.75 0 010-1.5h2.93a2.18 2.18 0 000-4.36H4.113l1.324 1.324a.75.75 0 01-1.061 1.06L1.772 6.739a.75.75 0 010-1.061l2.604-2.604a.75.75 0 011.06 0z"
            clipRule="evenodd"
          ></path>
        </svg>
      </Button>
    </div>
  );

  return (
    <div className="w-full rounded-full bg-white">
      <div className="flex flex-wrap items-center justify-between overflow-hidden rounded-full bg-surface-brand-primary-5 max-lg:flex-wrap">
        <div className="relative inline-flex h-20 flex-1 items-center overflow-hidden">
          <div
            ref={containerRef}
            className="inline-flex items-center gap-5 overflow-x-auto scroll-smooth px-20px py-14px"
          >
            {displayedBookmarkList}
          </div>
          {/* Info: (20240522 - Julian) scroll button */}
          <button
            type="button"
            onClick={slideLeft}
            disabled={isAtScrollStart}
            className="absolute left-20px rounded-full bg-surface-neutral-solid-light p-10px shadow-scrollBtn hover:text-primaryYellow disabled:hidden"
          >
            <FaChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={slideRight}
            disabled={isAtScrollEnd}
            className="absolute right-20px rounded-full bg-surface-neutral-solid-light p-10px shadow-scrollBtn hover:text-primaryYellow disabled:hidden"
          >
            <FaChevronRight size={16} />
          </button>
        </div>
        {/* Info: remove or add button (20240411 - Shirley) */}
        <div className="w-100px rounded-r-full border-l border-stroke-neutral-quaternary bg-white p-20px">
          {displayedRemoveOrAddButton}
        </div>
      </div>
    </div>
  );
};

export default DashboardBookmark;
