import React, { useState } from 'react';
import APandARList from '@/components/voucher/ap_and_ar_list';
import Tabs from '@/components/tabs/tabs';

const APandARPageBody = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="relative flex flex-col items-center gap-40px px-40px py-40px">
      <div className="flex w-full flex-col items-stretch gap-40px">
        {/* Info: (20240925 - Julian) Tabs */}
        <Tabs
          tabs={['Receivable', 'Payable']}
          activeTab={activeTab}
          onTabClick={(index: number) => setActiveTab(index)}
          counts={[0, 1]}
        />
        {/* ToDo: (20240924 - Julian) Filter: 通用元件 */}
        <div className="flex h-72px w-full flex-col items-center justify-center bg-text-neutral-secondary text-white">
          This is filter
        </div>
        {/* Info: (20240924 - Julian) AP/AR List */}
        <APandARList />
      </div>
    </div>
  );
};

export default APandARPageBody;
