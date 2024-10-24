import React, { useState, useEffect } from 'react';
import AssetList from '@/components/asset/asset_list';
import FilterSection from '@/components/filter_section/filter_section';
import Pagination from '@/components/pagination/pagination';
import { useUserCtx } from '@/contexts/user_context';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { APIName } from '@/constants/api_connection';
import { DEFAULT_PAGE_LIMIT, FREE_COMPANY_ID } from '@/constants/config';
import { AssetStatus, AccountCodesOfAsset } from '@/constants/asset';
import { useTranslation } from 'next-i18next';
import { IAssetItem } from '@/interfaces/asset';
import { MdOutlineFileDownload } from 'react-icons/md';
import { Button } from '@/components/button/button';
import { IPaginatedData } from '@/interfaces/pagination';

const AssetListPageBody: React.FC = () => {
  const { t } = useTranslation('common');
  const { selectedCompany } = useUserCtx();
  const { accountList, getAccountListHandler } = useAccountingCtx();

  const companyId = selectedCompany?.id ?? FREE_COMPANY_ID;
  const params = { companyId };
  // ToDo: (20241024 - Julian) add filter query

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const [assetList, setAssetList] = useState<IAssetItem[]>([]);

  useEffect(() => {
    getAccountListHandler(companyId);
  }, [companyId]);

  // Info: (20241024 - Julian) 資產類別列表
  const assetTypeList = accountList
    .filter((account) => AccountCodesOfAsset.includes(account.code))
    .map((account) => account.name);

  // Info: (20241024 - Julian) 資產狀態列表
  const assetStatusList = Object.values(AssetStatus);

  const handleApiResponse = (resData: IPaginatedData<IAssetItem[]>) => {
    setAssetList(resData.data);
    setTotalPage(resData.totalPages);
    setCurrentPage(resData.page);
  };

  return (
    <div className="relative flex flex-col items-center gap-40px p-40px">
      {/* Info: (20240925 - Julian) Asset List */}
      <div className="flex w-full flex-col items-stretch gap-40px">
        {/* Info: (20241024 - Julian) Filter Section */}
        <FilterSection
          params={params}
          apiName={APIName.ASSET_LIST_V2}
          onApiResponse={handleApiResponse}
          types={['All', ...assetTypeList]}
          statuses={['All', ...assetStatusList]}
          page={currentPage}
          pageSize={DEFAULT_PAGE_LIMIT}
        />
        <div className="flex flex-col gap-16px">
          {/* Info: (20240925 - Julian) Export Asset button */}
          <div className="ml-auto">
            <Button
              type="button"
              variant="tertiaryOutline"
              // ToDo: (20240925 - Julian) export to pdf
            >
              <MdOutlineFileDownload />
              <p>{t('asset:ASSET.EXPORT_ASSET_LIST')}</p>
            </Button>
          </div>

          {/* Info: (20240925 - Julian) Asset List */}
          {assetList && assetList.length > 0 ? (
            <AssetList assetList={assetList} />
          ) : (
            <div className="flex items-center justify-center rounded-lg bg-surface-neutral-surface-lv2 p-20px text-text-neutral-tertiary">
              <p>{t('asset:ASSET_DETAIL_PAGE.NO_ASSET')}</p>
            </div>
          )}

          {/* Info: (20240925 - Julian) Pagination */}
          <div className="mx-auto">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPage}
              setCurrentPage={setCurrentPage}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetListPageBody;
