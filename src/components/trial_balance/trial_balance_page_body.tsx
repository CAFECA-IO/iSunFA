import React from 'react';
import TrialBalanceList from '@/components/trial_balance/trial_balance_list';

const TrialBalancePageBody = () => {
  return (
    <div className="relative flex min-h-screen flex-col items-center gap-40px px-40px py-40px">
      {/* Info: (20240920 - Julian) Voucher List */}
      <div className="flex w-full flex-col items-stretch gap-40px">
        {/* ToDo: (20240920 - Julian) Filter: 通用元件 */}
        <div className="flex h-72px w-full flex-col items-center justify-center bg-text-neutral-secondary text-white">
          This is filter
        </div>
        {/* Info: (20240920 - Julian) Voucher List */}
        <TrialBalanceList />
      </div>
    </div>
  );
};

export default TrialBalancePageBody;
