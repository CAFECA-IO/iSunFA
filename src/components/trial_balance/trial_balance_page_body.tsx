import React, { useState } from 'react';
import TrialBalanceList from '@/components/trial_balance/trial_balance_list';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { IDatePeriod } from '@/interfaces/date_period';

const TrialBalancePageBody = () => {
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
        <div className="flex min-w-250px flex-1 flex-col">
          <DatePicker
            period={selectedDateRange}
            setFilteredPeriod={setSelectedDateRange}
            type={DatePickerType.TEXT_PERIOD}
            btnClassName="mt-28px"
          />
        </div>
        {/* Info: (20240920 - Julian) Voucher List */}
        <TrialBalanceList />
      </div>
    </div>
  );
};

export default TrialBalancePageBody;
