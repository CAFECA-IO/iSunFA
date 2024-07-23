import Image from 'next/image';
import { useState, useEffect } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import { FiSearch } from 'react-icons/fi';
import APIHandler from '@/lib/utils/api_handler';
import useOuterClick from '@/lib/hooks/use_outer_click';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import PendingReportList from '@/components/pending_report_list/pending_report_list';
import ReportsHistoryList from '@/components/reports_history_list/reports_history_list';
import Pagination from '@/components/pagination/pagination';
import {
  DEFAULT_DISPLAYED_COMPANY_ID,
  SortOptions,
  default30DayPeriodInSec,
} from '@/constants/display';
import {
  FIXED_DUMMY_GENERATED_REPORT_ITEMS,
  FIXED_DUMMY_PENDING_REPORT_ITEMS,
  IGeneratedReportItem,
  IPaginatedGeneratedReportItem,
  IPaginatedPendingReportItem,
  IPendingReportItem,
} from '@/interfaces/report_item';
import { IDatePeriod } from '@/interfaces/date_period';
import { ToastType } from '@/interfaces/toastify';
import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import { useGlobalCtx } from '@/contexts/global_context';
import { useTranslation } from 'next-i18next';
import { ReportType } from '@/constants/report';

const ProjectReportPageBody = ({ projectId }: { projectId: string }) => {
  const { t } = useTranslation('common');
  const { selectedCompany } = useUserCtx();
  const { toastHandler } = useGlobalCtx();

  const typeOptions = ['All', ReportType.FINANCIAL, ReportType.FINANCIAL];

  // Info: (20240701 - Julian) pending state
  const [pendingData, setPendingData] = useState<IPendingReportItem[]>([]);
  const [pendingCurrentPage, setPendingCurrentPage] = useState<number>(1);
  const [pendingSorting, setPendingSorting] = useState<string>(SortOptions.newest);
  const [pendingFilteredType, setPendingFilteredType] = useState<string>(typeOptions[0]);
  const [pendingFilteredPeriod, setPendingFilteredPeriod] =
    useState<IDatePeriod>(default30DayPeriodInSec);
  const [pendingSearch, setPendingSearch] = useState<string>('');

  // Info: (20240701 - Julian) history state
  const [historyData, setHistoryData] = useState<IGeneratedReportItem[]>([]);
  const [historyCurrentPage, setHistoryCurrentPage] = useState<number>(1);
  const [historySorting, setHistorySorting] = useState<string>(SortOptions.newest);
  const [historyFilteredType, setHistoryFilteredType] = useState<string>(typeOptions[0]);
  const [historyFilteredPeriod, setHistoryFilteredPeriod] =
    useState<IDatePeriod>(default30DayPeriodInSec);
  const [historySearch, setHistorySearch] = useState<string>('');

  // ToDo: (20240624 - Julian) Replace with api data
  const pendingTotalPages = 5;
  const historyTotalPages = 5;

  const {
    data: pendingReports,
    code: listPendingCode,
    success: listPendingSuccess,
  } = APIHandler<IPaginatedPendingReportItem>(APIName.REPORT_LIST_PENDING, {
    params: { companyId: selectedCompany?.id ?? DEFAULT_DISPLAYED_COMPANY_ID },
    query: { projectId }, // ToDo: (20240701 - Julian) Add query for filtering
  });

  const {
    data: generatedReports,
    code: listGeneratedCode,
    success: listGeneratedSuccess,
  } = APIHandler<IPaginatedGeneratedReportItem>(APIName.REPORT_LIST_GENERATED, {
    params: { companyId: selectedCompany?.id ?? DEFAULT_DISPLAYED_COMPANY_ID },
    query: { projectId }, //  ToDo: (20240701 - Julian) Add query for filtering
  });

  useEffect(() => {
    if (listPendingSuccess && pendingReports?.data) {
      setPendingData(pendingReports.data);
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
    if (listGeneratedSuccess && generatedReports?.data) {
      setHistoryData(generatedReports.data);
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
    targetRef: pendingTypeMenuRef,
    componentVisible: isPendingTypeMenuOpen,
    setComponentVisible: setIsPendingTypeMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: historySortMenuRef,
    componentVisible: isHistorySortMenuOpen,
    setComponentVisible: setIsHistorySortMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: historyTypeMenuRef,
    componentVisible: isHistoryTypeMenuOpen,
    setComponentVisible: setIsHistoryTypeMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const togglePendingSortMenu = () => setIsPendingSortMenuOpen(!isPendingSortMenuOpen);
  const togglePendingTypeMenu = () => setIsPendingTypeMenuOpen(!isPendingTypeMenuOpen);
  const pendingSearchChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPendingSearch(e.target.value);
  };

  const toggleHistorySortMenu = () => setIsHistorySortMenuOpen(!isHistorySortMenuOpen);
  const toggleHistoryTypeMenu = () => setIsHistoryTypeMenuOpen(!isHistoryTypeMenuOpen);
  const historySearchChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHistorySearch(e.target.value);
  };

  const displayedPendingSortDropMenu = (
    <div
      ref={pendingSortMenuRef}
      onClick={togglePendingSortMenu}
      className={`relative flex w-full items-center justify-between rounded-xs border border-input-stroke-input ${isPendingSortMenuOpen ? 'border-input-stroke-input-hover' : 'border-input-stroke-input'} bg-input-surface-input-background px-12px py-10px hover:cursor-pointer hover:border-input-stroke-input-hover`}
    >
      <p className="text-text-neutral-primary">{t(pendingSorting)}</p>
      <FaChevronDown size={16} />
      {/* Info: (20240624 - Julian) Sort By Drop Menu */}
      <div
        className={`absolute left-0 top-50px w-full rounded-xs border border-input-stroke-input bg-input-surface-input-background ${isPendingSortMenuOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-10 opacity-0'} z-10 px-12px py-8px text-sm shadow-md transition-all duration-300 ease-in-out`}
      >
        <button
          type="button"
          className="w-full p-8px text-left hover:bg-dropdown-surface-item-hover"
          onClick={() => setPendingSorting(SortOptions.newest)}
        >
          {t(SortOptions.newest)}
        </button>
        <button
          type="button"
          className="w-full p-8px text-left hover:bg-dropdown-surface-item-hover"
          onClick={() => setPendingSorting(SortOptions.oldest)}
        >
          {t(SortOptions.oldest)}
        </button>
      </div>
    </div>
  );

  const displayedHistorySortDropMenu = (
    <div
      ref={historySortMenuRef}
      onClick={toggleHistorySortMenu}
      className={`relative flex w-full items-center justify-between rounded-xs border border-input-stroke-input ${isHistorySortMenuOpen ? 'border-input-stroke-input-hover' : 'border-input-stroke-input'} bg-input-surface-input-background px-12px py-10px hover:cursor-pointer hover:border-input-stroke-input-hover`}
    >
      <p className="text-text-neutral-primary">{t(historySorting)}</p>
      <FaChevronDown size={16} />
      {/* Info: (20240624 - Julian) Sort By Drop Menu */}
      <div
        className={`absolute left-0 top-50px w-full rounded-xs border border-input-stroke-input bg-input-surface-input-background ${isHistorySortMenuOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-10 opacity-0'} z-10 px-12px py-8px text-sm shadow-md transition-all duration-300 ease-in-out`}
      >
        <button
          type="button"
          className="w-full p-8px text-left hover:bg-dropdown-surface-item-hover"
          onClick={() => setHistorySorting(SortOptions.newest)}
        >
          {t(SortOptions.newest)}
        </button>
        <button
          type="button"
          className="w-full p-8px text-left hover:bg-dropdown-surface-item-hover"
          onClick={() => setHistorySorting(SortOptions.oldest)}
        >
          {t(SortOptions.oldest)}
        </button>
      </div>
    </div>
  );

  const displayedPendingTypeDropMenu = (
    <div
      ref={pendingTypeMenuRef}
      onClick={togglePendingTypeMenu}
      className={`relative flex w-full items-center justify-between rounded-xs border border-input-stroke-input ${isPendingTypeMenuOpen ? 'border-input-stroke-input-hover' : 'border-input-stroke-input'} bg-input-surface-input-background px-12px py-10px hover:cursor-pointer hover:border-input-stroke-input-hover`}
    >
      <p className="text-text-neutral-primary">{pendingFilteredType}</p>
      <FaChevronDown size={16} />
      {/* Info: (20240624 - Julian) Sort By Drop Menu */}
      <div
        className={`absolute left-0 top-50px w-full rounded-xs border border-input-stroke-input bg-input-surface-input-background ${isPendingTypeMenuOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-10 opacity-0'} z-10 px-12px py-8px text-sm shadow-md transition-all duration-300 ease-in-out`}
      >
        {typeOptions.map((option) => (
          <button
            key={option}
            type="button"
            className="w-full p-8px text-left hover:bg-dropdown-surface-item-hover"
            onClick={() => setPendingFilteredType(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );

  const displayedHistoryTypeDropMenu = (
    <div
      ref={historyTypeMenuRef}
      onClick={toggleHistoryTypeMenu}
      className={`relative flex w-full items-center justify-between rounded-xs border border-input-stroke-input ${isHistoryTypeMenuOpen ? 'border-input-stroke-input-hover' : 'border-input-stroke-input'} bg-input-surface-input-background px-12px py-10px hover:cursor-pointer hover:border-input-stroke-input-hover`}
    >
      <p className="text-text-neutral-primary">{historyFilteredType}</p>
      <FaChevronDown size={16} />
      {/* Info: (20240624 - Julian) Sort By Drop Menu */}
      <div
        className={`absolute left-0 top-50px w-full rounded-xs border border-input-stroke-input bg-input-surface-input-background ${isHistoryTypeMenuOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-10 opacity-0'} z-10 px-12px py-8px text-sm shadow-md transition-all duration-300 ease-in-out`}
      >
        {typeOptions.map((option) => (
          <button
            key={option}
            type="button"
            className="w-full p-8px text-left hover:bg-dropdown-surface-item-hover"
            onClick={() => setHistoryFilteredType(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col gap-16px">
      {/* Info: (20240624 - Julian) Pending Report Filter */}
      <div className="flex items-end gap-x-24px">
        {/* Info: (20240624 - Julian) Sort */}
        <div className="flex w-1/5 flex-col gap-y-8px">
          <p className="font-semibold text-navyBlue2">{t('SORTING.SORT_BY')}</p>
          {displayedPendingSortDropMenu}
        </div>
        {/* Info: (20240624 - Julian) Type */}
        <div className="flex w-1/5 flex-col gap-y-8px">
          <p className="font-semibold text-navyBlue2">{t('JOURNAL.TYPE')}</p>
          {displayedPendingTypeDropMenu}
        </div>
        {/* Info: (20240624 - Julian) Date Picker */}
        <div className="w-1/5">
          <DatePicker
            type={DatePickerType.TEXT_PERIOD}
            period={pendingFilteredPeriod}
            setFilteredPeriod={setPendingFilteredPeriod}
          />
        </div>
        {/* Info: (20240624 - Julian) Search bar */}
        <div className="flex h-46px w-2/5 items-center justify-between rounded-xs border border-input-stroke-input bg-input-surface-input-background px-12px py-8px text-text-neutral-primary">
          <input
            id="pendingReportSearchBar"
            type="text"
            placeholder={t('AUDIT_REPORT.SEARCH')}
            value={pendingSearch}
            onChange={pendingSearchChangeHandler}
            className="w-full outline-none placeholder:text-lightGray4"
          />
          <FiSearch size={20} />
        </div>
      </div>

      {/* Info: (20240624 - Julian) Pending Report */}
      <div className="flex flex-col max-md:max-w-full">
        {/* Info: (20240624 - Julian) Pending Divider */}
        <div className="my-5 flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Image src={'/icons/hour_glass.svg'} alt="pending_icon" width={16} height={16} />
            <p>{t('MY_REPORTS_SECTION.PENDING')}</p>
          </div>
          <hr className="flex-1 border-lightGray4" />
        </div>

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

      {/* Info: (20240624 - Julian) History Report Filter */}
      <div className="flex items-end gap-x-24px">
        {/* Info: (20240624 - Julian) Sort */}
        <div className="flex w-1/5 flex-col gap-y-8px">
          <p className="font-semibold text-navyBlue2">{t('SORTING.SORT_BY')}</p>
          {displayedHistorySortDropMenu}
        </div>
        {/* Info: (20240624 - Julian) Type */}
        <div className="flex w-1/5 flex-col gap-y-8px">
          <p className="font-semibold text-navyBlue2">{t('JOURNAL.TYPE')}</p>
          {displayedHistoryTypeDropMenu}
        </div>
        {/* Info: (20240624 - Julian) Date Picker */}
        <div className="w-1/5">
          <DatePicker
            type={DatePickerType.TEXT_PERIOD}
            period={historyFilteredPeriod}
            setFilteredPeriod={setHistoryFilteredPeriod}
          />
        </div>
        {/* Info: (20240624 - Julian) Search bar */}
        <div className="flex h-46px w-2/5 items-center justify-between rounded-xs border border-input-stroke-input bg-input-surface-input-background px-12px py-8px text-text-neutral-primary">
          <input
            id="historyReportSearchBar"
            type="text"
            placeholder={t('AUDIT_REPORT.SEARCH')}
            value={historySearch}
            onChange={historySearchChangeHandler}
            className="w-full outline-none placeholder:text-lightGray4"
          />
          <FiSearch size={20} />
        </div>
      </div>

      {/* Info: (20240624 - Julian) Reports History */}
      <div className="flex flex-col max-md:max-w-full">
        {/* Info: (20240624 - Julian) Pending Divider */}
        <div className="my-5 flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Image src={'/icons/file.svg'} alt="history_icon" width={16} height={16} />
            <p>{t('MY_REPORTS_SECTION.REPORTS_HISTORY')}</p>
          </div>
          <hr className="flex-1 border-lightGray4" />
        </div>

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
    </div>
  );
};

export default ProjectReportPageBody;
