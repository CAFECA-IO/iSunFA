import React from 'react';
import { FiDownload, FiTrash2 } from 'react-icons/fi';

interface SelectionToolbarProps {
  items: { id: number }[]; // Info: (20240920 - tzuhan) 項目列表
  selectedItemIds: number[]; // Info: (20240920 - tzuhan) 選中的項目 ID 列表
  totalCount: number; // Info: (20240920 - tzuhan) 總項目數量
  onSelectionChange: (selectedIds: number[]) => void; // Info: (20240920 - tzuhan) 當選擇變更時的回調函數
  operations?: ('ADD_VOUCHER' | 'ADD_ASSET' | 'DELETE')[]; // Info: (20240920 - tzuhan) 操作列表
  onAddVoucher: () => void; // Info: (20240920 - tzuhan) 添加新的憑證的回調函數
  onAddAsset: () => void; // Info: (20240920 - tzuhan) 添加新資產的回調函數
  onDelete: () => void; // Info: (20240920 - tzuhan) 添加刪除的回調函數
}

const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  items,
  selectedItemIds,
  totalCount,
  onSelectionChange,
  operations = [],
  onAddVoucher,
  onAddAsset,
  onDelete,
}) => {
  const [activeSelection, setActiveSelection] = React.useState<boolean>(false);
  const selectedCount = selectedItemIds.length;

  // Info: (20240920 - tzuhan) 刪除選中項目
  const handleDelete = () => {
    onDelete();
    const newSelected: number[] = []; // Info: (20240920 - tzuhan) 刪除後清空選擇
    onSelectionChange(newSelected);
  };

  // Info: (20240920 - tzuhan) 下載選中項目
  const handleDownload = () => {
    // TODO: (20240920 - tzuhan) 下載選中的項目
    // Deprecated: (20240920 - tzuhan) debugging purpose
    // eslint-disable-next-line no-console
    console.log('Download selected items:', selectedItemIds);
  };

  // Info: (20240920 - tzuhan) 全選操作
  const handleSelectAll = () => {
    const allIds = items.map((item) => item.id);
    onSelectionChange(allIds);
  };

  // Info: (20240920 - tzuhan) 取消全選
  const handleUnselectAll = () => {
    onSelectionChange([]);
  };

  // Info: (20240920 - tzuhan) 取消操作
  const handleCancel = () => {
    // Deprecated: (20240920 - tzuhan) debugging purpose
    // eslint-disable-next-line no-console
    console.log('Cancel operation');
    onSelectionChange([]);
    setActiveSelection(false);
  };

  return (
    <div className="px-4">
      {activeSelection ? (
        <div className="flex items-center justify-between">
          {/* Info: (20240920 - tzuhan) 左側選擇計數顯示 */}
          <div className="font-medium text-gray-700">
            (Select {selectedCount}/{totalCount})
          </div>

          {/* Info: (20240920 - tzuhan) 中間操作按鈕 */}
          <div className="flex items-center space-x-4 text-blue-500">
            {operations.includes('DELETE') && (
              <button
                type="button"
                className={`rounded border border-tabs-stroke-default bg-tabs-surface-active p-2.5 text-stroke-neutral-solid-light hover:bg-tabs-surface-active hover:text-stroke-neutral-solid-light`}
                onClick={handleDelete}
              >
                <FiTrash2 />
              </button>
            )}
            <button
              type="button"
              className={`rounded border border-tabs-stroke-default bg-tabs-surface-active p-2.5 text-stroke-neutral-solid-light hover:bg-tabs-surface-active hover:text-stroke-neutral-solid-light`}
              onClick={handleDownload}
            >
              <FiDownload />
            </button>
            {operations.includes('ADD_VOUCHER') && (
              <button
                type="button"
                className="rounded border border-button-stroke-secondary px-4 py-2 text-button-text-secondary focus:outline-none"
                onClick={onAddVoucher}
              >
                Add New Voucher
              </button>
            )}
            {operations.includes('ADD_ASSET') && (
              <button
                type="button"
                className="rounded border border-button-stroke-secondary px-4 py-2 text-button-text-secondary focus:outline-none"
                onClick={onAddAsset}
              >
                Add New Asset
              </button>
            )}

            {/* Info: (20240920 - tzuhan) 右側選擇控制連結 */}
            <div className="m-2.5 flex space-x-4">
              <button type="button" className="hover:underline" onClick={handleSelectAll}>
                Select All
              </button>
              <button type="button" className="hover:underline" onClick={handleUnselectAll}>
                Unselect All
              </button>
              <button type="button" className="hover:underline" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-42px items-center justify-end space-x-4 text-blue-500">
          <button
            type="button"
            className="hover:underline"
            onClick={() => setActiveSelection((prev) => !prev)}
          >
            Select
          </button>
        </div>
      )}
    </div>
  );
};

export default SelectionToolbar;
