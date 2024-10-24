import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import APIHandler from '@/lib/utils/api_handler';
import { IAPIName } from '@/interfaces/api_connection';
import { IDatePeriod } from '@/interfaces/date_period';
import { generateRandomCertificates, ICertificate } from '@/interfaces/certificate';
import { DISPLAY_LIST_VIEW_TYPE } from '@/constants/display';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import SelectFilter from '@/components/filter_section/select_filter';
import SearchInput from '@/components/filter_section/search_input';
import ViewToggle from '@/components/filter_section/view_toggle';

interface FilterSectionProps {
  className?: string;
  apiName: IAPIName;
  params?: Record<string, string | number | boolean>;
  types?: string[];
  statuses?: string[];
  sortingOptions?: string[];
  sortingByDate?: boolean;
  onApiResponse?: (data: ICertificate[]) => void; // Info: (20240919 - tzuhan) 回傳 API 回應資料
  viewType?: DISPLAY_LIST_VIEW_TYPE;
  viewToggleHandler?: (viewType: DISPLAY_LIST_VIEW_TYPE) => void;
  extraQuery?: Record<string, string | number | boolean>; // Info: (20241022 - Julian) 額外查詢條件
}

const FilterSection: React.FC<FilterSectionProps> = ({
  className,
  apiName,
  params,
  types = [],
  statuses = [],
  sortingOptions = [],
  sortingByDate = false,
  onApiResponse,
  viewType,
  viewToggleHandler,
  extraQuery,
}) => {
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
  const { trigger } = APIHandler<ICertificate[]>(apiName);
  const [sorting, setSorting] = useState<boolean>();

  // Info: (20240919 - tzuhan) 發送 API 請求
  const fetchData = useCallback(async () => {
    try {
      if (isLoading) return;
      setIsLoading(true);
      // Deprecated: (20240920 - tzuhan) Debugging purpose only
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { success, code, data } = await trigger({
        params,
        query: {
          type: selectedType,
          status: selectedStatus,
          startTimeStamp: !selectedDateRange.startTimeStamp
            ? undefined
            : selectedDateRange.startTimeStamp,
          endTimeStamp: !selectedDateRange.endTimeStamp
            ? undefined
            : selectedDateRange.endTimeStamp,
          search: searchQuery,
          sort: selectedSorting || sorting ? 'desc' : 'asc',
          ...extraQuery,
        },
      });
      /* Deprecated: (20240920 - tzuhan) Debugging purpose only
      // Info: (20240920 - tzuhan) 回傳 API 回應資料
      if (success && onApiResponse) onApiResponse(data!);
      if (!success) {
        // Deprecated: (20240919 - tzuhan) Debugging purpose only
        // eslint-disable-next-line no-console
        console.error('API Request Failed:', code);
      }
      */
      if (onApiResponse) onApiResponse(generateRandomCertificates());
    } catch (error) {
      // Deprecated: (20240919 - tzuhan) Debugging purpose only
      // eslint-disable-next-line no-console
      console.error('API Request error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [
    isLoading,
    selectedType,
    selectedStatus,
    selectedDateRange,
    searchQuery,
    selectedSorting,
    sorting,
    extraQuery,
  ]);

  // Info: (20240919 - tzuhan) 每次狀態變更時，組合查詢條件並發送 API 請求
  useEffect(() => {
    if (typeof window !== 'undefined') {
      fetchData();
    }
  }, [
    selectedType,
    selectedStatus,
    selectedDateRange,
    searchQuery,
    selectedSorting,
    sorting,
    extraQuery,
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
      <SearchInput searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {/* Info: (20240919 - tzuhan) 顯示風格切換 */}
      {viewType && viewToggleHandler && (
        <ViewToggle viewType={viewType} onViewTypeChange={viewToggleHandler} />
      )}

      {/* Info: (20240919 - tzuhan) 排序選項 */}
      {sortingByDate ? (
        <button
          type="button"
          className="flex items-center space-x-2 pb-2"
          onClick={() => setSorting((prev) => !prev)}
        >
          <Image src="/elements/double_arrow_down.svg" alt="arrow_down" width={20} height={20} />
          <div className="leading-none">Newest</div>
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
