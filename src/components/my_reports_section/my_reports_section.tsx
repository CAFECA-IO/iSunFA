import Image from 'next/image';
import React, { useCallback, useEffect, useState } from 'react';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import {
  SortOptions,
  default30DayPeriodInSec,
  LIMIT_FOR_REPORT_PAGE,
  DEFAULT_PAGE_NUMBER,
  DEFAULT_SKELETON_COUNT_FOR_PAGE,
} from '@/constants/display';
import useOuterClick from '@/lib/hooks/use_outer_click';
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
import { sortOptionQuery } from '@/constants/sort';
import { useRouter } from 'next/router';
import { IDatePeriod } from '@/interfaces/date_period';
import useStateRef from 'react-usestateref';
import { IPaginatedReport, IReport, MOCK_TOTAL_PAGES } from '@/interfaces/report';
import { ReportStatusType } from '@/constants/report';
import { SkeletonList } from '@/components/skeleton/skeleton';
import { cn } from '@/lib/utils/common';

const MyReportsSection = () => {
  const { t } = useTranslation([
    'common',
    'project',
    'journal',
    'kyc',
    'report_401',
    'salary',
    'setting',
    'terms',
  ]);
  const router = useRouter();

  const { isAuthLoading, selectedCompany } = useUserCtx();
  const hasCompanyId = isAuthLoading === false && !!selectedCompany?.id;
  // TODO: (20240528 - Shirley) [Beta] 區分 pending 跟 history 兩種 filter options
  // TODO: (20240528 - Shirley) [Beta] filterOptionsGotFromModal for API queries in mobile devices
  const {
    toastHandler,
    filterOptionsModalVisibilityHandler,
    // TODO: (20240613 - Shirley) [Beta] get filter options and send to API queries
    // filterOptionsForHistory,
    // filterOptionsForPending,
  } = useGlobalCtx();

  const { pending, history } = router.query;

  const [pendingPeriod, setPendingPeriod] = useStateRef(default30DayPeriodInSec);
  const [searchPendingQuery, setSearchPendingQuery] = useState('');
  const [filteredPendingSort, setFilteredPendingSort] = useState<SortOptions>(SortOptions.newest);
  const [isPendingSortSelected, setIsPendingSortSelected] = useState(false);
  const [pendingCurrentPage, setPendingCurrentPage] = useState(
    pending ? +pending : DEFAULT_PAGE_NUMBER
  );
  const [pendingData, setPendingData] = useState<IReport[]>([]);

  const [historyPeriod, setHistoryPeriod] = useStateRef(default30DayPeriodInSec);
  const [searchHistoryQuery, setSearchHistoryQuery] = useState('');
  const [filteredHistorySort, setFilteredHistorySort] = useState<SortOptions>(SortOptions.newest);
  const [isHistorySortSelected, setIsHistorySortSelected] = useState(false);
  const [historyCurrentPage, setHistoryCurrentPage] = useState(
    history ? +history : DEFAULT_PAGE_NUMBER
  );
  const [historyData, setHistoryData] = useState<IReport[]>([]);

  const {
    trigger: fetchPendingReports,
    data: pendingReports,
    code: listPendingCode,
    success: listPendingSuccess,
    isLoading: isPendingDataLoading,
  } = APIHandler<IPaginatedReport>(
    APIName.REPORT_LIST,
    {
      params: { companyId: selectedCompany?.id },
      query: {
        status: ReportStatusType.PENDING,
        sortOrder: sortOptionQuery[filteredPendingSort],
        startDateInSecond:
          pendingPeriod.startTimeStamp === 0 ? undefined : pendingPeriod.startTimeStamp,
        endDateInSecond: pendingPeriod.endTimeStamp === 0 ? undefined : pendingPeriod.endTimeStamp,
        searchQuery: searchPendingQuery,
        targetPage: pendingCurrentPage,
        pageSize: LIMIT_FOR_REPORT_PAGE,
      },
    },
    hasCompanyId
  );

  const {
    trigger: fetchGeneratedReports,
    data: generatedReports,
    code: listGeneratedCode,
    success: listGeneratedSuccess,
    isLoading: isHistoryDataLoading,
  } = APIHandler<IPaginatedReport>(
    APIName.REPORT_LIST,
    {
      params: { companyId: selectedCompany?.id },
      query: {
        status: ReportStatusType.GENERATED,
        sortOrder: sortOptionQuery[filteredHistorySort],
        startDateInSecond:
          historyPeriod.startTimeStamp === 0 ? undefined : historyPeriod.startTimeStamp,
        endDateInSecond: historyPeriod.endTimeStamp === 0 ? undefined : historyPeriod.endTimeStamp,
        searchQuery: searchHistoryQuery,
        targetPage: historyCurrentPage,
        pageSize: LIMIT_FOR_REPORT_PAGE,
      },
    },
    hasCompanyId
  );
  const pendingTotalPages = pendingReports?.totalPages || MOCK_TOTAL_PAGES;
  const historyTotalPages = generatedReports?.totalPages || MOCK_TOTAL_PAGES;
  useEffect(() => {
    if (listPendingSuccess && pendingReports?.data) {
      setPendingData(pendingReports.data);
    } else if (listPendingSuccess === false) {
      toastHandler({
        id: `listPendingReportsFailed${listPendingCode}_${(Math.random() * 100000).toFixed(5)}`,
        type: ToastType.ERROR,
        content: `${t('common:DASHBOARD.FAILED_TO_FETCH_PENDING_REPORTS')} ${listPendingCode}.${t('common:DASHBOARD.USING_DUMMY_DATA')}`,
        closeable: true,
      });
    }
  }, [listPendingSuccess, listPendingCode, pendingReports]);

  useEffect(() => {
    if (listGeneratedSuccess && generatedReports?.data) {
      setHistoryData(generatedReports.data);
    } else if (listGeneratedSuccess === false) {
      toastHandler({
        id: `listGeneratedReportsFailed${listGeneratedCode}_${(Math.random() * 100000).toFixed(5)}`,
        type: ToastType.ERROR,
        // Info: (20240901 - Anna) 原本是content: `Failed to fetch generated reports. Error code: ${listGeneratedCode}. USING DUMMY DATA`,翻譯為如下：
        content: t('report_401:MY_REPORTS_SECTION.FAILED_TO_FETCH_GENERATED_REPORTS', {
          code: listGeneratedCode,
        }),
        closeable: true,
      });
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

  const getPendingReports = useCallback(
    async (query: {
      currentPage?: number;
      filteredPendingSort?: SortOptions;
      pendingPeriod?: IDatePeriod;
      searchPendingQuery?: string;
    }) => {
      if (!hasCompanyId) return;
      const {
        currentPage: page,
        filteredPendingSort: sortOrder,
        pendingPeriod: period,
        searchPendingQuery: searchString,
      } = query;

      await fetchPendingReports({
        params: {
          companyId: selectedCompany?.id,
        },
        query: {
          status: ReportStatusType.PENDING,
          sortOrder: sortOptionQuery[sortOrder ?? filteredPendingSort],
          startDateInSecond: period?.startTimeStamp === 0 ? undefined : period?.startTimeStamp,
          endDateInSecond: period?.endTimeStamp === 0 ? undefined : period?.endTimeStamp,
          searchQuery: searchString ?? searchPendingQuery,
          targetPage: page ?? pendingCurrentPage,
          pageSize: LIMIT_FOR_REPORT_PAGE,
        },
      });
    },
    [
      fetchPendingReports,
      selectedCompany,
      filteredPendingSort,
      searchPendingQuery,
      pendingCurrentPage,
      pendingPeriod.endTimeStamp,
    ]
  );

  const getGeneratedReports = useCallback(
    async (query: {
      currentPage?: number;
      filteredHistorySort?: SortOptions;
      historyPeriod?: IDatePeriod;
      searchHistoryQuery?: string;
    }) => {
      if (!hasCompanyId) return;
      const {
        currentPage: page,
        filteredHistorySort: sortOrder,
        historyPeriod: period,
        searchHistoryQuery: searchString,
      } = query;

      await fetchGeneratedReports({
        params: {
          companyId: selectedCompany?.id,
        },
        query: {
          status: ReportStatusType.GENERATED,
          sortOrder: sortOptionQuery[sortOrder ?? filteredHistorySort],
          startDateInSecond: period?.startTimeStamp === 0 ? undefined : period?.startTimeStamp,
          endDateInSecond: period?.endTimeStamp === 0 ? undefined : period?.endTimeStamp,
          searchQuery: searchString ?? searchHistoryQuery,
          targetPage: page ?? historyCurrentPage,
          pageSize: LIMIT_FOR_REPORT_PAGE,
        },
      });
    },
    [
      fetchGeneratedReports,
      selectedCompany,
      filteredHistorySort,
      searchHistoryQuery,
      historyCurrentPage,
      historyPeriod.endTimeStamp,
    ]
  );

  const handlePendingDatePickerClose = async (start: number, end: number) => {
    setPendingPeriod({ startTimeStamp: start, endTimeStamp: end });
    await getPendingReports({
      pendingPeriod: { startTimeStamp: start, endTimeStamp: end },
    });
  };

  const handleHistoryDatePickerClose = async (start: number, end: number) => {
    setHistoryPeriod({ startTimeStamp: start, endTimeStamp: end });
    await getGeneratedReports({
      historyPeriod: { startTimeStamp: start, endTimeStamp: end },
    });
  };

  const togglePendingSortMenu = () => {
    if (!isPendingDataLoading) {
      setIsPendingSortSelected(true);
      setIsPendingSortMenuOpen(!isPendingSortMenuOpen);
    }
  };

  const toggleHistorySortMenu = () => {
    if (!isHistoryDataLoading) {
      setIsHistorySortSelected(true);
      setIsHistorySortMenuOpen(!isHistorySortMenuOpen);
    }
  };

  const pendingInputChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isPendingDataLoading) {
      setSearchPendingQuery(e.target.value);
    }
  };

  const historyInputChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isHistoryDataLoading) {
      setSearchHistoryQuery(e.target.value);
    }
  };

  const pendingPaginationHandler = async (newPage: number) => {
    setPendingCurrentPage(newPage);
    await getPendingReports({ currentPage: newPage });
  };

  const historyPaginationHandler = async (newPage: number) => {
    setHistoryCurrentPage(newPage);
    await getGeneratedReports({ currentPage: newPage });
  };

  const pendingSortClickHandler = async (sorting: SortOptions) => {
    setFilteredPendingSort(sorting);
    await getPendingReports({ filteredPendingSort: sorting });
  };

  const historySortClickHandler = async (sorting: SortOptions) => {
    setFilteredHistorySort(sorting);
    await getGeneratedReports({ filteredHistorySort: sorting });
  };

  const displayedPendingSortMenu = (
    <div
      ref={pendingSortMenuRef}
      onClick={isPendingDataLoading ? undefined : togglePendingSortMenu}
      className={cn(
        'group relative flex h-44px w-200px cursor-pointer items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background p-10px text-dropdown-text-head hover:border-input-stroke-input-hover hover:text-input-text-highlight',
        {
          'cursor-not-allowed border-button-stroke-disable text-button-text-disable hover:border-button-stroke-disable hover:text-button-text-disable':
            isPendingDataLoading,
          'border-input-stroke-input-hover hover:text-input-text-highlight': isPendingSortMenuOpen,
        }
      )}
    >
      <p
        className={`whitespace-nowrap ${isPendingDataLoading ? 'group-hover:text-button-text-disable' : 'group-hover:hover:text-input-text-highlight'} ${isPendingSortMenuOpen ? 'text-input-text-highlight' : isPendingSortSelected ? '' : 'text-input-text-input-placeholder'}`}
      >
        {t(filteredPendingSort)}
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
      </svg>
      {/* Info: (20240513 - Shirley) Dropdown menu */}
      <div
        className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isPendingSortMenuOpen ? 'grid-rows-1 border-dropdown-stroke-menu' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-sm border transition-all duration-300 ease-in-out`}
      >
        <ul className="z-10 flex w-full flex-col items-start bg-dropdown-surface-menu-background-primary p-8px">
          {Object.values(SortOptions).map((sorting: SortOptions) => (
            <li
              key={sorting}
              onClick={() => {
                pendingSortClickHandler(sorting);
              }}
              className="w-full cursor-pointer px-3 py-2 text-dropdown-text-primary hover:text-dropdown-stroke-input-hover"
            >
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
        disabled={isPendingDataLoading}
        value={searchPendingQuery}
        onChange={pendingInputChangeHandler}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            getPendingReports({ searchPendingQuery });
          }
        }}
        type="text"
        placeholder={t('report_401:AUDIT_REPORT.SEARCH')}
        className={`relative flex h-44px w-full min-w-200px items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background p-10px outline-none`}
      />
      <div
        onClick={() => !isPendingDataLoading && getPendingReports({ searchPendingQuery })}
        className="absolute right-3 top-3 hover:cursor-pointer"
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
            d="M9.17 3.252a5.917 5.917 0 104.109 10.173.754.754 0 01.147-.147A5.917 5.917 0 009.169 3.252zm5.747 10.604a7.417 7.417 0 10-1.06 1.06l3.115 3.116a.75.75 0 001.06-1.06l-3.115-3.116z"
            clipRule="evenodd"
          ></path>
        </svg>
      </div>
    </div>
  );

  const displayedPendingFilterOptionsSection = (
    <div>
      {/* Info: (20240527 - Shirley) desktop */}
      <div className="hidden flex-wrap items-end justify-between space-y-2 lg:flex lg:space-x-5">
        <div className="flex flex-col space-y-2 self-stretch">
          <div className="text-sm font-semibold leading-5 tracking-normal text-input-text-primary">
            {t('report_401:MY_REPORTS_SECTION.SORT_BY')}
          </div>
          {/* Info: (20240513 - Shirley) sort menu */}
          {displayedPendingSortMenu}
        </div>
        {/* Info: (20240513 - Shirley) date picker */}
        <DatePicker
          disabled={isPendingDataLoading}
          datePickerHandler={handlePendingDatePickerClose}
          type={DatePickerType.TEXT_PERIOD}
          period={pendingPeriod}
          setFilteredPeriod={setPendingPeriod}
          btnClassName="w-250px"
          datePickerClassName="lg:w-auto"
        />
        {/* Info: (20240513 - Shirley) Search bar */}
        <div className="flex flex-1 flex-wrap justify-between gap-5 whitespace-nowrap">
          {displayedPendingSearchBar}
        </div>
      </div>

      {/* Info: (20240527 - Shirley) mobile */}
      <div className="flex flex-wrap items-center justify-between space-x-6 lg:hidden">
        {/* Info: (20240513 - Shirley) Search bar */}
        <div className="flex flex-1 flex-wrap justify-between gap-5 whitespace-nowrap">
          {displayedPendingSearchBar}
        </div>
        <Button
          disabled={isPendingDataLoading}
          onClick={() => {
            return (
              !isPendingDataLoading &&
              filterOptionsModalVisibilityHandler(FilterOptionsModalType.pending)
            );
          }}
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
    <div className="flex w-full items-center justify-center py-10">
      <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
    </div>
  ) : pendingData.length !== 0 ? (
    <div className="flex flex-col max-md:max-w-full">
      <PendingReportList reports={pendingData} />
      <div className="mt-4 flex justify-center">
        <Pagination
          currentPage={pendingCurrentPage}
          setCurrentPage={setPendingCurrentPage}
          totalPages={pendingTotalPages}
          pagePrefix="pending"
          paginationHandler={pendingPaginationHandler}
        />
      </div>
    </div>
  ) : (
    // Info: (20240513 - Shirley) empty icon section
    <div className="mt-20 flex w-full items-center justify-center">
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
          {t('report_401:MY_REPORTS_SECTION.EMPTY')}
        </div>
      </section>
    </div>
  );

  const displayedHistorySortMenu = (
    <div
      ref={historySortMenuRef}
      onClick={isHistoryDataLoading ? undefined : toggleHistorySortMenu}
      className={cn(
        'group relative flex h-44px w-200px cursor-pointer items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background p-10px text-dropdown-text-head hover:border-input-stroke-input-hover hover:text-input-text-highlight',
        {
          'cursor-not-allowed border-button-stroke-disable text-button-text-disable hover:border-button-stroke-disable hover:text-button-text-disable':
            isHistoryDataLoading,
          'border-input-stroke-input-hover hover:text-input-text-highlight': isHistorySortMenuOpen,
        }
      )}
    >
      <p
        className={`whitespace-nowrap ${isHistoryDataLoading ? 'group-hover:text-button-text-disable' : 'group-hover:hover:text-input-text-highlight'} ${isHistorySortMenuOpen ? 'text-input-text-highlight' : isHistorySortSelected ? '' : 'text-input-text-input-placeholder'}`}
      >
        {t(filteredHistorySort)}
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
      </svg>
      {/* Info: (20240513 - Shirley) Dropdown menu */}
      <div
        className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isHistorySortMenuOpen ? 'grid-rows-1 border-dropdown-stroke-menu' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-sm border transition-all duration-300 ease-in-out`}
      >
        <ul className="z-10 flex w-full flex-col items-start bg-dropdown-surface-menu-background-primary p-8px">
          {Object.values(SortOptions).map((sorting: SortOptions) => (
            <li
              key={sorting}
              onClick={() => {
                historySortClickHandler(sorting);
              }}
              className="w-full cursor-pointer px-3 py-2 text-dropdown-text-primary hover:text-dropdown-stroke-input-hover"
            >
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
        disabled={isHistoryDataLoading}
        value={searchHistoryQuery}
        onChange={historyInputChangeHandler}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            getGeneratedReports({ searchHistoryQuery });
          }
        }}
        type="text"
        placeholder={t('report_401:AUDIT_REPORT.SEARCH')}
        className={`relative flex h-44px w-full min-w-200px items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background p-10px outline-none`}
      />
      <div
        onClick={() => !isHistoryDataLoading && getGeneratedReports({ searchHistoryQuery })}
        className="absolute right-3 top-3 hover:cursor-pointer"
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
            d="M9.17 3.252a5.917 5.917 0 104.109 10.173.754.754 0 01.147-.147A5.917 5.917 0 009.169 3.252zm5.747 10.604a7.417 7.417 0 10-1.06 1.06l3.115 3.116a.75.75 0 001.06-1.06l-3.115-3.116z"
            clipRule="evenodd"
          ></path>
        </svg>
      </div>
    </div>
  );

  const displayedHistoryFilterOptionsSection = (
    <div>
      {/* Info: (20240527 - Shirley) desktop */}
      <div className="hidden flex-wrap items-end justify-between space-y-2 lg:flex lg:space-x-5">
        <div className="flex flex-col space-y-2 self-stretch">
          <div className="text-sm font-semibold leading-5 tracking-normal text-input-text-primary">
            {t('report_401:MY_REPORTS_SECTION.SORT_BY')}
          </div>
          {/* Info: (20240513 - Shirley) sort menu */}
          {displayedHistorySortMenu}
        </div>
        {/* Info: (20240513 - Shirley) date picker */}
        <DatePicker
          disabled={isHistoryDataLoading}
          datePickerHandler={handleHistoryDatePickerClose}
          type={DatePickerType.TEXT_PERIOD}
          period={historyPeriod}
          setFilteredPeriod={setHistoryPeriod}
          btnClassName="w-250px"
          datePickerClassName="lg:w-auto"
        />
        {/* Info: (20240513 - Shirley) Search bar */}
        <div className="flex flex-1 flex-wrap justify-between gap-5 whitespace-nowrap">
          {displayedHistorySearchBar}
        </div>
      </div>

      {/* Info: (20240527 - Shirley) mobile */}
      <div className="flex flex-wrap items-center justify-between space-x-6 lg:hidden">
        {/* Info: (20240513 - Shirley) Search bar */}
        <div className="flex flex-1 flex-wrap justify-between gap-5 whitespace-nowrap">
          {displayedHistorySearchBar}
        </div>
        <Button
          disabled={isHistoryDataLoading}
          onClick={() => {
            return (
              !isHistoryDataLoading &&
              filterOptionsModalVisibilityHandler(FilterOptionsModalType.history)
            );
          }}
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
    <div className="flex w-full items-center justify-center py-10">
      <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
    </div>
  ) : historyData.length !== 0 ? (
    <div className="flex flex-col max-md:max-w-full">
      <ReportsHistoryList reports={historyData} />

      <div className="mt-4 flex justify-center">
        <Pagination
          currentPage={historyCurrentPage}
          setCurrentPage={setHistoryCurrentPage}
          totalPages={historyTotalPages}
          pagePrefix="history"
          paginationHandler={historyPaginationHandler}
        />
      </div>
    </div>
  ) : (
    <div className="mt-20 flex w-full items-center justify-center">
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
          {t('report_401:MY_REPORTS_SECTION.EMPTY')}
        </div>
      </section>
    </div>
  );

  return (
    <div className="mt-20 flex w-full shrink-0 grow basis-0 flex-col bg-surface-neutral-main-background px-0 pb-0">
      <div className="flex gap-0 max-md:flex-wrap">
        <div className="flex w-fit shrink-0 grow basis-0 flex-col pb-5 pt-16 max-md:max-w-full">
          {/* Info: (20240513 - Shirley) desktop heading */}
          <div className="hidden w-full flex-col justify-center px-10 text-4xl font-semibold leading-10 text-text-neutral-secondary max-md:max-w-full max-md:pr-5 md:flex md:px-16 lg:px-28">
            {t('report_401:MY_REPORTS_SECTION.MY_REPORTS')}
          </div>
          {/* Info: (20240513 - Shirley) mobile heading */}
          <div className="mx-4 flex w-600px max-w-full flex-1 items-center space-x-2 md:hidden">
            <Image
              src={'/icons/report.svg'}
              width={30}
              height={30}
              alt="report_icon"
              className="aspect-square shrink-0"
            />
            <div className="mt-1.5 text-text-neutral-secondary">
              {t('report_401:MY_REPORTS_SECTION.MY_REPORTS')}
            </div>
          </div>

          {/* Info: (20240528 - Shirley) Divider beneath Heading */}
          <div className="mt-4 flex flex-1 flex-col justify-center px-6 py-2.5 max-md:max-w-full md:px-16 lg:pl-28">
            <div className="h-px shrink-0 border border-solid border-divider-stroke-lv-4 bg-divider-stroke-lv-4 max-md:max-w-full" />
          </div>
        </div>
      </div>

      {/* Info: (20240513 - Shirley) ----- pending reports ----- */}
      <div className="mt-5 flex flex-col px-6 max-md:mt-0 max-md:max-w-full md:px-16 lg:mx-10 lg:pl-20 lg:pr-5">
        {displayedPendingFilterOptionsSection}

        <div className="mt-4 flex gap-4 py-2.5 max-md:max-w-full max-md:flex-wrap">
          <div className="flex items-center gap-2 text-center text-sm font-medium leading-5 tracking-normal text-divider-text-lv-1">
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
            <div>{t('report_401:MY_REPORTS_SECTION.PENDING')}</div>
          </div>
          <div className="my-auto flex flex-1 flex-col justify-center max-md:max-w-full">
            <div className="mr-0 h-px shrink-0 border border-solid border-divider-stroke-lv-1 bg-divider-stroke-lv-1 max-md:max-w-full" />
          </div>
        </div>
        {displayedPendingDataSection}
      </div>

      {/* Info: (20240513 - Shirley) ----- reports history ----- */}
      <div className="mt-10 flex flex-col px-6 max-md:max-w-full md:px-16 lg:mx-10 lg:pl-20 lg:pr-5">
        {displayedHistoryFilterOptionsSection}

        <div className="mt-4 flex gap-4 py-2.5 max-md:max-w-full max-md:flex-wrap">
          <div className="flex items-center gap-2 text-center text-sm font-medium leading-5 tracking-normal text-divider-text-lv-1">
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
            <div>{t('report_401:MY_REPORTS_SECTION.REPORTS_HISTORY')}</div>
          </div>
          <div className="my-auto flex flex-1 flex-col justify-center max-md:max-w-full">
            <div className="mr-0 h-px shrink-0 border border-solid border-divider-stroke-lv-1 bg-divider-stroke-lv-1 max-md:max-w-full" />
          </div>
        </div>
        {displayedHistoryDataSection}
      </div>
    </div>
  );
};

export default MyReportsSection;
