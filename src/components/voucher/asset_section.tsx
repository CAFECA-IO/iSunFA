import React from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { FiEdit, FiPlus, FiTrash2 } from 'react-icons/fi';
import { Button } from '@/components/button/button';
import { IAssetItem } from '@/interfaces/asset';
import { useGlobalCtx } from '@/contexts/global_context';
import { ILineItemBeta } from '@/interfaces/line_item';
import { AccountCodesOfAsset } from '@/constants/asset';
import { IAccount } from '@/interfaces/accounting_account';

interface IAssetSectionProps {
  isShowAssetHint: boolean;
  assets: IAssetItem[];
  setAssets: React.Dispatch<React.SetStateAction<IAssetItem[]>>;
  lineItems: ILineItemBeta[];
}

const AssetSection: React.FC<IAssetSectionProps> = ({
  isShowAssetHint,
  assets,
  setAssets,
  lineItems,
}) => {
  const { t } = useTranslation('common');
  const { addAssetModalVisibilityHandler, addAssetModalDataHandler } = useGlobalCtx();

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

  const assNewAssetHandler = () => {
    addAssetModalDataHandler(assetAccountList);
    addAssetModalVisibilityHandler();
  };

  const displayedAssetList =
    assets && assets.length > 0 ? (
      assets.map((asset) => {
        const deleteHandler = () => setAssets(assets.filter((a) => a.id !== asset.id));

        return (
          <div
            key={asset.id}
            className="flex gap-16px rounded-sm border border-file-uploading-stroke-outline bg-file-uploading-surface-primary p-20px"
          >
            <Image src="/icons/number_sign.svg" alt="number_sign" width={24} height={24} />
            <div className="flex flex-1 flex-col">
              <p className="font-semibold text-file-uploading-text-primary">{asset.assetName}</p>
              <p className="text-xs text-file-uploading-text-disable">{asset.assetNumber}</p>
            </div>
            <div className="flex items-center gap-16px">
              <Button type="button" variant="secondaryBorderless" className="p-0">
                <FiEdit size={20} />
              </Button>
              <Button
                type="button"
                variant="secondaryBorderless"
                className="p-0"
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
        <Button type="button" variant="secondaryOutline" onClick={assNewAssetHandler}>
          <FiPlus size={20} />
          <p>{t('journal:ASSET_SECTION.ADD_BTN')}</p>
        </Button>
      </div>
    </>
  );
};

export default AssetSection;
