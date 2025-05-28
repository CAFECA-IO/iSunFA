import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'next-i18next';
import { RxCross2 } from 'react-icons/rx';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import Toggle from '@/components/toggle/toggle';
import SelectFilter from '@/components/filter_section/select_filter';
import APIHandler from '@/lib/utils/api_handler';
import { IPaginatedData } from '@/interfaces/pagination';
import { IAPIName } from '@/interfaces/api_connection';
import { SortBy, SortOrder } from '@/constants/sort';
import { IDatePeriod } from '@/interfaces/date_period';
import { default30DayPeriodInSec } from '@/constants/display';

interface IFilterSideMenuProps<T> {
  isModalVisible: boolean;
  modalVisibleHandler: () => void;

  activeTab?: string; // Info: (20250527 - Julian) 用於指定當前選項卡
  typeOptions?: string[]; // Info: (20250528 - Julian) 用於指定可選的類型選項
  hideReversedRelated?: boolean; // Info: (20250527 - Julian) 是否隱藏已刪除的憑證和其相關的反向憑證

  apiName: IAPIName;
  params?: Record<string, string | number | boolean | undefined>;
  onApiResponse: (data: IPaginatedData<T>) => void;
}

const FilterSideMenu = <T,>({
  isModalVisible,
  modalVisibleHandler,
  activeTab,
  typeOptions,
  hideReversedRelated,
  apiName,
  params,
  onApiResponse,
}: IFilterSideMenuProps<T>) => {
  const { t } = useTranslation(['filter_section_type', 'journal', 'common']);

  // Info: (20250528 - Julian) Type 管理
  const [selectedType, setSelectedType] = useState<string>('All');

  // Info: (20250528 - Julian) Date Period 管理
  const [selectedPeriod, setSelectedPeriod] = useState<IDatePeriod>(default30DayPeriodInSec);

  const [isOpenToggle, setIsOpenToggle] = useState<boolean>(hideReversedRelated ?? false);

  // Info: (20250527 - Julian) API 呼叫處理器
  const { trigger } = APIHandler<IPaginatedData<T>>(apiName);

  // Info: (20250527 - Julian) 呼叫 API，將 data 寫入 state
  const fetchData = useCallback(async () => {
    // Info: (20250527 - Julian) 預設排序為：日期/降序
    const effectiveSort = { by: SortBy.DATE, order: SortOrder.DESC };

    try {
      const { data, success, error } = await trigger({
        params,
        query: {
          // Info: (20250527 - Julian) ====== 必填選項 =======
          page: 1, // Info: (20250527 - Julian) 頁碼，預設為 1
          pageSize: 10, // Info: (20250527 - Julian) 每頁大小，預設為 10
          sortOption: `${effectiveSort.by}:${effectiveSort.order}`, // Info: (20250527 - Julian) 排序選項，使用 effectiveSort 物件

          // Info: (20250527 - Julian) ====== 可選選項 =======
          tab: activeTab, // Info: (20250527 - Julian) 當前選項卡
          type: selectedType, // Info: (20250527 - Julian) 選擇的類型
          // Info: (20250527 - Julian) 選擇的日期範圍
          startDate:
            selectedPeriod.startTimeStamp !== 0 ? selectedPeriod.startTimeStamp : undefined,
          endDate: selectedPeriod.endTimeStamp !== 0 ? selectedPeriod.endTimeStamp : undefined,

          hideReversedRelated, // Info: (20250527 - Julian) 是否隱藏已刪除的憑證和其相關的反向憑證
        },
      });

      if (success && data) {
        // Info: (20250527 - Julian) 成功取得資料後，將資料傳遞給父組件
        onApiResponse(data);
      } else {
        // Info: (20250527 - Julian) 處理 API 呼叫失敗的情況
        // eslint-disable-next-line no-console
        console.error('Failed to fetch data:', error);
      }
    } catch (err) {
      // Info: (20250527 - Julian) 捕捉異常並處理
      // eslint-disable-next-line no-console
      console.error('Error fetching data:', err);
    }
  }, [
    activeTab,
    selectedType,
    selectedPeriod.startTimeStamp,
    selectedPeriod.endTimeStamp,
    hideReversedRelated,
  ]);

  useEffect(() => {
    // Info: (20250527 - Julian) 當選擇類型或日期變更時，重新呼叫 API
    fetchData();
  }, [selectedType, selectedPeriod]);

  return (
    <div className="block tablet:hidden">
      {/* Info: (20250521 - Julian) 黑底遮罩 */}
      <div
        onClick={modalVisibleHandler}
        className={`fixed inset-0 z-120 flex items-center justify-center bg-black/50 transition-all duration-300 ease-in-out ${isModalVisible ? 'visible opacity-100' : 'invisible opacity-0'}`}
      ></div>

      {/* Info: (20250521 - Julian) 選單 */}
      <div
        className={`fixed right-0 top-0 z-130 flex h-screen w-90vw flex-col gap-lv-5 bg-white px-16px py-24px transition-all duration-300 ease-in-out ${isModalVisible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Info: (20250521 - Julian) Header */}
        <div className="relative flex w-full flex-col items-center">
          <button type="button" className="absolute left-0 p-10px" onClick={modalVisibleHandler}>
            <RxCross2 size={16} />
          </button>
          <p className="text-center text-base font-semibold text-text-neutral-secondary">Filter</p>
        </div>

        {/* Info: (20250521 - Julian) 分隔線 */}
        <hr className="border-divider-stroke-lv-4" />
        {/* Info: (20250521 - Julian) 選單內容 */}
        <div className="flex flex-col items-stretch gap-lv-4">
          {/* Info: (20250527 - Julian) 選擇類型 */}
          {typeOptions && (
            <SelectFilter
              label="Type"
              options={typeOptions}
              selectedValue={selectedType}
              onChange={setSelectedType}
              labelClassName="text-input-text-primary"
            />
          )}

          {/* Info: (20250527 - Julian) 選擇日期 */}
          <div className="flex flex-col items-start gap-8px">
            <p className="text-sm font-semibold text-input-text-primary">
              {t('common:COMMON.PERIOD')}
            </p>
            <DatePicker
              type={DatePickerType.TEXT_DATE}
              period={selectedPeriod}
              setFilteredPeriod={setSelectedPeriod}
              btnClassName="h-46px"
              calenderClassName="w-full"
            />
          </div>
        </div>

        {/* Info: (20250528 - Julian) 開關 */}
        {hideReversedRelated && (
          <div className="flex items-center gap-lv-2 text-xs font-medium">
            <Toggle
              id="hide-reversals-toggle-mobile"
              initialToggleState={isOpenToggle}
              toggleStateFromParent={isOpenToggle}
              getToggledState={() => setIsOpenToggle(!isOpenToggle)}
            />
            {t('journal:VOUCHER.HIDE_VOUCHER_TOGGLE')}
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterSideMenu;
