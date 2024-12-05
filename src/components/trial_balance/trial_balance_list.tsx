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
  const { t } = useTranslation(['reports', 'date_picker', 'common']);
  const { exportVoucherModalVisibilityHandler } = useGlobalCtx();
  const printRef = useRef<HTMLDivElement>(null); // Info: (20241203 - Anna) 引用列印內容

  const [subAccountsToggle, setSubAccountsToggle] = useState<boolean>(false);

  // Info: (20241101 - Anna) 將資料原始狀態設為空
  const [accountList, setAccountList] = useState<TrialBalanceItem[]>([]);
  const [totalData, setTotalData] = useState<ITrialBalancePayload['total'] | null>(null); // Info: (20241205 - Anna) 儲存總計資料
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false); // Info: (20241105 - Anna) 追蹤是否已經成功請求過一次 API
  const [isLoading, setIsLoading] = useState(false); // Info: (20241105 - Anna) 追蹤 API 請求的加載狀態
  const prevSelectedDateRange = useRef<IDatePeriod | null>(null); // Info: (20241105 - Anna) 追蹤之前的日期範圍

  // Info: (20241204 - Anna) 使用 trigger 方法替代直接調用 APIHandler
  const { trigger: fetchTrialBalance } = APIHandler<ITrialBalancePayload>(
    APIName.TRIAL_BALANCE_LIST
  );

  // Info: (20241204 - Anna) 更新 fetchTrialBalanceData 函數為使用 trigger 方法
  const fetchTrialBalanceData = useCallback(async () => {
    if (
      !selectedDateRange ||
      selectedDateRange.endTimeStamp === 0 ||
      (prevSelectedDateRange.current &&
        prevSelectedDateRange.current.startTimeStamp === selectedDateRange.startTimeStamp &&
        prevSelectedDateRange.current.endTimeStamp === selectedDateRange.endTimeStamp &&
        hasFetchedOnce)
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
          pageSize: 10,
        },
      });

      if (response.success && response.data) {
        setAccountList(response.data.items.data); // Info: (20241204 - Anna) 更新帳戶列表
        setTotalData(response.data.total); // Info: (20241205 - Anna) 更新總計資料
        setHasFetchedOnce(true); // Info: (20241204 - Anna) 標記為已成功請求
        prevSelectedDateRange.current = selectedDateRange; // Info: (20241204 - Anna) 更新前一个日期範圍
      } else {
        // eslint-disable-next-line no-console
        // console.error('API response error: ', response);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      // console.error('Error fetching trial balance data:', error);
    } finally {
      setIsLoading(false); // Info: (20241204 - Anna) 請求結束，設置加載狀態為 false
    }
  }, [fetchTrialBalance, selectedDateRange, hasFetchedOnce]);

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

  const [currentPage, setCurrentPage] = useState(1);
  const [creditSort, setCreditSort] = useState<null | SortOrder>(null);
  const [debitSort, setDebitSort] = useState<null | SortOrder>(null);

  const displayedCredit = SortingButton({
    string: t('reports:REPORTS.CREDIT'),
    sortOrder: creditSort,
    setSortOrder: setCreditSort,
  });

  const displayedDebit = SortingButton({
    string: t('reports:REPORTS.DEBIT'),
    sortOrder: debitSort,
    setSortOrder: setDebitSort,
  });

  const displayedSelectArea = (
    <div className="flex items-center justify-between px-px max-md:flex-wrap print:hidden">
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
              className={`table-cell w-70px whitespace-nowrap border-b-0.5px border-r-0.5px border-stroke-neutral-quaternary text-center align-middle print:bg-neutral-50`}
            >
              {t('reports:REPORTS.CODE')}
            </div>
            <div
              className={`table-cell w-350px border-b-0.5px border-stroke-neutral-quaternary text-center align-middle print:bg-neutral-50`}
            >
              {t('reports:REPORT.ACCOUNTING')}
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
              className={`col-span-3 table-cell h-full w-472px border-stroke-neutral-quaternary text-center align-middle print:bg-neutral-50`}
            >
              {t('reports:TAX_REPORT.TOTAL')}
            </div>

            <div
              className={`table-cell h-full w-77px border-r-0.5px border-stroke-neutral-quaternary bg-support-olive-100 py-8px pr-2 text-right align-middle text-neutral-600`}
            >
              {formatNumber(totalData?.beginningDebitAmount ?? 0)}
            </div>

            <div
              className={`table-cell h-full w-77px border-stroke-neutral-quaternary bg-support-olive-100 py-8px pr-2 text-right align-middle text-neutral-600`}
            >
              {formatNumber(totalData?.beginningCreditAmount ?? 0)}
            </div>

            <div
              className={`table-cell h-full w-77px border-r-0.5px border-stroke-neutral-quaternary bg-support-baby-100 py-8px pr-2 text-right align-middle text-neutral-600`}
            >
              {formatNumber(totalData?.midtermDebitAmount ?? 0)}
            </div>

            <div
              className={`table-cell h-full w-77px border-stroke-neutral-quaternary bg-support-baby-100 py-8px pr-2 text-right align-middle text-neutral-600`}
            >
              {formatNumber(totalData?.midtermCreditAmount ?? 0)}
            </div>

            <div
              className={`table-cell h-full w-77px border-r-0.5px border-stroke-neutral-quaternary bg-support-pink-100 py-8px pr-2 text-right align-middle text-neutral-600`}
            >
              {formatNumber(totalData?.endingDebitAmount ?? 0)}
            </div>

            <div
              className={`table-cell h-full w-77px border-stroke-neutral-quaternary bg-support-pink-100 py-8px pr-2 text-right align-middle text-neutral-600`}
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
