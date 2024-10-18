import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { LuPlus } from 'react-icons/lu';
import { Button } from '@/components/button/button';
import VoucherList from '@/components/voucher/voucher_list';
import Tabs from '@/components/tabs/tabs';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { IVoucherBeta } from '@/interfaces/voucher';

enum VoucherTabs {
  UPLOADED = 'Uploaded Voucher',
  UPCOMING = 'Upcoming Events',
}

const VoucherListPageBody: React.FC = () => {
  const { t } = useTranslation('common');
  const [activeTab, setActiveTab] = useState(0);

  const voucherTab = Object.values(VoucherTabs);
  const voucherTabCount = [0, 1];

  const tabClick = (index: number) => {
    setActiveTab(index);
  };

  const tabQueryStr = Object.keys(VoucherTabs)[activeTab].toLowerCase();

  const { data: voucherData } = APIHandler<{ data: IVoucherBeta[] }>(
    APIName.VOUCHER_LIST_V2,
    {
      // ToDo: (20241017 - Julian) Replace with real parameters
      params: {
        companyId: '111',
      },
      query: {
        strategy: tabQueryStr,
      },
    },
    true
  );

  const voucherList = voucherData?.data ?? [];

  const displayVoucherList = voucherList ? (
    <VoucherList voucherList={voucherList} />
  ) : (
    <div className="flex items-center justify-center rounded-lg bg-surface-neutral-surface-lv2 p-20px text-text-neutral-tertiary">
      <p>{t('journal:VOUCHER.NO_VOUCHER')}</p>
    </div>
  );

  return (
    <div className="relative flex flex-col items-center gap-40px p-40px">
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
          tabs={voucherTab}
          activeTab={activeTab}
          onTabClick={tabClick}
          counts={voucherTabCount}
        />
        {/* ToDo: (20240920 - Julian) Filter: 通用元件 */}
        <div className="flex h-72px w-full flex-col items-center justify-center bg-text-neutral-secondary text-white">
          This is filter
        </div>
        {/* Info: (20240920 - Julian) Voucher List */}
        {displayVoucherList}
      </div>
    </div>
  );
};

export default VoucherListPageBody;
