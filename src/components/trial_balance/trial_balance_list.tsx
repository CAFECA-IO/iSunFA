import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'next-i18next';
import TrialBalanceItemRow from '@/components/trial_balance/trial_balance_item';
import Pagination from '@/components/pagination/pagination';
import SortingButton from '@/components/voucher/sorting_button';
import { checkboxStyle, DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import { SortOrder } from '@/constants/sort';
import { useGlobalCtx } from '@/contexts/global_context';
import PrintButton from '@/components/button/print_button';
import DownloadButton from '@/components/button/download_button';
import {
  MOCK_RESPONSE as TrialBalanceData,
  TrialBalanceItem,
  ITrialBalancePayload,
} from '@/interfaces/trial_balance';
import Toggle from '@/components/toggle/toggle';
import { RiCoinsLine } from 'react-icons/ri';
import { SkeletonList } from '@/components/skeleton/skeleton';
import Image from 'next/image';
import { IDatePeriod } from '@/interfaces/date_period';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import { useReactToPrint } from 'react-to-print';

interface TrialBalanceListProps {
  selectedDateRange: IDatePeriod | null; // Info: (20241105 - Anna) 接收來自上層的日期範圍
}

const TrialBalanceList: React.FC<TrialBalanceListProps> = ({ selectedDateRange }) => {
  const { selectedCompany } = useUserCtx();
  const companyId = selectedCompany?.id; // Info: (20241204 - Anna) 提取 companyId
  const { t } = useTranslation('journal');
  const { exportVoucherModalVisibilityHandler } = useGlobalCtx();
  const printRef = useRef<HTMLDivElement>(null); // Info: (20241203 - Anna) 引用列印內容

  const [subAccountsToggle, setSubAccountsToggle] = useState<boolean>(false);

  // Info: (20241101 - Anna) 將資料原始狀態設為空
  // const [accountList] = useState<TrialBalanceItem[]>(TrialBalanceData.items.data);
  const [accountList, setAccountList] = useState<TrialBalanceItem[]>([]);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false); // Info: (20241105 - Anna) 追蹤是否已經成功請求過一次 API
  const [isLoading, setIsLoading] = useState(false); // Info: (20241105 - Anna) 追蹤 API 請求的加載狀態
  const prevSelectedDateRange = useRef<IDatePeriod | null>(null); // Info: (20241105 - Anna) 追蹤之前的日期範圍

  // Info: (20241204 - Anna) 使用 trigger 方法替代直接調用 APIHandler
  const { trigger: fetchTrialBalance } = APIHandler<ITrialBalancePayload>(
    APIName.TRIAL_BALANCE_LIST
  );

  // Info: (20241107 - Anna) API 請求邏輯
  // const fetchTrialBalanceData = useCallback(async () => {
  //   // Info: (20241204 - Anna) 調試 API 請求參數
  //   // eslint-disable-next-line no-console
  //   console.log('API Query Params: ', {
  //     startDate: selectedDateRange?.startTimeStamp,
  //     endDate: selectedDateRange?.endTimeStamp,
  //     page: 1,
  //     pageSize: 10,
  //   });

  //   if (!selectedDateRange || selectedDateRange.endTimeStamp === 0) {
  //     // Info: (20241204 - Anna) 調試無效日期範圍
  //     // eslint-disable-next-line no-console
  //     console.log('Invalid date range, skipping fetch.');
  //     return;
  //   }
  //   // Info: (20241204 - Anna) 調試有效的日期範圍
  //   // eslint-disable-next-line no-console
  //   console.log('Fetching data with date range: ', selectedDateRange);
  //   if (
  //     prevSelectedDateRange.current &&
  //     prevSelectedDateRange.current.startTimeStamp === selectedDateRange.startTimeStamp &&
  //     prevSelectedDateRange.current.endTimeStamp === selectedDateRange.endTimeStamp &&
  //     hasFetchedOnce
  //   ) {
  //     return;
  //   }

  //   setIsLoading(true);
  //   try {
  //     const response = await APIHandler<ITrialBalancePayload>(
  //       APIName.TRIAL_BALANCE_LIST,
  //       {
  //         query: {
  //           startDate: selectedDateRange.startTimeStamp,
  //           endDate: selectedDateRange.endTimeStamp,
  //           page: 1,
  //           pageSize: 10,
  //         },
  //       },
  //       true // Info: (20241204 - Anna) 確保立即觸發 API 請求
  //     );
  //     // Info: (20241204 - Anna) 打印 API 回應
  //     // eslint-disable-next-line no-console
  //     console.log('API Response: ', response);
  //     if (response.success && response.data) {
  //       // Info: (20241204 - Anna) 調試 API 回應資料
  //       // eslint-disable-next-line no-console
  //       console.log('API Response: ', response.data);
  //       setAccountList(response.data.items.data);
  //       setHasFetchedOnce(true);
  //       prevSelectedDateRange.current = selectedDateRange;
  //     } else {
  //       //  Info: (20241204 - Anna) 如果回應不成功，打印錯誤
  //       // eslint-disable-next-line no-console
  //       console.error('API response error: ', response);
  //     }
  //   } catch (error) {
  //     // Deprecate: (20241118 - Anna) debug
  //     // eslint-disable-next-line no-console
  //     console.error('Error fetching trial balance data:', error);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // }, [selectedDateRange]);

  // Info: (20241204 - Anna) 更新 fetchTrialBalanceData 函數為使用 trigger 方法
  const fetchTrialBalanceData = useCallback(async () => {
    // eslint-disable-next-line no-console
    console.log('API Query Params: ', {
      companyId,
      startDate: selectedDateRange?.startTimeStamp,
      endDate: selectedDateRange?.endTimeStamp,
      page: 1,
      pageSize: 10,
    });

    if (
      !selectedDateRange ||
      selectedDateRange.endTimeStamp === 0 ||
      (prevSelectedDateRange.current &&
        prevSelectedDateRange.current.startTimeStamp === selectedDateRange.startTimeStamp &&
        prevSelectedDateRange.current.endTimeStamp === selectedDateRange.endTimeStamp &&
        hasFetchedOnce)
    ) {
      // eslint-disable-next-line no-console
      console.log('Invalid date range, skipping fetch.');
      return;
    }

    setIsLoading(true);
    try {
      // Info: (20241204 - Anna) 使用 trigger 手動觸發 APIHandler
      const response = await fetchTrialBalance({
        params: { companyId },
        query: {
          startDate: selectedDateRange.startTimeStamp,
          endDate: selectedDateRange.endTimeStamp,
          page: 1,
          pageSize: 10,
        },
      });

      // eslint-disable-next-line no-console
      console.log('API Response: ', response);

      if (response.success && response.data) {
        setAccountList(response.data.items.data); // Info: (20241204 - Anna) 更新帳戶列表
        setHasFetchedOnce(true); // Info: (20241204 - Anna) 標記為已成功請求
        prevSelectedDateRange.current = selectedDateRange; // Info: (20241204 - Anna) 更新前一个日期範圍
      } else {
        // eslint-disable-next-line no-console
        console.error('API response error: ', response);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching trial balance data:', error);
    } finally {
      setIsLoading(false); // Info: (20241204 - Anna) 請求結束，設置加載狀態為 false
    }
  }, [fetchTrialBalance, selectedDateRange, hasFetchedOnce]);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('Selected Date Range: ', selectedDateRange);
    if (
      !selectedDateRange ||
      !selectedDateRange.startTimeStamp ||
      !selectedDateRange.endTimeStamp
    ) {
      // Info: (20241204 - Anna) 調試不執行的條件
      // eslint-disable-next-line no-console
      console.log('Skipped fetching due to invalid date range.');
      return;
    }
    if (
      selectedDateRange && //  Info: (20241204 - Anna) 確保日期範圍存在
      selectedDateRange.startTimeStamp &&
      selectedDateRange.endTimeStamp
    ) {
      fetchTrialBalanceData(); //  Info: (20241204 - Anna) 僅在日期有效時觸發請求
    }
  }, [fetchTrialBalanceData]);

  // Info: (20241101 - Anna) 模擬 API 呼叫
  // const fetchTrialBalanceData = useCallback(async () => {
  //   if (!selectedDateRange || selectedDateRange.endTimeStamp === 0) return; // Info: (20241105 - Anna) 檢查 selectedDateRange 是否有效

  //   if (
  //     prevSelectedDateRange.current &&
  //     prevSelectedDateRange.current.startTimeStamp === selectedDateRange.startTimeStamp &&
  //     prevSelectedDateRange.current.endTimeStamp === selectedDateRange.endTimeStamp &&
  //     hasFetchedOnce
  //   ) {
  //     return; // Info: (20241105 - Anna) 避免重複請求
  //   }

  //   setIsLoading(true); // Info: (20241105 - Anna) 開始加載
  //   const mockFetch = async (): Promise<ITrialBalancePayload> => {
  //     return new Promise<ITrialBalancePayload>((resolve) => {
  //       setTimeout(() => {
  //         resolve(TrialBalanceData); // Info: (20241101 - Anna) 使用 mock data 代替 API 回應
  //       }, 500); // Info: (20241101 - Anna) 延遲 500 毫秒模擬網路請求
  //     });
  //   };

  //   try {
  //     const response = await mockFetch();
  //     setAccountList(response.items.data); // Info: (20241101 - Anna) 設定獲得的 mock 資料
  //     setHasFetchedOnce(true); // Info: (20241105 - Anna) 設置成功請求過的狀態
  //     prevSelectedDateRange.current = selectedDateRange; // Info: (20241105 - Anna) 更新 prevSelectedDateRange
  //   } catch (error) {
  //     // eslint-disable-next-line no-console
  //     console.error('Error fetching trial balance data:', error);
  //   } finally {
  //     setIsLoading(false); // Info: (20241105 - Anna) 結束加載
  //   }
  // }, [selectedDateRange]);

  // Info: (20241105 - Anna) 監測日期區間變更並觸發 API 請求
  // useEffect(() => {
  //   if (!selectedDateRange) return; // Info: (20241105 - Anna) 檢查日期範圍存在
  //   fetchTrialBalanceData();
  // }, [fetchTrialBalanceData, selectedDateRange]);

  // Info: (20241028 - Anna) 處理 toggle 開關

  const handlePrint = useReactToPrint({
    contentRef: printRef, // Info: (20241203 - Anna) 指定需要打印的內容 Ref
    documentTitle: `試算表`,
    onBeforePrint: async () => {
      // Deprecate: (20241203 - Anna) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Preparing to print the modal content...');
      return Promise.resolve(); // Info: (20241203 - Anna) 確保回傳一個 Promise
    },
    onAfterPrint: async () => {
      // Deprecate: (20241203 - Anna) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Printing completed.');
      return Promise.resolve(); // Info: (20241203 - Anna) 確保回傳一個 Promise
    },
  });
  const subAccountsToggleHandler: () => void = () => {
    setSubAccountsToggle((prevState) => !prevState);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [creditSort, setCreditSort] = useState<null | SortOrder>(null);
  const [debitSort, setDebitSort] = useState<null | SortOrder>(null);

  // Todo: (20241101 - Anna) API 呼叫處理 (等Shirley提供API後修改)
  // const {
  //   data: trialBalanceData,
  //   trigger,
  //   success,
  //   isLoading,
  //   code,
  // } = APIHandler<ITrialBalancePayload>(APIName.TRIAL_BALANCE);

  const displayedCredit = SortingButton({
    string: t('journal:JOURNAL.CREDIT'),
    sortOrder: creditSort,
    setSortOrder: setCreditSort,
  });

  const displayedDebit = SortingButton({
    string: t('journal:JOURNAL.DEBIT'),
    sortOrder: debitSort,
    setSortOrder: setDebitSort,
  });

  const displayedSelectArea = (
    <div className="flex items-center justify-between px-px max-md:flex-wrap">
      {/* Info: (20241101 - Anna)幣別 */}
      <div className="mr-42px flex w-fit items-center gap-5px rounded-full border border-orange-500 bg-white px-10px py-6px text-sm font-medium text-badge-text-error-solid">
        <RiCoinsLine className="text-orange-600" />
        <p className="whitespace-nowrap text-orange-600">
          {t(`reports:REPORTS.${TrialBalanceData.currencyAlias}`)}
        </p>
      </div>
      {/* Info: (20241028 - Anna) 新增 Display Sub-Accounts Toggle 開關 */}
      <div className="flex items-center gap-4">
        <Toggle
          id="subAccounts-toggle"
          initialToggleState={subAccountsToggle}
          getToggledState={subAccountsToggleHandler}
          toggleStateFromParent={subAccountsToggle}
        />
        <span className="text-neutral-600">{t('reports:REPORTS.DISPLAY_SUB_ACCOUNTS')}</span>
      </div>
      {/* Info: (20241028 - Anna) Display Sub-Accounts 結束  */}
      <div className="ml-auto flex items-center gap-24px">
        <DownloadButton onClick={exportVoucherModalVisibilityHandler} disabled />
        <PrintButton onClick={handlePrint} disabled={false} />
      </div>
    </div>
  );

  const displayedAccountList = accountList.map((account) => (
    // Info: (20241029 - Anna) Passing subAccountsToggle to each TrialBalanceItemRow
    <TrialBalanceItemRow
      key={account.id}
      account={account}
      totalExpanded={subAccountsToggle}
      // selectedDateRange={selectedDateRange}
    />
  ));

  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US');
  };

  // Info: (20241105 - Anna) 頁面渲染邏輯
  if (!hasFetchedOnce && !isLoading) {
    // Info: (20241204 - Anna) 調試當前狀態
    // eslint-disable-next-line no-console
    console.log('No data and not loading.');
    // Info: (20241105 - Anna) 如果尚未成功請求過 API 且沒有加載
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <Image src="/elements/empty.png" alt="No data image" width={120} height={135} />
        <div>
          <p className="text-neutral-300">{t('reports:REPORT.NO_DATA_AVAILABLE')}</p>
          <p className="text-neutral-300">{t('reports:REPORT.PLEASE_SELECT_PERIOD')}</p>
        </div>
      </div>
    );
  } else if (isLoading) {
    // Info: (20241105 - Anna) 調試加載狀態
    // eslint-disable-next-line no-console
    console.log('Loading state active.');
    // Info: (20241105 - Anna) 如果正在加載
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface-neutral-main-background">
        <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {displayedSelectArea}
      <div
        className="mb-4 mt-10 table w-full overflow-hidden rounded-lg bg-surface-neutral-surface-lv2"
        ref={printRef}
      >
        <div className="table-header-group border-b-0.5px bg-surface-neutral-surface-lv1 text-sm text-text-neutral-tertiary">
          <div className="table-row h-60px">
            <div
              className={`table-cell border-b-0.5px border-stroke-neutral-quaternary text-center align-middle print:hidden`}
            >
              <div className="flex items-center justify-center">
                <div className="relative">
                  <input type="checkbox" className={checkboxStyle} />
                </div>
              </div>
            </div>
            <div
              className={`table-cell w-70px border-b-0.5px border-r-0.5px border-stroke-neutral-quaternary text-center align-middle`}
            >
              {t('reports:REPORTS.CODE')}
            </div>
            <div
              className={`table-cell w-350px border-b-0.5px border-stroke-neutral-quaternary text-center align-middle`}
            >
              {t('journal:VOUCHER_LINE_BLOCK.ACCOUNTING')}
            </div>

            <div
              className={`table-cell w-77px border-b-0.5px border-r-0.5px border-stroke-neutral-quaternary bg-support-olive-100 text-center align-middle`}
            >
              {t('reports:REPORTS.BEGINNING')}
              {displayedDebit}
            </div>

            <div
              className={`table-cell w-77px border-b-0.5px border-stroke-neutral-quaternary bg-support-olive-100 text-center align-middle`}
            >
              {t('reports:REPORTS.BEGINNING')}
              {displayedCredit}
            </div>

            <div
              className={`table-cell w-77px border-b-0.5px border-r-0.5px border-stroke-neutral-quaternary bg-support-baby-100 text-center align-middle`}
            >
              {t('reports:REPORTS.MIDTERM')}
              {displayedDebit}
            </div>

            <div
              className={`table-cell w-77px border-b-0.5px border-stroke-neutral-quaternary bg-support-baby-100 text-center align-middle`}
            >
              {t('reports:REPORTS.MIDTERM')}
              {displayedCredit}
            </div>

            <div
              className={`table-cell w-77px border-b-0.5px border-r-0.5px border-stroke-neutral-quaternary bg-support-pink-100 text-center align-middle`}
            >
              {t('reports:REPORTS.ENDING')}
              {displayedDebit}
            </div>

            <div
              className={`table-cell w-77px border-b-0.5px border-stroke-neutral-quaternary bg-support-pink-100 text-center align-middle`}
            >
              {t('reports:REPORTS.ENDING')}
              {displayedCredit}
            </div>
          </div>
        </div>

        <div className="table-row-group text-sm">{displayedAccountList}</div>
      </div>
      <div className="h-px w-full bg-neutral-100"></div>
      {/* Info: (20241018 - Anna) Total開始 */}
      <div className="mb-10 mt-4 table w-full overflow-hidden rounded-b-lg bg-surface-neutral-surface-lv2">
        <div className="table-header-group bg-surface-neutral-surface-lv1 text-sm text-text-neutral-tertiary">
          <div className="table-row h-60px">
            <div
              className={`col-span-3 table-cell h-full w-472px border-stroke-neutral-quaternary text-center align-middle`}
            >
              {t('reports:TAX_REPORT.TOTAL')}
            </div>

            <div
              className={`table-cell h-full w-77px border-r-0.5px border-stroke-neutral-quaternary bg-support-olive-100 py-8px pr-2 text-right align-middle text-neutral-600`}
            >
              {formatNumber(TrialBalanceData.total.beginningDebitAmount)}
            </div>

            <div
              className={`table-cell h-full w-77px border-stroke-neutral-quaternary bg-support-olive-100 py-8px pr-2 text-right align-middle text-neutral-600`}
            >
              {formatNumber(TrialBalanceData.total.beginningCreditAmount)}
            </div>

            <div
              className={`table-cell h-full w-77px border-r-0.5px border-stroke-neutral-quaternary bg-support-baby-100 py-8px pr-2 text-right align-middle text-neutral-600`}
            >
              {formatNumber(TrialBalanceData.total.midtermDebitAmount)}
            </div>

            <div
              className={`table-cell h-full w-77px border-stroke-neutral-quaternary bg-support-baby-100 py-8px pr-2 text-right align-middle text-neutral-600`}
            >
              {formatNumber(TrialBalanceData.total.midtermCreditAmount)}
            </div>

            <div
              className={`table-cell h-full w-77px border-r-0.5px border-stroke-neutral-quaternary bg-support-pink-100 py-8px pr-2 text-right align-middle text-neutral-600`}
            >
              {formatNumber(TrialBalanceData.total.endingDebitAmount)}
            </div>

            <div
              className={`table-cell h-full w-77px border-stroke-neutral-quaternary bg-support-pink-100 py-8px pr-2 text-right align-middle text-neutral-600`}
            >
              {formatNumber(TrialBalanceData.total.endingCreditAmount)}
            </div>
          </div>
        </div>
      </div>
      {/* Info: (20241018 - Anna) Total結束 */}
      <div className="mx-auto">
        <Pagination
          currentPage={currentPage}
          totalPages={TrialBalanceData.items.totalPages}
          setCurrentPage={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default TrialBalanceList;
