import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { LuPlus } from 'react-icons/lu';
import { Button } from '@/components/button/button';
import VoucherList from '@/components/voucher/voucher_list';
import Tabs from '@/components/tabs/tabs';

const VoucherListPageBody = () => {
  const { t } = useTranslation('common');
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="relative flex flex-col items-center gap-40px px-40px py-40px">
      {/* Info: (20240920 - Julian) Add New Voucher button */}
      <div className="ml-auto">
        <Button type="button">
          <LuPlus />
          <p>{t('journal:VOUCHER.ADD_NEW_VOUCHER')}</p>
        </Button>
      </div>
      {/* Info: (20240920 - Julian) Voucher List */}
      <div className="flex w-full flex-col items-stretch gap-40px">
        {/* Info: (20240925 - Julian) Tabs */}
        <Tabs
          tabs={['Uploaded Voucher', 'Upcoming Events']}
          activeTab={activeTab}
          onTabClick={(index: number) => setActiveTab(index)}
          counts={[0, 1]}
        />
        {/* ToDo: (20240920 - Julian) Filter: 通用元件 */}
        <div className="flex h-72px w-full flex-col items-center justify-center bg-text-neutral-secondary text-white">
          This is filter
        </div>
        {/* Info: (20240920 - Julian) Voucher List */}
        <VoucherList />
      </div>
    </div>
  );
};

export default VoucherListPageBody;
