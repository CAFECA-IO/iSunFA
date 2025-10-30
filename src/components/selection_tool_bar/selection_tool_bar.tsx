import React from 'react';
import { ICertificateUI } from '@/interfaces/certificate';
import { FaPlus } from 'react-icons/fa6';
import { /* FiDownload, */ FiTrash2 } from 'react-icons/fi';
import { Button } from '@/components/button/button';
import { useTranslation } from 'next-i18next';
import { IVoucherBeta } from '@/interfaces/voucher';
import { numberWithCommas } from '@/lib/utils/common';
import loggerFront from '@/lib/utils/logger_front';

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
  handleSelectAll: () => void; // Info: (20240920 - tzuhan) 全選
  onDelete?: () => void; // Info: (20240920 - tzuhan) 添加刪除的回調函數
  addOperations?: ISelectionToolBarOperation[];
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
  handleSelectAll,
  onDelete,
  addOperations,
  // exportOperations,
}) => {
  const { t } = useTranslation(['certificate']);

  // Info: (20240920 - tzuhan) 取消全選
  const handleUnselectAll = () => {
    handleSelect(
      items.map((item) => item.id),
      false
    );
  };

  // Info: (20240920 - tzuhan) 取消操作
  const handleCancel = () => {
    loggerFront.log('Cancel operation');
    handleUnselectAll();
    onActiveChange(false);
  };

  return (
    <div className={`flex h-42px items-center justify-between ${className || ''}`}>
      {active ? (
        <>
          {/* Info: (20240920 - tzuhan) 左側選擇計數顯示 */}
          <div className="font-medium text-text-neutral-secondary">
            {`(${t('certificate:COMMON.SELECT')} ${selectedCount}/${totalCount})`}
          </div>

          {/* Info: (20240920 - tzuhan) 中間操作按鈕 */}
          <div className="flex items-center space-x-4 text-blue-500">
            {addOperations &&
              addOperations.map((operation) => (
                <Button
                  key={operation.operation}
                  type="button"
                  variant="tertiary"
                  className="h-36px py-1.5"
                  onClick={operation.onClick}
                >
                  <FaPlus />
                  <div>{t(operation.buttonStr)}</div>
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
                {t('certificate:COMMON.SELECT_ALL')}
              </button>
              <button type="button" className="hover:underline" onClick={handleCancel}>
                {t('certificate:COMMON.CANCEL')}
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Info: (20240920 - tzuhan) 左側選擇計數顯示 */}
          {subtitle && currency && (
            <div className="font-medium text-text-neutral-tertiary">
              <span>{subtitle} </span>
              <span className="text-black">{numberWithCommas(totalPrice ?? 0)}</span>
              <span>{currency}</span>
            </div>
          )}
          <div className="flex h-42px items-center justify-end space-x-4 text-link-text-primary">
            {/* ToDo: (20250116 - Julian) 先隱藏按鈕 */}
            {/* {exportOperations &&
              exportOperations.map((operation) => (
                <Button
                  type="button"
                  variant="tertiaryOutline"
                  className="h-36px py-1.5"
                  onClick={operation.onClick}
                >
                  <FiDownload />
                  <div>{t(operation.buttonStr)}</div>
                </Button>
              ))} */}
            {isSelectable && (
              <button
                type="button"
                className="hover:underline"
                onClick={() => onActiveChange(true)}
              >
                {t('certificate:COMMON.SELECT')}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SelectionToolbar;
