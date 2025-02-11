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
import { IPaginatedData } from '@/interfaces/pagination';
import { useModalContext } from '@/contexts/modal_context';
import { ToastId } from '@/constants/toast_id';
import { ToastType } from '@/interfaces/toastify';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { SortOrder, SortBy } from '@/constants/sort';
// import { useTranslation } from 'next-i18next';

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
  sort?: {
    by: SortBy;
    order: SortOrder;
  };
  disableDateSearch?: boolean;
  displayTypeFilter?: boolean;
  hideReversedRelated?: boolean; // Info: (20250210 - Julian) 用於 VoucherListBody，隱藏沖銷分錄
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
}: FilterSectionProps<T>) => {
  // const { t } = useTranslation(['common']);
  const { toastHandler } = useModalContext();
  const [selectedType, setSelectedType] = useState<string | undefined>(
    types.length > 0 ? types[0] : undefined
  );
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(
    statuses.length > 0 ? statuses[0] : undefined
  );
  const [selectedDateRange, setSelectedDateRange] = useState<IDatePeriod>({
    startTimeStamp: 0,
    endTimeStamp: 0,
  });
  const [searchQuery, setSearchQuery] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedSortOption, setSelectedSortOption] = useState<
    | {
        by: string;
        order: SortOrder;
      }
    | undefined
  >(sort ? { by: sort.by, order: sort.order } : undefined);

  // Info: (20241022 - tzuhan) @Murky, <...> 裡面是 CERTIFICATE_LIST_V2 API 需要的回傳資料格式
  const { trigger } = APIHandler<IPaginatedData<T>>(apiName);

  // Info: (20240919 - tzuhan) 發送 API 請求
  const fetchData = useCallback(async () => {
    // Deprecated: (20241115 - Liz)
    // eslint-disable-next-line no-console
    console.log('call FilterSection fetchData');

    try {
      if (isLoading) return;
      setIsLoading(true);
      // Info: (20241022 - tzuhan) @Murky, 這裡是前端呼叫 CERTIFICATE_LIST_V2 API 的地方，以及query參數的組合

      const effectiveSort = selectedSortOption || { by: SortBy.DATE, order: SortOrder.DESC };

      const { success, code, data } = await trigger({
        params,
        query: {
          // Info: (20241025 - tzuhan) @Shirley, @Murky 這裡是共同處理 List all assets / get all certificate / get all voucher / list news / list reports 的地方，需要協助確認query格式，特別幫我注意一下sortOption，需要修改可以提
          page,
          pageSize,
          tab,
          type: selectedType,
          status: selectedStatus, // Info: (20241022 - tzuhan) 這個如果是用在<CertificateListBody> 或是 <CertificateSelectorModal>, 會是 undefined，所以不會被加入 query 參數
          sortOption: `${effectiveSort.by}:${effectiveSort.order}`,
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
    if (sort && (sort.by !== selectedSortOption?.by || sort.order !== selectedSortOption?.order)) {
      setSelectedSortOption(sort);
    }
  }, [sort]);

  // Info: (20240919 - tzuhan) 每次狀態變更時，組合查詢條件並發送 API 請求
  useEffect(() => {
    if (typeof window !== 'undefined') {
      fetchData();
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
  ]);

  return (
    <div
      className={`flex flex-wrap items-end justify-start gap-4 ${className || ''}`}
      style={{ maxWidth: '100%' }}
    >
      {/* Info: (20240919 - tzuhan) 類型篩選 */}
      {!displayTypeFilter && types.length > 0 && (
        <SelectFilter
          label="Type"
          options={types}
          selectedValue={selectedType}
          onChange={setSelectedType}
          containerClassName="flex-1"
        />
      )}

      {/* Info: (20240919 - tzuhan) 狀態篩選 */}
      {statuses.length > 0 && (
        <SelectFilter
          label="Status"
          options={statuses}
          selectedValue={selectedStatus}
          onChange={setSelectedStatus}
          containerClassName="flex-1"
        />
      )}

      {/* Info: (20240919 - tzuhan) 時間區間篩選 */}
      {!disableDateSearch && (
        <div className="flex min-w-250px flex-1 flex-col">
          <DatePicker
            period={selectedDateRange}
            setFilteredPeriod={setSelectedDateRange}
            type={DatePickerType.TEXT_PERIOD}
            btnClassName=""
          />
        </div>
      )}

      {/* Info: (20240919 - tzuhan) 搜索欄 */}
      {enableSearch && <SearchInput searchQuery={searchQuery} onSearchChange={setSearchQuery} />}

      {/* Info: (20240919 - tzuhan) 顯示風格切換 */}
      {viewType && viewToggleHandler && (
        <ViewToggle viewType={viewType} onViewTypeChange={viewToggleHandler} />
      )}

      {/* Info: (20240919 - tzuhan) 排序選項 */}
      {/* {selectedSortOptions[SortBy.DATE] ? (
        <button type="button" className="flex items-center space-x-2 pb-2" onClick={handleSort}>
          <Image src="/elements/double_arrow_down.svg" alt="arrow_down" width={20} height={20} />
          <div className="leading-none">
            {selectedSortOptions[SortBy.DATE].order === SortOrder.DESC
              ? t('common:SORTING.NEWEST')
              : t('common:SORTING.OLDEST')}
          </div>
        </button>
      ) : (
        sortingOptions.length > 0 && (
          <SelectFilter
            label="Sort"
            options={sortingOptions}
            selectedValue={selectedSorting}
            onChange={setSelectedSorting}
          />
        )
      )} */}
    </div>
  );
};

export default FilterSection;
