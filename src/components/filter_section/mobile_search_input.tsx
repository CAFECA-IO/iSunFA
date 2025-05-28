import { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import APIHandler from '@/lib/utils/api_handler';
import { IAPIName } from '@/interfaces/api_connection';
import { IPaginatedData } from '@/interfaces/pagination';
import { SortBy, SortOrder } from '@/constants/sort';
import { ISortOption } from '@/interfaces/sort';
import { FiSearch } from 'react-icons/fi';

interface IMobileSearchInputProps<T> {
  apiName: IAPIName;
  param: Record<string, string | number | boolean | undefined>;

  currentPage?: number; // Info: (20250528 - Julian) 當前頁碼，預設為 1
  maxPageSize?: number; // Info: (20250528 - Julian) 每頁大小，預設為 10
  sortOption?: ISortOption; // Info: (20250528 - Julian) 排序選項，預設為日期/降序

  currentTab?: string; // Info: (20250528 - Julian) 當前選項卡
  type?: string; // Info: (20250528 - Julian) 用於指定類型的選項
  datePeriod?: { start: number; end: number }; // Info: (20250528 - Julian) 用於指定日期範圍的選項
  hideReversedRelated?: boolean; // Info: (20250528 - Julian) 是否隱藏已刪除的憑證和其相關的反向憑證

  onApiResponse: (data: IPaginatedData<T>) => void;
}

const MobileSearchInput = <T,>({
  apiName,
  param,
  currentPage,
  maxPageSize,
  sortOption,
  currentTab,
  type,
  datePeriod,
  hideReversedRelated,
  onApiResponse,
}: IMobileSearchInputProps<T>) => {
  const { t } = useTranslation(['filter_section_type', 'journal', 'common']);

  const [keyword, setKeyword] = useState<string>('');

  const changeKeyword = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
  };

  // Info: (20250527 - Julian) API 呼叫處理器
  const { trigger } = APIHandler<IPaginatedData<T>>(apiName);

  // Info: (20250528 - Julian) 預設排序為：日期/降序
  const effectiveSort = sortOption ?? { sortBy: SortBy.DATE, sortOrder: SortOrder.DESC };

  // Info: (20250528 - Julian) 處理日期範圍
  const startDate = datePeriod && datePeriod.start !== 0 ? datePeriod.start : undefined;
  const endDate = datePeriod && datePeriod.end !== 0 ? datePeriod.end : undefined;

  const query = {
    // Info: (20250528 - Julian) ====== 必填選項 =======
    page: currentPage ?? 1, // Info: (20250528 - Julian) 頁碼，預設為 1
    pageSize: maxPageSize ?? 10, // Info: (20250528 - Julian) 每頁大小，預設為 10
    sortOption: `${effectiveSort.sortBy}:${effectiveSort.sortOrder}`, // Info: (20250528 - Julian) 排序選項，使用 effectiveSort 物件

    // Info: (20250528 - Julian) ====== 搜尋關鍵字 =======
    searchQuery: keyword,

    // Info: (20250528 - Julian) ====== 可選選項 =======
    tab: currentTab, // Info: (20250528 - Julian) 當前選項卡
    type, // Info: (20250528 - Julian) 選擇的類型
    startDate, // Info: (20250528 - Julian) 選擇的日期範圍
    endDate,
    hideReversedRelated, // Info: (20250528 - Julian) 是否隱藏已刪除的憑證和其相關的反向憑證
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, success, error } = await trigger({
          params: param,
          query,
        });

        if (success && data) {
          // Info: (20250527 - Julian) 將 API 回應資料寫入 state
          onApiResponse(data);
        } else {
          // Info: (20250527 - Julian) 處理錯誤情況
          // eslint-disable-next-line no-console
          console.error(error);
        }
      } catch (err) {
        // Info: (20250527 - Julian) 捕捉異常情況
        // eslint-disable-next-line no-console
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, [keyword]);

  return (
    <div className="flex h-44px min-w-250px items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background p-10px text-sm font-medium tablet:hidden">
      <input
        type="text"
        id="search-input-mobile"
        className="relative flex flex-1 bg-transparent outline-none"
        placeholder={t('search:COMMON.SEARCH')}
        value={keyword}
        onChange={changeKeyword}
      />
      <FiSearch size={20} className="text-icon-surface-single-color-primary" />
    </div>
  );
};

export default MobileSearchInput;
