import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { FiEdit, FiPlus, FiTrash2 } from 'react-icons/fi';
import { Button } from '@/components/button/button';
import { IAssetDetails, IAssetPostOutput } from '@/interfaces/asset';
import { useUserCtx } from '@/contexts/user_context';
import { useModalContext } from '@/contexts/modal_context';
import { useGlobalCtx } from '@/contexts/global_context';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { ILineItemBeta } from '@/interfaces/line_item';
import { AccountCodesOfAsset } from '@/constants/asset';
import { IAccount } from '@/interfaces/accounting_account';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { ToastType } from '@/interfaces/toastify';
import { AssetModalType } from '@/interfaces/asset_modal';
import { FREE_ACCOUNT_BOOK_ID } from '@/constants/config';

interface IAssetSectionProps {
  isShowAssetHint: boolean;
  lineItems: ILineItemBeta[];
  defaultAssetList?: IAssetDetails[];
}

const AssetSection: React.FC<IAssetSectionProps> = ({
  isShowAssetHint,
  lineItems,
  defaultAssetList = [],
}) => {
  const { t } = useTranslation('common');
  const { connectedAccountBook } = useUserCtx();
  const { addAssetModalVisibilityHandler, addAssetModalDataHandler } = useGlobalCtx();
  const { deleteTemporaryAssetHandler, temporaryAssetList } = useAccountingCtx();
  const { toastHandler } = useModalContext();

  const { trigger, success, isLoading, data, error } = APIHandler<IAssetDetails>(
    APIName.DELETE_ASSET_V2
  );

  const accountBookId = connectedAccountBook?.id ?? FREE_ACCOUNT_BOOK_ID;

  const defaultList: IAssetPostOutput[] = defaultAssetList.map((asset) => ({
    ...asset,
    name: asset.assetName,
    number: asset.assetNumber,
    note: asset.note ?? '',
    status: 'normal',
    accountBookId,
  }));
  const temporaryAssetListByCompany: IAssetPostOutput[] = temporaryAssetList[accountBookId] ?? [];

  const [assetList, setAssetList] = useState<IAssetPostOutput[]>([
    ...defaultList,
    ...temporaryAssetListByCompany,
  ]);

  // Info: (20241025 - Julian) 根據 lineItems 取得資產類別的會計科目
  const assetAccountList = lineItems
    .filter((lineItem) => {
      // Info: (20241025 - Julian) 判斷是否為資產類別的會計科目
      const isAsset = lineItem.account
        ? AccountCodesOfAsset.includes(lineItem.account.code)
        : false;
      return isAsset;
    })
    .map((lineItem) => lineItem.account) // Info: (20241025 - Julian) 轉換為 IAccount
    .filter((account) => account !== undefined) as IAccount[]; // Info: (20241025 - Julian) 移除 undefined

  const addNewAssetHandler = () => {
    addAssetModalDataHandler({
      modalType: AssetModalType.ADD,
      assetAccountList,
      assetData: null,
    });
    addAssetModalVisibilityHandler();
  };

  useEffect(() => {
    if (!isLoading) {
      if (success && data) {
        // Info: (20241025 - Julian) 確定 API 刪除成功後，更新畫面
        deleteTemporaryAssetHandler(accountBookId, data.id);
      } else if (error) {
        // Info: (20241025 - Julian) 刪除失敗後，提示使用者
        toastHandler({
          id: 'delete-asset-error',
          type: ToastType.ERROR,
          content: t('asset:ADD_ASSET_MODAL.TOAST_ERROR'),
          closeable: true,
        });
      }
    }
  }, [success, data, isLoading]);

  useEffect(() => {
    // Info: (20241119 - Julian) 更新 assetList
    const newTemporaryAssetList: IAssetPostOutput[] = temporaryAssetList[accountBookId] ?? [];
    setAssetList([...defaultList, ...newTemporaryAssetList]);
  }, [temporaryAssetList]);

  const displayedAssetList =
    assetList.length > 0 ? (
      assetList.map((asset) => {
        const editClickHandler = () => {
          addAssetModalDataHandler({
            modalType: AssetModalType.EDIT,
            assetAccountList,
            assetData: asset,
          });
          addAssetModalVisibilityHandler();
        };

        const deleteHandler = () => {
          // Info: (20241025 - Julian) trigger API to delete asset
          trigger({ params: { accountBookId, assetId: asset.id } });
        };

        return (
          <div
            id={`asset-${asset.id}`}
            key={`${asset.id} - ${asset.name}`}
            className="flex gap-16px rounded-sm border border-file-uploading-stroke-outline bg-file-uploading-surface-primary p-20px"
          >
            <Image src="/icons/number_sign.svg" alt="number_sign" width={24} height={24} />
            <div className="flex flex-1 flex-col">
              <p className="font-semibold text-file-uploading-text-primary">{asset.name ?? '-'}</p>
              <p className="text-xs text-file-uploading-text-disable">{asset.number ?? '-'}</p>
            </div>
            <div className="flex items-center gap-16px">
              <Button
                type="button"
                variant="secondaryBorderless"
                size={'defaultSquare'}
                onClick={editClickHandler}
                disabled={asset.name === ''}
              >
                <FiEdit size={20} />
              </Button>
              <Button
                type="button"
                variant="secondaryBorderless"
                size={'defaultSquare'}
                onClick={deleteHandler}
                disabled={isLoading} // Info: (20241202 - Julian) 防止重複點擊
              >
                <FiTrash2 size={20} />
              </Button>
            </div>
          </div>
        );
      })
    ) : (
      <div className="flex flex-col items-center text-xs">
        <p className={`${isShowAssetHint ? 'text-text-state-error' : 'text-text-neutral-primary'}`}>
          {t('journal:ASSET_SECTION.EMPTY_HINT')}
        </p>
      </div>
    );

  return (
    <>
      {/* Info: (20241009 - Julian) Asset Divider */}
      <div id="asset-section" className="my-5 flex items-center gap-4">
        <hr className="block flex-1 border-divider-stroke-lv-4 md:hidden" />
        <div className="flex items-center gap-2 text-sm text-divider-text-lv-1">
          <Image src="/icons/asset.svg" width={16} height={16} alt="asset_icon" />
          <p>{t('journal:ASSET_SECTION.TITLE')}</p>
        </div>
        <hr className="flex-1 border-divider-stroke-lv-4" />
      </div>

      <div className="flex flex-col gap-12px">
        {displayedAssetList}
        <Button
          id="voucher-asset"
          type="button"
          variant="secondaryOutline"
          onClick={addNewAssetHandler}
        >
          <FiPlus size={20} />
          <p>{t('journal:ASSET_SECTION.ADD_BTN')}</p>
        </Button>
      </div>
    </>
  );
};

export default AssetSection;
