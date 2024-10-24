import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import SortingButton from '@/components/voucher/sorting_button';
import { SortOrder } from '@/constants/sort';
import AssetItem from '@/components/asset/asset_item';
import { IAssetItem } from '@/interfaces/asset';

interface IAssetListProps {
  assetList: IAssetItem[];
}

const AssetList: React.FC<IAssetListProps> = ({ assetList }) => {
  const { t } = useTranslation('common');

  // Info: (20240925 - Julian) 排序狀態
  const [dateSort, setDateSort] = useState<null | SortOrder>(null);
  const [priceSort, setPriceSort] = useState<null | SortOrder>(null);
  const [depreciationSort, setDepreciationSort] = useState<null | SortOrder>(null);
  const [residualSort, setResidualSort] = useState<null | SortOrder>(null);
  const [remainingLifeSort, setRemainingLifeSort] = useState<null | SortOrder>(null);

  // Info: (20240925 - Julian) css string
  const tableCellStyles = 'table-cell text-center align-middle';
  const sideBorderStyles = 'border-r border-stroke-neutral-quaternary border-b';

  // Info: (20240925 - Julian) 日期排序按鈕
  const displayedIssuedDate = SortingButton({
    string: t('asset:ASSET.ACQUISITION_DATE'),
    sortOrder: dateSort,
    setSortOrder: setDateSort,
  });

  // Info: (20240925 - Julian) 價格排序按鈕
  const displayedPrice = SortingButton({
    string: t('asset:ASSET.PURCHASE_PRICE'),
    sortOrder: priceSort,
    setSortOrder: setPriceSort,
  });

  // Info: (20240925 - Julian) 累積折舊排序按鈕
  const displayedDepreciation = SortingButton({
    string: t('asset:ASSET.ACCUM_DEP'),
    sortOrder: depreciationSort,
    setSortOrder: setDepreciationSort,
  });

  // Info: (20240925 - Julian) 殘值排序按鈕
  const displayedResidual = SortingButton({
    string: t('asset:ASSET.RESIDUAL_VALUE'),
    sortOrder: residualSort,
    setSortOrder: setResidualSort,
  });

  // Info: (20240925 - Julian) 剩餘壽命排序按鈕
  const displayedRemainingLife = SortingButton({
    string: t('asset:ASSET.REMAINING_LIFE'),
    sortOrder: remainingLifeSort,
    setSortOrder: setRemainingLifeSort,
  });

  const displayedAssetList = assetList.map((asset) => {
    return <AssetItem key={asset.id} assetData={asset} />;
  });

  return (
    <div className="table overflow-hidden rounded-lg bg-surface-neutral-surface-lv2">
      {/* Info: (20240925 - Julian) ---------------- Table Header ---------------- */}
      <div className="table-header-group h-60px bg-surface-neutral-surface-lv1 text-sm text-text-neutral-tertiary">
        <div className="table-row">
          <div className={`${tableCellStyles} ${sideBorderStyles}`}>{displayedIssuedDate}</div>
          <div className={`${tableCellStyles} ${sideBorderStyles}`}>{t('asset:ASSET.TYPE')}</div>
          <div className={`${tableCellStyles} ${sideBorderStyles}`}>
            {t('asset:ASSET.ASSET_NAME')}
          </div>
          <div className={`${tableCellStyles} ${sideBorderStyles}`}>{displayedPrice}</div>
          <div className={`${tableCellStyles} ${sideBorderStyles}`}>{displayedDepreciation}</div>
          <div className={`${tableCellStyles} ${sideBorderStyles}`}>{displayedResidual}</div>
          <div className={`${tableCellStyles} border-b border-stroke-neutral-quaternary`}>
            {displayedRemainingLife}
          </div>
        </div>
      </div>

      {/* Info: (20240925 - Julian) ---------------- Table Body ---------------- */}
      <div className="table-row-group">{displayedAssetList}</div>
    </div>
  );
};

export default AssetList;
