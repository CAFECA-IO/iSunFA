import React, { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import { useModalContext } from '@/contexts/modal_context';
import SortingButton from '@/components/voucher/sorting_button';
import { SortOrder } from '@/constants/sort';
import AssetItem from '@/components/asset/asset_item';
import { IAssetItemUI } from '@/interfaces/asset';
import { MdOutlineFileDownload } from 'react-icons/md';
import { Button } from '@/components/button/button';
import { checkboxStyle } from '@/constants/display';
import { MessageType } from '@/interfaces/message_modal';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { ToastType } from '@/interfaces/toastify';
import { ToastId } from '@/constants/toast_id';
import { VscSettings } from 'react-icons/vsc';

interface IAssetListProps {
  assetList: IAssetItemUI[];
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
  toggleSideMenu: () => void;
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
  toggleSideMenu,
}) => {
  const { t } = useTranslation('asset');
  const { messageModalDataHandler, messageModalVisibilityHandler, toastHandler } =
    useModalContext();
  const { connectedAccountBook } = useUserCtx();

  const {
    trigger: exportAsset,
    success,
    isLoading,
    data: downloadFile,
  } = APIHandler(APIName.ASSET_LIST_EXPORT);

  // Info: (20241024 - Julian) checkbox 是否開啟
  const [isCheckBoxOpen, setIsCheckBoxOpen] = useState(false);
  // Info: (20241024 - Julian) 轉換成 IAssetItemUI[]
  const [uiAssetList, setUiAssetList] = useState<IAssetItemUI[]>(assetList);
  // Info: (20241024 - Julian) 全選狀態
  const [isSelectedAll, setIsSelectedAll] = useState(false);
  // Info: (20241024 - Julian) 被選中的 voucher
  const [selectedAssetList, setSelectedAssetList] = useState<IAssetItemUI[]>([]);

  // Info: (20240925 - Julian) css string
  const tableCellStyles = 'table-cell text-center align-middle h-60px';
  const sideBorderStyles = 'border-r border-stroke-neutral-quaternary border-b';
  const checkStyle = `${isCheckBoxOpen ? 'table-cell' : 'hidden'} text-center align-middle border-r border-stroke-neutral-quaternary`;

  // Info: (20250603 - Julian) 如果 uiAssetList 為空，則顯示無資料狀態
  // ToDo: (20250603 - Julian) 開發中，未完成
  const isNoData = uiAssetList.length === 0;

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
          return { ...asset, isSelected: !asset.isSelected };
        }
        return asset;
      });
    });
  };

  const exportAssetHandler = () => {
    if (selectedAssetList.length === 0) {
      // Info: (20241024 - Julian) 未選取任何 asset
      messageModalDataHandler({
        messageType: MessageType.WARNING,
        title: t('asset:ASSET.EXPORT_ASSET_LIST_WARNING_TITLE'),
        content: t('asset:ASSET.EXPORT_ASSET_LIST_WARNING_CONTENT'),
        submitBtnFunction: messageModalVisibilityHandler,
        submitBtnStr: t('asset:ASSET.OK_BTN'),
      });
      messageModalVisibilityHandler();
    } else {
      // Info: (20241127 - Julian) 排序條件
      const sortQuery: { by: string; order: string }[] = [];

      if (dateSort) {
        sortQuery.push({ by: 'acquisitionDate', order: dateSort });
      } else {
        // Info: (20241127 - Julian) 預設日期排序
        sortQuery.push({ by: 'acquisitionDate', order: 'desc' });
      }
      if (priceSort) {
        sortQuery.push({ by: 'purchasePrice', order: priceSort });
      }
      if (depreciationSort) {
        sortQuery.push({ by: 'accumulatedDepreciation', order: depreciationSort });
      }
      if (residualSort) {
        sortQuery.push({ by: 'residualValue', order: residualSort });
      }
      if (remainingLifeSort) {
        sortQuery.push({ by: 'remainingLife', order: remainingLifeSort });
      }

      // Info: (20241127 - Julian) 呼叫 API
      exportAsset({
        params: { accountBookId: connectedAccountBook?.id },
        body: {
          fileType: 'csv',
          filters: {
            searchQuery: selectedAssetList.map((asset) => asset.id.toString()), // Info: (20241127 - Julian) 選取的 asset id
          },
          sort: sortQuery,
          options: {
            language: 'zh-TW',
            timezone: '+0800',
            fields: [
              'name',
              'type',
              'status',
              'assetNumber',
              'acquisitionDate',
              'purchasePrice',
              'accumulatedDepreciation',
              'residualValue',
              'remainingLife',
            ],
          },
        },
      });
    }
  };

  // Info: (20250604 - Julian) 更新 assetList
  useEffect(() => {
    setUiAssetList(assetList);
  }, [assetList]);

  // Info: (20241024 - Julian) 更新被選中的 asset
  useEffect(() => {
    setIsSelectedAll(uiAssetList.every((asset) => asset.isSelected));
    setSelectedAssetList(uiAssetList.filter((asset) => asset.isSelected));
  }, [uiAssetList]);

  useEffect(() => {
    if (isLoading === false) {
      // Info: (20241127 - Julian) 顯示失敗 Toast
      if (!success) {
        toastHandler({
          id: ToastId.EXPORT_ASSET_ERROR,
          type: ToastType.ERROR,
          content: t('asset:ASSET.TOAST_EXPORT_FAILED'),
          closeable: true,
        });
      } else {
        // Info: (20241127 - Julian) 顯示成功 Toast ，下載檔案並關閉 Modal
        toastHandler({
          id: ToastId.EXPORT_ASSET_SUCCESS,
          type: ToastType.SUCCESS,
          content: t('asset:ASSET.TOAST_EXPORT_SUCCESS'),
          closeable: true,
        });

        // Info: (20241127 - Julian) 下載檔案
        const url = window.URL.createObjectURL(new Blob([downloadFile as BlobPart]));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'voucher.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  }, [isLoading, success, downloadFile]);

  // Info: (20240925 - Julian) 日期排序按鈕
  const displayedIssuedDate = SortingButton({
    string: t('asset:ASSET.ACQUISITION_DATE'),
    sortOrder: dateSort,
    setSortOrder: setDateSort,
    handleReset: () => {
      setPriceSort(null);
      setDepreciationSort(null);
      setResidualSort(null);
      setRemainingLifeSort(null);
    },
  });

  // Info: (20240925 - Julian) 價格排序按鈕
  const displayedPrice = SortingButton({
    string: t('asset:ASSET.PURCHASE_PRICE'),
    sortOrder: priceSort,
    setSortOrder: setPriceSort,
    handleReset: () => {
      setDateSort(null);
      setDepreciationSort(null);
      setResidualSort(null);
      setRemainingLifeSort(null);
    },
  });

  // Info: (20240925 - Julian) 累積折舊排序按鈕
  const displayedDepreciation = SortingButton({
    string: t('asset:ASSET.ACCUM_DEP'),
    sortOrder: depreciationSort,
    setSortOrder: setDepreciationSort,
    handleReset: () => {
      setDateSort(null);
      setPriceSort(null);
      setResidualSort(null);
      setRemainingLifeSort(null);
    },
  });

  // Info: (20240925 - Julian) 殘值排序按鈕
  const displayedResidual = SortingButton({
    string: t('asset:ASSET.RESIDUAL_VALUE'),
    sortOrder: residualSort,
    setSortOrder: setResidualSort,
    handleReset: () => {
      setDateSort(null);
      setPriceSort(null);
      setDepreciationSort(null);
      setRemainingLifeSort(null);
    },
  });

  // Info: (20240925 - Julian) 剩餘壽命排序按鈕
  const displayedRemainingLife = SortingButton({
    string: t('asset:ASSET.REMAINING_LIFE'),
    sortOrder: remainingLifeSort,
    setSortOrder: setRemainingLifeSort,
    handleReset: () => {
      setDateSort(null);
      setPriceSort(null);
      setDepreciationSort(null);
      setResidualSort(null);
    },
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

  const displayedTable = !isNoData ? (
    <div className="table w-full overflow-hidden rounded-lg bg-surface-neutral-surface-lv2">
      {/* Info: (20240925 - Julian) ---------------- Table Header ---------------- */}
      <div className="table-header-group bg-surface-neutral-surface-lv1 text-sm text-text-neutral-tertiary">
        <div className="table-row">
          <div className={`${checkStyle} w-20px border-b border-stroke-neutral-quaternary`}>
            <input
              type="checkbox"
              className={checkboxStyle}
              checked={isSelectedAll}
              onChange={checkAllHandler}
            />
          </div>
          <div className={`${tableCellStyles} ${sideBorderStyles} w-100px`}>
            {displayedIssuedDate}
          </div>
          <div className={`${tableCellStyles} ${sideBorderStyles} w-140px`}>
            {t('asset:ASSET.TYPE')}
          </div>
          <div className={`${tableCellStyles} ${sideBorderStyles} w-120px`}>
            {t('asset:ASSET.ASSET_NAME')}
          </div>
          <div className={`${tableCellStyles} ${sideBorderStyles} w-100px`}>{displayedPrice}</div>
          <div className={`${tableCellStyles} ${sideBorderStyles} w-100px`}>
            {displayedDepreciation}
          </div>
          <div className={`${tableCellStyles} ${sideBorderStyles} w-100px`}>
            {displayedResidual}
          </div>
          <div className={`${tableCellStyles} border-b border-stroke-neutral-quaternary`}>
            {displayedRemainingLife}
          </div>
        </div>
      </div>

      {/* Info: (20240925 - Julian) ---------------- Table Body ---------------- */}
      <div className="table-row-group">{displayedAssetList}</div>
    </div>
  ) : (
    <div className="flex items-center justify-center rounded-lg bg-surface-neutral-surface-lv2 p-20px text-text-neutral-tertiary">
      <p>{t('asset:ASSET_DETAIL_PAGE.NO_ASSET')}</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-16px">
      <div className="flex items-center">
        {/* Info: (20250529 - Julian) Filter button */}
        <button
          type="button"
          onClick={toggleSideMenu}
          className="block w-fit p-10px text-button-text-secondary tablet:hidden"
        >
          <VscSettings size={24} />
        </button>
        {/* Info: (20240925 - Julian) Export Asset button */}
        <div className="ml-auto flex items-center gap-24px">
          <Button
            type="button"
            variant="tertiaryOutline"
            onClick={exportAssetHandler}
            disabled={isLoading} // Info: (20241202 - Julian) 防止重複點擊
          >
            <MdOutlineFileDownload />
            <p>{t('asset:ASSET.EXPORT_ASSET_LIST')}</p>
          </Button>
          {/* Info: (20241024 - Julian) Select All */}
          <button
            type="button"
            className={`${isCheckBoxOpen ? 'block' : 'hidden'} text-sm font-semibold text-link-text-primary enabled:hover:underline disabled:text-link-text-disable`}
            onClick={selectAllHandler}
            disabled={isNoData}
          >
            {isSelectedAll ? t('asset:COMMON.UNSELECT_ALL') : t('asset:COMMON.SELECT_ALL')}
          </button>
          {/* Info: (20241024 - Julian) Cancel selecting button */}
          <button
            type="button"
            onClick={selectToggleHandler}
            className={`${isCheckBoxOpen ? 'block' : 'hidden'} text-sm font-semibold text-link-text-primary enabled:hover:underline disabled:text-link-text-disable`}
          >
            {t('asset:COMMON.CANCEL')}
          </button>
          {/* Info: (20241024 - Julian) Select toggle button */}
          <button
            type="button"
            onClick={selectToggleHandler}
            className={`${isCheckBoxOpen ? 'hidden' : 'block'} text-sm font-semibold text-link-text-primary enabled:hover:underline`}
          >
            {t('asset:COMMON.SELECT')}
          </button>
        </div>
      </div>

      {/* Info: (20250603 - Julian) Table for mobile */}
      <div className="inline-block overflow-x-auto rounded-lg shadow-Dropshadow_XS tablet:hidden">
        <div className={isNoData ? '' : 'w-max'}>{displayedTable}</div>
      </div>

      {/* Info: (20250603 - Julian) Table for desktop */}
      <div className="hidden tablet:block">{displayedTable}</div>
    </div>
  );
};

export default AssetList;
