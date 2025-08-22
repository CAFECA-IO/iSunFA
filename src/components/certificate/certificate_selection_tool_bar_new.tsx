import React from 'react';
import { ICertificateUI } from '@/interfaces/certificate';
import { FaPlus } from 'react-icons/fa6';
import { FiDownload, FiTrash2 } from 'react-icons/fi';
import { Button } from '@/components/button/button';
import { useTranslation } from 'next-i18next';
import { IVoucherBeta } from '@/interfaces/voucher';
import { numberWithCommas } from '@/lib/utils/common';
import { IInvoiceRC2InputUI, IInvoiceRC2OutputUI } from '@/interfaces/invoice_rc2';
import { VscSettings } from 'react-icons/vsc';

export interface ISelectionToolBarOperation {
  operation: string;
  buttonStr: string;
  onClick: () => void;
}

interface SelectionToolbarProps {
  className?: string;
  active: boolean; // Info: (20240920 - Anna) 是否打開
  isSelectable: boolean; // Info: (20240920 - Anna) 是否可選擇
  onActiveChange: (active: boolean) => void; // Info: (20240920 - Anna) 當打開狀態變更時的回調函數
  items: ICertificateUI[] | IVoucherBeta[] | IInvoiceRC2InputUI[] | IInvoiceRC2OutputUI[]; // Info: (20240920 - Anna) 項目列表
  subtitle?: string;
  totalPrice?: string;
  currency?: string;
  selectedCount: number; // Info: (20240920 - Anna) 選中的項目數量
  totalCount: number; // Info: (20240920 - Anna) 總項目數量
  handleSelect: (ids: number[], isSelected: boolean) => void;
  handleSelectAll: () => void; // Info: (20240920 - Anna) 全選
  onDelete?: () => void; // Info: (20240920 - Anna) 添加刪除的回調函數
  addOperations?: ISelectionToolBarOperation[];
  onDownload?: () => void;
  toggleSideMenu: () => void;
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
  onDownload,
  toggleSideMenu,
}) => {
  const { t } = useTranslation(['certificate']);

  // Info: (20240920 - Anna) 取消全選
  const handleUnselectAll = () => {
    handleSelect(
      items.map((item) => item.id),
      false
    );
  };

  // Info: (20240920 - Anna) 取消操作
  const handleCancel = () => {
    handleUnselectAll();
    onActiveChange(false);
  };

  return (
    <div className={`flex h-42px items-center justify-between ${className || ''}`}>
      {active ? (
        <>
          {/* Info: (20240920 - Anna) 左側選擇計數顯示 */}
          <div className="font-medium text-text-neutral-secondary">
            {`(${t('certificate:COMMON.SELECT')} ${selectedCount}/${totalCount})`}
          </div>

          {/* Info: (20240920 - Anna) 中間操作按鈕 */}
          <div className="flex items-center space-x-4 text-blue-500">
            {addOperations &&
              addOperations.map((operation) => (
                <Button
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

            {/* Info: (20240920 - Anna) 右側選擇控制連結 */}
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
          {/* Info: (20240920 - Anna) 左側選擇計數顯示(tablet以上) */}
          {subtitle && currency && (
            <div className="hidden font-medium text-text-neutral-tertiary tablet:flex">
              <span className="mr-1 whitespace-nowrap">{subtitle} </span>
              <span className="mr-1 text-text-neutral-primary">
                {numberWithCommas(totalPrice ?? '0')}
              </span>
              <span>{currency}</span>
            </div>
          )}
          <div className="w-full">
            <div className="flex h-42px items-center justify-between space-x-4 text-link-text-primary tablet:justify-end">
              {/* Info: (20250528 - Anna) Filter button */}
              <button
                type="button"
                onClick={toggleSideMenu}
                className="block w-fit p-10px text-button-text-secondary tablet:hidden"
              >
                <VscSettings size={24} />
              </button>

              <div className="flex gap-3">
                {/* Info: (20250418 - Anna) 匯出憑證 */}
                {onDownload && (
                  <Button
                    type="button"
                    variant="tertiaryOutline"
                    className="h-36px w-36px !p-0 tablet:w-auto tablet:!px-4 tablet:!py-1.5"
                    onClick={onDownload}
                  >
                    <FiDownload size={16} />
                    <div className="hidden tablet:block">
                      {t('certificate:COMMON.EXPORT_INVOICES')}
                    </div>
                  </Button>
                )}
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
            </div>
            {/* Info: (20250527 - Anna) 左側選擇計數顯示(tablet以下) */}
            {subtitle && currency && (
              <div className="mb-6 mt-18px flex font-medium text-text-neutral-tertiary tablet:hidden">
                <span className="mr-1">{subtitle} </span>
                <span className="mr-1 text-black">{numberWithCommas(totalPrice ?? '0')}</span>
                <span>{currency}</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SelectionToolbar;
