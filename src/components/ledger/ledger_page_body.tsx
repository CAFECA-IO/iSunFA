import React, { useState } from 'react';
import LedgerList from '@/components/ledger/ledger_list';
import AccountRangeFilter from '@/components/filter_section/account_range_filter';
import { radioButtonStyle } from '@/constants/display';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { IDatePeriod } from '@/interfaces/date_period';
import { useTranslation } from 'next-i18next';

const LedgerPageBody = () => {
  const { t } = useTranslation(['common', 'journal']);
  // Info: (20241015 - Anna) dummy data
  const assetOptions = ['1141 Accounts receivable', '1100 Cash', '1150 Inventory'];
  const liabilityOptions = ['2100 Accounts payable', '2200 Notes payable'];
  const equityOptions = ['3000 Common stock', '3100 Retained earnings'];
  // Info: (20241015 - Anna) 用於追踪分類帳類型的狀態
  const [selectedReportType, setSelectedReportType] = useState<
    'General' | 'Detailed' | 'General & Detailed'
  >('General');

  // Info: (20241015 - Anna) 處理用戶選擇報表類型
  const handleReportTypeChange = (type: 'General' | 'Detailed' | 'General & Detailed') => {
    setSelectedReportType(type);
  };
  // Info: (20241015 - Anna) 定義日期篩選狀態
  const [selectedDateRange, setSelectedDateRange] = useState<IDatePeriod>({
    startTimeStamp: 0,
    endTimeStamp: 0,
  });

  return (
    <div className="relative flex min-h-screen flex-col items-center gap-40px px-40px py-40px">
      <div className="flex w-full flex-col items-stretch gap-40px">
        {/* Info: (20241015 - Anna) 篩選器 */}
        <div>
          {/* Info: (20241015 - Anna) 日期篩選器 */}
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

          {/* Info: (20241015 - Anna) radio buttons */}
          <p className="mb-8px mt-18px text-sm font-semibold text-neutral-300">
            {t('journal:LEDGER.LABEL_TYPE')}
          </p>
          <div className="flex w-1/3 flex-col items-start gap-x-60px gap-y-24px md:flex-row md:items-baseline md:justify-between">
            {/* Info: (20241015 - Anna) General */}
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
            {/* Info: (20241015 - Anna) Detailed */}
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
            {/* Info: (20240424 - Anna) General & Detailed */}
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
          {/* Info: (20241015 - Anna) 選會計科目 */}
          <p className="mt-18px text-sm font-semibold text-neutral-300">
            {t('journal:LEDGER.SPECIFIC_ACCOUNTING_TITLE')}
          </p>
          <AccountRangeFilter
            assetOptions={assetOptions}
            liabilityOptions={liabilityOptions}
            equityOptions={equityOptions}
            onRangeSelected={() => {
              // Todo: (20241015 - Anna) 暫時無需處理 API 邏輯，UI完成後處理
            }}
          />
        </div>
        <div className="h-px w-full bg-neutral-100"></div>
        {/* Info: (20241018 - Anna) Ledger List */}
        <LedgerList />
      </div>
    </div>
  );
};

export default LedgerPageBody;
