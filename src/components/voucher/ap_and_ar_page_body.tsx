import React, { useState } from 'react';
import APandARList from '@/components/voucher/ap_and_ar_list';
import Tabs from '@/components/tabs/tabs';

enum APandARTabs {
  RECEIVABLE = 'Receivable',
  PAYABLE = 'Payable',
}

const APandARPageBody: React.FC = () => {
  const [activeTab, setActiveTab] = useState(APandARTabs.RECEIVABLE);

  return (
    <div className="relative flex flex-col items-center gap-40px p-40px">
      <div className="flex w-full flex-col items-stretch gap-40px">
        {/* Info: (20240925 - Julian) Tabs */}
        <Tabs
          tabs={Object.values(APandARTabs)}
          tabsString={['Receivable', 'Payable']}
          activeTab={activeTab}
          onTabClick={(tab: string) => setActiveTab(tab as APandARTabs)}
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
