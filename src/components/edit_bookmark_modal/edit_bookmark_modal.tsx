/* eslint-disable */
import useStateRef from 'react-usestateref';
import React, { useEffect } from 'react';
import { Button } from '@/components/button/button';
import { useDashboardCtx } from '@/contexts/dashboard_context';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { useGlobalCtx } from '@/contexts/global_context';
import { useTranslation } from 'next-i18next';

interface IAddBookmarkModal {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

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
  'HR Utilization': 'BOOKMARK_LIST.HR_UTILIZATION',
  'Forecast Report': 'BOOKMARK_LIST.FORECAST_REPORT',
};

const EditBookmarkModal = ({ isModalVisible, modalVisibilityHandler }: IAddBookmarkModal) => {
  const { t } = useTranslation('common');
  const { bookmarkList, addSelectedBookmarks } = useDashboardCtx();
  const { isAddBookmarkModalVisible, addBookmarkModalVisibilityHandler } = useGlobalCtx();

  const [selectedBookmark, setSelectedBookmark, selectedBookmarkRef] = useStateRef<string[]>([]);

  const {
    targetRef: menuRef,
    componentVisible: isMenuOpen,
    setComponentVisible: setIsMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const menuClickHandler = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const dropdownMenu =
    selectedBookmark.length > 0
      ? `${selectedBookmark.length} ${t('DASHBOARD.SELECTED')}`
      : t('EDIT_BOOKMARK_MODAL.PLEASE_SELECT_BOOKMARKS');

  useEffect(() => {
    const addedBookmark = Object.entries(bookmarkList)
      .filter(([key, value]) => value.added)
      .map(([key, value]) => key);

    setSelectedBookmark(addedBookmark);
  }, [isAddBookmarkModalVisible]);

  const menuOptionClickHandler = (name: string) => {
    console.log('selectedBookmark', selectedBookmarkRef.current);
    setSelectedBookmark((prevSelected) => {
      if (prevSelected.includes(name)) {
        return prevSelected.filter((item) => item !== name);
      } else {
        return [...prevSelected, name];
      }
    });
  };

  const addBtnClickHandler = () => {
    addSelectedBookmarks(selectedBookmarkRef.current);
    addBookmarkModalVisibilityHandler();
  };

  const cancelBtnClickHandler = () => {
    modalVisibilityHandler();
    setIsMenuOpen(false);
  };

  const displayedBookmarkMenu = (
    <div ref={menuRef} className="relative flex w-full flex-col justify-center">
      <button
        className={`flex items-center justify-between gap-0 rounded-sm border bg-white px-5 py-2.5 shadow-sm ${
          isMenuOpen ? 'border-input-stroke-selected' : 'border-dropdown-stroke-menu'
        }`}
        onClick={menuClickHandler}
      >
        <div className="flex-1 text-start text-base font-normal leading-6 tracking-normal text-tertiaryBlue">
          {dropdownMenu}
        </div>
        <div className="flex items-center justify-center text-base lg:text-xl">
          <div
            className={`text-base transition-transform duration-300 lg:text-xl ${isMenuOpen ? '' : ''}`} // Info: (20240425 - Shirley) be consistent with other dropdown menu, so remove `-rotate-180`
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              fill="none"
              viewBox="0 0 20 20"
            >
              <path
                fill="#314362"
                fillRule="evenodd"
                d="M4.472 6.97a.75.75 0 011.06 0l4.47 4.47 4.47-4.47a.75.75 0 011.06 1.061l-5 5a.75.75 0 01-1.06 0l-5-5a.75.75 0 010-1.06z"
                clipRule="evenodd"
              ></path>
            </svg>
          </div>
        </div>
      </button>
      {/* Info: (20240425 - Shirley) Bookmark Menu */}
      <div
        className={`grid-cols-0 absolute left-0 top-[3.5rem] z-20 grid max-h-[250px] w-full overflow-hidden overflow-y-auto rounded-sm border bg-white pb-2 transition-all duration-300 ease-in-out lg:max-h-[250px] ${
          isMenuOpen
            ? 'grid-rows-1 border-gray-300 shadow-xl'
            : 'pointer-events-none grid-rows-0 overflow-y-hidden border-transparent bg-transparent text-transparent'
        } transition-all duration-300 ease-in-out`}
      >
        <div className="flex w-full flex-col pl-2 pt-2">
          <div className="z-10 flex items-start gap-0">
            <div className="flex w-full flex-col">
              {Object.entries(bookmarkList).map(([key, value]) => {
                return (
                  <button
                    key={key}
                    disabled={value.link === ''}
                    onClick={() => menuOptionClickHandler(bookmarkList[key].id)}
                    type="button"
                    className={`mb-1.5 flex items-center gap-3 rounded-sm px-1.5 py-2 text-dropdown-text-primary hover:cursor-pointer disabled:cursor-not-allowed disabled:text-dropdown-text-primary disabled:opacity-50 disabled:hover:bg-white sm:px-2 ${
                      !isMenuOpen
                        ? 'hidden'
                        : selectedBookmark.includes(key)
                          ? 'bg-dropdown-surface-item-hover'
                          : 'hover:text-text-brand-primary-lv2'
                    }`}
                  >
                    <div className="my-auto flex flex-col justify-center">
                      {bookmarkList[key].iconOnModal}
                    </div>
                    <p className="items-center justify-center text-start text-xs sm:text-sm">
                      {t(bookmarkNameMap[bookmarkList[key].name])}
                    </p>

                    <div
                      className={`${bookmarkList[key].added ? 'flex' : 'hidden'} my-auto h-fit items-center justify-end rounded-xs bg-badge-surface-soft-primary px-2 py-0.1rem text-center text-xs text-badge-text-primary-solid`}
                    >
                      {t('EDIT_BOOKMARK_MODAL.LISTED')}{' '}
                    </div>

                    <div className="flex flex-1 items-center justify-end">
                      {!bookmarkList[key].added && selectedBookmarkRef.current.includes(key) ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          fill="none"
                          viewBox="0 0 20 20"
                        >
                          <g clipPath="url(#clip0_3542_64023)">
                            <path
                              stroke="#314362"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.5"
                              d="M6.25 10l2.5 2.5 5-5m4.583 2.5a8.333 8.333 0 11-16.666 0 8.333 8.333 0 0116.666 0z"
                            ></path>
                          </g>
                          <defs>
                            <clipPath id="clip0_3542_64023">
                              <path fill="#fff" d="M0 0H20V20H0z"></path>
                            </clipPath>
                          </defs>
                        </svg>
                      ) : selectedBookmarkRef.current.includes(key) ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          fill="none"
                          viewBox="0 0 20 20"
                        >
                          <g clipPath="url(#clip0_3542_38603)">
                            <path
                              className="stroke-current"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.5"
                              d="M12.5 7.5l-5 5m0-5l5 5m5.833-2.5a8.333 8.333 0 11-16.666 0 8.333 8.333 0 0116.666 0z"
                            ></path>
                          </g>
                          <defs>
                            <clipPath id="clip0_3542_38603">
                              <path fill="#fff" d="M0 0H20V20H0z"></path>
                            </clipPath>
                          </defs>
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          fill="none"
                          viewBox="0 0 20 20"
                        >
                          <g clipPath="url(#clip0_3542_71722)">
                            <path
                              className="stroke-current"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.5"
                              d="M10 6.667v6.666M6.667 10h6.666m5 0a8.333 8.333 0 11-16.666 0 8.333 8.333 0 0116.666 0z"
                            ></path>
                          </g>
                          <defs>
                            <clipPath id="clip0_3542_71722">
                              <path fill="#fff" d="M0 0H20V20H0z"></path>
                            </clipPath>
                          </defs>
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex flex-col justify-center p-1">
              <div className="h-36 shrink-0 rounded-rounded bg-gray-300" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const isDisplayedAddBookmarkModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative mx-0 flex w-350px flex-col items-center rounded-md bg-white p-6 shadow-lg shadow-black/80 sm:w-400px sm:px-3">
        <div className="flex gap-2.5 bg-white px-2 py-4">
          <div className="flex flex-1 flex-col justify-center text-center">
            <div className="flex flex-col justify-center">
              <div className="justify-center self-center text-xl font-bold leading-8 text-navyBlue2">
                {t('EDIT_BOOKMARK_MODAL.EDIT_MY_FAVORITES')}{' '}
              </div>
              <div className="text-xs leading-5 tracking-normal text-lightGray5">
                {t('EDIT_BOOKMARK_MODAL.SELECT_A_BOOKMARK_TO_ADD_OR_REMOVE')}{' '}
              </div>
            </div>
          </div>
          <div className="absolute right-3 top-3">
            <button onClick={cancelBtnClickHandler} className="flex items-center justify-center">
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
          <div className="flex flex-col justify-center">{displayedBookmarkMenu}</div>
        </div>
        <div className="flex w-full flex-col items-end justify-center whitespace-nowrap bg-white px-5 py-4 text-sm font-medium leading-5 tracking-normal">
          <div className="flex gap-3">
            <button
              onClick={cancelBtnClickHandler}
              className="rounded-sm px-4 py-2 text-secondaryBlue hover:text-primaryYellow"
            >
              {t('REPORTS_HISTORY_LIST.CANCEL')}
            </button>{' '}
            <Button variant={'tertiary'} onClick={addBtnClickHandler}>
              {t('EDIT_BOOKMARK_MODAL.SAVE')}
            </Button>{' '}
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return <div className="font-barlow">{isDisplayedAddBookmarkModal}</div>;
};

export default EditBookmarkModal;
