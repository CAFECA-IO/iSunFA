import React, { useState, useEffect } from 'react';
import LedgerList from '@/components/ledger/ledger_list';
import { radioButtonStyle } from '@/constants/display';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { IDatePeriod } from '@/interfaces/date_period';
import { useTranslation } from 'next-i18next';
import { IPaginatedAccount, IAccount } from '@/interfaces/accounting_account';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { ILedgerPayload } from '@/interfaces/ledger';
import { useUserCtx } from '@/contexts/user_context';
import { useRouter } from 'next/router';
import { FaAngleDown } from 'react-icons/fa6';
import { IoBookOutline } from 'react-icons/io5';
import AccountTitleSelector from '@/components/ledger/account_title_selector';
import Pagination from '@/components/pagination/pagination';

enum ReportType {
  General = 'general',
  Detailed = 'detailed',
  All = 'all',
}

const LedgerPageBody = () => {
  const router = useRouter();

  const { t } = useTranslation(['journal', 'date_picker', 'filter_section_type', 'reports']);
  const { connectedAccountBook } = useUserCtx();

  const [selectedReportType, setSelectedReportType] = useState<ReportType>(ReportType.All);
  const [selectedDateRange, setSelectedDateRange] = useState<IDatePeriod>({
    startTimeStamp: 0,
    endTimeStamp: 0,
  });
  const [isStartAccountSelectorOpen, setIsStartAccountSelectorOpen] = useState(false); // Info: (20250311 - Anna) 起始會計科目彈窗開關
  const [isEndAccountSelectorOpen, setIsEndAccountSelectorOpen] = useState(false); // Info: (20250311 - Anna) 結束會計科目彈窗開關

  const [selectedStartCategory, setSelectedStartCategory] = useState<string | null>(null); // Info: (20250311 - Anna) 起始科目類別
  const [selectedEndCategory, setSelectedEndCategory] = useState<string | null>(null); // Info: (20250311 - Anna) 結束科目類別

  const [selectedStartAccountNo, setSelectedStartAccountNo] = useState<string>('');
  const [selectedEndAccountNo, setSelectedEndAccountNo] = useState<string>('');

  const [ledgerData, setLedgerData] = useState<ILedgerPayload | null>(null);

  // Info: (20250312 - Anna) Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const { trigger: getAccountListAPI } = APIHandler<IPaginatedAccount>(APIName.ACCOUNT_LIST);
  const { trigger: fetchLedgerDataAPI, isLoading } = APIHandler<ILedgerPayload>(
    APIName.LEDGER_LIST
  );

  // Info: (20241225 - Anna) 初始時嘗試從 URL 中獲取篩選條件
  useEffect(() => {
    const {
      startDate = 0,
      endDate = 0,
      labelType = ReportType.All,
      startAccountNo = '',
      endAccountNo = '',
    } = router.query;

    if (startDate && endDate) {
      setSelectedDateRange({
        startTimeStamp: Number(startDate),
        endTimeStamp: Number(endDate),
      });
      setSelectedReportType(labelType as ReportType);
      setSelectedStartAccountNo(String(startAccountNo));
      setSelectedEndAccountNo(String(endAccountNo));
    }
  }, [router.query]);

  useEffect(() => {
    if (
      connectedAccountBook?.id &&
      selectedDateRange.startTimeStamp &&
      selectedDateRange.endTimeStamp &&
      selectedReportType
    ) {
      const fetchLedgerData = async () => {
        const startAccountNo = selectedStartAccountNo.split(' ')[0]; // Info: (20241117 - Liz) 取出科目編號
        const endAccountNo = selectedEndAccountNo.split(' ')[0]; // Info: (20241117 - Liz) 取出科目編號

        const { data } = await fetchLedgerDataAPI({
          params: { accountBookId: connectedAccountBook.id },
          query: {
            startDate: selectedDateRange.startTimeStamp,
            endDate: selectedDateRange.endTimeStamp,
            startAccountNo,
            endAccountNo,
            labelType: selectedReportType,
            page: currentPage, // Info: (20250312 - Anna) 傳遞當前頁碼
            pageSize: 10, // Info: (20250312 - Anna) 每頁筆數
          },
        });
        setLedgerData(data);
        setTotalPages(data?.totalPages || 1); // Info: (20250312 - Anna) 更新總頁數
        setTotalCount(data?.totalCount || 0); // Info: (20250312 - Anna) 更新總筆數
      };

      fetchLedgerData();
    }
  }, [
    connectedAccountBook,
    selectedDateRange,
    selectedReportType,
    selectedStartAccountNo,
    selectedEndAccountNo,
    currentPage, // Info: (20250312 - Anna) 監聽 currentPage 變化
  ]);

  // Info: (20250311 - Anna) 選擇起始會計科目
  const startAccountSelectedHandler = (account: IAccount) => {
    setSelectedStartCategory(account.type);
    setSelectedStartAccountNo(`${account.code} ${account.name}`);

    setIsStartAccountSelectorOpen(false);
  };

  // Info: (20250311 - Anna) 選擇結束會計科目
  const endAccountSelectedHandler = (account: IAccount) => {
    setSelectedEndCategory(account.type);
    setSelectedEndAccountNo(`${account.code} ${account.name}`);

    setIsEndAccountSelectorOpen(false);
  };

  // Info: (20241117 - Liz) 取得會計科目列表
  useEffect(() => {
    if (!connectedAccountBook) return;

    const getAccountList = async () => {
      const { data: accountTitleList } = await getAccountListAPI({
        params: { accountBookId: connectedAccountBook.id },
        query: {
          limit: 0, // Info: (20250312 - Anna) 取所有數據
          forUser: true,
          sortBy: 'code', // Info: (20241105 - Anna) 依 code 排序
          sortOrder: 'asc',
          isDeleted: false, // Info: (20250102 - Julian) 只取未刪除的
        },
      });

      if (accountTitleList) {
        // Info: (20241105 - Anna) 初始化臨時陣列來分類不同類型的會計科目
        const assets: string[] = [];
        const liabilities: string[] = [];
        const equities: string[] = [];
        const revenues: string[] = [];
        const costs: string[] = [];
        const expenses: string[] = [];
        const incomes: string[] = [];
        const otherComprehensiveIncomes: string[] = [];

        // Info: (20241105 - Anna) 遍歷 accountTitleList.data，依據 type 將科目分類
        accountTitleList.data.forEach((account) => {
          const accountName = `${account.code} ${account.name}`;
          switch (account.type) {
            case 'asset':
              assets.push(accountName);
              break;
            case 'liability':
              liabilities.push(accountName);
              break;
            case 'equity':
              equities.push(accountName);
              break;
            case 'revenue':
              revenues.push(accountName);
              break;
            case 'cost':
              costs.push(accountName);
              break;
            case 'expense':
              expenses.push(accountName);
              break;
            case 'income':
              incomes.push(accountName);
              break;
            case 'otherComprehensiveIncome':
              otherComprehensiveIncomes.push(accountName);
              break;
            default:
              break;
          }
        });
      }
    };

    getAccountList();
  }, [connectedAccountBook]);

  const handleReportTypeChange = (type: ReportType) => {
    setSelectedReportType(type);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center gap-40px">
      <div className="flex w-full flex-col items-stretch gap-32px tablet:gap-40px">
        <p className="text-base font-semibold leading-6 tracking-wide text-neutral-400 tablet:hidden">
          {t('journal:LEDGER.LEDGER')}
        </p>
        <div>
          <p className="mb-8px mt-18px text-sm font-semibold text-neutral-300">
            {t('journal:LEDGER.LEDGER_PERIOD')}&nbsp;
            <span className="text-text-state-error">*</span>
          </p>
          <div className="flex min-w-250px flex-1 flex-col">
            <DatePicker
              period={selectedDateRange}
              setFilteredPeriod={setSelectedDateRange}
              type={DatePickerType.TEXT_PERIOD}
            />
          </div>

          <p className="mb-8px mt-18px text-sm font-semibold text-neutral-300">
            {t('journal:LEDGER.LABEL_TYPE')}&nbsp;
            <span className="text-text-state-error">*</span>
          </p>
          <div className="flex w-1/3 flex-col items-start gap-x-60px gap-y-24px md:items-baseline md:justify-between lg:flex-row">
            <label
              htmlFor="input-general-detailed"
              className="flex items-center gap-8px whitespace-nowrap text-checkbox-text-primary"
            >
              <input
                type="radio"
                id="input-general-detailed"
                name="ledger-type"
                className={radioButtonStyle}
                checked={selectedReportType === ReportType.All}
                onChange={() => handleReportTypeChange(ReportType.All)}
              />
              <p className="text-sm">{t('journal:LEDGER.GENERAL_DETAILED')}</p>
            </label>
            <label
              htmlFor="input-general"
              className="flex items-center gap-8px whitespace-nowrap text-checkbox-text-primary"
            >
              <input
                type="radio"
                id="input-general"
                name="ledger-type"
                className={radioButtonStyle}
                checked={selectedReportType === ReportType.General}
                onChange={() => handleReportTypeChange(ReportType.General)}
              />
              <p className="text-sm">{t('journal:LEDGER.GENERAL')}</p>
            </label>
            <label
              htmlFor="input-detailed"
              className="flex items-center gap-8px whitespace-nowrap text-checkbox-text-primary"
            >
              <input
                type="radio"
                id="input-detailed"
                name="ledger-type"
                className={radioButtonStyle}
                checked={selectedReportType === ReportType.Detailed}
                onChange={() => handleReportTypeChange(ReportType.Detailed)}
              />
              <p className="text-sm">{t('journal:LEDGER.DETAILED')}</p>
            </label>
          </div>

          <p className="mt-18px text-sm font-semibold text-neutral-300">
            {t('journal:LEDGER.SPECIFIC_ACCOUNTING_TITLE')}
          </p>
          {/* Info: (20250521 - Anna) 會計科目篩選(laptop以上) */}
          <div className="hidden w-full laptop:flex laptop:gap-x-4">
            {/* Info: (20241015 - Anna) From 篩選 */}
            <div className="flex min-w-0 flex-1 items-center">
              <span className="mr-2 mt-2 text-sm text-neutral-600">{t('common:COMMON.FROM')}</span>
              <div
                className={`flex w-full flex-col gap-8px lg:w-200px`}
                // Info: (20250311 - Anna) 點擊打開彈窗
                onClick={() => {
                  setIsStartAccountSelectorOpen(true);
                }}
              >
                <p className="text-sm font-semibold text-input-text-primary"></p>
                <div
                  className={`relative flex h-44px items-center justify-between rounded-bl-sm rounded-tl-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-sm hover:cursor-pointer`}
                >
                  <p className="flex-1 truncate text-input-text-input-placeholder">
                    {selectedStartCategory
                      ? t(
                          `filter_section_type:FILTER_SECTION_TYPE.${selectedStartCategory.toUpperCase()}`
                        )
                      : '選擇科目類別'}
                  </p>
                  <div className="flex h-20px w-20px items-center justify-center">
                    <FaAngleDown />
                  </div>
                </div>
              </div>
              <div
                className={`flex w-full flex-col gap-8px`}
                // Info: (20250311 - Anna) 點擊打開彈窗
                onClick={() => {
                  setIsStartAccountSelectorOpen(true);
                }}
              >
                <p className="text-sm font-semibold text-input-text-primary"></p>
                <div
                  className={`relative flex h-44px items-center justify-between rounded-br-sm rounded-tr-sm border border-l-0 border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-sm hover:cursor-pointer`}
                >
                  <p className="flex-1 truncate text-input-text-input-placeholder">
                    {selectedStartAccountNo
                      ? t(
                          `filter_section_type:FILTER_SECTION_TYPE.${selectedStartAccountNo.toUpperCase()}`
                        )
                      : '選擇會計科目'}
                  </p>
                  <div className="flex h-20px w-20px items-center justify-center">
                    <IoBookOutline size={20} />
                  </div>
                </div>
              </div>
            </div>

            {/* Info: (20241015 - Anna) To 篩選 */}
            <div className="flex min-w-0 flex-1 items-center">
              <span className="mr-2 mt-2 text-sm text-neutral-600">{t('common:COMMON.TO')}</span>
              <div
                className={`flex w-full flex-col gap-8px lg:w-200px`} // Info: (20250311 - Anna) 點擊打開彈窗
                onClick={() => {
                  setIsEndAccountSelectorOpen(true);
                }}
              >
                <p className="text-sm font-semibold text-input-text-primary"></p>
                <div
                  className={`relative flex h-44px items-center justify-between rounded-bl-sm rounded-tl-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-sm hover:cursor-pointer`}
                >
                  <p className="flex-1 truncate text-input-text-input-placeholder">
                    {selectedEndCategory
                      ? t(
                          `filter_section_type:FILTER_SECTION_TYPE.${selectedEndCategory.toUpperCase()}`
                        )
                      : '選擇科目類別'}
                  </p>
                  <div className="flex h-20px w-20px items-center justify-center">
                    <FaAngleDown />
                  </div>
                </div>
              </div>
              <div
                className={`flex w-full flex-col gap-8px`}
                // Info: (20250311 - Anna) 點擊打開彈窗
                onClick={() => {
                  setIsEndAccountSelectorOpen(true);
                }}
              >
                <p className="text-sm font-semibold text-input-text-primary"></p>
                <div
                  className={`relative flex h-44px items-center justify-between rounded-br-sm rounded-tr-sm border border-l-0 border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-sm hover:cursor-pointer`}
                >
                  <p className="flex-1 truncate text-input-text-input-placeholder">
                    {selectedEndAccountNo
                      ? t(
                          `filter_section_type:FILTER_SECTION_TYPE.${selectedEndAccountNo.toUpperCase()}`
                        )
                      : '選擇會計科目'}
                  </p>
                  <div className="flex h-20px w-20px items-center justify-center">
                    <IoBookOutline size={20} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info: (20250521 - Anna) 會計科目篩選(laptop以下) */}
          <div className="mt-2 w-full flex-col laptop:hidden">
            {/* Info: (20241015 - Anna) From 篩選 */}
            <div className="w-full flex-col items-center">
              <span className="mr-2 mt-2 text-sm text-neutral-600">{t('common:COMMON.FROM')}</span>
              <div className="flex">
                <div
                  className={`flex w-3/10 flex-col gap-8px lg:w-200px`}
                  // Info: (20250311 - Anna) 點擊打開彈窗
                  onClick={() => {
                    setIsStartAccountSelectorOpen(true);
                  }}
                >
                  <p className="text-sm font-semibold text-input-text-primary"></p>
                  <div
                    className={`relative flex h-44px items-center justify-between rounded-bl-sm rounded-tl-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-sm hover:cursor-pointer`}
                  >
                    <p className="flex-1 truncate text-input-text-input-placeholder">
                      {selectedStartCategory
                        ? t(
                            `filter_section_type:FILTER_SECTION_TYPE.${selectedStartCategory.toUpperCase()}`
                          )
                        : '選擇科目類別'}
                    </p>
                    <div className="flex h-20px w-20px items-center justify-center">
                      <FaAngleDown />
                    </div>
                  </div>
                </div>
                <div
                  className={`flex w-7/10 flex-col gap-8px`}
                  // Info: (20250311 - Anna) 點擊打開彈窗
                  onClick={() => {
                    setIsStartAccountSelectorOpen(true);
                  }}
                >
                  <p className="text-sm font-semibold text-input-text-primary"></p>
                  <div
                    className={`relative flex h-44px items-center justify-between rounded-br-sm rounded-tr-sm border border-l-0 border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-sm hover:cursor-pointer`}
                  >
                    <p className="flex-1 truncate text-input-text-input-placeholder">
                      {selectedStartAccountNo
                        ? t(
                            `filter_section_type:FILTER_SECTION_TYPE.${selectedStartAccountNo.toUpperCase()}`
                          )
                        : '選擇會計科目'}
                    </p>
                    <div className="flex h-20px w-20px items-center justify-center">
                      <IoBookOutline size={20} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Info: (20241015 - Anna) To 篩選 */}
            <div className="w-full flex-col items-center">
              <span className="mr-2 mt-2 text-sm text-neutral-600">{t('common:COMMON.TO')}</span>
              <div className="flex">
                <div
                  className={`flex w-3/10 flex-col gap-8px lg:w-200px`} // Info: (20250311 - Anna) 點擊打開彈窗
                  onClick={() => {
                    setIsEndAccountSelectorOpen(true);
                  }}
                >
                  <p className="text-sm font-semibold text-input-text-primary"></p>
                  <div
                    className={`relative flex h-44px items-center justify-between rounded-bl-sm rounded-tl-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-sm hover:cursor-pointer`}
                  >
                    <p className="flex-1 truncate text-input-text-input-placeholder">
                      {selectedEndCategory
                        ? t(
                            `filter_section_type:FILTER_SECTION_TYPE.${selectedEndCategory.toUpperCase()}`
                          )
                        : '選擇科目類別'}
                    </p>
                    <div className="flex h-20px w-20px items-center justify-center">
                      <FaAngleDown />
                    </div>
                  </div>
                </div>
                <div
                  className={`flex w-7/10 flex-col gap-8px`}
                  // Info: (20250311 - Anna) 點擊打開彈窗
                  onClick={() => {
                    setIsEndAccountSelectorOpen(true);
                  }}
                >
                  <p className="text-sm font-semibold text-input-text-primary"></p>
                  <div
                    className={`relative flex h-44px items-center justify-between rounded-br-sm rounded-tr-sm border border-l-0 border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-sm hover:cursor-pointer`}
                  >
                    <p className="flex-1 truncate text-input-text-input-placeholder">
                      {selectedEndAccountNo
                        ? t(
                            `filter_section_type:FILTER_SECTION_TYPE.${selectedEndAccountNo.toUpperCase()}`
                          )
                        : '選擇會計科目'}
                    </p>
                    <div className="flex h-20px w-20px items-center justify-center">
                      <IoBookOutline size={20} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info: (20250311 - Anna) 加入 AccountTitleSelector 彈窗 */}
        {isStartAccountSelectorOpen && (
          <AccountTitleSelector
            toggleModal={() => setIsStartAccountSelectorOpen(false)}
            accountSelectedHandler={startAccountSelectedHandler}
          />
        )}
        {isEndAccountSelectorOpen && (
          <AccountTitleSelector
            toggleModal={() => setIsEndAccountSelectorOpen(false)}
            accountSelectedHandler={endAccountSelectedHandler}
          />
        )}

        {/* Info: (20250521 - Anna) 有選擇日期再顯示分隔線 */}
        {selectedDateRange.startTimeStamp > 0 && selectedDateRange.endTimeStamp > 0 && (
          <div className="hidden h-px w-full bg-neutral-100 tablet:block"></div>
        )}

        <LedgerList
          ledgerData={ledgerData} // Info: (20241118 - Anna) 如果 ledgerData 是 undefined，傳遞 null
          loading={!!isLoading} // Info: (20241118 - Anna) 使用 !! 確保 loading 是 boolean
          selectedDateRange={selectedDateRange} // Info: (20241218 - Anna) 傳遞日期範圍
          labelType={selectedReportType} // Info: (20241218 - Anna) 傳遞報表類型（general/detailed/all）
          selectedStartAccountNo={selectedStartAccountNo}
          selectedEndAccountNo={selectedEndAccountNo}
        />
        {/* Info: (20250312 - Anna) 分頁 UI */}
        {selectedDateRange.startTimeStamp > 0 && selectedDateRange.endTimeStamp > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            setCurrentPage={setCurrentPage}
            totalCount={totalCount}
          />
        )}
      </div>
    </div>
  );
};

export default LedgerPageBody;
