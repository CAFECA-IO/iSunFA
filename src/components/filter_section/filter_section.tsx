import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
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
import { useTranslation } from 'next-i18next';

interface FilterSectionProps<T> {
  className?: string;
  apiName: IAPIName;
  params?: Record<string, string | number | boolean | undefined>;
  page: number;
  pageSize: number;
  tab?: string;
  types?: string[];
  statuses?: string[];
  sortingOptions?: SortBy[];
  enableSearch?: boolean;
  onApiResponse?: (resData: IPaginatedData<T>) => void; // Info: (20240919 - tzuhan) 回傳 API 回應資料
  viewType?: DISPLAY_LIST_VIEW_TYPE;
  viewToggleHandler?: (viewType: DISPLAY_LIST_VIEW_TYPE) => void;
  dateSort?: SortOrder | null;
  setDateSort?: React.Dispatch<React.SetStateAction<SortOrder | null>>;
  otherSorts?: {
    sort: SortBy;
    sortOrder: SortOrder;
  }[];
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
  sortingOptions = [],
  onApiResponse,
  viewType,
  viewToggleHandler,
  dateSort,
  setDateSort,
  otherSorts,
}: FilterSectionProps<T>) => {
  const { t } = useTranslation(['certificate', 'common']);
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
  const [selectedSorting, setSelectedSorting] = useState<string | undefined>(
    sortingOptions.length > 0 ? sortingOptions[0] : undefined
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedSortOptions, setSelectedSortOptions] = useState<{
    [key: string]: {
      by: string;
      order: SortOrder;
    };
  }>({});

  // Info: (20241022 - tzuhan) @Murky, <...> 裡面是 CERTIFICATE_LIST_V2 API 需要的回傳資料格式
  const { trigger } = APIHandler<IPaginatedData<T>>(apiName);

  // Info: (20240919 - tzuhan) 發送 API 請求
  const fetchData = useCallback(async () => {
    try {
      if (isLoading) return;
      setIsLoading(true);
      // Info: (20241022 - tzuhan) @Murky, 這裡是前端呼叫 CERTIFICATE_LIST_V2 API 的地方，以及query參數的組合
      const { success, code, data } = await trigger({
        params,
        query: {
          // Info: (20241025 - tzuhan) @Shirly, @Murky 這裡是共同處理 List all assets / get all certificate / get all voucher / list news / list reports 的地方，需要協助確認query格式，特別幫我注意一下sortOption，需要修改可以提
          page,
          pageSize,
          tab, // Info: (20241022 - tzuhan) @Murky, 這個不夠泛用，需要修改成 tab（for voucherList or certificateList)
          type: selectedType,
          status: selectedStatus, // Info: (20241022 - tzuhan) 這個如果是用在<CertificateListBody> 或是 <CertificateSelectorModal>, 會是 undefined，所以不會被加入 query 參數
          // Info: (20241022 - tzuhan) @Murky, 這裡排序需要可以多種方式排序，所以需要修改
          sortOption: JSON.stringify(selectedSortOptions),
          startDate: !selectedDateRange.startTimeStamp
            ? undefined
            : selectedDateRange.startTimeStamp,
          endDate: !selectedDateRange.endTimeStamp ? undefined : selectedDateRange.endTimeStamp,
          searchQuery,
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
    selectedSortOptions,
    page,
  ]);

  const handleSort = () => {
    if (setDateSort) {
      if (selectedSortOptions[SortBy.DATE]) {
        setDateSort(
          selectedSortOptions[SortBy.DATE].order === SortOrder.DESC ? SortOrder.ASC : SortOrder.DESC
        );
      } else {
        setDateSort(SortOrder.DESC);
      }
    }
  };

  useEffect(() => {
    if (dateSort) {
      setSelectedSortOptions((prev) => ({
        ...prev,
        [SortBy.DATE]: {
          by: SortBy.DATE,
          order: dateSort,
        },
      }));
    } else {
      setSelectedSortOptions((prev) => {
        const rest = { ...prev };
        delete rest[SortBy.DATE];
        return rest;
      });
    }
    if (otherSorts) {
      otherSorts.forEach(({ sort, sortOrder }) => {
        if (sort === SortBy.DATE) return;
        setSelectedSortOptions((prev) => ({
          ...prev,
          [sort]: {
            by: sort,
            order: sortOrder,
          },
        }));
      });
    }
  }, [dateSort, otherSorts]);

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
    selectedSortOptions,
  ]);

  return (
    <div
      className={`flex flex-wrap items-end justify-start gap-4 ${className || ''}`}
      style={{ maxWidth: '100%' }}
    >
      {/* Info: (20240919 - tzuhan) 類型篩選 */}
      {types.length > 0 && (
        <SelectFilter
          label="Type"
          options={types}
          selectedValue={selectedType}
          onChange={setSelectedType}
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

      {/* Info: (20240919 - tzuhan) 時間區間篩選 */}
      <div className="flex min-w-250px flex-1 flex-col">
        <DatePicker
          period={selectedDateRange}
          setFilteredPeriod={setSelectedDateRange}
          type={DatePickerType.TEXT_PERIOD}
          btnClassName=""
        />
      </div>

      {/* Info: (20240919 - tzuhan) 搜索欄 */}
      {enableSearch && <SearchInput searchQuery={searchQuery} onSearchChange={setSearchQuery} />}

      {/* Info: (20240919 - tzuhan) 顯示風格切換 */}
      {viewType && viewToggleHandler && (
        <ViewToggle viewType={viewType} onViewTypeChange={viewToggleHandler} />
      )}

      {/* Info: (20240919 - tzuhan) 排序選項 */}
      {selectedSortOptions[SortBy.DATE] ? (
        <button type="button" className="flex items-center space-x-2 pb-2" onClick={handleSort}>
          <Image src="/elements/double_arrow_down.svg" alt="arrow_down" width={20} height={20} />
          <div className="leading-none">
            {selectedSortOptions[SortBy.DATE].order === SortOrder.DESC
              ? t('common:SORTING.NEWEST')
              : t('common:SORTING.ORDEST')}
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
      )}
    </div>
  );
};

export default FilterSection;
