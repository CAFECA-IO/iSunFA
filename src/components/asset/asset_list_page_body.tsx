import React, { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import AssetList from '@/components/asset/asset_list';
import FilterSection from '@/components/filter_section/filter_section';
import Pagination from '@/components/pagination/pagination';
import { useModalContext } from '@/contexts/modal_context';
import { useUserCtx } from '@/contexts/user_context';
import { APIName } from '@/constants/api_connection';
import { DEFAULT_PAGE_LIMIT, FREE_ACCOUNT_BOOK_ID } from '@/constants/config';
import { AssetStatus, AccountCodesOfAsset, AssetEntityType } from '@/constants/asset';
import { SortBy, SortOrder } from '@/constants/sort';
import { IAssetItem, IAssetItemUI } from '@/interfaces/asset';
import { IPaginatedData } from '@/interfaces/pagination';
import APIHandler from '@/lib/utils/api_handler';
import { IPaginatedAccount } from '@/interfaces/accounting_account';
import { ToastType } from '@/interfaces/toastify';
import { ToastId } from '@/constants/toast_id';
import { ISortOption } from '@/interfaces/sort';
import useOuterClick from '@/lib/hooks/use_outer_click';

const AssetListPageBody: React.FC = () => {
  const { t } = useTranslation('asset');
  const { connectedAccountBook } = useUserCtx();
  const { toastHandler } = useModalContext();

  // Info: (20250522 - Julian) for mobile: Filter Side Menu
  const {
    targetRef: sideMenuRef,
    componentVisible: isShowSideMenu,
    setComponentVisible: setIsShowSideMenu,
  } = useOuterClick<HTMLDivElement>(false);

  const accountBookId = connectedAccountBook?.id ?? FREE_ACCOUNT_BOOK_ID;
  const params = { accountBookId };

  const { trigger: getAccountListAPI } = APIHandler<IPaginatedAccount>(APIName.ACCOUNT_LIST);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const [assetList, setAssetList] = useState<IAssetItemUI[]>([]);
  // Info: (20241024 - Julian) 排序狀態
  const [dateSort, setDateSort] = useState<null | SortOrder>(null);
  const [purchasePriceSort, setPurchasePriceSort] = useState<null | SortOrder>(null);
  const [accumulatedDepreciationSort, setAccumulatedDepreciationSort] = useState<null | SortOrder>(
    null
  );
  const [residualValueSort, setResidualValueSort] = useState<null | SortOrder>(null);
  const [remainingLifeSort, setRemainingLifeSort] = useState<null | SortOrder>(null);
  const [selectedSort, setSelectedSort] = useState<ISortOption | undefined>();

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
      (error as Error).message = t('asset:ASSET.TOAST_GET_ACCOUNT_LIST_FAILED');
    }
  };

  useEffect(() => {
    getAccountList();
  }, []);

  // Info: (20241024 - Julian) 資產狀態列表
  const assetStatusList = Object.values(AssetStatus);

  const handleApiResponse = (resData: IPaginatedData<IAssetItem[]>) => {
    setTotalPage(resData.totalPages);
    setCurrentPage(resData.page);

    const assetListUI: IAssetItemUI[] = resData.data.map((asset) => ({
      ...asset,
      isSelected: false,
    }));
    setAssetList(assetListUI);
  };

  return (
    <div ref={sideMenuRef} className="relative flex flex-col items-center gap-40px">
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
          labelClassName="text-input-text-primary"
        />
        {/* Info: (20240925 - Julian) Asset List */}
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
          toggleSideMenu={toggleSideMenu}
        />

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
