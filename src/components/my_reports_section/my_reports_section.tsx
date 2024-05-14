import Image from 'next/image';
import React, { useState } from 'react';
import DatePicker, { DatePickerType } from '../date_picker/date_picker';
import { default30DayPeriodInSec } from '../../constants/display';
import useOuterClick from '../../lib/hooks/use_outer_click';
import {
  FIXED_DUMMY_GENERATED_REPORT_ITEMS,
  FIXED_DUMMY_PENDING_REPORT_ITEMS,
  IGeneratedReportItem,
  IPendingReportItem,
} from '../../interfaces/report_item';
import PendingReportList from '../pending_report_list/pending_report_list';
import { Button } from '../button/button';
import ReportsHistoryList from '../reports_history_list/reports_history_list';

enum SortingType {
  NEWEST = 'Newest',
  OLDEST = 'Oldest',
}

const MyReportsSection = () => {
  const [pendingPeriod, setPendingPeriod] = useState(default30DayPeriodInSec);
  const [searchPendingQuery, setSearchPendingQuery] = useState('');
  const [filteredPendingSort, setFilteredPendingSort] = useState<SortingType>(SortingType.NEWEST);
  const [isPendingSortSelected, setIsPendingSortSelected] = useState(false);
  // TODO: in dev (20240513 - Shirley)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [pendingDatePickerType, setPendingDatePickerType] = useState(DatePickerType.CHOOSE_PERIOD);

  const [historyPeriod, setHistoryPeriod] = useState(default30DayPeriodInSec);
  const [searchHistoryQuery, setSearchHistoryQuery] = useState('');
  const [filteredHistorySort, setFilteredHistorySort] = useState<SortingType>(SortingType.NEWEST);
  const [isHistorySortSelected, setIsHistorySortSelected] = useState(false);
  // TODO: in dev (20240513 - Shirley)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [historyDatePickerType, setHistoryDatePickerType] = useState(DatePickerType.CHOOSE_PERIOD);

  const [isCheckboxVisible, setIsCheckboxVisible] = useState(false);
  // TODO: in dev (20240514 - Shirley)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isAllPaused, setIsAllPaused] = useState(false);

  const isPendingDataLoading = false;
  const isHistoryDataLoading = false;
  const pendingData: IPendingReportItem[] = FIXED_DUMMY_PENDING_REPORT_ITEMS;
  const historyData: IGeneratedReportItem[] = FIXED_DUMMY_GENERATED_REPORT_ITEMS;

  const {
    targetRef: pendingSortMenuRef,
    componentVisible: isPendingSortMenuOpen,
    setComponentVisible: setIsPendingSortMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: historySortMenuRef,
    componentVisible: isHistorySortMenuOpen,
    setComponentVisible: setIsHistorySortMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const togglePendingSortMenu = () => {
    setIsPendingSortSelected(true);
    setIsPendingSortMenuOpen(!isPendingSortMenuOpen);
  };

  const toggleHistorySortMenu = () => {
    setIsHistorySortSelected(true);
    setIsHistorySortMenuOpen(!isHistorySortMenuOpen);
  };

  const pendingInputChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchPendingQuery(e.target.value);
  };

  const historyInputChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchHistoryQuery(e.target.value);
  };

  const toggleCheckboxVisibility = () => {
    setIsCheckboxVisible(!isCheckboxVisible);
  };

  const toggleAllPaused = () => {
    setIsAllPaused(!isAllPaused);
  };

  const pauseClickHandler = () => {
    toggleAllPaused();
    // TODO: LOCK and send paused request (20240514 - Shirley)
  };

  const resumeClickHandler = () => {
    toggleAllPaused();
    // TODO:LOCK and send resumed request (20240514 - Shirley)
  };

  const displayedPendingSortMenu = (
    <div
      ref={pendingSortMenuRef}
      onClick={togglePendingSortMenu}
      className={`group relative flex h-44px w-200px cursor-pointer ${isPendingSortMenuOpen ? 'border-primaryYellow text-primaryYellow' : ''} items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background p-10px hover:border-primaryYellow hover:text-primaryYellow`}
    >
      <p
        className={`whitespace-nowrap group-hover:text-primaryYellow ${isPendingSortMenuOpen ? ' text-primaryYellow' : isPendingSortSelected ? '' : 'text-input-text-input-placeholder'}`}
      >
        {filteredPendingSort}
      </p>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="none"
        viewBox="0 0 20 20"
      >
        <path
          className="fill-current"
          fillRule="evenodd"
          d="M4.472 6.972a.75.75 0 011.06 0l4.47 4.47 4.47-4.47a.75.75 0 011.06 1.06l-5 5a.75.75 0 01-1.06 0l-5-5a.75.75 0 010-1.06z"
          clipRule="evenodd"
        ></path>
      </svg>{' '}
      {/* Info: (20240513 - Shirley) Dropdown menu */}
      <div
        className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isPendingSortMenuOpen ? 'grid-rows-1 border-lightGray3' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-sm border transition-all duration-300 ease-in-out`}
      >
        <ul className="z-10 flex w-full flex-col items-start bg-white p-8px">
          {Object.values(SortingType).map((sorting: SortingType) => (
            <li
              key={sorting}
              onClick={() => {
                setFilteredPendingSort(sorting);
              }}
              className="w-full cursor-pointer px-3 py-2 text-navyBlue2 hover:text-primaryYellow"
            >
              {sorting}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const displayedPendingSearchBar = (
    <div className="relative flex-1">
      <input
        value={searchPendingQuery}
        onChange={pendingInputChangeHandler}
        type="text"
        placeholder="Search"
        className={`relative flex h-44px w-full min-w-200px items-center justify-between rounded-sm border border-lightGray3 bg-white p-10px outline-none`}
      />
      <div className="absolute right-3 top-3 hover:cursor-pointer">
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
            d="M9.17 3.252a5.917 5.917 0 104.109 10.173.754.754 0 01.147-.147A5.917 5.917 0 009.169 3.252zm5.747 10.604a7.417 7.417 0 10-1.06 1.06l3.115 3.116a.75.75 0 001.06-1.06l-3.115-3.116z"
            clipRule="evenodd"
          ></path>
        </svg>{' '}
      </div>
    </div>
  );

  const displayedPauseOrResumeButton = !isAllPaused ? (
    <Button onClick={pauseClickHandler} variant={'secondaryOutline'} className="px-2 py-2">
      {' '}
      {/* Info: Pause (20240513 - Shirley) */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="none"
        viewBox="0 0 16 16"
      >
        <path
          className="fill-current"
          fillRule="evenodd"
          d="M8.002 2.084a5.917 5.917 0 100 11.833 5.917 5.917 0 000-11.833zM.586 8.001a7.417 7.417 0 1114.833 0A7.417 7.417 0 01.586 8zm5.75-2.75a.75.75 0 01.75.75v4a.75.75 0 01-1.5 0V6a.75.75 0 01.75-.75zm3.333 0a.75.75 0 01.75.75v4a.75.75 0 01-1.5 0V6a.75.75 0 01.75-.75z"
          clipRule="evenodd"
        ></path>
      </svg>
    </Button>
  ) : (
    <Button onClick={resumeClickHandler} variant={'secondaryOutline'} className="px-2 py-2">
      {' '}
      {/* Info: Resume (20240514 - Shirley) */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="none"
        viewBox="0 0 16 16"
      >
        <path
          className="fill-current"
          fillRule="evenodd"
          d="M5.384 1.799l.026.017 7.01 4.674.024.016c.202.134.393.262.541.381.155.125.347.305.457.572.144.347.144.737 0 1.085-.11.267-.302.446-.457.571-.147.12-.339.247-.54.382l-.025.016-7.01 4.673-.026.018c-.247.164-.474.315-.667.42-.193.105-.471.232-.8.212a1.417 1.417 0 01-1.045-.56c-.198-.261-.246-.563-.267-.782-.02-.219-.02-.491-.02-.788V3.328v-.032c0-.296 0-.569.02-.787.02-.22.069-.521.267-.783.25-.33.632-.535 1.046-.56.328-.02.606.108.8.212.192.105.419.256.666.42zm-1.292.95c-.006.134-.007.315-.007.579v9.347c0 .264 0 .445.007.579.115-.07.266-.17.486-.316l7.01-4.673c.18-.12.3-.2.386-.264a11.602 11.602 0 00-.386-.263l-7.01-4.674a13.77 13.77 0 00-.486-.315z"
          clipRule="evenodd"
        ></path>
      </svg>
    </Button>
  );

  const displayedStatusButtons = (
    <div className="flex w-full items-center justify-end px-12">
      {isCheckboxVisible ? (
        <div className="flex space-x-5">
          {' '}
          {displayedPauseOrResumeButton}
          <Button variant={'secondaryOutline'} className="px-2 py-2">
            {' '}
            {/* Info: Delete (20240514 - Shirley) */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 16 16"
            >
              <path
                className="fill-current"
                fillRule="evenodd"
                d="M7.44.584H8.565c.349 0 .655 0 .908.02.269.023.543.072.81.207.391.2.71.518.91.91.135.266.184.54.206.81.017.206.02.448.02.72h2.584a.75.75 0 010 1.5h-.583v6.746c0 .535 0 .98-.03 1.345-.03.38-.098.736-.27 1.074a2.75 2.75 0 01-1.202 1.202c-.337.171-.694.239-1.073.27-.365.03-.81.03-1.345.03H6.506c-.535 0-.98 0-1.345-.03-.38-.031-.737-.099-1.074-.27a2.75 2.75 0 01-1.202-1.202l.65-.331-.65.33c-.172-.336-.239-.693-.27-1.073-.03-.364-.03-.81-.03-1.344V4.75h-.583a.75.75 0 110-1.5h2.584c0-.272.003-.514.02-.72.022-.27.071-.544.207-.81.2-.392.518-.71.91-.91.266-.135.54-.184.81-.206.252-.021.558-.021.908-.021zM5.337 4.751h-1.25v6.716c0 .573 0 .957.024 1.253.024.287.066.424.112.515.12.235.31.426.546.546l-.34.668.34-.668c.09.046.228.088.515.112.296.024.68.024 1.253.024h2.933c.572 0 .957 0 1.252-.024.287-.024.425-.066.515-.112a1.25 1.25 0 00.547-.546c.046-.09.088-.228.111-.515.024-.296.025-.68.025-1.253V4.751H5.336zm4.583-1.5H6.086c0-.265.003-.45.015-.598.015-.176.038-.231.048-.25a.583.583 0 01.255-.255c.02-.01.074-.034.25-.048.185-.015.43-.016.815-.016h1.067c.385 0 .63 0 .814.016.176.014.231.038.25.048.11.055.2.145.255.254.01.02.034.075.048.25.012.148.015.334.016.599zm-3.25 3.666a.75.75 0 01.75.75v3.334a.75.75 0 01-1.5 0V7.667a.75.75 0 01.75-.75zm2.667 0a.75.75 0 01.75.75v3.334a.75.75 0 11-1.5 0V7.667a.75.75 0 01.75-.75z"
                clipRule="evenodd"
              ></path>
            </svg>
          </Button>
        </div>
      ) : null}
      {/* Info: Select or Cancel (20240514 - Shirley) */}
      <Button onClick={toggleCheckboxVisibility} variant={'secondaryBorderless'}>
        {' '}
        {isCheckboxVisible ? (
          <p>Cancel</p>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 16 16"
            >
              <path
                className="fill-current"
                fillRule="evenodd"
                d="M5.172 1.252h5.497a.75.75 0 010 1.5H5.202c-.572 0-.956 0-1.252.025-.287.023-.425.065-.515.111a1.25 1.25 0 00-.547.546c-.046.091-.088.228-.111.515-.024.296-.025.68-.025 1.253v5.6c0 .572 0 .957.025 1.253.023.287.065.424.111.514.12.236.312.427.547.547.09.046.228.088.515.111.296.024.68.025 1.252.025h5.6c.573 0 .957 0 1.253-.025.287-.023.424-.065.515-.111a1.25 1.25 0 00.546-.547c.046-.09.088-.227.111-.514.025-.296.025-.68.025-1.253v-2.8a.75.75 0 011.5 0V10.832c0 .535 0 .98-.03 1.345-.03.38-.098.736-.27 1.073a2.75 2.75 0 01-1.201 1.202c-.338.172-.694.24-1.074.27-.364.03-.81.03-1.344.03H5.172c-.534 0-.98 0-1.344-.03-.38-.03-.737-.098-1.074-.27a2.75 2.75 0 01-1.202-1.202c-.172-.337-.239-.694-.27-1.073-.03-.365-.03-.81-.03-1.345v-5.66c0-.535 0-.98.03-1.345.031-.38.098-.736.27-1.074a2.75 2.75 0 011.202-1.201c.337-.172.694-.24 1.074-.27.364-.03.81-.03 1.344-.03zm10.027.886a.75.75 0 010 1.061L8.533 9.866a.75.75 0 01-1.061 0l-2-2a.75.75 0 111.06-1.061l1.47 1.47 6.136-6.137a.75.75 0 011.061 0z"
                clipRule="evenodd"
              ></path>
            </svg>
            <p>Select</p>
          </>
        )}
      </Button>
    </div>
  );

  const displayedPendingDataSection = isPendingDataLoading ? (
    <div>Loading...</div>
  ) : pendingData.length !== 0 ? (
    <div className="hideScrollbar overflow-x-scroll lg:mr-10">
      {' '}
      <PendingReportList reports={pendingData} isCheckboxVisible={isCheckboxVisible} />
    </div>
  ) : (
    // Info: empty icon section (20240513 - Shirley)
    <div className="mt-20 flex w-full items-center justify-center">
      {' '}
      <section className="flex flex-col items-center">
        <div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="49"
            height="27"
            viewBox="0 0 49 27"
            fill="none"
          >
            <path
              d="M13 17.4956L10 14.4956"
              stroke="#002462"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M3.0001 8.49571L3 8.49561"
              stroke="#002462"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M39 17.4956L46 10.4956"
              stroke="#002462"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M26 17.4956L26 2.49561"
              stroke="#002462"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
          >
            <path
              d="M44.5716 14.6387H3.42871V37.7815C3.42871 40.6218 5.73124 42.9244 8.57157 42.9244H39.4287C42.2689 42.9244 44.5716 40.6218 44.5716 37.7815V14.6387Z"
              fill="#002462"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M5.14286 0.0671387C2.30254 0.0671387 0 2.36966 0 5.21V10.3529C0 13.1932 2.30254 15.4957 5.14286 15.4957H42.8571C45.6974 15.4957 48 13.1932 48 10.3529V5.21C48 2.36966 45.6974 0.0671387 42.8571 0.0671387H5.14286ZM18.8571 23.6386C17.6737 23.6386 16.7143 24.5979 16.7143 25.7814C16.7143 26.9649 17.6737 27.9243 18.8571 27.9243H29.1429C30.3263 27.9243 31.2857 26.9649 31.2857 25.7814C31.2857 24.5979 30.3263 23.6386 29.1429 23.6386H18.8571Z"
              fill="#FFA502"
            />
          </svg>
        </div>
        <div className="text-h6 font-semibold leading-h6 text-text-neutral-tertiary">Empty</div>
      </section>
    </div>
  );

  const displayedHistorySortMenu = (
    <div
      ref={historySortMenuRef}
      onClick={toggleHistorySortMenu}
      className={`group relative flex h-44px w-200px cursor-pointer ${isHistorySortMenuOpen ? 'border-primaryYellow text-primaryYellow' : ''} items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background p-10px hover:border-primaryYellow hover:text-primaryYellow`}
    >
      <p
        className={`whitespace-nowrap group-hover:text-primaryYellow ${isHistorySortMenuOpen ? ' text-primaryYellow' : isHistorySortSelected ? '' : 'text-input-text-input-placeholder'}`}
      >
        {filteredHistorySort}
      </p>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="none"
        viewBox="0 0 20 20"
      >
        <path
          className="fill-current"
          fillRule="evenodd"
          d="M4.472 6.972a.75.75 0 011.06 0l4.47 4.47 4.47-4.47a.75.75 0 011.06 1.06l-5 5a.75.75 0 01-1.06 0l-5-5a.75.75 0 010-1.06z"
          clipRule="evenodd"
        ></path>
      </svg>{' '}
      {/* Info: (20240513 - Shirley) Dropdown menu */}
      <div
        className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isHistorySortMenuOpen ? 'grid-rows-1 border-lightGray3' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-sm border transition-all duration-300 ease-in-out`}
      >
        <ul className="z-10 flex w-full flex-col items-start bg-white p-8px">
          {Object.values(SortingType).map((sorting: SortingType) => (
            <li
              key={sorting}
              onClick={() => {
                setFilteredHistorySort(sorting);
              }}
              className="w-full cursor-pointer px-3 py-2 text-navyBlue2 hover:text-primaryYellow"
            >
              {sorting}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const displayedHistorySearchBar = (
    <div className="relative flex-1">
      <input
        value={searchHistoryQuery}
        onChange={historyInputChangeHandler}
        type="text"
        placeholder="Search"
        className={`relative flex h-44px w-full min-w-200px items-center justify-between rounded-sm border border-lightGray3 bg-white p-10px outline-none`}
      />
      <div className="absolute right-3 top-3 hover:cursor-pointer">
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
            d="M9.17 3.252a5.917 5.917 0 104.109 10.173.754.754 0 01.147-.147A5.917 5.917 0 009.169 3.252zm5.747 10.604a7.417 7.417 0 10-1.06 1.06l3.115 3.116a.75.75 0 001.06-1.06l-3.115-3.116z"
            clipRule="evenodd"
          ></path>
        </svg>{' '}
      </div>
    </div>
  );

  const displayedHistoryDataSection = isHistoryDataLoading ? (
    <div>Loading...</div>
  ) : historyData.length !== 0 ? (
    <ReportsHistoryList reports={historyData} isCheckboxVisible={false} />
  ) : (
    <div className="mt-20 flex w-full items-center justify-center">
      {' '}
      <section className="flex flex-col items-center">
        <div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="49"
            height="27"
            viewBox="0 0 49 27"
            fill="none"
          >
            <path
              d="M13 17.4956L10 14.4956"
              stroke="#002462"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M3.0001 8.49571L3 8.49561"
              stroke="#002462"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M39 17.4956L46 10.4956"
              stroke="#002462"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M26 17.4956L26 2.49561"
              stroke="#002462"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
          >
            <path
              d="M44.5716 14.6387H3.42871V37.7815C3.42871 40.6218 5.73124 42.9244 8.57157 42.9244H39.4287C42.2689 42.9244 44.5716 40.6218 44.5716 37.7815V14.6387Z"
              fill="#002462"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M5.14286 0.0671387C2.30254 0.0671387 0 2.36966 0 5.21V10.3529C0 13.1932 2.30254 15.4957 5.14286 15.4957H42.8571C45.6974 15.4957 48 13.1932 48 10.3529V5.21C48 2.36966 45.6974 0.0671387 42.8571 0.0671387H5.14286ZM18.8571 23.6386C17.6737 23.6386 16.7143 24.5979 16.7143 25.7814C16.7143 26.9649 17.6737 27.9243 18.8571 27.9243H29.1429C30.3263 27.9243 31.2857 26.9649 31.2857 25.7814C31.2857 24.5979 30.3263 23.6386 29.1429 23.6386H18.8571Z"
              fill="#FFA502"
            />
          </svg>
        </div>
        <div className="text-h6 font-semibold leading-h6 text-text-neutral-tertiary">Empty</div>
      </section>
    </div>
  );

  return (
    <div className="mt-20 flex w-full shrink-0 grow basis-0 flex-col bg-surface-neutral-main-background px-0 pb-0">
      <div className="flex gap-0 max-md:flex-wrap">
        <div className="flex w-fit shrink-0 grow basis-0 flex-col pb-5 pt-16 max-md:max-w-full">
          {/* Info: desktop heading (20240513 - Shirley) */}
          <div className="hidden flex-col justify-center text-4xl font-semibold leading-10 text-slate-500 max-md:max-w-full max-md:pr-5 md:flex">
            <div className="w-full justify-center px-10 md:px-28">My Reports</div>
          </div>
          {/* Info: mobile heading (20240513 - Shirley) */}
          <div className="flex w-600px max-w-full flex-1 md:hidden">
            <div className="mx-4 flex space-x-2">
              <div>
                <Image
                  src={'/icons/report.svg'}
                  width={30}
                  height={30}
                  alt="report_icon"
                  className="aspect-square shrink-0"
                />
              </div>
              <div className="mt-1.5">My Reports</div>
            </div>
          </div>

          <div className="mt-4 flex flex-1 flex-col justify-center px-6 py-2.5 max-md:max-w-full md:px-28">
            <div className="flex flex-col justify-center max-md:max-w-full">
              <div className="h-px shrink-0 border border-solid border-gray-300 bg-gray-300 max-md:max-w-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Info: ----- pending reports (20240513 - Shirley) ----- */}
      <div className="mx-10 mt-5 flex flex-col pl-20 pr-5 max-md:mt-10 max-md:max-w-full max-md:pl-5">
        <div className="flex flex-wrap items-end justify-between space-y-2 pr-14 max-md:pr-5 lg:space-x-5">
          <div className="flex flex-col space-y-2 self-stretch">
            <div className="text-sm font-semibold leading-5 tracking-normal text-slate-700">
              Sort by
            </div>
            {/* Info: sort menu (20240513 - Shirley) */}
            {displayedPendingSortMenu}
          </div>
          {/* Info: date picker (20240513 - Shirley) */}
          <DatePicker
            type={pendingDatePickerType}
            period={pendingPeriod}
            setFilteredPeriod={setPendingPeriod}
            className="w-250px"
          />{' '}
          {/* Info: Search bar (20240513 - Shirley) */}
          <div className="flex flex-1 flex-wrap justify-between gap-5 whitespace-nowrap">
            {displayedPendingSearchBar}
          </div>
        </div>

        <div className="mt-4 flex gap-4 py-2.5 max-md:max-w-full max-md:flex-wrap">
          <div className="flex items-center gap-2 text-center text-sm font-medium leading-5 tracking-normal text-slate-800">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 16 16"
            >
              <path
                fill="#002462"
                fillRule="evenodd"
                d="M1 1c0-.552.723-1 1.615-1h10.77C14.277 0 15 .448 15 1s-.723 1-1.615 1h-.386C12.96 4.422 11.255 6.432 9 6.898v.204c2.255.466 3.96 2.476 4 4.898h.385c.892 0 1.615.448 1.615 1s-.723 1-1.615 1H2.615C1.723 14 1 13.552 1 13s.723-1 1.615-1h.386C3.04 9.578 4.745 7.568 7 7.102v-.204C4.745 6.432 3.04 4.422 3 2h-.385C1.723 2 1 1.552 1 1z"
                clipRule="evenodd"
              ></path>
              <path
                fill="#FFA502"
                fillRule="evenodd"
                d="M8.4 5.982C10.421 5.8 12 4.251 12 2.367c0 0-.5-.867-2-.867-1 0-2 1-2 1s-1.127 1.016-2 1c-.898-.017-2-1.133-2-1.133C4 4.25 5.579 5.8 7.6 5.982v4.028C5.517 10.118 4 11.06 4 12h8c0-.94-1.517-1.882-3.6-1.99V5.982z"
                clipRule="evenodd"
              ></path>
            </svg>
            <div>Pending</div>
          </div>
          <div className="my-auto flex flex-1 flex-col justify-center max-md:max-w-full">
            <div className="mr-10 h-px shrink-0 border border-solid border-slate-800 bg-slate-800 max-md:max-w-full" />
          </div>
        </div>

        {displayedStatusButtons}

        {displayedPendingDataSection}
      </div>

      {/* Info: ----- reports history (20240513 - Shirley) ----- */}
      <div className="mx-10 mt-20 flex flex-col pl-20 pr-5 max-md:max-w-full max-md:pl-5 lg:mt-20">
        {/* <div className="mx-10 mt-5 flex flex-col pl-20 pr-5 max-md:mt-10 max-md:max-w-full max-md:pl-5"> */}
        <div className="flex flex-wrap items-end justify-between space-y-2 pr-14 max-md:pr-5 lg:space-x-5">
          <div className="flex flex-col space-y-2 self-stretch">
            <div className="text-sm font-semibold leading-5 tracking-normal text-slate-700">
              Sort by
            </div>
            {/* Info: sort menu (20240513 - Shirley) */}
            {displayedHistorySortMenu}
          </div>
          {/* Info: date picker (20240513 - Shirley) */}
          <DatePicker
            type={historyDatePickerType}
            period={historyPeriod}
            setFilteredPeriod={setHistoryPeriod}
            className="w-250px"
          />{' '}
          {/* Info: Search bar (20240513 - Shirley) */}
          <div className="flex flex-1 flex-wrap justify-between gap-5 whitespace-nowrap">
            {displayedHistorySearchBar}
          </div>
        </div>

        <div className="mt-4 flex gap-4 py-2.5 max-md:max-w-full max-md:flex-wrap">
          <div className="flex items-center gap-2 text-center text-sm font-medium leading-5 tracking-normal text-slate-800">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="16"
              fill="none"
              viewBox="0 0 14 16"
            >
              <path
                fill="#002462"
                d="M1.857 0A1.714 1.714 0 00.143 1.714v12.572A1.714 1.714 0 001.857 16h10.286a1.714 1.714 0 001.714-1.714V5.714a.571.571 0 00-.167-.404L8.547.167A.571.571 0 008.143 0H1.857z"
              ></path>
              <path
                fill="#FFA502"
                d="M13.857 5.714a.571.571 0 00-.167-.404L8.547.167A.571.571 0 008.143 0v5.143c0 .315.256.571.571.571h5.143z"
              ></path>
            </svg>
            <div>Reports History</div>
          </div>
          <div className="my-auto flex flex-1 flex-col justify-center max-md:max-w-full">
            <div className="mr-10 h-px shrink-0 border border-solid border-slate-800 bg-slate-800 max-md:max-w-full" />
          </div>
        </div>
        {displayedHistoryDataSection}
      </div>
    </div>
  );
};

export default MyReportsSection;
