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
  IPendingReportItem,
  ReportKind,
} from '@/interfaces/report_item';
import { IDatePeriod } from '@/interfaces/date_period';
import { ToastType } from '@/interfaces/toastify';
import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import { useGlobalCtx } from '@/contexts/global_context';
import { useTranslation } from 'next-i18next';

const ProjectReportPageBody = ({ projectId }: { projectId: string }) => {
  const { t } = useTranslation('common');
  const { selectedCompany } = useUserCtx();
  const { toastHandler } = useGlobalCtx();

  const typeOptions = ['All', ReportKind.analysis, ReportKind.financial];

  const [sorting, setSorting] = useState<string>(SortOptions.newest);
  const [filteredType, setFilteredType] = useState<string>(typeOptions[0]);
  const [filteredPeriod, setFilteredPeriod] = useState<IDatePeriod>(default30DayPeriodInSec);
  const [search, setSearch] = useState<string>('');
  const [pendingData, setPendingData] = useState<IPendingReportItem[]>([]);
  const [historyData, setHistoryData] = useState<IGeneratedReportItem[]>([]);
  const [pendingCurrentPage, setPendingCurrentPage] = useState<number>(1);
  const [historyCurrentPage, setHistoryCurrentPage] = useState<number>(1);

  // ToDo: (20240624 - Julian) Replace with api data
  const pendingTotalPages = 5;
  const historyTotalPages = 5;

  const {
    data: pendingReports,
    code: listPendingCode,
    success: listPendingSuccess,
  } = APIHandler<IPendingReportItem[]>(APIName.REPORT_LIST_PENDING, {
    params: { companyId: selectedCompany?.id ?? DEFAULT_DISPLAYED_COMPANY_ID },
    query: { projectId },
  });
  const {
    data: generatedReports,
    code: listGeneratedCode,
    success: listGeneratedSuccess,
  } = APIHandler<IGeneratedReportItem[]>(APIName.REPORT_LIST_GENERATED, {
    params: { companyId: selectedCompany?.id ?? DEFAULT_DISPLAYED_COMPANY_ID },
    query: { projectId },
  });

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
    targetRef: sortByMenuRef,
    componentVisible: isSortByMenuOpen,
    setComponentVisible: setIsSortByMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: typeMenuRef,
    componentVisible: isTypeMenuOpen,
    setComponentVisible: setIsTypeMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const toggleSortByMenu = () => setIsSortByMenuOpen(!isSortByMenuOpen);
  const toggleTypeMenu = () => setIsTypeMenuOpen(!isTypeMenuOpen);
  const searchChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value);

  const displayedSortByDropMenu = (
    <div
      ref={sortByMenuRef}
      onClick={toggleSortByMenu}
      className={`relative flex w-full items-center justify-between rounded-xs border border-input-stroke-input 
        ${isSortByMenuOpen ? 'border-input-stroke-input-hover' : 'border-input-stroke-input'} 
        bg-input-surface-input-background px-12px py-10px hover:cursor-pointer hover:border-input-stroke-input-hover`}
    >
      <p className="text-text-neutral-primary">
        {/* {sorting} */}
        {t(sorting)}
      </p>
      <FaChevronDown size={16} />
      {/* Info: (20240624 - Julian) Sort By Drop Menu */}
      <div
        className={`absolute left-0 top-50px w-full rounded-xs border border-input-stroke-input bg-input-surface-input-background
        ${isSortByMenuOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-10 opacity-0'} 
        z-10 px-12px py-8px text-sm shadow-md transition-all duration-300 ease-in-out`}
      >
        <button
          type="button"
          className="w-full p-8px text-left hover:bg-dropdown-surface-item-hover"
          onClick={() => setSorting(SortOptions.newest)}
        >
          {SortOptions.newest}
        </button>
        <button
          type="button"
          className="w-full p-8px text-left hover:bg-dropdown-surface-item-hover"
          onClick={() => setSorting(SortOptions.oldest)}
        >
          {SortOptions.oldest}
        </button>
      </div>
    </div>
  );

  const displayedTypeDropMenu = (
    <div
      ref={typeMenuRef}
      onClick={toggleTypeMenu}
      className={`relative flex w-full items-center justify-between rounded-xs border border-input-stroke-input 
        ${isTypeMenuOpen ? 'border-input-stroke-input-hover' : 'border-input-stroke-input'} 
        bg-input-surface-input-background px-12px py-10px hover:cursor-pointer hover:border-input-stroke-input-hover`}
    >
      <p className="text-text-neutral-primary">{filteredType}</p>
      <FaChevronDown size={16} />
      {/* Info: (20240624 - Julian) Sort By Drop Menu */}
      <div
        className={`absolute left-0 top-50px w-full rounded-xs border border-input-stroke-input bg-input-surface-input-background
        ${isTypeMenuOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-10 opacity-0'} 
        z-10 px-12px py-8px text-sm shadow-md transition-all duration-300 ease-in-out`}
      >
        {typeOptions.map((option) => (
          <button
            key={option}
            type="button"
            className="w-full p-8px text-left hover:bg-dropdown-surface-item-hover"
            onClick={() => setFilteredType(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col gap-16px">
      {/* Info: (20240624 - Julian) Filter */}
      <div className="flex items-end gap-x-24px">
        {/* Info: (20240624 - Julian) Sort */}
        <div className="flex w-1/5 flex-col gap-y-8px">
          <p className="font-semibold text-navyBlue2">{t('SORTING.SORT_BY')}</p>
          {displayedSortByDropMenu}
        </div>
        {/* Info: (20240624 - Julian) Type */}
        <div className="flex w-1/5 flex-col gap-y-8px">
          <p className="font-semibold text-navyBlue2">{t('JOURNAL.TYPE')}</p>
          {displayedTypeDropMenu}
        </div>
        {/* Info: (20240624 - Julian) Date Picker */}
        <div className="w-1/5">
          <DatePicker
            type={DatePickerType.TEXT_PERIOD}
            period={filteredPeriod}
            setFilteredPeriod={setFilteredPeriod}
          />
        </div>
        {/* Info: (20240624 - Julian) Search bar */}
        <div className="flex h-46px w-2/5 items-center justify-between rounded-xs border border-input-stroke-input bg-input-surface-input-background px-12px py-8px text-text-neutral-primary">
          <input
            id="reportSearchBar"
            type="text"
            placeholder="Search"
            value={search}
            onChange={searchChangeHandler}
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
