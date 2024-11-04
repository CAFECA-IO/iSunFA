import React, { useState } from 'react';
import TrialBalanceList from '@/components/trial_balance/trial_balance_list';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { IDatePeriod } from '@/interfaces/date_period';
import { useTranslation } from 'next-i18next';

const TrialBalancePageBody = () => {
  const { t } = useTranslation(['common', 'report_401']);
  // Info: (20241015 - Anna) 定義日期篩選狀態
  const [selectedDateRange, setSelectedDateRange] = useState<IDatePeriod>({
    startTimeStamp: 0,
    endTimeStamp: 0,
  });

  return (
    <div className="relative flex min-h-screen flex-col items-center gap-40px px-40px py-40px">
      {/* Info: (20240920 - Julian) Voucher List */}
      <div className="flex w-full flex-col items-stretch gap-40px">
        {/* Info: (20241015 - Anna) 日期篩選器 */}
        <div className="flex min-w-250px flex-1 flex-col space-y-0">
          <div className="justify-center text-sm font-semibold leading-5 tracking-normal text-input-text-primary max-md:max-w-full">
            {t('journal:VOUCHER.TRIAL_BALANCE_PERIOD')}
          </div>
          <DatePicker
            period={selectedDateRange}
            setFilteredPeriod={setSelectedDateRange}
            type={DatePickerType.TEXT_PERIOD}
            btnClassName="mt-2"
          />
        </div>
        <hr className="break-before-page" />
        {/* Info: (20240920 - Julian) Voucher List */}
        <TrialBalanceList />
      </div>
    </div>
  );
};

export default TrialBalancePageBody;
