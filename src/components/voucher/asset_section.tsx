import React, { useEffect } from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { FiEdit, FiPlus, FiTrash2 } from 'react-icons/fi';
import { Button } from '@/components/button/button';
import { IAssetDetails } from '@/interfaces/asset';
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
import { FREE_COMPANY_ID } from '@/constants/config';
import { AssetModalType } from '@/interfaces/asset_modal';

interface IAssetSectionProps {
  isShowAssetHint: boolean;
  lineItems: ILineItemBeta[];
}

const AssetSection: React.FC<IAssetSectionProps> = ({ isShowAssetHint, lineItems }) => {
  const { t } = useTranslation('common');
  const { selectedCompany } = useUserCtx();
  const { addAssetModalVisibilityHandler, addAssetModalDataHandler } = useGlobalCtx();
  const { deleteTemporaryAssetHandler, temporaryAssetList } = useAccountingCtx();
  const { toastHandler } = useModalContext();

  const { trigger, success, isLoading, data, error } = APIHandler<IAssetDetails>(
    APIName.DELETE_ASSET_V2
  );

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
        deleteTemporaryAssetHandler(data.id);
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

  const displayedAssetList =
    temporaryAssetList.length > 0 ? (
      temporaryAssetList.map((asset) => {
        const deleteHandler = () => {
          // Info: (20241025 - Julian) trigger API to delete asset
          trigger({
            params: {
              companyId: selectedCompany?.id ?? FREE_COMPANY_ID,
              assetId: asset.id,
            },
          });
        };

        return (
          <div
            key={`${asset.id} - ${asset.assetName}`}
            className="flex gap-16px rounded-sm border border-file-uploading-stroke-outline bg-file-uploading-surface-primary p-20px"
          >
            <Image src="/icons/number_sign.svg" alt="number_sign" width={24} height={24} />
            <div className="flex flex-1 flex-col">
              <p className="font-semibold text-file-uploading-text-primary">{asset.assetName}</p>
              <p className="text-xs text-file-uploading-text-disable">{asset.assetNumber}</p>
            </div>
            <div className="flex items-center gap-16px">
              <Button type="button" variant="secondaryBorderless" size={'defaultSquare'}>
                <FiEdit size={20} />
              </Button>
              <Button
                type="button"
                variant="secondaryBorderless"
                size={'defaultSquare'}
                onClick={deleteHandler}
              >
                <FiTrash2 size={20} />
              </Button>
            </div>
          </div>
        );
      })
    ) : (
      <div className="flex flex-col items-center text-xs">
        <p className="text-text-neutral-tertiary">{t('common:COMMON.EMPTY')}</p>
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
        <Button type="button" variant="secondaryOutline" onClick={addNewAssetHandler}>
          <FiPlus size={20} />
          <p>{t('journal:ASSET_SECTION.ADD_BTN')}</p>
        </Button>
      </div>
    </>
  );
};

export default AssetSection;
