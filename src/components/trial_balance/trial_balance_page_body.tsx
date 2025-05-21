import React, { useState } from 'react';
import TrialBalanceList from '@/components/trial_balance/trial_balance_list';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { IDatePeriod } from '@/interfaces/date_period';
import { useTranslation } from 'next-i18next';

const TrialBalancePageBody = () => {
  const { t } = useTranslation(['reports', 'date_picker', 'common']);
  // Info: (20241015 - Anna) 定義日期篩選狀態
  const [selectedDateRange, setSelectedDateRange] = useState<IDatePeriod>({
    startTimeStamp: 0,
    endTimeStamp: 0,
  });

  return (
    <div className="relative flex min-h-screen flex-col items-center gap-40px">
      <div className="flex w-full flex-col items-stretch gap-32px tablet:gap-40px">
        <p className="text-base font-semibold leading-6 tracking-wide text-neutral-400 tablet:hidden">
          {t('reports:REPORTS.TRIAL_BALANCE')}
        </p>
        {/* Info: (20241015 - Anna) 日期篩選器 */}
        <div className="flex min-w-250px flex-1 flex-col space-y-0">
          <div className="justify-center text-sm font-semibold leading-5 tracking-normal text-neutral-300 max-md:max-w-full">
            {t('reports:REPORTS.TRIAL_BALANCE_PERIOD')}
            <span> </span>
            <span className="text-text-state-error">*</span>
          </div>
          <DatePicker
            period={selectedDateRange}
            setFilteredPeriod={setSelectedDateRange}
            type={DatePickerType.TEXT_PERIOD}
            btnClassName="mt-2 tablet:mt-14px md:mt-28px"
          />
        </div>
        {/* Info: (20250521 - Anna) 有選擇日期再顯示分隔線 */}
        {selectedDateRange.startTimeStamp > 0 && selectedDateRange.endTimeStamp > 0 && (
          <hr className="border-neutral-300" />
        )}

        {/* Info: (20250520 - Anna) TrialBalance List */}
        <TrialBalanceList
          selectedDateRange={selectedDateRange}
        />
      </div>
    </div>
  );
};

export default TrialBalancePageBody;
