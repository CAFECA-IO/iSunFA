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

const LedgerPageBody = () => {
  const { t } = useTranslation(['common', 'journal']);

  const queryCondition = {
    limit: 100,
    forUser: true,
    sortBy: 'code',
    sortOrder: 'asc',
  };

  // Info: (20241104 - Anna) API call to fetch account data
  const { trigger: getAccountList, data: accountTitleList } = APIHandler<IPaginatedAccount>(
    APIName.ACCOUNT_LIST,
    {
      params: { companyId: 1 },
      query: queryCondition,
    },
    false,
    true
  );

  const [allAccounts, setAllAccounts] = useState<string[]>([]); // Info: (20241104 - Anna) Array to store all accounts without categorization

  const [selectedReportType, setSelectedReportType] = useState<
    'General' | 'Detailed' | 'General & Detailed'
  >('General');
  const [selectedDateRange, setSelectedDateRange] = useState<IDatePeriod>({
    startTimeStamp: 0,
    endTimeStamp: 0,
  });

  useEffect(() => {
    getAccountList({ query: { ...queryCondition } });
  }, []);

  useEffect(() => {
    if (accountTitleList) {
      const accounts: string[] = [];

      accountTitleList.data.forEach((account) => {
        accounts.push(`${account.code} ${account.name}`);
      });

      setAllAccounts(accounts);
    }
  }, [accountTitleList]);

  const handleReportTypeChange = (type: 'General' | 'Detailed' | 'General & Detailed') => {
    setSelectedReportType(type);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center gap-40px px-40px py-40px">
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
            assetOptions={allAccounts} // Info: (20241104 - Anna) Pass all accounts here
            liabilityOptions={[]} // Info: (20241104 - Anna) Empty array since we’re not categorizing
            equityOptions={[]} // Info: (20241104 - Anna) Empty array since we’re not categorizing
            onRangeSelected={(from, to) => {
              // eslint-disable-next-line no-console
              console.log(`Selected From: ${from}, To: ${to}`); // Info: (20241104 - Anna) Confirm data flow here if needed
            }}
          />
        </div>

        <div className="h-px w-full bg-neutral-100"></div>
        <LedgerList selectedDateRange={selectedDateRange} />
      </div>
    </div>
  );
};

export default LedgerPageBody;
