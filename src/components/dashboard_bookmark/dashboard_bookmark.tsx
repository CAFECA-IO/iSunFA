import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/button/button';
import { useGlobalCtx } from '@/contexts/global_context';
import { useDashboardCtx } from '@/contexts/dashboard_context';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';
import { BOOKMARK_SCROLL_STEP } from '@/constants/config';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';

// Info: (2024708 - Anna) 定義BookmarkName名稱到翻譯鍵值的映射
interface BookmarkNameMap {
  [key: string]: string;
}

const bookmarkNameMap: BookmarkNameMap = {
  'Add New Contract': 'BOOKMARK_LIST.ADD_NEW_CONTRACT',
  'Add New Employees': 'BOOKMARK_LIST.ADD_NEW_EMPLOYEES',
  'Add New Payroll': 'BOOKMARK_LIST.ADD_NEW_PAYROLL',
  'Add New Journal': 'BOOKMARK_LIST.ADD_NEW_JOURNAL',
  'Camera Scanner': 'BOOKMARK_LIST.CAMERA_SCANNER',
  'Balance Sheet': 'BOOKMARK_LIST.BALANCE_SHEET',
  'Income Statement': 'BOOKMARK_LIST.INCOME_STATEMENT',
  'Cash Flow Statement': 'BOOKMARK_LIST.CASH_FLOW_STATEMENT',
  'Financial Performance': 'BOOKMARK_LIST.FINANCIAL_PERFORMANCE',
  'Cost Analysis': 'BOOKMARK_LIST.COST_ANALYSIS',
  'Hr Utilization': 'BOOKMARK_LIST.HR_UTILIZATION',
  'Forecast Report': 'BOOKMARK_LIST.FORECAST_REPORT',
};

const DashboardBookmark = () => {
  const { t } = useTranslation('common');
  const { addBookmarkModalVisibilityHandler } = useGlobalCtx();
  const { bookmarkList } = useDashboardCtx();
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

  const editBtnClickHandler = () => {
    addBookmarkModalVisibilityHandler();
  };

  const displayedBookmarkList = Object.entries(bookmarkList)
    .filter(([key]) => bookmarkList[key].added)
    .map(([key]) => {
      return (
        <Link href={bookmarkList[key].link}>
          <Button
            key={key}
            type="button"
            className={`flex justify-center gap-2 rounded-full border border-transparent bg-tertiaryBlue px-3 py-3 text-white hover:bg-tertiaryBlue2 lg:px-8 lg:py-2`}
          >
            <div className="my-auto flex items-center justify-center">
              {bookmarkList[key].iconOnSection}
            </div>
            <div className="hidden text-lg font-normal leading-7 tracking-normal lg:inline">
              {/* {bookmarkList[key].name} */}
              {t(bookmarkNameMap[bookmarkList[key].name])}
            </div>
          </Button>
        </Link>
      );
    });

  const displayedRemoveOrAddButton = (
    <div className="relative">
      <Button
        size={'medium'}
        variant={'tertiaryOutline'}
        onClick={editBtnClickHandler}
        className="my-auto flex flex-col justify-center rounded-full p-2 lg:p-4"
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
  );

  return (
    <div className="w-full rounded-full bg-white">
      <div className="flex flex-wrap items-center justify-between overflow-hidden rounded-full bg-surface-brand-primary-5 max-lg:flex-wrap">
        <div className="relative inline-flex h-16 flex-1 items-center overflow-hidden lg:h-24">
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
        <div className="rounded-r-full border-l border-stroke-neutral-quaternary bg-white p-20px lg:w-100px">
          {displayedRemoveOrAddButton}
        </div>
      </div>
    </div>
  );
};

export default DashboardBookmark;
