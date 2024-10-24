import React, { useState, useEffect } from 'react';
import AssetList from '@/components/asset/asset_list';
import FilterSection from '@/components/filter_section/filter_section';
import Pagination from '@/components/pagination/pagination';
import { useUserCtx } from '@/contexts/user_context';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { APIName } from '@/constants/api_connection';
import { FREE_COMPANY_ID } from '@/constants/config';
import { AssetStatus, AccountCodesOfAsset } from '@/constants/asset';
import { useTranslation } from 'next-i18next';
import APIHandler from '@/lib/utils/api_handler';
import { IAssetItem } from '@/interfaces/asset';
import { MdOutlineFileDownload } from 'react-icons/md';
import { Button } from '@/components/button/button';

const AssetListPageBody: React.FC = () => {
  const { t } = useTranslation('common');
  const { selectedCompany } = useUserCtx();
  const { accountList, getAccountListHandler } = useAccountingCtx();

  const companyId = selectedCompany?.id ?? FREE_COMPANY_ID;
  const params = { companyId };
  // ToDo: (20241024 - Julian) add filter query

  const [currentPage, setCurrentPage] = useState(1);

  const { data: assetData } = APIHandler<{ data: IAssetItem[]; totalPages: number }>(
    APIName.ASSET_LIST_V2,
    { params },
    true
  );

  useEffect(() => {
    getAccountListHandler(companyId);
  }, [companyId]);

  const assetList = assetData?.data ?? [];
  const totalPage = assetData?.totalPages ?? 1;

  // Info: (20241024 - Julian) 資產類別列表
  const assetTypeList = accountList
    .filter((account) => AccountCodesOfAsset.includes(account.code))
    .map((account) => account.name);

  // Info: (20241024 - Julian) 資產狀態列表
  const assetStatusList = Object.values(AssetStatus);

  return (
    <div className="relative flex flex-col items-center gap-40px p-40px">
      {/* Info: (20240925 - Julian) Asset List */}
      <div className="flex w-full flex-col items-stretch gap-40px">
        {/* Info: (20241024 - Julian) Filter Section */}
        <FilterSection
          params={params}
          apiName={APIName.ASSET_LIST_V2}
          types={['All', ...assetTypeList]}
          statuses={['All', ...assetStatusList]}
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
          <AssetList assetList={assetList} />

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
