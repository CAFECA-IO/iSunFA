import React, { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { VscSettings } from 'react-icons/vsc';
import AssetList from '@/components/asset/asset_list';
import FilterSection from '@/components/filter_section/filter_section';
import Pagination from '@/components/pagination/pagination';
import { useModalContext } from '@/contexts/modal_context';
import { useUserCtx } from '@/contexts/user_context';
import { APIName } from '@/constants/api_connection';
import { DEFAULT_PAGE_LIMIT, FREE_ACCOUNT_BOOK_ID } from '@/constants/config';
import { AssetStatus, AccountCodesOfAsset, AssetEntityType } from '@/constants/asset';
import { SortBy, SortOrder } from '@/constants/sort';
import { IAssetItem } from '@/interfaces/asset';
import { IPaginatedData } from '@/interfaces/pagination';
import APIHandler from '@/lib/utils/api_handler';
import { IPaginatedAccount } from '@/interfaces/accounting_account';
import { ToastType } from '@/interfaces/toastify';
import { ToastId } from '@/constants/toast_id';
import { ISortOption } from '@/interfaces/sort';

const AssetListPageBody: React.FC = () => {
  const { t } = useTranslation('asset');
  const { connectedAccountBook } = useUserCtx();
  const { toastHandler } = useModalContext();

  const accountBookId = connectedAccountBook?.id ?? FREE_ACCOUNT_BOOK_ID;
  const params = { accountBookId };

  const { trigger: getAccountListAPI } = APIHandler<IPaginatedAccount>(APIName.ACCOUNT_LIST);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const [assetList, setAssetList] = useState<IAssetItem[]>([]);
  // Info: (20241024 - Julian) 排序狀態
  const [dateSort, setDateSort] = useState<null | SortOrder>(null);
  const [purchasePriceSort, setPurchasePriceSort] = useState<null | SortOrder>(null);
  const [accumulatedDepreciationSort, setAccumulatedDepreciationSort] = useState<null | SortOrder>(
    null
  );
  const [residualValueSort, setResidualValueSort] = useState<null | SortOrder>(null);
  const [remainingLifeSort, setRemainingLifeSort] = useState<null | SortOrder>(null);
  const [selectedSort, setSelectedSort] = useState<ISortOption | undefined>();

  const [isShowSideMenu, setIsShowSideMenu] = useState(false);

  const [assetTypeOptions, setAssetTypeOptions] = useState<string[]>([AssetEntityType.ALL]);

  const toggleSideMenu = () => setIsShowSideMenu((prev) => !prev);

  useEffect(() => {
    let sort: ISortOption | undefined;
    if (dateSort) {
      sort = { sortBy: SortBy.DATE, sortOrder: dateSort };
    } else if (purchasePriceSort) {
      sort = { sortBy: SortBy.PURCHASE_PRICE, sortOrder: purchasePriceSort };
    } else if (accumulatedDepreciationSort) {
      sort = {
        sortBy: SortBy.ACCUMULATED_DEPRECIATION,
        sortOrder: accumulatedDepreciationSort,
      };
    } else if (residualValueSort) {
      sort = { sortBy: SortBy.RESIDUAL_VALUE, sortOrder: residualValueSort };
    } else if (remainingLifeSort) {
      sort = { sortBy: SortBy.REMAINING_LIFE, sortOrder: remainingLifeSort };
    }
    setSelectedSort(sort);
  }, [
    dateSort,
    purchasePriceSort,
    accumulatedDepreciationSort,
    residualValueSort,
    remainingLifeSort,
  ]);

  // Info: (20241024 - Julian) 取得資產類別列表
  const getAccountList = async () => {
    try {
      const { data: accountData, success } = await getAccountListAPI({
        params,
        query: { limit: 9999 }, // Info: (20250122 - Julian) 一次取得全部
      });

      if (success && accountData) {
        const accountList = accountData.data;

        const assetTypeList = accountList
          .filter((account) => AccountCodesOfAsset.includes(account.code))
          .map((account) => account.code);
        setAssetTypeOptions([AssetEntityType.ALL, ...assetTypeList]);
      }
    } catch (error) {
      toastHandler({
        id: ToastId.GET_ACCOUNT_LIST_ERROR,
        type: ToastType.ERROR,
        content: t('asset:ASSET.TOAST_GET_ACCOUNT_LIST_FAILED'),
        closeable: true,
      });
    }
  };

  useEffect(() => {
    getAccountList();
  }, []);

  // Info: (20241024 - Julian) 資產狀態列表
  const assetStatusList = Object.values(AssetStatus);

  const handleApiResponse = (resData: IPaginatedData<IAssetItem[]>) => {
    setAssetList(resData.data);
    setTotalPage(resData.totalPages);
    setCurrentPage(resData.page);
  };

  return (
    <div className="relative flex flex-col items-center gap-40px">
      {/* Info: (20240925 - Julian) Asset List */}
      <div className="flex w-full flex-col items-stretch gap-40px">
        {/* Info: (20241024 - Julian) Filter Section */}
        <FilterSection<IAssetItem[]>
          params={params}
          apiName={APIName.ASSET_LIST_V2}
          onApiResponse={handleApiResponse}
          types={assetTypeOptions}
          statuses={[AssetStatus.ALL, ...assetStatusList]}
          page={currentPage}
          pageSize={DEFAULT_PAGE_LIMIT}
          sort={selectedSort}
          isShowSideMenu={isShowSideMenu}
          toggleSideMenu={toggleSideMenu}
        />
        {/* Info: (20250529 - Julian) Filter button */}
        <button
          type="button"
          onClick={toggleSideMenu}
          className="block p-10px text-button-text-secondary tablet:hidden"
        >
          <VscSettings size={24} />
        </button>
        {/* Info: (20240925 - Julian) Asset List */}
        {assetList && assetList.length > 0 ? (
          <AssetList
            assetList={assetList}
            dateSort={dateSort}
            setDateSort={setDateSort}
            priceSort={purchasePriceSort}
            setPriceSort={setPurchasePriceSort}
            depreciationSort={accumulatedDepreciationSort}
            setDepreciationSort={setAccumulatedDepreciationSort}
            residualSort={residualValueSort}
            setResidualSort={setResidualValueSort}
            remainingLifeSort={remainingLifeSort}
            setRemainingLifeSort={setRemainingLifeSort}
          />
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
  );
};

export default AssetListPageBody;
