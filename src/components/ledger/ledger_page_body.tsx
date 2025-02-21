import React, { useState, useEffect } from 'react';
import LedgerList from '@/components/ledger/ledger_list';
import AccountRangeFilter from '@/components/filter_section/account_range_filter';
import { radioButtonStyle } from '@/constants/display';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { IDatePeriod } from '@/interfaces/date_period';
import { useTranslation } from 'next-i18next';
import { IPaginatedAccount } from '@/interfaces/accounting_account';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { ILedgerPayload } from '@/interfaces/ledger';
import { useUserCtx } from '@/contexts/user_context';
import { useRouter } from 'next/router';

enum ReportType {
  General = 'general',
  Detailed = 'detailed',
  All = 'all',
}

const LedgerPageBody = () => {
  const router = useRouter();

  const { t } = useTranslation(['journal', 'date_picker', 'filter_section_type', 'reports']);
  const { selectedAccountBook } = useUserCtx();
  // const [financialReport, setFinancialReport] = useState<IPaginatedAccount | null>(null); // Info: (20241205 - Anna) 用來看回傳的會計科目 Add state to hold the financial report data for debugging output

  // Info: (20241105 - Anna) 定義各類別的會計科目選項
  // Info: (20241105 - Anna) 從 src/constants/account.ts 的 export enum AccountType 而來，只留下有科目的類別
  const [assetOptions, setAssetOptions] = useState<string[]>([]);
  const [liabilityOptions, setLiabilityOptions] = useState<string[]>([]);
  const [equityOptions, setEquityOptions] = useState<string[]>([]);
  const [revenueOptions, setRevenueOptions] = useState<string[]>([]);
  const [costOptions, setCostOptions] = useState<string[]>([]);
  const [expenseOptions, setExpenseOptions] = useState<string[]>([]);
  const [incomeOptions, setIncomeOptions] = useState<string[]>([]);
  const [otherComprehensiveIncomeOptions, setOtherComprehensiveIncomeOptions] = useState<string[]>(
    []
  );
  const [selectedReportType, setSelectedReportType] = useState<ReportType>(ReportType.All);
  const [selectedDateRange, setSelectedDateRange] = useState<IDatePeriod>({
    startTimeStamp: 0,
    endTimeStamp: 0,
  });
  const [selectedStartAccountNo, setSelectedStartAccountNo] = useState<string>('');
  const [selectedEndAccountNo, setSelectedEndAccountNo] = useState<string>('');
  const [ledgerData, setLedgerData] = useState<ILedgerPayload | null>(null);

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
      selectedAccountBook?.id &&
      selectedDateRange.startTimeStamp &&
      selectedDateRange.endTimeStamp &&
      selectedReportType
    ) {
      const query = {
        startDate: selectedDateRange.startTimeStamp,
        endDate: selectedDateRange.endTimeStamp,
        startAccountNo: selectedStartAccountNo || null, // Info: (20241118 - Anna) 若為選填，使用 null 表示不填
        endAccountNo: selectedEndAccountNo || null,
        labelType: selectedReportType.toLowerCase(), // Info: (20241118 - Anna) 確保傳遞的是小寫的值
      };

      const params = { companyId: selectedAccountBook.id };

      // Deprecate: (20241118 - Anna) debug
      // eslint-disable-next-line no-console
      console.log('Fetching ledger data with params and query:', {
        params,
        query,
      });

      const fetchLedgerData = async () => {
        const startAccountNo = selectedStartAccountNo.split(' ')[0]; // Info: (20241117 - Liz) 取出科目編號
        const endAccountNo = selectedEndAccountNo.split(' ')[0]; // Info: (20241117 - Liz) 取出科目編號

        const { data } = await fetchLedgerDataAPI({
          params: { companyId: selectedAccountBook.id },
          query: {
            startDate: selectedDateRange.startTimeStamp,
            endDate: selectedDateRange.endTimeStamp,
            startAccountNo,
            endAccountNo,
            labelType: selectedReportType,
            // page: 1,
            pageSize: 99999, // Info: (20241105 - Anna) 限制每次取出 99999 筆
          },
        });
        setLedgerData(data);
      };

      fetchLedgerData();
    }
  }, [
    selectedAccountBook,
    selectedDateRange,
    selectedReportType,
    selectedStartAccountNo,
    selectedEndAccountNo,
  ]);

  // Info: (20241117 - Liz) 取得會計科目列表
  useEffect(() => {
    if (!selectedAccountBook) return;

    const getAccountList = async () => {
      const { data: accountTitleList } = await getAccountListAPI({
        params: { companyId: selectedAccountBook.id },
        query: {
          limit: 99999, // Info: (20241105 - Anna) 限制每次取出 99999 筆
          forUser: true,
          sortBy: 'code', // Info: (20241105 - Anna) 依 code 排序
          sortOrder: 'asc',
          isDeleted: false, // Info: (20250102 - Julian) 只取未刪除的
        },
      });

      if (accountTitleList) {
        // setFinancialReport(accountTitleList); // Info: (20241205 - Anna) 用來看回傳的會計科目 Set the financial report data to state for output below

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

        // Info: (20241105 - Anna) 更新各類別的選項狀態
        setAssetOptions(assets);
        setLiabilityOptions(liabilities);
        setEquityOptions(equities);
        setRevenueOptions(revenues);
        setCostOptions(costs);
        setExpenseOptions(expenses);
        setIncomeOptions(incomes);
        setOtherComprehensiveIncomeOptions(otherComprehensiveIncomes);

        // Info: (20241105 - Anna) 印出各類別的會計科目
        // Deprecate: (20241118 - Anna) debug
        // eslint-disable-next-line no-console
        console.log('Assets:', assets);
        // Deprecate: (20241118 - Anna) debug
        // eslint-disable-next-line no-console
        console.log('Liabilities:', liabilities);
        // Deprecate: (20241118 - Anna) debug
        // eslint-disable-next-line no-console
        console.log('Equities:', equities);
        // Deprecate: (20241118 - Anna) debug
        // eslint-disable-next-line no-console
        console.log('Revenues:', revenues);
        // Deprecate: (20241118 - Anna) debug
        // eslint-disable-next-line no-console
        console.log('Costs:', costs);
        // Deprecate: (20241118 - Anna) debug
        // eslint-disable-next-line no-console
        console.log('Expenses:', expenses);
        // Deprecate: (20241118 - Anna) debug
        // eslint-disable-next-line no-console
        console.log('Incomes:', incomes);
        // Deprecate: (20241118 - Anna) debug
        // eslint-disable-next-line no-console
        // console.log('GainsOrLosses:', gainsOrLosses);
        // Deprecate: (20241118 - Anna) debug
        // eslint-disable-next-line no-console
        console.log('OtherComprehensiveIncomes:', otherComprehensiveIncomes);
        // Deprecate: (20241118 - Anna) debug
        // eslint-disable-next-line no-console
        // console.log('CashFlows:', cashFlows);
        // Deprecate: (20241118 - Anna) debug
        // eslint-disable-next-line no-console
        // console.log('Others:', others);
      }
    };

    getAccountList();
  }, [selectedAccountBook]);

  const handleReportTypeChange = (type: ReportType) => {
    setSelectedReportType(type);
  };

  return (
    <>
      <div className="relative flex min-h-screen flex-col items-center gap-40px">
        <div className="flex w-full flex-col items-stretch gap-40px">
          <div>
            <p className="mb-8px mt-18px text-sm font-semibold text-neutral-300">
              {t('journal:LEDGER.LEDGER_PERIOD')}
            </p>
            <div className="flex min-w-250px flex-1 flex-col">
              <DatePicker
                period={selectedDateRange}
                setFilteredPeriod={setSelectedDateRange}
                type={DatePickerType.TEXT_PERIOD}
              />
            </div>

            <p className="mb-8px mt-18px text-sm font-semibold text-neutral-300">
              {t('journal:LEDGER.LABEL_TYPE')}
            </p>
            <div className="flex w-1/3 flex-col items-start gap-x-60px gap-y-24px md:flex-row md:items-baseline md:justify-between">
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
            <AccountRangeFilter
              // Info: (20241105 - Anna) 傳入各類別的會計科目選項
              assetOptions={assetOptions}
              liabilityOptions={liabilityOptions}
              equityOptions={equityOptions}
              revenueOptions={revenueOptions}
              costOptions={costOptions}
              expenseOptions={expenseOptions}
              incomeOptions={incomeOptions}
              otherComprehensiveIncomeOptions={otherComprehensiveIncomeOptions}
              onRangeSelected={(startAccountNo, endAccountNo) => {
                setSelectedStartAccountNo(startAccountNo);
                setSelectedEndAccountNo(endAccountNo);
              }}
            />
          </div>

          <div className="h-px w-full bg-neutral-100"></div>
          <LedgerList
            ledgerData={ledgerData} // Info: (20241118 - Anna) 如果 ledgerData 是 undefined，傳遞 null
            loading={!!isLoading} // Info: (20241118 - Anna) 使用 !! 確保 loading 是 boolean
            selectedDateRange={selectedDateRange} // Info: (20241218 - Anna) 傳遞日期範圍
            labelType={selectedReportType} // Info: (20241218 - Anna) 傳遞報表類型（general/detailed/all）
            selectedStartAccountNo={selectedStartAccountNo}
            selectedEndAccountNo={selectedEndAccountNo}
          />
        </div>
      </div>

      {/*  Info: (20241205 - Anna) 用來看回傳的會計科目 Output the entire response data here for debugging */}
      {/* <div className="mx-auto w-a4-height origin-top overflow-x-auto">
        {financialReport && <pre>{JSON.stringify(financialReport, null, 2)}</pre>}
      </div> */}
    </>
  );
};

export default LedgerPageBody;
