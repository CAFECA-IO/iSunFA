import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'next-i18next';
import TrialBalanceItemRow from '@/components/trial_balance/trial_balance_item';
import Pagination from '@/components/pagination/pagination';
import TrialBalanceSorting from '@/components/trial_balance/trial_balance_sorting';
import { checkboxStyle, DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import { SortOrder, SortBy } from '@/constants/sort';
import PrintButton from '@/components/button/print_button';
import DownloadButton from '@/components/button/download_button';
import {
  TrialBalanceItem,
  ITrialBalancePayload,
  ITrialBalanceNote,
  ITrialBalanceTotal,
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
import { CurrencyType } from '@/constants/currency';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import loggerFront from '@/lib/utils/logger_front';

interface TrialBalanceListProps {
  selectedDateRange: IDatePeriod | null; // Info: (20241105 - Anna) 接收來自上層的日期範圍
}

const TrialBalanceList: React.FC<TrialBalanceListProps> = ({ selectedDateRange }) => {
  const { connectedAccountBook } = useUserCtx();
  const accountBookId = connectedAccountBook?.id; // Info: (20241204 - Anna) 提取 companyId
  const { t } = useTranslation(['reports', 'date_picker', 'common']);
  const printRef = useRef<HTMLDivElement>(null); // Info: (20241203 - Anna) 引用列印內容

  const [subAccountsToggle, setSubAccountsToggle] = useState<boolean>(false);

  // Info: (20241101 - Anna) 將資料原始狀態設為空
  const [accountList, setAccountList] = useState<TrialBalanceItem[]>([]);
  const [currencyAlias, setCurrencyAlias] = useState<string>(CurrencyType.TWD);
  const [totalData, setTotalData] = useState<ITrialBalanceTotal | null>(null); // Info: (20241205 - Anna) 儲存總計資料
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false); // Info: (20241105 - Anna) 追蹤是否已經成功請求過一次 API
  const [isLoading, setIsLoading] = useState(false); // Info: (20241105 - Anna) 追蹤 API 請求的加載狀態
  const prevSelectedDateRange = useRef<IDatePeriod | null>(null); // Info: (20241105 - Anna) 追蹤之前的日期範圍

  const prevCurrentPage = useRef<number>(1); // Info: (20250312 - Anna) 用 useRef 記錄上一次的 currentPage
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1); // Info: (20250312 - Anna) 儲存 API 回傳的總頁數

  const [beginningCreditSort, setBeginningCreditSort] = useState<null | SortOrder>(null);
  const [beginningDebitSort, setBeginningDebitSort] = useState<null | SortOrder>(null);
  const [midtermDebitSort, setMidtermDebitSort] = useState<null | SortOrder>(null);
  const [midtermCreditSort, setMidtermCreditSort] = useState<null | SortOrder>(null);
  const [endingDebitSort, setEndingDebitSort] = useState<null | SortOrder>(null);
  const [endingCreditSort, setEndingCreditSort] = useState<null | SortOrder>(null);

  // Info: (20250214 - Shirley) 解析 note 字串，並提供預設值
  const parseNote = (noteString: string | undefined): ITrialBalanceNote => {
    try {
      if (!noteString) {
        throw new Error('Note string is empty');
      }
      return JSON.parse(noteString) as ITrialBalanceNote;
    } catch (error) {
      return {
        currencyAlias: CurrencyType.TWD,
        total: {
          beginningCreditAmount: 0,
          beginningDebitAmount: 0,
          midtermCreditAmount: 0,
          midtermDebitAmount: 0,
          endingCreditAmount: 0,
          endingDebitAmount: 0,
          createAt: 0,
          updateAt: 0,
        },
      };
    }
  };

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
          // Info: (20250110 - Julian) 若「已經請求過一次」且「沒有排序選項」則略過請求
          !sort &&
          // Info: (20250312 - Anna) 確保頁數不同時會發送 API
          prevCurrentPage.current === currentPage)
      ) {
        return;
      }
      setIsLoading(true);
      try {
        // Info: (20241204 - Anna) 使用 trigger 手動觸發 APIHandler
        const response = await fetchTrialBalance({
          params: { accountBookId },
          query: {
            startDate: selectedDateRange.startTimeStamp,
            endDate: selectedDateRange.endTimeStamp,
            page: currentPage, // Info: (20250312 - Anna) 傳遞當前頁碼
            pageSize: DEFAULT_PAGE_LIMIT, // Info: (20250312 - Anna) 限制每頁筆數
            sortOption: sort ? `${sort?.sortBy}:${sort?.sortOrder}` : undefined, // Info: (20250110 - Julian) 起始/期中/結束的借貸方金額排序
          },
        });

        if (response.success && response.data) {
          // Info: (20250214 - Shirley) @Anna 修改 list trial balance API 資料格式，array 的 data 放到 data 裡，非 array 的 data 放到 note 裡，解析 note 字串，並提供預設值
          setAccountList(response.data.data);
          const { currencyAlias: currency, total } = parseNote(response.data.note);
          setCurrencyAlias(currency);
          setTotalData(total);
          setTotalPages(response.data.totalPages || 1); // Info: (20250312 - Anna) 設定 `totalPages`，確保分頁正常
          setHasFetchedOnce(true); // Info: (20241204 - Anna) 標記為已成功請求
          prevSelectedDateRange.current = selectedDateRange; // Info: (20241204 - Anna) 更新前一个日期範圍
        }
      } finally {
        setIsLoading(false); // Info: (20241204 - Anna) 請求結束，設置加載狀態為 false
      }
    },
    [
      fetchTrialBalance,
      selectedDateRange,
      currentPage, // Info: (20250312 - Anna) 確保 currentPage 變更時會重新發送 API 請求
      hasFetchedOnce,
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
  }, [selectedDateRange, currentPage]);

  // Info: (20250312 - Anna) 當 API 請求結束後，更新 prevCurrentPage
  useEffect(() => {
    prevCurrentPage.current = currentPage;
  }, [currentPage]);

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

  // Info: (20241028 - Anna) 處理 toggle 開關
  const subAccountsToggleHandler: () => void = () => {
    setSubAccountsToggle((prevState) => !prevState);
  };

  const displayedBeginningCredit = TrialBalanceSorting({
    string: (
      <>
        <span className="print:hidden">
          {t('reports:REPORTS.BEGINNING')}
          {t('reports:REPORTS.CREDIT')}
        </span>
        <span className="hidden print:inline">
          {t('reports:REPORTS.BEGINNING')}
          <br />
          {t('reports:REPORTS.CREDIT')}
        </span>
      </>
    ),
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
    className: 'px-8px',
  });

  const displayedBeginningDebit = TrialBalanceSorting({
    string: (
      <>
        <span className="print:hidden">
          {t('reports:REPORTS.BEGINNING')}
          {t('reports:REPORTS.DEBIT')}
        </span>
        <span className="hidden print:inline">
          {t('reports:REPORTS.BEGINNING')}
          <br />
          {t('reports:REPORTS.DEBIT')}
        </span>
      </>
    ),
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
    className: 'px-8px',
  });

  const displayedMidtermCredit = TrialBalanceSorting({
    string: (
      <>
        <span className="print:hidden">
          {t('reports:REPORTS.MIDTERM')}
          {t('reports:REPORTS.CREDIT')}
        </span>
        <span className="hidden print:inline">
          {t('reports:REPORTS.MIDTERM')}
          <br />
          {t('reports:REPORTS.CREDIT')}
        </span>
      </>
    ),
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
    className: 'px-8px',
  });

  const displayedMidtermDebit = TrialBalanceSorting({
    string: (
      <>
        <span className="print:hidden">
          {t('reports:REPORTS.MIDTERM')}
          {t('reports:REPORTS.DEBIT')}
        </span>
        <span className="hidden print:inline">
          {t('reports:REPORTS.MIDTERM')}
          <br />
          {t('reports:REPORTS.DEBIT')}
        </span>
      </>
    ),
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

  const displayedEndingDebit = TrialBalanceSorting({
    string: (
      <>
        <span className="print:hidden">
          {t('reports:REPORTS.ENDING')}
          {t('reports:REPORTS.DEBIT')}
        </span>
        <span className="hidden print:inline">
          {t('reports:REPORTS.ENDING')}
          <br />
          {t('reports:REPORTS.DEBIT')}
        </span>
      </>
    ),
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
    className: 'px-8px',
  });

  const displayedEndingCredit = TrialBalanceSorting({
    string: (
      <>
        <span className="print:hidden">
          {t('reports:REPORTS.ENDING')}
          {t('reports:REPORTS.CREDIT')}
        </span>
        <span className="hidden print:inline">
          {t('reports:REPORTS.ENDING')}
          <br />
          {t('reports:REPORTS.CREDIT')}
        </span>
      </>
    ),
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
    className: 'px-8px',
  });

  // Info: (20241218 - Anna) 匯出csv
  const handleDownload = async () => {
    // Info: (20250115 - Shirley) 匯出 csv 的排序，跟 fetchTrialBalanceData 一樣用 query 參數 sortOption
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
      .filter(Boolean)
      .map((s) => s as unknown as ISortOption);
    const sortString =
      sort.length > 0 ? sort.map((s) => `${s.sortBy}:${s.sortOrder}`).join('-') : undefined;

    const url = `/api/v2/account_book/${accountBookId}/trial_balance/export?sortOption=${sortString}`; // Info: (20241218 - Anna) API 路徑
    const body = {
      fileType: 'csv',
      filters: {
        startDate: selectedDateRange?.startTimeStamp || 0,
        endDate: selectedDateRange?.endTimeStamp || 0,
      },
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
      loggerFront.error('Download failed:', error);
    }
  };

  const displayedSelectArea = (
    <div className="flex flex-col print:hidden">
      <div className="flex items-center justify-between px-px max-md:flex-wrap">
        {/* Info: (20241101 - Anna) 幣別(md以上) */}
        <div className="mr-42px hidden w-fit items-center gap-5px rounded-full border border-badge-stroke-primary bg-badge-surface-base-soft px-10px py-6px text-sm font-medium text-badge-text-primary md:flex">
          <RiCoinsLine />
          <p className="whitespace-nowrap">{currencyAlias}</p>
        </div>
        {/* Info: (20241028 - Anna) 新增 Display Sub-Accounts Toggle 開關 */}
        <Toggle
          id="subAccounts-toggle"
          initialToggleState={subAccountsToggle}
          getToggledState={subAccountsToggleHandler}
          toggleStateFromParent={subAccountsToggle}
          label={t('reports:REPORTS.DISPLAY_SUB_ACCOUNTS')}
          labelClassName="font-normal text-switch-text-primary"
        />
        {/* Info: (20241028 - Anna) Display Sub-Accounts 結束  */}
        <div className="ml-auto flex items-center gap-8px md:gap-16px">
          <DownloadButton onClick={handleDownload} />
          <PrintButton onClick={handlePrint} disabled={false} />
        </div>
      </div>
      {/* Info: (20250520 - Anna) 幣別(md以下) */}
      <div className="mt-32px flex w-full justify-end md:hidden">
        <div className="flex w-fit items-center gap-5px rounded-full border border-badge-stroke-primary bg-badge-surface-base-soft px-10px py-6px text-sm font-medium text-badge-text-primary">
          <RiCoinsLine />
          <p className="whitespace-nowrap">{t(`reports:REPORTS.${currencyAlias}`)}</p>
        </div>
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
      <div className="-mt-40 flex h-screen flex-col items-center justify-center">
        <Image src="/images/empty.svg" alt="No data image" width={120} height={135} />
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
      {/* Info: (20250116 - Anna) print:max-w-a4-width */}
      <div className="hide-scrollbar overflow-x-auto print:-mt-32px">
        <div className="min-w-900px">
          <div className="mb-4 mt-10 table w-full overflow-hidden rounded-lg bg-surface-neutral-surface-lv2 print:max-w-a4-width">
            <div className="table-header-group bg-surface-neutral-surface-lv1 text-sm font-medium">
              <div className="table-row h-60px print:text-xxs">
                <div
                  className={`hidden border-b border-stroke-neutral-quaternary text-center align-middle print:hidden`}
                >
                  <div className="flex items-center justify-center">
                    <input type="checkbox" className={checkboxStyle} />
                  </div>
                </div>
                {/* Info: (20250116 - Anna) print:max-w-55px */}
                <div
                  className={`table-cell w-70px whitespace-nowrap border-b border-stroke-neutral-quaternary text-center align-middle text-text-neutral-tertiary print:max-w-55px print:bg-neutral-50`}
                >
                  <span className="print:hidden">{t('reports:REPORTS.CODE')}</span>
                  <span className="hidden print:inline">
                    {t('reports:REPORTS.SUBJECT')}
                    <br />
                    {t('reports:REPORTS.NUMBER')}
                  </span>
                </div>
                {/* Info: (20250116 - Anna) print:max-w-150px */}
                <div
                  className={`table-cell border-b border-l border-stroke-neutral-quaternary text-center align-middle text-text-neutral-tertiary print:max-w-150px print:bg-neutral-50`}
                >
                  <span className="print:hidden">
                    {t('reports:REPORT.ACCOUNTING')}
                    {t('reports:REPORT.SUBJECT')}
                  </span>
                  <span className="hidden print:inline">
                    {t('reports:REPORT.ACCOUNTING')}
                    <br />
                    {t('reports:REPORT.SUBJECT')}
                  </span>
                </div>
                {/* Info: (20250116 - Anna) print:max-w-65px print:px-1 */}
                <div
                  className={`table-cell w-100px border-b border-l border-stroke-neutral-quaternary bg-surface-support-soft-green text-center align-middle text-text-neutral-solid-dark print:max-w-65px print:px-1`}
                >
                  {displayedBeginningDebit}
                </div>
                {/* Info: (20250116 - Anna) print:max-w-65px print:px-1 */}
                <div
                  className={`table-cell w-100px border-b border-l border-stroke-neutral-quaternary bg-surface-support-soft-green text-center align-middle text-text-neutral-solid-dark print:max-w-65px print:px-1`}
                >
                  {displayedBeginningCredit}
                </div>
                {/* Info: (20250116 - Anna) print:max-w-65px print:px-1 */}
                <div
                  className={`table-cell w-100px border-b border-l border-stroke-neutral-quaternary bg-surface-support-soft-baby text-center align-middle text-text-neutral-solid-dark print:max-w-65px print:px-1`}
                >
                  {displayedMidtermDebit}
                </div>
                {/* Info: (20250116 - Anna) print:max-w-65px print:px-1 */}
                <div
                  className={`table-cell w-100px border-b border-l border-stroke-neutral-quaternary bg-surface-support-soft-baby text-center align-middle text-text-neutral-solid-dark print:max-w-65px print:px-1`}
                >
                  {displayedMidtermCredit}
                </div>
                {/* Info: (20250116 - Anna) print:max-w-65px print:px-1 */}
                <div
                  className={`table-cell w-100px border-b border-l border-stroke-neutral-quaternary bg-surface-support-soft-pink text-center align-middle text-text-neutral-solid-dark print:max-w-65px print:px-1`}
                >
                  {displayedEndingDebit}
                </div>
                {/* Info: (20250116 - Anna) print:max-w-65px print:px-1 */}
                <div
                  className={`table-cell w-100px border-b border-l border-stroke-neutral-quaternary bg-surface-support-soft-pink text-center align-middle text-text-neutral-solid-dark print:max-w-65px print:px-1`}
                >
                  {displayedEndingCredit}
                </div>
              </div>
            </div>

            <div className="table-row-group text-sm">{displayedAccountList}</div>
          </div>
        </div>
      </div>

      <div className="h-px w-full bg-divider-stroke-lv-4"></div>
      {/* Info: (20241018 - Anna) Total開始 */}
      <div className="hide-scrollbar overflow-x-auto">
        <div className="min-w-900px print:min-w-0">
          <div className="mb-10 mt-4 table w-full overflow-hidden rounded-b-lg">
            <div className="table-header-group bg-surface-neutral-surface-lv1 text-sm text-text-neutral-secondary print:max-w-a4-width">
              <div className="table-row h-60px print:text-xxs">
                <div
                  className={`col-span-3 table-cell border-stroke-neutral-quaternary text-center align-middle font-medium print:bg-neutral-50`}
                >
                  {t('reports:TAX_REPORT.TOTAL')}
                </div>
                {/* Info: (20241018 - Anna) print:max-w-65px print:px-1 */}
                <div
                  className={`table-cell w-100px border-r border-stroke-neutral-quaternary bg-surface-support-soft-green p-8px text-right align-middle font-semibold text-text-neutral-solid-dark print:max-w-65px print:px-1`}
                >
                  {formatNumber(totalData?.beginningDebitAmount ?? 0)}
                </div>
                {/* Info: (20241018 - Anna) print:max-w-65px print:px-1 */}
                <div
                  className={`table-cell w-100px border-stroke-neutral-quaternary bg-surface-support-soft-green p-8px text-right align-middle font-semibold text-text-neutral-solid-dark print:max-w-65px print:px-1`}
                >
                  {formatNumber(totalData?.beginningCreditAmount ?? 0)}
                </div>
                {/* Info: (20241018 - Anna) print:max-w-65px print:px-1 */}
                <div
                  className={`table-cell w-100px border-r border-stroke-neutral-quaternary bg-surface-support-soft-baby p-8px text-right align-middle font-semibold text-text-neutral-solid-dark print:max-w-65px print:px-1`}
                >
                  {formatNumber(totalData?.midtermDebitAmount ?? 0)}
                </div>
                {/* Info: (20241018 - Anna) print:max-w-65px print:px-1 */}
                <div
                  className={`table-cell w-100px border-stroke-neutral-quaternary bg-surface-support-soft-baby p-8px text-right align-middle font-semibold text-text-neutral-solid-dark print:max-w-65px print:px-1`}
                >
                  {formatNumber(totalData?.midtermCreditAmount ?? 0)}
                </div>
                {/* Info: (20241018 - Anna) print:max-w-65px print:px-1 */}
                <div
                  className={`table-cell w-100px border-r border-stroke-neutral-quaternary bg-surface-support-soft-pink p-8px text-right align-middle font-semibold text-text-neutral-solid-dark print:max-w-65px print:px-1`}
                >
                  {formatNumber(totalData?.endingDebitAmount ?? 0)}
                </div>
                {/* Info: (20241018 - Anna) print:max-w-65px print:px-1 */}
                <div
                  className={`table-cell w-100px border-stroke-neutral-quaternary bg-surface-support-soft-pink p-8px text-right align-middle font-semibold text-text-neutral-solid-dark print:max-w-65px print:px-1`}
                >
                  {formatNumber(totalData?.endingCreditAmount ?? 0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info: (20241018 - Anna) Total結束 */}
      <div className="mx-auto print:hidden">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages} // Info: (20250312 - Anna) 使用 API 回傳的 `totalPages`
          setCurrentPage={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default TrialBalanceList;
