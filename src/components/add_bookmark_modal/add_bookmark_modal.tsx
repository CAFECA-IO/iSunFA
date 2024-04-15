/* eslint-disable */
import useStateRef from 'react-usestateref';
import React, { useEffect } from 'react';
import { Button } from '../button/button';
import { useDashboard } from '../../contexts/dashboard_context';
import useOuterClick from '../../lib/hooks/use_outer_click';
import { useGlobal } from '../../contexts/global_context';

interface IAddBookmarkModal {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

const AddBookmarkModal = ({ isModalVisible, modalVisibilityHandler }: IAddBookmarkModal) => {
  const { bookmarkList, addBookmarks } = useDashboard();
  const { isAddBookmarkModalVisible, addBookmarkModalVisibilityHandler } = useGlobal();

  const [selectedBookmark, setSelectedBookmark] = useStateRef<string[]>([]);

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
    setSelectedBookmark(prevSelected => {
      if (prevSelected.includes(name)) {
        return prevSelected.filter(item => item !== name);
      } else {
        return [...prevSelected, name];
      }
    });
  };

  const addBtnClickHandler = () => {
    addBookmarks(selectedBookmark);
    addBookmarkModalVisibilityHandler();
  };

  const cancelBtnClickHandler = () => {
    modalVisibilityHandler();
    setIsMenuOpen(false);
  };

  const menu = isMenuOpen ? (
    <div className="absolute top-44 max-h-[200px] w-[330px] flex-col overflow-y-auto rounded-xl border border-solid border-gray-300 bg-white pb-2 shadow-xl lg:max-h-[250px]">
      <div className="flex w-full flex-col pl-2 pt-2">
        <div className="z-10 flex items-start gap-0">
          <div className="flex w-full flex-col">
            {Object.entries(bookmarkList).map(([key, value]) => {
              return (
                <button
                  key={key}
                  onClick={() => menuOptionClickHandler(bookmarkList[key].name)}
                  type="button"
                  className={`${
                    selectedBookmark.includes(key) ? 'bg-tertiaryBlue2 text-white' : ''
                  } mt-1 flex gap-3 rounded-md px-3 py-2 text-navyBlue2 hover:bg-tertiaryBlue2 hover:bg-opacity-70 hover:text-white`}
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
            <div className="h-36 shrink-0 rounded-[999px] bg-gray-300" />
          </div>
        </div>
      </div>
    </div>
  ) : null;

  const isDisplayedAddBookmarkModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative mx-auto flex flex-col items-center rounded-xl bg-white p-6 shadow-lg shadow-black/80 sm:w-400px sm:px-3">
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
          <div className="flex flex-col justify-center">
            <div className="flex flex-col justify-center" ref={menuRef}>
              <div
                className={`${isMenuOpen ? 'border-lightGray' : 'border-lightGray'} flex gap-0 rounded-lg border border-solid bg-white shadow-sm hover:cursor-pointer`}
                onClick={menuClickHandler}
              >
                <div className="flex flex-1 flex-col justify-center text-base leading-6 tracking-normal text-lightGray5">
                  <p className="items-start justify-start px-5 py-2.5 text-start">{dropdownMenu}</p>
                </div>
                <div className="my-auto flex flex-col justify-center px-3 py-2.5">
                  <div className="flex items-center justify-center">
                    <div
                      className={`text-base transition-transform duration-500 lg:text-xl ${isMenuOpen ? '-rotate-180' : ''}`}
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
                </div>
              </div>

              {menu}
            </div>
          </div>
        </div>
        <div className="flex w-full flex-col items-end justify-center whitespace-nowrap bg-white px-5 py-4 text-sm font-medium leading-5 tracking-normal">
          <div className="flex gap-3">
            <button
              onClick={cancelBtnClickHandler}
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

  return <div className="font-barlow">{isDisplayedAddBookmarkModal}</div>;
};

export default AddBookmarkModal;
