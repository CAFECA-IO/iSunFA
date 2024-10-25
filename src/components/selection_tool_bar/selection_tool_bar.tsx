import { ICertificateUI } from '@/interfaces/certificate';
import React from 'react';
import { FaPlus } from 'react-icons/fa6';
import { FiDownload, FiTrash2 } from 'react-icons/fi';
import { Button } from '@/components/button/button';
import { useTranslation } from 'next-i18next';
import { IVoucherBeta } from '@/interfaces/voucher';

export interface ISelectionToolBarOperation {
  operation: string;
  buttonStr: string;
  onClick: () => void;
}

interface SelectionToolbarProps {
  className?: string;
  active: boolean; // Info: (20240920 - tzuhan) 是否打開
  isSelectable: boolean; // Info: (20240920 - tzuhan) 是否可選擇
  onActiveChange: (active: boolean) => void; // Info: (20240920 - tzuhan) 當打開狀態變更時的回調函數
  items: ICertificateUI[] | IVoucherBeta[]; // Info: (20240920 - tzuhan) 項目列表
  subtitle?: string;
  totalPrice?: number;
  currency?: string;
  selectedCount: number; // Info: (20240920 - tzuhan) 選中的項目數量
  totalCount: number; // Info: (20240920 - tzuhan) 總項目數量
  handleSelect: (ids: number[], isSelected: boolean) => void;
  onDelete?: () => void; // Info: (20240920 - tzuhan) 添加刪除的回調函數
  addOperations?: ISelectionToolBarOperation[];
  exportOperations?: ISelectionToolBarOperation[];
}

const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  className,
  active,
  isSelectable,
  onActiveChange,
  items,
  subtitle,
  totalPrice,
  currency,
  selectedCount,
  totalCount,
  handleSelect,
  onDelete,
  addOperations,
  exportOperations,
}) => {
  const { t } = useTranslation('common');
  // Info: (20240920 - tzuhan) 全選操作
  const handleSelectAll = () => {
    handleSelect(
      items.map((item) => item.id),
      true
    );
  };

  // Info: (20240920 - tzuhan) 取消全選
  const handleUnselectAll = () => {
    handleSelect(
      items.map((item) => item.id),
      false
    );
  };

  // Info: (20240920 - tzuhan) 取消操作
  const handleCancel = () => {
    // Deprecated: (20240920 - tzuhan) debugging purpose
    // eslint-disable-next-line no-console
    console.log('Cancel operation');
    handleUnselectAll();
    onActiveChange(false);
  };

  return (
    <div className={`flex items-center justify-between ${className || ''}`}>
      {active ? (
        <>
          {/* Info: (20240920 - tzuhan) 左側選擇計數顯示 */}
          <div className="font-medium text-text-neutral-secondary">
            {`(${t('common:COMMON.SELECT')} ${selectedCount}/${totalCount})`}
          </div>

          {/* Info: (20240920 - tzuhan) 中間操作按鈕 */}
          <div className="flex items-center space-x-4 text-blue-500">
            {exportOperations &&
              exportOperations.map((operation) => (
                <Button
                  type="button"
                  variant="tertiaryOutline"
                  className="py-1.5"
                  onClick={operation.onClick}
                >
                  <FiDownload />
                  {/* <div>{`${t('common:SELECTION.EXPORT')} ${operation.buttonStr ? t(`common:SELECTION.${operation.buttonStr.toUpperCase()}`) : ''}`}</div> */}
                  <div>{t(`common:SELECTION.${operation.buttonStr.toUpperCase}`)}</div>
                </Button>
              ))}
            {addOperations &&
              addOperations.map((operation) => (
                <Button
                  type="button"
                  variant="tertiary"
                  className="h-36px py-1.5"
                  onClick={operation.onClick}
                >
                  <FaPlus />
                  {/* <div>{t('common:SELECTION.ADD_NEW_ASSET')}</div> */}
                  {/* <div>{t('common:SELECTION.ADD_NEW_VOUCHER')}</div> */}
                  <div>{t(`common:SELECTION.${operation.buttonStr.toUpperCase}`)}</div>
                </Button>
              ))}
            {onDelete && (
              <Button type="button" variant="tertiary" className="h-36px p-2.5" onClick={onDelete}>
                <FiTrash2 />
              </Button>
            )}

            {/* Info: (20240920 - tzuhan) 右側選擇控制連結 */}
            <div className="m-2.5 flex space-x-4">
              <button type="button" className="hover:underline" onClick={handleSelectAll}>
                {t('common:COMMON.SELECT_ALL')}
              </button>
              <button type="button" className="hover:underline" onClick={handleCancel}>
                {t('common:COMMON.CANCEL')}
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Info: (20240920 - tzuhan) 左側選擇計數顯示 */}
          {subtitle && currency && totalPrice && (
            <div className="font-medium text-text-neutral-tertiary">
              <span>{subtitle} </span>
              <span className="text-black">{totalPrice} </span>
              <span>{currency}</span>
            </div>
          )}
          <div className="flex h-42px items-center justify-end space-x-4 text-link-text-primary">
            {exportOperations &&
              exportOperations.map((operation) => (
                <Button
                  type="button"
                  variant="tertiaryOutline"
                  className="py-1.5"
                  onClick={operation.onClick}
                >
                  <FiDownload />
                  {/* <div>{`${t('common:SELECTION.EXPORT')} ${operation.buttonStr ? t(`common:SELECTION.${operation.buttonStr.toUpperCase()}`) : ''}`}</div> */}
                  <div>{t(`common:SELECTION.${operation.buttonStr.toUpperCase}`)}</div>
                </Button>
              ))}
            {isSelectable && (
              <button
                type="button"
                className="hover:underline"
                onClick={onActiveChange.bind(null, true)}
              >
                {t('common:COMMON.SELECT')}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SelectionToolbar;
