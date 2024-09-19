import { IAPIName } from '@/interfaces/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import React, { useState, useEffect } from 'react';

interface FilterSectionProps {
  apiName: IAPIName;
  params?: Record<string, string | number | boolean>;
  types?: string[];
  statuses?: string[];
  sortingOptions?: string[];
  onApiResponse?: (data: unknown[]) => void; // Info: (20240919 - tzuhan) 回傳 API 回應資料
  viewType: 'grid' | 'list';
  viewToggleHandler: (viewType: 'grid' | 'list') => void;
}

const FilterSection: React.FC<FilterSectionProps> = ({
  apiName,
  params,
  types = [],
  statuses = [],
  sortingOptions = [],
  onApiResponse,
  viewType,
  viewToggleHandler,
}) => {
  const [selectedType, setSelectedType] = useState<string | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();
  const [selectedDateRange, setSelectedDateRange] = useState<{ start?: string; end?: string }>({});
  const [searchQuery, setSearchQuery] = useState<string | undefined>();
  const [selectedSorting, setSelectedSorting] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { trigger } = APIHandler<unknown[]>(apiName);

  // Info: (20240919 - tzuhan) 發送 API 請求
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const { success, code, data } = await trigger({
        params,
        query: {
          type: selectedType,
          status: selectedStatus,
          startDate: selectedDateRange.start,
          endDate: selectedDateRange.end,
          search: searchQuery,
          sort: selectedSorting,
        },
      });
      if (success && onApiResponse) onApiResponse(data!);
      if (!success) {
        // Deprecated: (20240919 - tzuhan) Debugging purpose only
        // eslint-disable-next-line no-console
        console.error('API Request Failed:', code);
      }
    } catch (error) {
      // Deprecated: (20240919 - tzuhan) Debugging purpose only
      // eslint-disable-next-line no-console
      console.error('API Request error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSearchClick = () => {
    setSearchQuery((document.getElementById('search') as HTMLInputElement)?.value);
  };

  // Info: (20240919 - tzuhan) 每次狀態變更時，組合查詢條件並發送 API 請求
  useEffect(() => {
    if (!isLoading) fetchData();
  }, [selectedType, selectedStatus, selectedDateRange, searchQuery, selectedSorting, isLoading]);

  return (
    <div
      className="flex flex-wrap items-center justify-start space-x-4 rounded-lg bg-white p-4 shadow-md"
      style={{ maxWidth: '100%' }}
    >
      {/* Info: (20240919 - tzuhan) 類型篩選 */}
      {types.length > 0 && (
        <div className="flex min-w-150px flex-col">
          <label htmlFor="type" className="text-sm font-medium text-gray-500">
            {selectedType || 'Type'}
          </label>
          <select
            id="type"
            className="rounded-md border border-gray-300 p-2"
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value={undefined}>All</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Info: (20240919 - tzuhan) 狀態篩選 */}
      {statuses.length > 0 && (
        <div className="flex min-w-150px flex-col">
          <label htmlFor="status" className="text-sm font-medium text-gray-500">
            {selectedStatus || 'Status'}
          </label>
          <select
            id="status"
            className="rounded-md border border-gray-300 p-2"
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value={undefined}>All</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Info: (20240919 - tzuhan) 時間區間篩選 */}
      <div className="flex min-w-250px flex-col">
        <label htmlFor="date-range" className="text-sm font-medium text-gray-500">
          Period
          <input
            type="text"
            id="date-range"
            className="rounded-md border border-gray-300 p-2"
            placeholder="Start Date - End Date"
            onBlur={(e) => {
              const [startDate, endDate] = e.target.value.split(' - ');
              setSelectedDateRange({ start: startDate.trim(), end: endDate.trim() });
            }}
          />
        </label>
      </div>

      {/* Info: (20240919 - tzuhan) 搜索欄 */}
      <div className="flex min-w-200px flex-col">
        <label htmlFor="search" className="text-sm font-medium text-gray-500">
          Search
          <div className="flex items-center">
            <input
              type="text"
              id="search"
              className="grow rounded-l-md border border-gray-300 p-2"
              placeholder="Search"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setSearchQuery(e.currentTarget.value);
                }
              }}
            />
            <button type="button" className="rounded-r-md bg-gray-300 p-2" onClick={onSearchClick}>
              🔍
            </button>
          </div>
        </label>
      </div>

      {/* 排序選項 */}
      {sortingOptions.length > 0 && (
        <div className="flex min-w-150px flex-col">
          <label htmlFor="sort" className="text-sm font-medium text-gray-500">
            {selectedSorting || 'Sort'}
          </label>
          <select
            id="sort"
            className="rounded-md border border-gray-300 p-2"
            onChange={(e) => setSelectedSorting(e.target.value)}
          >
            <option value={undefined}>Default</option>
            {sortingOptions.map((sort) => (
              <option key={sort} value={sort}>
                {sort}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 顯示風格切換 */}
      <div className="flex min-w-150px items-center space-x-2">
        <button
          type="button"
          className={`rounded border p-2 hover:bg-gray-300 ${viewType === 'grid' ? 'bg-gray-200' : ''}`}
          onClick={() => viewToggleHandler('grid')}
        >
          Grid View
        </button>
        <button
          type="button"
          className={`rounded border p-2 hover:bg-gray-300 ${viewType === 'list' ? 'bg-gray-200' : ''}`}
          onClick={() => viewToggleHandler('list')}
        >
          List View
        </button>
      </div>
    </div>
  );
};

export default FilterSection;
