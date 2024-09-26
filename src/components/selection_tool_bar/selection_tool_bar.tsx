import { ICertificateUI } from '@/interfaces/certificate';
import React from 'react';
import { FaPlus } from 'react-icons/fa6';
import { FiDownload, FiTrash2 } from 'react-icons/fi';

interface SelectionToolbarProps {
  active: boolean; // Info: (20240920 - tzuhan) 是否打開
  isSelectable: boolean; // Info: (20240920 - tzuhan) 是否可選擇
  onActiveChange: (active: boolean) => void; // Info: (20240920 - tzuhan) 當打開狀態變更時的回調函數
  items: ICertificateUI[]; // Info: (20240920 - tzuhan) 項目列表
  itemType?: string;
  subtitle?: string;
  selectedCount: number; // Info: (20240920 - tzuhan) 選中的項目數量
  totalCount: number; // Info: (20240920 - tzuhan) 總項目數量
  handleSelect: (ids: number[], isSelected: boolean) => void;
  operations?: ('ADD_VOUCHER' | 'ADD_ASSET' | 'DELETE')[]; // Info: (20240920 - tzuhan) 操作列表
  onAddVoucher?: () => void; // Info: (20240920 - tzuhan) 添加新的憑證的回調函數
  onAddAsset?: () => void; // Info: (20240920 - tzuhan) 添加新資產的回調函數
  onDelete?: () => void; // Info: (20240920 - tzuhan) 添加刪除的回調函數
  onDownload?: () => void; // Info: (20240923 - tzuhan) 添加下載的回調函數
}

const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  active,
  isSelectable,
  onActiveChange,
  items,
  itemType,
  subtitle,
  selectedCount,
  totalCount,
  handleSelect,
  operations = [],
  onAddVoucher,
  onAddAsset,
  onDelete,
  onDownload,
}) => {
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
    <div className="px-4">
      {active ? (
        <div className="flex items-center justify-between">
          {/* Info: (20240920 - tzuhan) 左側選擇計數顯示 */}
          <div className="font-medium text-text-neutral-secondary">
            (Select {selectedCount}/{totalCount})
          </div>

          {/* Info: (20240920 - tzuhan) 中間操作按鈕 */}
          <div className="flex items-center space-x-4 text-blue-500">
            {onDownload && (
              <button
                type="button"
                className={`flex gap-2 rounded border border-tabs-stroke-default bg-tabs-surface-active p-2.5 text-stroke-neutral-solid-light hover:bg-tabs-surface-active hover:text-stroke-neutral-solid-light`}
                onClick={onDownload}
              >
                <FiDownload />
                <div>Export {itemType || ''}</div>
              </button>
            )}
            {operations.includes('ADD_VOUCHER') && onAddVoucher && (
              <button
                type="button"
                className="flex gap-2 rounded border border-button-stroke-secondary px-4 py-2 text-button-text-secondary focus:outline-none"
                onClick={onAddVoucher}
              >
                <FaPlus />
                <div>Add New Voucher</div>
              </button>
            )}
            {operations.includes('ADD_ASSET') && onAddAsset && (
              <button
                type="button"
                className="flex gap-2 rounded border border-button-stroke-secondary px-4 py-2 text-button-text-secondary focus:outline-none"
                onClick={onAddAsset}
              >
                <FaPlus />
                <div>Add New Asset</div>
              </button>
            )}
            {operations.includes('DELETE') && onDelete && (
              <button
                type="button"
                className={`rounded border border-tabs-stroke-default bg-tabs-surface-active p-2.5 text-stroke-neutral-solid-light hover:bg-tabs-surface-active hover:text-stroke-neutral-solid-light`}
                onClick={onDelete}
              >
                <FiTrash2 />
              </button>
            )}

            {/* Info: (20240920 - tzuhan) 右側選擇控制連結 */}
            <div className="m-2.5 flex space-x-4">
              <button type="button" className="hover:underline" onClick={handleSelectAll}>
                Select All
              </button>
              <button type="button" className="hover:underline" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          {/* Info: (20240920 - tzuhan) 左側選擇計數顯示 */}
          {subtitle && <div className="font-medium text-text-neutral-secondary">{subtitle}</div>}
          <div className="flex h-42px items-center justify-end space-x-4 text-link-text-primary">
            <button
              type="button"
              className={`flex gap-2 rounded border border-tabs-stroke-default bg-tabs-surface-active p-2.5 text-stroke-neutral-solid-light hover:bg-tabs-surface-active hover:text-stroke-neutral-solid-light`}
              onClick={onDownload}
            >
              <FiDownload />
              <div>Export {itemType}</div>
            </button>
            {isSelectable && (
              <button
                type="button"
                className="hover:underline"
                onClick={onActiveChange.bind(null, true)}
              >
                Select
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectionToolbar;
