import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { LuPlus } from 'react-icons/lu';
import { Button } from '@/components/button/button';
import VoucherList from '@/components/voucher/voucher_list';
import FilterSection from '@/components/filter_section/filter_section';
import Pagination from '@/components/pagination/pagination';
import { EventType } from '@/constants/account';
import Tabs from '@/components/tabs/tabs';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { IVoucherBeta } from '@/interfaces/voucher';
import { useUserCtx } from '@/contexts/user_context';
import { FREE_COMPANY_ID } from '@/constants/config';

enum VoucherTabs {
  UPLOADED = 'Uploaded Voucher',
  UPCOMING = 'Upcoming Events',
}

const VoucherListPageBody: React.FC = () => {
  const { t } = useTranslation('common');
  const { selectedCompany } = useUserCtx();

  const [activeTab, setActiveTab] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // ToDo: (20240920 - Julian) dummy data
  const totalPage = 10;
  const voucherTabCount = [0, 1];

  const voucherTab = Object.values(VoucherTabs);
  const voucherTypeList = Object.keys(EventType).map((key) => key.toLowerCase());

  const tabQueryStr = Object.keys(VoucherTabs)[activeTab].toLowerCase();
  const params = { companyId: selectedCompany?.id ?? FREE_COMPANY_ID };

  const { data: voucherData } = APIHandler<{ data: IVoucherBeta[] }>(
    APIName.VOUCHER_LIST_V2,
    {
      params,
      query: { strategy: tabQueryStr },
    },
    true
  );

  const voucherList = voucherData?.data ?? [];

  // Info: (20241022 - Julian) 額外查詢條件
  const extraQuery = { strategy: tabQueryStr, page: currentPage };

  const tabClick = (index: number) => setActiveTab(index);

  const displayVoucherList =
    voucherList && voucherList.length > 0 ? (
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
        {/* ToDo: (20241022 - Julian) Filter Section */}
        <FilterSection
          params={params}
          apiName={APIName.VOUCHER_LIST_V2}
          types={voucherTypeList}
          extraQuery={extraQuery}
        />
        {/* Info: (20240920 - Julian) Voucher List */}
        {displayVoucherList}
        {/* Info: (20240920 - Julian) Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPage}
          setCurrentPage={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default VoucherListPageBody;
