import React, { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import FilterSection from '@/components/filter_section/filter_section';
import { APIName } from '@/constants/api_connection';
import InvoiceSelectionPanel from '@/components/voucher/invoice_selection_panel';
import { Button } from '@/components/button/button';
import { RxCross2 } from 'react-icons/rx';
import { InvoiceTab } from '@/constants/invoice_rc2';
// import { InvoiceType } from '@/constants/invoice';
import { DEFAULT_MAX_PAGE_LIMIT } from '@/constants/config';
import { InvoiceType } from '@/constants/invoice';
import { IInvoiceRC2, IInvoiceRC2UI } from '@/interfaces/invoice_rc2';
import { IPaginatedData } from '@/interfaces/pagination';

interface InvoiceSelectorModalProps {
  isOpen: boolean;
  accountBookId: number;
  selectedIds: number[];
  setSelectedIds: React.Dispatch<React.SetStateAction<number[]>>;
  onClose: () => void; // Info: (20240924 - tzuhan) 關閉模態框的回調函數

  handleSelect: (ids: number[]) => void; // Info: (20240926 - tzuhan) 保存數據的回調函數
  invoices: IInvoiceRC2UI[]; // Info: (20240926 - tzuhan) 證書列表
  handleApiResponse: (data: IPaginatedData<IInvoiceRC2[]>) => void; // Info: (20240926 - tzuhan) 處理 API 回應的回調函數
  openUploaderModal: () => void; // Info: (20240926 - tzuhan) 打開上傳模態框的回調函數
}

const InvoiceSelectorModal: React.FC<InvoiceSelectorModalProps> = ({
  isOpen,
  accountBookId,
  onClose,
  handleSelect,
  handleApiResponse,
  invoices,
  selectedIds,
  setSelectedIds,
  openUploaderModal,
}) => {
  const { t } = useTranslation(['certificate', 'common']);
  const [isSelectAll, setIsSelectAll] = useState(false);

  useEffect(() => {
    // Info: (20250331- Julian) 判斷是否全選
    const selectedAll = invoices.length === selectedIds.length && invoices.length > 0;
    setIsSelectAll(selectedAll);
  }, [selectedIds, invoices]);

  // Info: (20240924 - tzuhan) 不顯示模態框時返回 null
  if (!isOpen) return null;

  const handleConfirm = () => {
    // Info: (20250312 - Julian) 更新選擇狀態
    handleSelect(selectedIds);

    // Info: (20250312 - Julian) 關閉模態框
    onClose();
  };

  const handleSelectAll = () => {
    if (isSelectAll) {
      // Info: (20250312 - Julian) 如果已經全選，則清空 selectedIds
      setSelectedIds([]);
    } else {
      // Info: (20250312 - Julian) 將所有發票加入 selectedIds
      setSelectedIds(invoices.map((item) => item.id));
    }
  };

  const handleSelectOne = (id: number) => {
    const index = selectedIds.findIndex((item) => item === id);
    if (index === -1) {
      // Info: (20250312 - Julian) 如果該發票還沒有被選取，則加入 selectedIds
      setSelectedIds([...selectedIds, id]);
    } else {
      // Info: (20250312 - Julian) 如果該發票已經被選取，則從 selectedIds 移除
      setSelectedIds(selectedIds.filter((item) => item !== id));
    }
  };

  return (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="relative flex max-h-600px w-90vw max-w-800px flex-col rounded-sm bg-surface-neutral-surface-lv2 tablet:max-h-90vh">
        <div className="px-20px py-16px">
          {/* Info: (20240924 - tzuhan) 關閉按鈕 */}
          <button
            type="button"
            className="absolute right-20px top-16px text-icon-surface-single-color-primary"
            onClick={onClose}
          >
            <RxCross2 size={24} />
          </button>
          {/* Info: (20240924 - tzuhan) 模態框標題 */}
          <h2 className="flex justify-center gap-2 text-xl font-bold text-card-text-primary">
            {t('certificate:SELECT.TITLE')}
          </h2>
          <p className="flex justify-center text-xs text-card-text-secondary">
            {t('certificate:SELECT.CONTENT')}
          </p>
        </div>

        {/* Info: (20250527 - Julian) content */}
        <div className="overflow-y-auto overflow-x-hidden px-lv-4 py-lv-3">
          <FilterSection
            apiName={APIName.LIST_INVOICE_RC2}
            params={{ accountBookId }}
            page={1}
            pageSize={DEFAULT_MAX_PAGE_LIMIT} // Info: (20241022 - tzuhan) @Murky, 這裡需要一次性取得所有證書
            tab={InvoiceTab.WITHOUT_VOUCHER}
            onApiResponse={handleApiResponse}
            types={Object.keys(InvoiceType)}
          />
          <div className="mt-12px tablet:px-4">
            <div className="flex items-center justify-between">
              <div className="font-medium text-text-neutral-secondary">
                ({t('certificate:COMMON.SELECT')} {selectedIds.length}/{invoices.length})
              </div>
              <button
                type="button"
                className="text-link-text-primary enabled:hover:underline disabled:text-link-text-disable"
                onClick={handleSelectAll}
                disabled={invoices.length === 0} // Info: (20250331 - Julian) 如果沒有發票，則不能全選
              >
                {isSelectAll
                  ? t('certificate:COMMON.UNSELECT_ALL')
                  : t('certificate:COMMON.SELECT_ALL')}
              </button>
            </div>
          </div>
          <InvoiceSelectionPanel
            invoices={invoices}
            selectedIds={selectedIds}
            handleSelect={handleSelectOne}
            openUploaderModal={openUploaderModal}
          />
        </div>

        <div className="flex items-center gap-12px px-lv-4 py-16px tablet:justify-end">
          <Button
            id="upload-image-button"
            type="button"
            variant="secondaryOutline"
            className="w-full px-4 py-2 tablet:w-auto"
            onClick={onClose}
          >
            {t('common:COMMON.CANCEL')}
          </Button>
          <Button
            id="upload-image-button"
            type="button"
            variant="tertiary"
            className="w-full px-4 py-2 tablet:w-auto"
            onClick={handleConfirm}
          >
            {t('common:COMMON.CONFIRM')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceSelectorModal;
