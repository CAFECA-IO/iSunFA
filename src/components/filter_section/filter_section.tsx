import React, { useState, useEffect, useCallback } from 'react';
// import Image from 'next/image';
import APIHandler from '@/lib/utils/api_handler';
import { IAPIName } from '@/interfaces/api_connection';
import { IDatePeriod } from '@/interfaces/date_period';
import { DISPLAY_LIST_VIEW_TYPE } from '@/constants/display';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import SelectFilter from '@/components/filter_section/select_filter';
import SearchInput from '@/components/filter_section/search_input';
import ViewToggle from '@/components/filter_section/view_toggle';
import Toggle from '@/components/toggle/toggle';
import { IPaginatedData } from '@/interfaces/pagination';
import { useModalContext } from '@/contexts/modal_context';
import { ToastId } from '@/constants/toast_id';
import { ToastType } from '@/interfaces/toastify';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { SortOrder, SortBy } from '@/constants/sort';
import { ISortOption } from '@/interfaces/sort';
import { RxCross2 } from 'react-icons/rx';
import { useTranslation } from 'next-i18next';
import loggerFront from '@/lib/utils/logger_front';

interface FilterSectionProps<T> {
  className?: string;
  apiName: IAPIName;
  params?: Record<string, string | number | boolean | undefined>;
  page: number;
  pageSize: number;
  tab?: string;
  types?: string[];
  statuses?: string[];
  // sortingOptions?: SortBy[];
  enableSearch?: boolean;
  onApiResponse?: (resData: IPaginatedData<T>) => void; // Info: (20240919 - tzuhan) 回傳 API 回應資料
  viewType?: DISPLAY_LIST_VIEW_TYPE;
  viewToggleHandler?: (viewType: DISPLAY_LIST_VIEW_TYPE) => void;
  // setDateSort?: React.Dispatch<React.SetStateAction<SortOrder | null>>;
  /* Deprecated: (20250107 - tzuhan) 一次只能有一個排序條件
  dateSort?: SortOrder | null;
  otherSorts?: {
    sort: SortBy;
    sortOrder: SortOrder;
  }[];
  */
  sort?: ISortOption;
  disableDateSearch?: boolean;
  displayTypeFilter?: boolean;
  hideReversedRelated?: boolean; // Info: (20250210 - Julian) 用於 VoucherListBody，隱藏沖銷分錄
  hideReversalsToggleHandler?: (isOpen: boolean) => void; // Info: (20250528 - Julian) 用於 VoucherListBody，沖銷分錄開關
  flagOfRefresh?: boolean; // Info: (20250221 - Julian) 當 flagOfRefresh 變更時，重新發送 API 請求

  // Info: (20250324 - Anna) 篩選條件（類型、日期、關鍵字）改變時，可透過此 prop 回傳給父層
  onFilterChange?: (filters: {
    type?: string;
    startDate?: number;
    endDate?: number;
    keyword?: string;
  }) => void;
  initialStartDate?: number;
  initialEndDate?: number;
  initialType?: string;
  initialKeyword?: string;
  initialPage?: number;
  labelClassName?: string; // Info: (20250416 - Anna) label的 className

  isShowSideMenu?: boolean; // Info: (20250528 - Julian) 側邊欄是否打開
  toggleSideMenu?: () => void; // Info: (20250528 - Julian) 側邊欄開關
}

const FilterSection = <T,>({
  className,
  apiName,
  params,
  page = 1,
  pageSize = DEFAULT_PAGE_LIMIT,
  tab,
  enableSearch = true,
  types = [],
  statuses = [],
  // sortingOptions = [],
  onApiResponse,
  viewType,
  viewToggleHandler,
  // setDateSort,
  /* Deprecated: (20250107 - tzuhan) 一次只能有一個排序條件
  dateSort,
  otherSorts,
  */
  sort,
  disableDateSearch,
  displayTypeFilter,
  hideReversedRelated,
  hideReversalsToggleHandler,
  flagOfRefresh,
  onFilterChange,
  initialStartDate,
  initialEndDate,
  initialType,
  initialKeyword,
  initialPage,
  labelClassName = '',
  isShowSideMenu,
  toggleSideMenu,
}: FilterSectionProps<T>) => {
  const { t } = useTranslation(['common']);
  const { toastHandler } = useModalContext();

  // Info: (20250324 - Anna) 以 initialPage 優先，沒有的話就用外層的 page 值
  const currentPage = initialPage ?? page;

  const [selectedType, setSelectedType] = useState<string | undefined>(
    // Info: (20250324 - Anna) 類型篩選的初始值
    initialType ?? (types.length > 0 ? types[0] : undefined)
  );
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(
    statuses.length > 0 ? statuses[0] : undefined
  );
  // Info: (20250324 - Anna) 日期範圍，優先使用初始值，沒有就預設為 0
  const [selectedDateRange, setSelectedDateRange] = useState<IDatePeriod>({
    startTimeStamp: initialStartDate ?? 0,
    endTimeStamp: initialEndDate ?? 0,
  });
  // Info: (20250324 - Anna) 初始化搜尋關鍵字，優先使用從父層傳入的 initialKeyword
  const [searchQuery, setSearchQuery] = useState<string | undefined>(initialKeyword);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedSortOption, setSelectedSortOption] = useState<ISortOption | undefined>(
    sort ? { sortBy: sort.sortBy, sortOrder: sort.sortOrder } : undefined
  );

  // Info: (20250324 - Anna) 判斷是否為初次載入（無初始篩選條件）
  const [isInitialized] = useState(() => {
    return !(initialStartDate || initialEndDate || initialType || initialKeyword);
  });

  // Info: (20250528 - Julian) 如果有傳入相關參數和處理函數，則顯示沖銷分錄開關
  const isShowReversedToggle = hideReversedRelated !== undefined && hideReversalsToggleHandler;

  // Info: (20250528 - Julian) 側邊欄樣式 => 隱藏電腦版 type / date picker
  const isSideMenuStyle = isShowSideMenu !== undefined && toggleSideMenu;

  // Info: (20241022 - tzuhan) @Murky, <...> 裡面是 CERTIFICATE_LIST_V2 API 需要的回傳資料格式
  const { trigger } = APIHandler<IPaginatedData<T>>(apiName);

  // Info: (20240919 - tzuhan) 發送 API 請求
  const fetchData = useCallback(async () => {
    loggerFront.log('call FilterSection fetchData');

    try {
      if (isLoading) return;
      setIsLoading(true);
      // Info: (20241022 - tzuhan) @Murky, 這裡是前端呼叫 CERTIFICATE_LIST_V2 API 的地方，以及query參數的組合

      const effectiveSort = selectedSortOption || {
        sortBy: SortBy.DATE,
        sortOrder: SortOrder.DESC,
      };

      const { success, code, data } = await trigger({
        params,
        query: {
          // Info: (20241025 - tzuhan) @Shirley, @Murky 這裡是共同處理 List all assets / get all certificate / get all voucher / list news / list reports 的地方，需要協助確認query格式，特別幫我注意一下sortOption，需要修改可以提
          page: currentPage,
          pageSize,
          tab,
          type: selectedType,
          status: selectedStatus, // Info: (20241022 - tzuhan) 這個如果是用在<CertificateListBody> 或是 <CertificateSelectorModal>, 會是 undefined，所以不會被加入 query 參數
          sortOption: `${effectiveSort.sortBy}:${effectiveSort.sortOrder}`,
          startDate: !selectedDateRange.startTimeStamp
            ? undefined
            : selectedDateRange.startTimeStamp,
          endDate: !selectedDateRange.endTimeStamp ? undefined : selectedDateRange.endTimeStamp,
          searchQuery,
          hideReversedRelated,
        },
      });
      if (success && onApiResponse && data) onApiResponse(data);
      if (!success) {
        // ToDo: (20241021 - tzuhan) handle error
        toastHandler({
          id: ToastId.API_REQUEST_FAILED,
          type: ToastType.ERROR,
          content: `API Request Failed: ${code}`,
          closeable: true,
        });
      }
    } catch (error) {
      // ToDo: (20241021 - tzuhan) handle error
      toastHandler({
        id: ToastId.API_REQUEST_FAILED,
        type: ToastType.ERROR,
        content: `API Request error: ${(error as Error).message}`,
        closeable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    isLoading,
    tab,
    selectedType,
    selectedStatus,
    selectedDateRange,
    searchQuery,
    selectedSortOption,
    page,
    hideReversedRelated,
  ]);

  // const handleSort = () => {
  //   if (setDateSort) {
  //     if (selectedSortOptions[SortBy.DATE]) {
  //       setDateSort(
  //         selectedSortOptions[SortBy.DATE].order === SortOrder.DESC ? SortOrder.ASC : SortOrder.DESC
  //       );
  //     } else {
  //       setDateSort(SortOrder.DESC);
  //     }
  //   }
  // };

  useEffect(() => {
    if (
      sort &&
      (sort.sortBy !== selectedSortOption?.sortBy ||
        sort.sortOrder !== selectedSortOption?.sortOrder)
    ) {
      setSelectedSortOption(sort);
    }
  }, [sort]);

  // Info: (20240919 - tzuhan) 每次狀態變更時，組合查詢條件並發送 API 請求
  useEffect(() => {
    if (typeof window !== 'undefined') {
      fetchData();
      // Info: (20250324 - Anna) 將篩選條件回傳給父層
      if (onFilterChange) {
        onFilterChange({
          startDate: selectedDateRange.startTimeStamp || undefined,
          endDate: selectedDateRange.endTimeStamp || undefined,
          type: selectedType,
          keyword: searchQuery,
        });
      }
    }
  }, [
    page,
    pageSize,
    tab,
    selectedType,
    selectedStatus,
    selectedDateRange,
    searchQuery,
    selectedSortOption,
    hideReversedRelated,
    flagOfRefresh,
    isInitialized, // Info: (20250324 - Anna) 初始篩選條件條件載入完成後，發送第一次 API 請求
  ]);

  return (
    <div
      className={`z-30 flex flex-col items-end justify-start gap-4 tablet:flex-row tablet:flex-wrap ${className || ''}`}
      style={{ maxWidth: '100%' }}
    >
      {/* Info: (20240919 - tzuhan) 類型篩選 */}
      {!displayTypeFilter && types.length > 0 && (
        <SelectFilter
          label="Type"
          options={types}
          selectedValue={selectedType}
          onChange={setSelectedType}
          containerClassName={`${isSideMenuStyle ? 'hidden tablet:flex' : ''} basis-1/5`}
          labelClassName={labelClassName}
        />
      )}

      {/* Info: (20240919 - tzuhan) 狀態篩選 */}
      {statuses.length > 0 && (
        <SelectFilter
          label="Status"
          options={statuses}
          selectedValue={selectedStatus}
          onChange={setSelectedStatus}
          containerClassName={`${isSideMenuStyle ? 'hidden tablet:flex' : ''} basis-1/5`}
          labelClassName={labelClassName}
        />
      )}

      {/* Info: (20240919 - tzuhan) 時間區間篩選 */}
      {!disableDateSearch && (
        <DatePicker
          label="Issue_Date"
          period={selectedDateRange}
          setFilteredPeriod={setSelectedDateRange}
          type={DatePickerType.TEXT_PERIOD}
          datePickerClassName={`${isSideMenuStyle ? 'hidden tablet:flex' : ''} basis-1/5`}
          labelClassName={labelClassName}
        />
      )}

      {/* Info: (20240919 - tzuhan) 搜索欄 */}
      {enableSearch && (
        <SearchInput
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          className="w-full grow"
        />
      )}

      {/* Info: (20240919 - tzuhan) 顯示風格切換 */}
      {viewType && viewToggleHandler && (
        <ViewToggle viewType={viewType} onViewTypeChange={viewToggleHandler} />
      )}

      {/* Info: (20250528 - Julian) ========== 手機版側邊欄 ========== */}
      <div
        className={`fixed inset-0 z-120 flex items-center justify-center bg-black/50 transition-all duration-300 ease-in-out tablet:hidden ${isShowSideMenu ? 'visible opacity-100' : 'invisible opacity-0'}`}
      >
        {/* Info: (20250528 - Julian) 選單 */}
        <div
          className={`fixed right-0 top-0 z-130 flex h-screen w-90vw flex-col gap-lv-5 bg-white px-16px py-24px transition-all duration-300 ease-in-out ${isShowSideMenu ? 'translate-x-0' : 'translate-x-full'}`}
        >
          {/* Info: (20250528 - Julian) Header */}
          <div className="relative flex w-full flex-col items-center">
            <button type="button" className="absolute left-0 p-10px" onClick={toggleSideMenu}>
              <RxCross2 size={16} />
            </button>
            <p className="text-center text-base font-semibold text-text-neutral-secondary">
              {t('common:COMMON.FILTER')}
            </p>
          </div>

          {/* Info: (20250528 - Julian) 分隔線 */}
          <hr className="border-divider-stroke-lv-4" />
          {/* Info: (20250528 - Julian) 選單內容 */}
          <div className="flex flex-col items-stretch gap-lv-4">
            {/* Info: (20250528 - Julian) 類型篩選 */}
            {!displayTypeFilter && types.length > 0 && (
              <SelectFilter
                label="Type"
                options={types}
                selectedValue={selectedType}
                onChange={setSelectedType}
                labelClassName="text-input-text-primary"
              />
            )}

            {/* Info: (20240919 - tzuhan) 狀態篩選 */}
            {statuses.length > 0 && (
              <SelectFilter
                label="Status"
                options={statuses}
                selectedValue={selectedStatus}
                onChange={setSelectedStatus}
              />
            )}

            {/* Info: (20250528 - Julian) 時間區間篩選 */}
            <div className="flex flex-col items-start gap-8px">
              <DatePicker
                label="Issue_Date"
                type={DatePickerType.TEXT_PERIOD}
                period={selectedDateRange}
                setFilteredPeriod={setSelectedDateRange}
                btnClassName="h-46px"
                calenderClassName="w-full"
              />
            </div>
          </div>

          {/* Info: (20250528 - Julian) 開關 */}
          {isShowReversedToggle && (
            <Toggle
              id="hide-reversals-toggle-mobile"
              initialToggleState={hideReversedRelated}
              toggleStateFromParent={hideReversedRelated}
              getToggledState={() => hideReversalsToggleHandler(!hideReversedRelated)}
              label={t('journal:VOUCHER.HIDE_VOUCHER_TOGGLE')}
              labelClassName="text-xs font-medium text-switch-text-primary"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterSection;
