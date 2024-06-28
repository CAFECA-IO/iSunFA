import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import {
  SortOptions,
  DEFAULT_DISPLAYED_COMPANY_ID,
  default30DayPeriodInSec,
} from '@/constants/display';
import useOuterClick from '@/lib/hooks/use_outer_click';
import {
  FIXED_DUMMY_GENERATED_REPORT_ITEMS,
  FIXED_DUMMY_PENDING_REPORT_ITEMS,
  IGeneratedReportItem,
  IPendingReportItem,
} from '@/interfaces/report_item';
import PendingReportList from '@/components/pending_report_list/pending_report_list';
import ReportsHistoryList from '@/components/reports_history_list/reports_history_list';
import Pagination from '@/components/pagination/pagination';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useGlobalCtx } from '@/contexts/global_context';
import { ToastType } from '@/interfaces/toastify';
import { Button } from '@/components/button/button';
import { useUserCtx } from '@/contexts/user_context';
import { FilterOptionsModalType } from '@/interfaces/modals';
import { useTranslation } from 'next-i18next';

const MyReportsSection = () => {
  const { t } = useTranslation('common');
  const { selectedCompany } = useUserCtx();
  // TODO: 區分 pending 跟 history 兩種 filter options (20240528 - Shirley)
  // TODO: filterOptionsGotFromModal for API queries in mobile devices (20240528 - Shirley)
  // eslint-disable-next-line no-unused-vars
  const {
    toastHandler,
    filterOptionsModalVisibilityHandler,
    // TODO: get filter options and send to API queries (20240613 - Shirley)
    // filterOptionsForHistory,
    // filterOptionsForPending,
  } = useGlobalCtx();
  const {
    data: pendingReports,
    code: listPendingCode,
    success: listPendingSuccess,
  } = APIHandler<IPendingReportItem[]>(APIName.REPORT_LIST_PENDING, {
    params: { companyId: selectedCompany?.id ?? DEFAULT_DISPLAYED_COMPANY_ID },
  });
  const {
    data: generatedReports,
    code: listGeneratedCode,
    success: listGeneratedSuccess,
  } = APIHandler<IGeneratedReportItem[]>(APIName.REPORT_LIST_GENERATED, {
    params: { companyId: selectedCompany?.id ?? DEFAULT_DISPLAYED_COMPANY_ID },
  });
  const [pendingPeriod, setPendingPeriod] = useState(default30DayPeriodInSec);
  const [searchPendingQuery, setSearchPendingQuery] = useState('');
  const [filteredPendingSort, setFilteredPendingSort] = useState<SortOptions>(SortOptions.newest);
  const [isPendingSortSelected, setIsPendingSortSelected] = useState(false);
  const [pendingCurrentPage, setPendingCurrentPage] = useState(1);
  const [pendingData, setPendingData] = useState<IPendingReportItem[]>([]);
  const [historyData, setHistoryData] = useState<IGeneratedReportItem[]>([]);

  const [historyPeriod, setHistoryPeriod] = useState(default30DayPeriodInSec);
  const [searchHistoryQuery, setSearchHistoryQuery] = useState('');
  const [filteredHistorySort, setFilteredHistorySort] = useState<SortOptions>(SortOptions.newest);
  const [isHistorySortSelected, setIsHistorySortSelected] = useState(false);
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);

  const isPendingDataLoading = false;
  const isHistoryDataLoading = false;

  const pendingTotalPages = 1;
  const historyTotalPages = 1;

  useEffect(() => {
    if (listPendingSuccess && pendingReports) {
      setPendingData(pendingReports);
    } else if (listPendingSuccess === false) {
      toastHandler({
        id: `listPendingReportsFailed${listPendingCode}_${(Math.random() * 100000).toFixed(5)}`,
        type: ToastType.ERROR,
        content: `Failed to fetch pending reports. Error code: ${listPendingCode}. USING DUMMY DATA`,
        closeable: true,
      });
      setPendingData(FIXED_DUMMY_PENDING_REPORT_ITEMS);
    }
  }, [listPendingSuccess, listPendingCode, pendingReports]);

  useEffect(() => {
    if (listGeneratedSuccess && generatedReports) {
      setHistoryData(generatedReports);
    } else if (listGeneratedSuccess === false) {
      toastHandler({
        id: `listGeneratedReportsFailed${listGeneratedCode}_${(Math.random() * 100000).toFixed(5)}`,
        type: ToastType.ERROR,
        content: `Failed to fetch generated reports. Error code: ${listGeneratedCode}. USING DUMMY DATA`,
        closeable: true,
      });
      setHistoryData(FIXED_DUMMY_GENERATED_REPORT_ITEMS);
    }
  }, [listGeneratedSuccess, listGeneratedCode, generatedReports]);

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
          {Object.values(SortOptions).map((sorting: SortOptions) => (
            <li
              key={sorting}
              onClick={() => {
                setFilteredPendingSort(sorting);
              }}
              className="w-full cursor-pointer px-3 py-2 text-navyBlue2 hover:text-primaryYellow"
            >
              {/* {sorting} */}
              {t(sorting)}
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

  const displayedPendingFilterOptionsSection = (
    <div>
      {/* Info: desktop (20240527 - Shirley) */}
      <div className="hidden flex-wrap items-end justify-between space-y-2 lg:flex lg:space-x-5">
        <div className="flex flex-col space-y-2 self-stretch">
          <div className="text-sm font-semibold leading-5 tracking-normal text-slate-700">
            {t('MY_REPORTS_SECTION.SORT_BY')}
          </div>
          {/* Info: sort menu (20240513 - Shirley) */}
          {displayedPendingSortMenu}
        </div>
        {/* Info: date picker (20240513 - Shirley) */}
        <DatePicker
          type={DatePickerType.TEXT_PERIOD}
          period={pendingPeriod}
          setFilteredPeriod={setPendingPeriod}
          btnClassName="w-250px"
          datePickerClassName="lg:w-auto"
        />{' '}
        {/* Info: Search bar (20240513 - Shirley) */}
        <div className="flex flex-1 flex-wrap justify-between gap-5 whitespace-nowrap">
          {displayedPendingSearchBar}
        </div>
      </div>

      {/* Info: mobile (20240527 - Shirley) */}
      <div className="flex flex-wrap items-center justify-between space-x-6 lg:hidden">
        {/* Info: Search bar (20240513 - Shirley) */}
        <div className="flex flex-1 flex-wrap justify-between gap-5 whitespace-nowrap">
          {displayedPendingSearchBar}
        </div>
        <Button
          onClick={() => filterOptionsModalVisibilityHandler(FilterOptionsModalType.pending)}
          className="px-3 py-3"
          variant={'secondaryOutline'}
        >
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
              d="M3.335 1.251a.75.75 0 01.75.75v2.667a.75.75 0 01-1.5 0V2a.75.75 0 01.75-.75zm4.667 0a.75.75 0 01.75.75v2.056a2.084 2.084 0 11-1.5 0V2a.75.75 0 01.75-.75zm4.667 0a.75.75 0 01.75.75v4a.75.75 0 01-1.5 0v-4a.75.75 0 01.75-.75zM8.002 5.418a.583.583 0 100 1.166.583.583 0 000-1.166zM3.335 8.084a.583.583 0 100 1.167.583.583 0 000-1.167zm-2.083.584a2.083 2.083 0 112.833 1.944v3.39a.75.75 0 01-1.5 0v-3.39a2.084 2.084 0 01-1.333-1.944zm11.417.75a.583.583 0 100 1.166.583.583 0 000-1.166zM10.585 10a2.083 2.083 0 112.834 1.944v2.056a.75.75 0 01-1.5 0v-2.056a2.084 2.084 0 01-1.334-1.944zm-2.583-.75a.75.75 0 01.75.75v4a.75.75 0 01-1.5 0v-4a.75.75 0 01.75-.75z"
              clipRule="evenodd"
            ></path>
          </svg>
        </Button>
      </div>
    </div>
  );

  const displayedPendingDataSection = isPendingDataLoading ? (
    <div>{t('MY_REPORTS_SECTION.LOADING')}</div>
  ) : pendingData.length !== 0 ? (
    <div className="flex flex-col max-md:max-w-full">
      {' '}
      <PendingReportList reports={pendingData} />
      <div className="mt-4 flex justify-center">
        <Pagination
          currentPage={pendingCurrentPage}
          setCurrentPage={setPendingCurrentPage}
          totalPages={pendingTotalPages}
          pagePrefix="pending"
        />
      </div>
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
        <div className="text-h6 font-semibold leading-h6 text-text-neutral-tertiary">
          {t('MY_REPORTS_SECTION.EMPTY')}
        </div>
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
          {Object.values(SortOptions).map((sorting: SortOptions) => (
            <li
              key={sorting}
              onClick={() => {
                setFilteredHistorySort(sorting);
              }}
              className="w-full cursor-pointer px-3 py-2 text-navyBlue2 hover:text-primaryYellow"
            >
              {/* {sorting} */}
              {t(sorting)}
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
        placeholder={t('AUDIT_REPORT.SEARCH')}
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

  const displayedHistoryFilterOptionsSection = (
    <div>
      {/* Info: desktop (20240527 - Shirley) */}
      <div className="hidden flex-wrap items-end justify-between space-y-2 lg:flex lg:space-x-5">
        <div className="flex flex-col space-y-2 self-stretch">
          <div className="text-sm font-semibold leading-5 tracking-normal text-slate-700">
            {t('MY_REPORTS_SECTION.SORT_BY')}
          </div>
          {/* Info: sort menu (20240513 - Shirley) */}
          {displayedHistorySortMenu}
        </div>
        {/* Info: date picker (20240513 - Shirley) */}
        <DatePicker
          type={DatePickerType.TEXT_PERIOD}
          period={historyPeriod}
          setFilteredPeriod={setHistoryPeriod}
          btnClassName="w-250px"
          datePickerClassName="lg:w-auto"
        />{' '}
        {/* Info: Search bar (20240513 - Shirley) */}
        <div className="flex flex-1 flex-wrap justify-between gap-5 whitespace-nowrap">
          {displayedHistorySearchBar}
        </div>
      </div>

      {/* Info: mobile (20240527 - Shirley) */}
      <div className="flex flex-wrap items-center justify-between space-x-6 lg:hidden">
        {/* Info: Search bar (20240513 - Shirley) */}
        <div className="flex flex-1 flex-wrap justify-between gap-5 whitespace-nowrap">
          {displayedHistorySearchBar}
        </div>
        <Button
          onClick={() => filterOptionsModalVisibilityHandler(FilterOptionsModalType.history)}
          className="px-3 py-3"
          variant={'secondaryOutline'}
        >
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
              d="M3.335 1.251a.75.75 0 01.75.75v2.667a.75.75 0 01-1.5 0V2a.75.75 0 01.75-.75zm4.667 0a.75.75 0 01.75.75v2.056a2.084 2.084 0 11-1.5 0V2a.75.75 0 01.75-.75zm4.667 0a.75.75 0 01.75.75v4a.75.75 0 01-1.5 0v-4a.75.75 0 01.75-.75zM8.002 5.418a.583.583 0 100 1.166.583.583 0 000-1.166zM3.335 8.084a.583.583 0 100 1.167.583.583 0 000-1.167zm-2.083.584a2.083 2.083 0 112.833 1.944v3.39a.75.75 0 01-1.5 0v-3.39a2.084 2.084 0 01-1.333-1.944zm11.417.75a.583.583 0 100 1.166.583.583 0 000-1.166zM10.585 10a2.083 2.083 0 112.834 1.944v2.056a.75.75 0 01-1.5 0v-2.056a2.084 2.084 0 01-1.334-1.944zm-2.583-.75a.75.75 0 01.75.75v4a.75.75 0 01-1.5 0v-4a.75.75 0 01.75-.75z"
              clipRule="evenodd"
            ></path>
          </svg>
        </Button>
      </div>
    </div>
  );

  const displayedHistoryDataSection = isHistoryDataLoading ? (
    <div>{t('MY_REPORTS_SECTION.LOADING')}</div>
  ) : historyData.length !== 0 ? (
    <div className="flex flex-col max-md:max-w-full">
      <ReportsHistoryList reports={historyData} />

      <div className="mt-4 flex justify-center">
        <Pagination
          currentPage={historyCurrentPage}
          setCurrentPage={setHistoryCurrentPage}
          totalPages={historyTotalPages}
          pagePrefix="history"
        />
      </div>
    </div>
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
        <div className="text-h6 font-semibold leading-h6 text-text-neutral-tertiary">
          {t('MY_REPORTS_SECTION.EMPTY')}
        </div>
      </section>
    </div>
  );

  return (
    <div className="mt-20 flex w-full shrink-0 grow basis-0 flex-col bg-surface-neutral-main-background px-0 pb-0">
      <div className="flex gap-0 max-md:flex-wrap">
        <div className="flex w-fit shrink-0 grow basis-0 flex-col pb-5 pt-16 max-md:max-w-full">
          {/* Info: desktop heading (20240513 - Shirley) */}
          <div className="hidden flex-col justify-center text-4xl font-semibold leading-10 text-slate-500 max-md:max-w-full max-md:pr-5 md:flex">
            <div className="w-full justify-center px-10 md:px-16 lg:px-28">
              {t('MY_REPORTS_SECTION.MY_REPORTS')}
            </div>
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
              <div className="mt-1.5">{t('MY_REPORTS_SECTION.MY_REPORTS')}</div>
            </div>
          </div>

          {/* Info: Divider beneath Heading (20240528 - Shirley) */}
          <div className="mt-4 flex flex-1 flex-col justify-center px-6 py-2.5 max-md:max-w-full md:px-16 lg:pl-28">
            <div className="flex flex-col justify-center max-md:max-w-full">
              <div className="h-px shrink-0 border border-solid border-gray-300 bg-gray-300 max-md:max-w-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Info: ----- pending reports (20240513 - Shirley) ----- */}
      <div className="mt-5 flex flex-col px-6 max-md:mt-0 max-md:max-w-full md:px-16 lg:mx-10 lg:pl-20 lg:pr-5">
        {displayedPendingFilterOptionsSection}

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
            <div>{t('MY_REPORTS_SECTION.PENDING')}</div>
          </div>
          <div className="my-auto flex flex-1 flex-col justify-center max-md:max-w-full">
            <div className="mr-0 h-px shrink-0 border border-solid border-slate-800 bg-slate-800 max-md:max-w-full" />
          </div>
        </div>
        {displayedPendingDataSection}
      </div>

      {/* Info: ----- reports history (20240513 - Shirley) ----- */}
      <div className="mt-10 flex flex-col px-6 max-md:max-w-full md:px-16 lg:mx-10 lg:pl-20 lg:pr-5">
        {displayedHistoryFilterOptionsSection}

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
            <div>{t('MY_REPORTS_SECTION.REPORTS_HISTORY')}</div>
          </div>
          <div className="my-auto flex flex-1 flex-col justify-center max-md:max-w-full">
            <div className="mr-0 h-px shrink-0 border border-solid border-slate-800 bg-slate-800 max-md:max-w-full" />
          </div>
        </div>
        {displayedHistoryDataSection}
      </div>
    </div>
  );
};

export default MyReportsSection;
