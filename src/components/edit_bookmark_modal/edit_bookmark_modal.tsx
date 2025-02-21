import useStateRef from 'react-usestateref';
import React, { useEffect } from 'react';
import { Button } from '@/components/button/button';
import { useDashboardCtx } from '@/contexts/dashboard_context';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { useModalContext } from '@/contexts/modal_context';
import { useTranslation } from 'next-i18next';
// import logger from '@/lib/utils/logger';
import { IoIosArrowDown } from 'react-icons/io';
import { CiCircleCheck, CiCircleRemove, CiCirclePlus } from 'react-icons/ci';
import { FaXmark } from 'react-icons/fa6';

interface IAddBookmarkModal {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

// Info: (2024708 - Anna) 定義BookmarkName名稱到翻譯鍵值的映射
interface BookmarkNameMap {
  [key: string]: string;
}

const bookmarkNameMap: BookmarkNameMap = {
  'Add New Contract': 'alpha:BOOKMARK_LIST.ADD_NEW_CONTRACT',
  'Add New Employees': 'alpha:BOOKMARK_LIST.ADD_NEW_EMPLOYEES',
  'Add New Payroll': 'alpha:BOOKMARK_LIST.ADD_NEW_PAYROLL',
  'Add New Journal': 'alpha:BOOKMARK_LIST.ADD_NEW_JOURNAL',
  'Camera Scanner': 'alpha:BOOKMARK_LIST.CAMERA_SCANNER',
  'Balance Sheet': 'alpha:BOOKMARK_LIST.BALANCE_SHEET',
  'Income Statement': 'alpha:BOOKMARK_LIST.INCOME_STATEMENT',
  'Cash Flow Statement': 'alpha:BOOKMARK_LIST.CASH_FLOW_STATEMENT',
  'Financial Performance': 'alpha:BOOKMARK_LIST.FINANCIAL_PERFORMANCE',
  'Cost Analysis': 'alpha:BOOKMARK_LIST.COST_ANALYSIS',
  'HR Utilization': 'alpha:BOOKMARK_LIST.HR_UTILIZATION',
  'Forecast Report': 'alpha:BOOKMARK_LIST.FORECAST_REPORT',
};

const EditBookmarkModal = ({ isModalVisible, modalVisibilityHandler }: IAddBookmarkModal) => {
  const { t } = useTranslation('common');
  const { bookmarkList, addSelectedBookmarks } = useDashboardCtx();
  const { isAddBookmarkModalVisible, addBookmarkModalVisibilityHandler } = useModalContext();

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
      ? `${selectedBookmark.length} ${t('alpha:DASHBOARD.SELECTED')}`
      : t('alpha:EDIT_BOOKMARK_MODAL.PLEASE_SELECT_BOOKMARKS');

  useEffect(() => {
    const addedBookmark = Object.entries(bookmarkList)
      .filter(([, value]) => value.added)
      .map(([key]) => key);

    setSelectedBookmark(addedBookmark);
  }, [isAddBookmarkModalVisible]);

  const menuOptionClickHandler = (name: string) => {
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
        type="button"
        className={`flex items-center justify-between gap-0 rounded-sm border px-5 py-2.5 shadow-sm ${
          isMenuOpen ? 'border-input-stroke-selected' : 'border-dropdown-stroke-menu'
        }`}
        onClick={menuClickHandler}
      >
        <div className="flex-1 text-start text-base font-normal leading-6 tracking-normal text-input-text-input-filled">
          {dropdownMenu}
        </div>
        <div className="flex items-center justify-center text-base lg:text-xl">
          <div
            className={`text-base transition-transform duration-300 lg:text-xl ${isMenuOpen ? '' : ''}`} // Info: (20240425 - Shirley) be consistent with other dropdown menu, so remove `-rotate-180`
          >
            <IoIosArrowDown size={20} className="text-icon-surface-single-color-primary" />
          </div>
        </div>
      </button>
      {/* Info: (20240425 - Shirley) Bookmark Menu */}
      <div
        className={`absolute left-0 top-60px z-20 grid max-h-250px w-full overflow-hidden overflow-y-auto rounded-sm border bg-dropdown-surface-menu-background-primary pb-2 transition-all duration-300 ease-in-out ${
          isMenuOpen
            ? 'grid-rows-1 border-dropdown-stroke-menu shadow-xl'
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
                    className={`mb-1.5 flex items-center gap-3 rounded-sm px-1.5 py-2 text-dropdown-text-primary hover:cursor-pointer disabled:cursor-not-allowed disabled:text-dropdown-text-primary disabled:opacity-50 sm:px-2 ${
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
                      {t('alpha:EDIT_BOOKMARK_MODAL.LISTED')}{' '}
                    </div>

                    <div className="flex flex-1 items-center justify-end">
                      {!bookmarkList[key].added && selectedBookmarkRef.current.includes(key) ? (
                        <CiCircleCheck size={20} />
                      ) : selectedBookmarkRef.current.includes(key) ? (
                        <CiCircleRemove size={20} />
                      ) : (
                        <CiCirclePlus size={20} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex flex-col justify-center p-1">
              <div className="h-36 shrink-0 rounded-rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const isDisplayedAddBookmarkModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="relative mx-0 flex w-350px flex-col items-center rounded-md bg-card-surface-primary p-6 shadow-lg shadow-black/80 sm:w-400px sm:px-3">
        <div className="flex gap-2.5 px-2 py-4">
          <div className="flex flex-1 flex-col justify-center text-center">
            <div className="flex flex-col justify-center">
              <div className="justify-center self-center text-xl font-bold leading-8 text-card-text-primary">
                {t('alpha:EDIT_BOOKMARK_MODAL.EDIT_MY_FAVORITES')}{' '}
              </div>
              <div className="text-xs leading-5 tracking-normal text-card-text-secondary">
                {t('alpha:EDIT_BOOKMARK_MODAL.SELECT_A_BOOKMARK_TO_ADD_OR_REMOVE')}
              </div>
            </div>
          </div>
          <div className="absolute right-3 top-3">
            <button
              type="button"
              onClick={cancelBtnClickHandler}
              className="flex items-center justify-center"
            >
              <FaXmark size={30} className="text-icon-surface-single-color-primary" />
            </button>
          </div>
        </div>
        <div className="flex w-full flex-col justify-center px-5 py-2.5">
          <div className="flex flex-col justify-center">{displayedBookmarkMenu}</div>
        </div>
        <div className="flex w-full flex-col items-end justify-center whitespace-nowrap px-5 py-4 text-sm font-medium leading-5 tracking-normal">
          <div className="flex gap-3">
            <Button onClick={cancelBtnClickHandler} variant="tertiaryBorderless">
              {t('common:COMMON.CANCEL')}
            </Button>
            <Button variant={'tertiary'} onClick={addBtnClickHandler}>
              {t('alpha:EDIT_BOOKMARK_MODAL.SAVE')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return <div className="font-barlow">{isDisplayedAddBookmarkModal}</div>;
};

export default EditBookmarkModal;
