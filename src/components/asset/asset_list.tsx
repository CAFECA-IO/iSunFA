import React, { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import SortingButton from '@/components/voucher/sorting_button';
import { SortOrder } from '@/constants/sort';
import AssetItem from '@/components/asset/asset_item';
import { IAssetItem, IAssetItemUI } from '@/interfaces/asset';
import { MdOutlineFileDownload } from 'react-icons/md';
import { Button } from '@/components/button/button';
import { checkboxStyle } from '@/constants/display';
import { useModalContext } from '@/contexts/modal_context';
import { MessageType } from '@/interfaces/message_modal';

interface IAssetListProps {
  assetList: IAssetItem[];
  dateSort: SortOrder | null;
  setDateSort: (sortOrder: SortOrder | null) => void;
  priceSort: SortOrder | null;
  setPriceSort: (sortOrder: SortOrder | null) => void;
  depreciationSort: SortOrder | null;
  setDepreciationSort: (sortOrder: SortOrder | null) => void;
  residualSort: SortOrder | null;
  setResidualSort: (sortOrder: SortOrder | null) => void;
  remainingLifeSort: SortOrder | null;
  setRemainingLifeSort: (sortOrder: SortOrder | null) => void;
}

const AssetList: React.FC<IAssetListProps> = ({
  assetList,
  dateSort,
  setDateSort,
  priceSort,
  setPriceSort,
  depreciationSort,
  setDepreciationSort,
  residualSort,
  setResidualSort,
  remainingLifeSort,
  setRemainingLifeSort,
}) => {
  const { t } = useTranslation('common');
  const { messageModalDataHandler, messageModalVisibilityHandler } = useModalContext();

  const defaultAssetList: IAssetItemUI[] = assetList.map((asset) => {
    return {
      ...asset,
      isSelected: false,
    };
  });

  // Info: (20241024 - Julian) checkbox 是否開啟
  const [isCheckBoxOpen, setIsCheckBoxOpen] = useState(false);
  // Info: (20241024 - Julian) 轉換成 IAssetItemUI[]
  const [uiAssetList, setUiAssetList] = useState<IAssetItemUI[]>(defaultAssetList);
  // Info: (20241024 - Julian) 全選狀態
  const [isSelectedAll, setIsSelectedAll] = useState(false);
  // Info: (20241024 - Julian) 被選中的 voucher
  const [selectedAssetList, setSelectedAssetList] = useState<IAssetItemUI[]>([]);

  // Info: (20240925 - Julian) css string
  const tableCellStyles = 'table-cell text-center align-middle';
  const sideBorderStyles = 'border-r border-stroke-neutral-quaternary border-b';
  const checkStyle = `${isCheckBoxOpen ? 'table-cell' : 'hidden'} text-center align-middle border-r border-stroke-neutral-quaternary`;

  // Info: (20241024 - Julian) checkbox 的開關
  const selectToggleHandler = () => setIsCheckBoxOpen((prev) => !prev);

  // Info: (20241024 - Julian) 全選(checkbox)
  const checkAllHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    // Info: (20241024 - Julian) 切換全選狀態
    setIsSelectedAll(!isSelectedAll);
    // Info: (20241024 - Julian) 切換所有 Asset 的選取狀態
    setUiAssetList((prev) => {
      return prev.map((asset) => {
        return { ...asset, isSelected: isChecked };
      });
    });
  };
  // Info: (20241024 - Julian) 全選(文字)
  const selectAllHandler = () => {
    setIsSelectedAll(!isSelectedAll);
    setUiAssetList((prev) => {
      return prev.map((asset) => {
        return { ...asset, isSelected: !isSelectedAll };
      });
    });
  };
  // Info: (20241024 - Julian) 單選
  const selectAssetHandler = (id: number) => {
    setUiAssetList((prev) => {
      return prev.map((asset) => {
        if (asset.id === id) {
          return {
            ...asset,
            isSelected: !asset.isSelected,
          };
        }
        return asset;
      });
    });
  };

  // ToDo: (20241024 - Julian) export to pdf
  const exportAssetHandler = () => {
    if (selectedAssetList.length === 0) {
      // Info: (20241024 - Julian) 未選取任何 asset
      messageModalDataHandler({
        messageType: MessageType.WARNING,
        title: 'Warning',
        content: 'Please select at least one asset to export',
        submitBtnFunction: messageModalVisibilityHandler,
        submitBtnStr: t('common:COMMON.OK'),
      });
      messageModalVisibilityHandler();
    } else {
      // eslint-disable-next-line no-console
      console.log('export:\n', selectedAssetList);
    }
  };

  // Info: (20241024 - Julian) 更新被選中的 asset
  useEffect(() => {
    setSelectedAssetList(uiAssetList.filter((asset) => asset.isSelected));
  }, [uiAssetList]);

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

  const displayedAssetList = uiAssetList.map((asset) => {
    return (
      <AssetItem
        key={asset.id}
        assetData={asset}
        selectHandler={selectAssetHandler}
        isCheckBoxOpen={isCheckBoxOpen}
      />
    );
  });

  return (
    <div className="flex flex-col gap-16px">
      {/* Info: (20240925 - Julian) Export Asset button */}
      <div className="ml-auto flex items-center gap-24px">
        <Button type="button" variant="tertiaryOutline" onClick={exportAssetHandler}>
          <MdOutlineFileDownload />
          <p>{t('asset:ASSET.EXPORT_ASSET_LIST')}</p>
        </Button>
        {/* Info: (20241024 - Julian) Select All */}
        <button
          type="button"
          className={`${isCheckBoxOpen ? 'block' : 'hidden'} font-semibold text-link-text-primary hover:opacity-70`}
          onClick={selectAllHandler}
        >
          {t('common:COMMON.SELECT_ALL')}
        </button>
        {/* Info: (20241024 - Julian) Cancel selecting button */}
        <button
          type="button"
          onClick={selectToggleHandler}
          className={`${isCheckBoxOpen ? 'block' : 'hidden'} font-semibold text-link-text-primary hover:opacity-70`}
        >
          {t('common:COMMON.CANCEL')}
        </button>
        {/* Info: (20241024 - Julian) Select toggle button */}
        <button
          type="button"
          onClick={selectToggleHandler}
          className={`${isCheckBoxOpen ? 'hidden' : 'block'} font-semibold text-link-text-primary hover:opacity-70`}
        >
          {t('common:COMMON.SELECT')}
        </button>
      </div>

      {/* Info: (20241024 - Julian) Asset Table */}
      <div className="table overflow-hidden rounded-lg bg-surface-neutral-surface-lv2">
        {/* Info: (20240925 - Julian) ---------------- Table Header ---------------- */}
        <div className="table-header-group h-60px bg-surface-neutral-surface-lv1 text-sm text-text-neutral-tertiary">
          <div className="table-row">
            <div className={`${checkStyle} border-b border-stroke-neutral-quaternary`}>
              <input
                type="checkbox"
                className={checkboxStyle}
                checked={isSelectedAll}
                onChange={checkAllHandler}
              />
            </div>
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
    </div>
  );
};

export default AssetList;
