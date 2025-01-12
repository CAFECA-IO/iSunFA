import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'next-i18next';
import TrialBalanceItemRow from '@/components/trial_balance/trial_balance_item';
import Pagination from '@/components/pagination/pagination';
import SortingButton from '@/components/voucher/sorting_button';
import { checkboxStyle, DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import { SortOrder, SortBy } from '@/constants/sort';
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
import { ISortOption } from '@/interfaces/sort';

interface TrialBalanceListProps {
  selectedDateRange: IDatePeriod | null; // Info: (20241105 - Anna) 接收來自上層的日期範圍
}

const TrialBalanceList: React.FC<TrialBalanceListProps> = ({ selectedDateRange }) => {
  const { selectedCompany } = useUserCtx();
  const companyId = selectedCompany?.id; // Info: (20241204 - Anna) 提取 companyId
  const { t } = useTranslation(['reports', 'date_picker', 'common']);
  const printRef = useRef<HTMLDivElement>(null); // Info: (20241203 - Anna) 引用列印內容

  const [subAccountsToggle, setSubAccountsToggle] = useState<boolean>(false);

  // Info: (20241101 - Anna) 將資料原始狀態設為空
  const [accountList, setAccountList] = useState<TrialBalanceItem[]>([]);
  const [totalData, setTotalData] = useState<ITrialBalancePayload['total'] | null>(null); // Info: (20241205 - Anna) 儲存總計資料
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false); // Info: (20241105 - Anna) 追蹤是否已經成功請求過一次 API
  const [isLoading, setIsLoading] = useState(false); // Info: (20241105 - Anna) 追蹤 API 請求的加載狀態
  const prevSelectedDateRange = useRef<IDatePeriod | null>(null); // Info: (20241105 - Anna) 追蹤之前的日期範圍

  const [currentPage, setCurrentPage] = useState(1);
  const [beginningCreditSort, setBeginningCreditSort] = useState<null | SortOrder>(null);
  const [beginningDebitSort, setBeginningDebitSort] = useState<null | SortOrder>(null);
  const [midtermDebitSort, setMidtermDebitSort] = useState<null | SortOrder>(null);
  const [midtermCreditSort, setMidtermCreditSort] = useState<null | SortOrder>(null);
  const [endingDebitSort, setEndingDebitSort] = useState<null | SortOrder>(null);
  const [endingCreditSort, setEndingCreditSort] = useState<null | SortOrder>(null);

  // Info: (20241204 - Anna) 使用 trigger 方法替代直接調用 APIHandler
  const { trigger: fetchTrialBalance } = APIHandler<ITrialBalancePayload>(
    APIName.TRIAL_BALANCE_LIST
  );

  // Info: (20241204 - Anna) 更新 fetchTrialBalanceData 函數為使用 trigger 方法
  const fetchTrialBalanceData = useCallback(
    async (
      sort?: ISortOption // Info: (20250110 - Julian) 新增排序選項
    ) => {
      if (
        !selectedDateRange ||
        selectedDateRange.endTimeStamp === 0 ||
        (prevSelectedDateRange.current &&
          prevSelectedDateRange.current.startTimeStamp === selectedDateRange.startTimeStamp &&
          prevSelectedDateRange.current.endTimeStamp === selectedDateRange.endTimeStamp &&
          hasFetchedOnce &&
          !sort) // Info: (20250110 - Julian) 若「已經請求過一次」且「沒有排序選項」則略過請求
      ) {
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
            pageSize: 99999, // Info: (20241105 - Anna) 限制每次取出 99999 筆
            sortOption: sort ? `${sort?.sortBy}:${sort?.sortOrder}` : undefined, // Info: (20250110 - Julian) 起始/期中/結束的借貸方金額排序
          },
        });

        if (response.success && response.data) {
          setAccountList(response.data.items.data); // Info: (20241204 - Anna) 更新帳戶列表
          setTotalData(response.data.total); // Info: (20241205 - Anna) 更新總計資料
          setHasFetchedOnce(true); // Info: (20241204 - Anna) 標記為已成功請求
          prevSelectedDateRange.current = selectedDateRange; // Info: (20241204 - Anna) 更新前一个日期範圍
        } else {
          // Deprecate: (20241205 - Anna) remove eslint-disable
          // eslint-disable-next-line no-console
          // console.error('API response error: ', response);
        }
      } catch (error) {
        // Deprecate: (20241205 - Anna) remove eslint-disable
        // eslint-disable-next-line no-console
        // console.error('Error fetching trial balance data:', error);
      } finally {
        setIsLoading(false); // Info: (20241204 - Anna) 請求結束，設置加載狀態為 false
      }
    },
    [
      fetchTrialBalance,
      selectedDateRange,
      hasFetchedOnce,
      beginningCreditSort,
      beginningCreditSort,
      beginningDebitSort,
      midtermDebitSort,
      midtermCreditSort,
      endingDebitSort,
      endingCreditSort,
    ]
  );

  useEffect(() => {
    if (
      !selectedDateRange ||
      !selectedDateRange.startTimeStamp ||
      !selectedDateRange.endTimeStamp
    ) {
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

  useEffect(() => {
    // Info: (20250110 - Julian) 排序狀態變更時重新請求資料
    const sort: ISortOption[] = [
      beginningCreditSort && {
        sortBy: SortBy.BEGINNING_CREDIT_AMOUNT,
        sortOrder: beginningCreditSort,
      },
      beginningDebitSort && {
        sortBy: SortBy.BEGINNING_DEBIT_AMOUNT,
        sortOrder: beginningDebitSort,
      },
      midtermDebitSort && {
        sortBy: SortBy.MIDTERM_DEBIT_AMOUNT,
        sortOrder: midtermDebitSort,
      },
      midtermCreditSort && {
        sortBy: SortBy.MIDTERM_CREDIT_AMOUNT,
        sortOrder: midtermCreditSort,
      },
      endingDebitSort && {
        sortBy: SortBy.ENDING_DEBIT_AMOUNT,
        sortOrder: endingDebitSort,
      },
      endingCreditSort && {
        sortBy: SortBy.ENDING_CREDIT_AMOUNT,
        sortOrder: endingCreditSort,
      },
    ]
      .filter(Boolean) // Info: (20250110 - Julian) 移除 null
      .map((s) => s as unknown as ISortOption); // Info: (20250110 - Julian) 轉換類型

    fetchTrialBalanceData(sort[0]);
  }, [
    beginningCreditSort,
    beginningDebitSort,
    midtermDebitSort,
    midtermCreditSort,
    endingDebitSort,
    endingCreditSort,
  ]);

  // Info: (20241028 - Anna) 處理 toggle 開關

  const handlePrint = useReactToPrint({
    contentRef: printRef, // Info: (20241203 - Anna) 指定需要打印的內容 Ref
    documentTitle: `試算表`,
    onBeforePrint: async () => {
      return Promise.resolve(); // Info: (20241203 - Anna) 確保回傳一個 Promise
    },
    onAfterPrint: async () => {
      return Promise.resolve(); // Info: (20241203 - Anna) 確保回傳一個 Promise
    },
  });
  const subAccountsToggleHandler: () => void = () => {
    setSubAccountsToggle((prevState) => !prevState);
  };

  const displayedBeginningCredit = SortingButton({
    string: t('reports:REPORTS.BEGINNING_CREDIT'),
    sortOrder: beginningCreditSort,
    setSortOrder: setBeginningCreditSort,
    handleReset: () => {
      // Info: (20250110 - Julian) 將其他排序狀態設為 null
      setBeginningDebitSort(null);
      setMidtermDebitSort(null);
      setMidtermCreditSort(null);
      setEndingDebitSort(null);
      setEndingCreditSort(null);
    },
  });

  const displayedBeginningDebit = SortingButton({
    string: t('reports:REPORTS.BEGINNING_DEBIT'),
    sortOrder: beginningDebitSort,
    setSortOrder: setBeginningDebitSort,
    handleReset: () => {
      // Info: (20250110 - Julian) 將其他排序狀態設為 null
      setBeginningCreditSort(null);
      setMidtermDebitSort(null);
      setMidtermCreditSort(null);
      setEndingDebitSort(null);
      setEndingCreditSort(null);
    },
  });

  const displayedMidtermCredit = SortingButton({
    string: t('reports:REPORTS.MIDTERM_CREDIT'),
    sortOrder: midtermCreditSort,
    setSortOrder: setMidtermCreditSort,
    handleReset: () => {
      // Info: (20250110 - Julian) 將其他排序狀態設為 null
      setBeginningCreditSort(null);
      setBeginningDebitSort(null);
      setMidtermDebitSort(null);
      setEndingDebitSort(null);
      setEndingCreditSort(null);
    },
  });

  const displayedMidtermDebit = SortingButton({
    string: t('reports:REPORTS.MIDTERM_DEBIT'),
    sortOrder: midtermDebitSort,
    setSortOrder: setMidtermDebitSort,
    handleReset: () => {
      // Info: (20250110 - Julian) 將其他排序狀態設為 null
      setBeginningCreditSort(null);
      setBeginningDebitSort(null);
      setMidtermCreditSort(null);
      setEndingDebitSort(null);
      setEndingCreditSort(null);
    },
  });

  const displayedEndingDebit = SortingButton({
    string: t('reports:REPORTS.ENDING_DEBIT'),
    sortOrder: endingDebitSort,
    setSortOrder: setEndingDebitSort,
    handleReset: () => {
      // Info: (20250110 - Julian) 將其他排序狀態設為 null
      setBeginningCreditSort(null);
      setBeginningDebitSort(null);
      setMidtermDebitSort(null);
      setMidtermCreditSort(null);
      setEndingCreditSort(null);
    },
  });

  const displayedEndingCredit = SortingButton({
    string: t('reports:REPORTS.ENDING_CREDIT'),
    sortOrder: endingCreditSort,
    setSortOrder: setEndingCreditSort,
    handleReset: () => {
      // Info: (20250110 - Julian) 將其他排序狀態設為 null
      setBeginningCreditSort(null);
      setBeginningDebitSort(null);
      setMidtermDebitSort(null);
      setMidtermCreditSort(null);
      setEndingDebitSort(null);
    },
  });

  // Info: (20241218 - Anna) 匯出csv
  const handleDownload = async () => {
    const url = `/api/v2/company/${companyId}/trial_balance/export`; // Info: (20241218 - Anna) API 路徑
    const body = {
      fileType: 'csv',
      filters: {
        startDate: selectedDateRange?.startTimeStamp || 0,
        endDate: selectedDateRange?.endTimeStamp || 0,
      },
      sort: [
        {
          by: 'beginningCreditAmount',
          order: 'desc',
        },
      ],
      options: {
        language: 'zh-TW',
        timezone: '+0800',
      },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error(`Error: ${response.statusText}`);

      // Info: (20241218 - Anna) 解析為 Blob
      const blob = await response.blob();

      // Info: (20241218 - Anna) 從 headers 中取得 filename
      const contentDisposition = response.headers.get('content-disposition');
      const fileNameMatch = contentDisposition?.match(/filename="?([^"]+)"?/);
      const fileName = fileNameMatch ? fileNameMatch[1] : 'trial_balance_export.csv';

      // Info: (20241218 - Anna) 觸發檔案下載
      const fileUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = fileUrl;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();

      // Info: (20241218 - Anna) 清理資源
      window.URL.revokeObjectURL(fileUrl);
      link.parentNode?.removeChild(link);
    } catch (error) {
      // Deprecate: (20241218 - Anna) remove eslint-disable
      // eslint-disable-next-line no-console
      console.error('Download failed:', error);
    }
  };

  const displayedSelectArea = (
    <div className="flex items-center justify-between px-px max-md:flex-wrap print:hidden">
      {/* Info: (20241101 - Anna) 幣別 */}
      <div className="mr-42px flex w-fit items-center gap-5px rounded-full border border-badge-stroke-primary bg-badge-surface-base-soft px-10px py-6px text-sm font-medium text-badge-text-primary">
        <RiCoinsLine />
        <p className="whitespace-nowrap">
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
        <span className="font-normal text-switch-text-primary">
          {t('reports:REPORTS.DISPLAY_SUB_ACCOUNTS')}
        </span>
      </div>
      {/* Info: (20241028 - Anna) Display Sub-Accounts 結束  */}
      <div className="ml-auto flex items-center gap-24px">
        <DownloadButton onClick={handleDownload} />
        <PrintButton onClick={handlePrint} disabled={false} />
      </div>
    </div>
  );

  const displayedAccountList = accountList.map((account) => (
    // Info: (20241029 - Anna) Passing subAccountsToggle to each TrialBalanceItemRow
    <TrialBalanceItemRow key={account.id} account={account} totalExpanded={subAccountsToggle} />
  ));

  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US');
  };

  // Info: (20241105 - Anna) 頁面渲染邏輯
  if (!hasFetchedOnce && !isLoading) {
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
    // Info: (20241105 - Anna) 如果正在加載
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface-neutral-main-background">
        <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
      </div>
    );
  }

  return (
    <div className="flex flex-col" ref={printRef}>
      {displayedSelectArea}
      <div className="mb-4 mt-10 table w-full overflow-hidden rounded-lg bg-surface-neutral-surface-lv2">
        <div className="table-header-group bg-surface-neutral-surface-lv1 text-sm font-medium">
          <div className="table-row h-60px print:text-xs">
            <div
              className={`hidden border-b border-stroke-neutral-quaternary text-center align-middle print:hidden`}
            >
              <div className="flex items-center justify-center">
                <input type="checkbox" className={checkboxStyle} />
              </div>
            </div>
            <div
              className={`table-cell w-70px whitespace-nowrap border-b border-stroke-neutral-quaternary text-center align-middle text-text-neutral-tertiary print:bg-neutral-50`}
            >
              {t('reports:REPORTS.CODE')}
            </div>
            <div
              className={`table-cell w-350px border-b border-l border-stroke-neutral-quaternary text-center align-middle text-text-neutral-tertiary print:bg-neutral-50`}
            >
              {t('reports:REPORT.ACCOUNTING')}
            </div>

            <div
              className={`table-cell w-100px border-b border-l border-stroke-neutral-quaternary bg-surface-support-soft-green text-center align-middle text-text-neutral-solid-dark`}
            >
              {displayedBeginningCredit}
            </div>

            <div
              className={`table-cell w-100px border-b border-l border-stroke-neutral-quaternary bg-surface-support-soft-green text-center align-middle text-text-neutral-solid-dark`}
            >
              {displayedBeginningDebit}
            </div>

            <div
              className={`table-cell w-100px border-b border-l border-stroke-neutral-quaternary bg-surface-support-soft-baby text-center align-middle text-text-neutral-solid-dark`}
            >
              {displayedMidtermDebit}
            </div>

            <div
              className={`table-cell w-100px border-b border-l border-stroke-neutral-quaternary bg-surface-support-soft-baby text-center align-middle text-text-neutral-solid-dark`}
            >
              {displayedMidtermCredit}
            </div>

            <div
              className={`table-cell w-100px border-b border-l border-stroke-neutral-quaternary bg-surface-support-soft-pink text-center align-middle text-text-neutral-solid-dark`}
            >
              {displayedEndingDebit}
            </div>

            <div
              className={`table-cell w-100px border-b border-l border-stroke-neutral-quaternary bg-surface-support-soft-pink text-center align-middle text-text-neutral-solid-dark`}
            >
              {displayedEndingCredit}
            </div>
          </div>
        </div>

        <div className="table-row-group text-sm">{displayedAccountList}</div>
      </div>
      <div className="h-px w-full bg-divider-stroke-lv-4"></div>
      {/* Info: (20241018 - Anna) Total開始 */}
      <div className="mb-10 mt-4 table w-full overflow-hidden rounded-b-lg">
        <div className="table-header-group bg-surface-neutral-surface-lv1 text-sm text-text-neutral-tertiary">
          <div className="table-row h-60px print:text-xs">
            <div
              className={`col-span-3 table-cell h-full w-472px border-stroke-neutral-quaternary text-center align-middle font-medium print:bg-neutral-50`}
            >
              {t('reports:TAX_REPORT.TOTAL')}
            </div>

            <div
              className={`table-cell h-full w-100px border-r border-stroke-neutral-quaternary bg-surface-support-soft-green p-8px text-right align-middle font-semibold text-text-neutral-solid-dark`}
            >
              {formatNumber(totalData?.beginningDebitAmount ?? 0)}
            </div>

            <div
              className={`table-cell h-full w-100px border-stroke-neutral-quaternary bg-surface-support-soft-green p-8px text-right align-middle font-semibold text-text-neutral-solid-dark`}
            >
              {formatNumber(totalData?.beginningCreditAmount ?? 0)}
            </div>

            <div
              className={`table-cell h-full w-100px border-r border-stroke-neutral-quaternary bg-surface-support-soft-baby p-8px text-right align-middle font-semibold text-text-neutral-solid-dark`}
            >
              {formatNumber(totalData?.midtermDebitAmount ?? 0)}
            </div>

            <div
              className={`table-cell h-full w-100px border-stroke-neutral-quaternary bg-surface-support-soft-baby p-8px text-right align-middle font-semibold text-text-neutral-solid-dark`}
            >
              {formatNumber(totalData?.midtermCreditAmount ?? 0)}
            </div>

            <div
              className={`table-cell h-full w-100px border-r border-stroke-neutral-quaternary bg-surface-support-soft-pink p-8px text-right align-middle font-semibold text-text-neutral-solid-dark`}
            >
              {formatNumber(totalData?.endingDebitAmount ?? 0)}
            </div>

            <div
              className={`table-cell h-full w-100px border-stroke-neutral-quaternary bg-surface-support-soft-pink p-8px text-right align-middle font-semibold text-text-neutral-solid-dark`}
            >
              {formatNumber(totalData?.endingCreditAmount ?? 0)}
            </div>
          </div>
        </div>
      </div>
      {/* Info: (20241018 - Anna) Total結束 */}
      <div className="mx-auto print:hidden">
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
