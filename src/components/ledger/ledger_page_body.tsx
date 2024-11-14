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

const LedgerPageBody = () => {
  const { t } = useTranslation(['common', 'journal']);
  const { selectedCompany } = useUserCtx();

  const queryCondition = {
    limit: 99999, // Info: (20241105 - Anna) 限制每次取出 99999 筆
    forUser: true,
    // sortBy: 'code', // Info: (20241105 - Anna) 依 code 排序
    // sortOrder: 'asc',
  };

  // Info: (20241104 - Anna) API call to fetch account data
  const { trigger: getAccountList, data: accountTitleList } = selectedCompany?.id
    ? APIHandler<IPaginatedAccount>(
        APIName.LEDGER_LIST,
        {
          params: { companyId: selectedCompany.id },
          query: queryCondition,
        },
        false,
        true
      )
    : { trigger: () => {}, data: null }; // 如果没有 selectedCompany，不發起 API 請求

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

  const [selectedReportType, setSelectedReportType] = useState<
    'General' | 'Detailed' | 'General & Detailed'
  >('General');
  const [selectedDateRange, setSelectedDateRange] = useState<IDatePeriod>({
    startTimeStamp: 0,
    endTimeStamp: 0,
  });

  const [selectedStartAccountNo, setSelectedStartAccountNo] = useState<string>('');
  const [selectedEndAccountNo, setSelectedEndAccountNo] = useState<string>('');

  // 🌟 新增的 state，儲存從 API 拿的總借貸金額
  const [totalDebitAmount, setTotalDebitAmount] = useState(0);
  const [totalCreditAmount, setTotalCreditAmount] = useState(0);

  const { trigger: fetchLedgerData, data: ledgerData } = selectedCompany?.id
    ? APIHandler<ILedgerPayload>(
        APIName.LEDGER_LIST, // 使用LEDGER_LIST API
        {
          params: { companyId: selectedCompany.id },
          query: {
            startDate: selectedDateRange.startTimeStamp,
            endDate: selectedDateRange.endTimeStamp,
            startAccountNo: selectedStartAccountNo,
            endAccountNo: selectedEndAccountNo,
            labelType: selectedReportType,
            page: 1,
            pageSize: 10,
          },
        },
        false,
        true
      )
    : { trigger: () => {}, data: null }; // 如果没有 selectedCompany，不發起 API 請求

  useEffect(() => {
    // 确保 startDate 和 endDate 是有效的
    if (selectedDateRange.startTimeStamp && selectedDateRange.endTimeStamp) {
      // eslint-disable-next-line no-console
      console.log('Fetching ledger data with params:', {
        startDate: selectedDateRange.startTimeStamp,
        endDate: selectedDateRange.endTimeStamp,
        startAccountNo: selectedStartAccountNo,
        endAccountNo: selectedEndAccountNo,
        labelType: selectedReportType.toLowerCase(), // 确保传递的是小写的值
      });
      fetchLedgerData(); // 发起请求
    }
  }, [selectedDateRange, selectedStartAccountNo, selectedEndAccountNo, selectedReportType]);

  // 🌟 更新 ledgerData 並計算借貸總金額
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('Fetched ledger data:', ledgerData);
    if (ledgerData && ledgerData.total) {
      // eslint-disable-next-line no-console
      console.log('Ledger data updated:', ledgerData);
      setTotalDebitAmount(ledgerData.total.totalDebitAmount);
      setTotalCreditAmount(ledgerData.total.totalCreditAmount);
    }
  }, [ledgerData]);

  // 當日期範圍更改時調用api
  useEffect(() => {
    if (selectedDateRange.startTimeStamp && selectedDateRange.endTimeStamp) {
      fetchLedgerData();
    }
  }, [selectedDateRange]);

  useEffect(() => {
    getAccountList({ query: { ...queryCondition } });
  }, []);

  useEffect(() => {
    if (accountTitleList) {
      // eslint-disable-next-line no-console
      console.log('Account title list received:', accountTitleList); // Info: (20241105 - Anna) 查看原始資料
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
      // eslint-disable-next-line no-console
      // console.log('Assets:', assets);
      // console.log('Liabilities:', liabilities);
      // console.log('Equities:', equities);
      // console.log('Revenues:', revenues);
      // console.log('Costs:', costs);
      // console.log('Expenses:', expenses);
      // console.log('Incomes:', incomes);
      // console.log('GainsOrLosses:', gainsOrLosses);
      // console.log('OtherComprehensiveIncomes:', otherComprehensiveIncomes);
      // console.log('CashFlows:', cashFlows);
      // console.log('Others:', others);
    }
  }, [accountTitleList]);

  const handleReportTypeChange = (type: 'General' | 'Detailed' | 'General & Detailed') => {
    setSelectedReportType(type);
  };

  return (
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
              htmlFor="input-general"
              className="flex items-center gap-8px whitespace-nowrap text-checkbox-text-primary"
            >
              <input
                type="radio"
                id="input-general"
                name="ledger-type"
                className={radioButtonStyle}
                checked={selectedReportType === 'General'}
                onChange={() => handleReportTypeChange('General')}
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
                checked={selectedReportType === 'Detailed'}
                onChange={() => handleReportTypeChange('Detailed')}
              />
              <p className="text-sm">{t('journal:LEDGER.DETAILED')}</p>
            </label>
            <label
              htmlFor="input-general-detailed"
              className="flex items-center gap-8px whitespace-nowrap text-checkbox-text-primary"
            >
              <input
                type="radio"
                id="input-general-detailed"
                name="ledger-type"
                className={radioButtonStyle}
                checked={selectedReportType === 'General & Detailed'}
                onChange={() => handleReportTypeChange('General & Detailed')}
              />
              <p className="text-sm">{t('journal:LEDGER.GENERAL_DETAILED')}</p>
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
              // eslint-disable-next-line no-console
              console.log('Selected Account Range:', startAccountNo, endAccountNo);
              setSelectedStartAccountNo(startAccountNo);
              setSelectedEndAccountNo(endAccountNo);
            }}
            // onRangeSelected={(from, to) => {
            //   // eslint-disable-next-line no-console
            //   console.log(`Selected From: ${from}, To: ${to}`); // Info: (20241104 - Anna) Confirm data flow here if needed
            // }}
          />
        </div>

        <div className="h-px w-full bg-neutral-100"></div>
        <LedgerList
          ledgerData={ledgerData || null} // 如果 ledgerData 是 undefined，傳遞 null
          totalDebitAmount={totalDebitAmount}
          totalCreditAmount={totalCreditAmount}
        />
      </div>
    </div>
  );
};

export default LedgerPageBody;
