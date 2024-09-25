import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { MdOutlineFileDownload } from 'react-icons/md';
import { Button } from '@/components/button/button';
import Pagination from '@/components/pagination/pagination';
import SortingButton from '@/components/voucher/sorting_button';
import { SortOrder } from '@/constants/sort';
import { useGlobalCtx } from '@/contexts/global_context';

const AssetList = () => {
  const { t } = useTranslation('common');
  const { exportVoucherModalVisibilityHandler } = useGlobalCtx();

  const [currentPage, setCurrentPage] = useState(1);
  // Info: (20240925 - Julian) 排序狀態
  const [dateSort, setDateSort] = useState<null | SortOrder>(null);
  const [priceSort, setPriceSort] = useState<null | SortOrder>(null);
  const [depreciationSort, setDepreciationSort] = useState<null | SortOrder>(null);
  const [residualSort, setResidualSort] = useState<null | SortOrder>(null);
  const [remainingLifeSort, setRemainingLifeSort] = useState<null | SortOrder>(null);

  // ToDo: (20240925 - Julian) dummy data
  const totalPage = 10;

  // Info: (20240925 - Julian) css string
  const tableCellStyles = 'table-cell text-center align-middle';
  const sideBorderStyles = 'border-r border-stroke-neutral-quaternary';

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

  const displayedAssetList = Array.from({ length: 10 }, (_, i) => i + 1).map((i) => {
    return <div key={i} />;
  });

  return (
    <div className="flex flex-col gap-16px">
      {/* Info: (20240925 - Julian) Export Asset button */}
      <div className="ml-auto">
        <Button
          type="button"
          variant="tertiaryOutline"
          onClick={exportVoucherModalVisibilityHandler}
        >
          <MdOutlineFileDownload />
          <p>{t('asset:ASSET.EXPORT_ASSET_LIST')}</p>
        </Button>
      </div>

      {/* Info: (20240925 - Julian) Table */}
      <div className="table overflow-hidden rounded-lg bg-surface-neutral-surface-lv2">
        {/* Info: (20240925 - Julian) ---------------- Table Header ---------------- */}
        <div className="table-header-group h-60px border-stroke-neutral-quaternary bg-surface-neutral-surface-lv1 text-sm text-text-neutral-tertiary">
          <div className="table-row">
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>{displayedIssuedDate}</div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>{t('asset:ASSET.TYPE')}</div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>
              {t('asset:ASSET.ASSET_NAME')}
            </div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>{displayedPrice}</div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>{displayedDepreciation}</div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>{displayedResidual}</div>
            <div className={`${tableCellStyles}`}>{displayedRemainingLife}</div>
          </div>
        </div>

        {/* Info: (20240925 - Julian) ---------------- Table Body ---------------- */}
        <div className="table-row-group">{displayedAssetList}</div>

        {/* Info: (20240925 - Julian) ---------------- Table Footer(排版用) ---------------- */}
        <div className="table-footer-group h-40px"></div>
      </div>

      {/* Info: (20240925 - Julian) Pagination */}
      <div className="mx-auto">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPage}
          setCurrentPage={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default AssetList;
