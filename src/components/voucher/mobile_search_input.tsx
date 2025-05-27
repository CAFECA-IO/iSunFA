import { useState, useEffect, useCallback } from 'react';
import SearchInput from '@/components/filter_section/search_input';
import APIHandler from '@/lib/utils/api_handler';
import { IAPIName } from '@/interfaces/api_connection';
import { IPaginatedData } from '@/interfaces/pagination';
import { SortBy, SortOrder } from '@/constants/sort';

interface IMobileSearchInputProps<T> {
  apiName: IAPIName;
  param?: Record<string, string | number | boolean | undefined>;
  onApiResponse: (data: IPaginatedData<T>) => void;
}

const MobileSearchInput = <T,>({ apiName, param, onApiResponse }: IMobileSearchInputProps<T>) => {
  const [keyword, setKeyword] = useState<string>('');

  // Info: (20250527 - Julian) API 呼叫處理器
  const { trigger } = APIHandler<IPaginatedData<T>>(apiName);

  const fetchData = useCallback(async () => {
    // Info: (20250527 - Julian) 預設排序為：日期/降序
    const effectiveSort = { by: SortBy.DATE, order: SortOrder.DESC };
    try {
      const { data, success, error } = await trigger({
        params: param,
        query: {
          // Info: (20250527 - Julian) ====== 必填選項 =======
          page: 1, // Info: (20250527 - Julian) 頁碼，預設為 1
          pageSize: 10, // Info: (20250527 - Julian) 每頁大小，預設為 10
          sortOption: `${effectiveSort.by}:${effectiveSort.order}`, // Info: (20250527 - Julian) 排序選項，使用 effectiveSort 物件
        },
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
  }, [keyword]);

  useEffect(() => {
    fetchData();
  }, [keyword]);

  return (
    <div className="block tablet:hidden">
      <SearchInput searchQuery={keyword} onSearchChange={setKeyword} />
    </div>
  );
};

export default MobileSearchInput;
