/* eslint-disable */
import useStateRef from 'react-usestateref';
import React, { useEffect } from 'react';
import { Button } from '@/components/button/button';
import { useDashboardCtx } from '@/contexts/dashboard_context';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { useGlobalCtx } from '@/contexts/global_context';

interface IAddBookmarkModal {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

const AddBookmarkModal = ({ isModalVisible, modalVisibilityHandler }: IAddBookmarkModal) => {
  const { bookmarkList, addBookmarks, removeBookmark, addSelectedBookmarks } = useDashboardCtx();
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
    selectedBookmark.length > 0 ? `${selectedBookmark.length} selected` : 'Please select functions';

  useEffect(() => {
    const addedBookmark = Object.entries(bookmarkList)
      .filter(([key, value]) => value.added)
      .map(([key, value]) => key);

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
            className={`text-base transition-transform duration-300 lg:text-xl ${isMenuOpen ? '' : ''}`} // Info: be consistent with other dropdown menu, so remove `-rotate-180` (20240425 - Shirley)
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
      {/* Info: Bookmark Menu (20240425 - Shirley) */}
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
                    onClick={() => menuOptionClickHandler(bookmarkList[key].name)}
                    type="button"
                    className={`mt-1 flex gap-3 rounded-sm px-3 py-2 text-dropdown-text-primary hover:cursor-pointer disabled:cursor-not-allowed disabled:text-dropdown-text-primary disabled:opacity-50 disabled:hover:bg-white ${
                      !isMenuOpen
                        ? 'hidden'
                        : selectedBookmark.includes(key)
                          ? 'bg-primaryYellow/20'
                          : 'hover:text-text-brand-primary-lv2'
                    }`}
                  >
                    <div className="my-auto flex flex-col justify-center">
                      {bookmarkList[key].icon}
                    </div>
                    <p className="justify-center text-sm font-medium leading-5 tracking-normal">
                      {bookmarkList[key].name}
                    </p>
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
      <div className="relative mx-auto flex flex-col items-center rounded-lg bg-white p-6 shadow-lg shadow-black/80 sm:w-400px sm:px-3">
        <div className="flex gap-2.5 bg-white px-2 py-4">
          <div className="flex flex-1 flex-col justify-center text-center">
            <div className="flex flex-col justify-center">
              <div className="justify-center self-center text-xl font-bold leading-8 text-navyBlue2">
                Add My Favorites
              </div>
              <div className="text-xs leading-5 tracking-normal text-lightGray5">
                Select frequently used functions to be added to the favorites list.
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

  return <div className="font-barlow">{isDisplayedAddBookmarkModal}</div>;
};

export default AddBookmarkModal;
