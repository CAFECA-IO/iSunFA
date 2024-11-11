import React from 'react';
import { useTranslation } from 'next-i18next';

import FilterSection from '@/components/filter_section/filter_section';
import { ICertificate, ICertificateUI } from '@/interfaces/certificate';
import { APIName } from '@/constants/api_connection';
import SelectionPannl from '@/components/certificate/certificate_selection_pannel';
import { Button } from '@/components/button/button';
import { RxCross1 } from 'react-icons/rx';
import { IPaginatedData } from '@/interfaces/pagination';
import { InvoiceTabs } from '@/constants/certificate';
import { InvoiceType } from '@/constants/invoice';

interface CertificateSelectorModalProps {
  isOpen: boolean;
  selectedIds: number[];
  setSelectedIds: React.Dispatch<React.SetStateAction<number[]>>;
  onClose: () => void; // Info: (20240924 - tzuhan) 關閉模態框的回調函數

  handleSelect: (ids: number[], isSelected: boolean) => void; // Info: (20240926 - tzuhan) 保存數據的回調函數
  certificates: ICertificateUI[]; // Info: (20240926 - tzuhan) 證書列表
  handleApiResponse: (
    data: IPaginatedData<{
      totalInvoicePrice: number;
      unRead: {
        withVoucher: number;
        withoutVoucher: number;
      };
      currency: string;
      certificates: ICertificate[];
    }>
  ) => void; // Info: (20240926 - tzuhan) 處理 API 回應的回調函數
  openUploaderModal: () => void; // Info: (20240926 - tzuhan) 打開上傳模態框的回調函數
}

const CertificateSelectorModal: React.FC<CertificateSelectorModalProps> = ({
  isOpen,
  onClose,
  handleSelect,
  handleApiResponse,
  certificates,
  selectedIds,
  setSelectedIds,
  openUploaderModal,
}) => {
  const { t } = useTranslation(['certificate', 'common']);
  // Info: (20240924 - tzuhan) 不顯示模態框時返回 null
  if (!isOpen) return null;

  const handleSelectAll = () => {
    setSelectedIds(certificates.map((item) => item.id));
  };

  const handleComfirm = () => {
    handleSelect(selectedIds, true);
    onClose();
  };

  const handleSelectOne = (id: number) => {
    const index = selectedIds.findIndex((item) => item === id);
    if (index === -1) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    }
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="relative ml-250px flex max-h-450px w-90vw max-w-800px flex-col rounded-sm bg-surface-neutral-surface-lv2 p-20px md:max-h-90vh">
        {/* Info: (20240924 - tzuhan) 關閉按鈕 */}
        <button
          type="button"
          className="absolute right-4 top-4 text-checkbox-text-primary"
          onClick={onClose}
        >
          <RxCross1 size={32} />
        </button>
        {/* Info: (20240924 - tzuhan) 模態框標題 */}
        <h2 className="flex justify-center gap-2 text-xl font-semibold">
          {t('certificate:SELECT.TITLE')}
        </h2>
        <p className="flex justify-center text-card-text-secondary">
          {t('certificate:SELECT.CONTENT')}
        </p>
        <FilterSection
          apiName={APIName.CERTIFICATE_LIST_V2}
          page={1}
          pageSize={1000} // Info: (20241022 - tzuhan) @Murky, 這裡需要一次性取得所有證書
          tab={InvoiceTabs.WITHOUT_VOUCHER}
          onApiResponse={handleApiResponse}
          types={Object.keys(InvoiceType)}
        />
        <div className="mt-12px px-4">
          <div className="flex items-center justify-between">
            <div className="font-medium text-text-neutral-secondary">
              (Select {selectedIds.length}/{certificates.length})
            </div>
            <button
              type="button"
              className="text-link-text-primary hover:underline"
              onClick={handleSelectAll}
            >
              {t('common:COMMON.SELECT_ALL')}
            </button>
          </div>
        </div>
        <SelectionPannl
          certificates={certificates}
          selectedIds={selectedIds}
          handleSelect={handleSelectOne}
          openUploaderModal={openUploaderModal}
        />
        <div className="flex items-center justify-end gap-2">
          <Button
            id="upload-image-button"
            type="button"
            variant="secondaryOutline"
            className="gap-x-4px px-4 py-2"
            onClick={onClose}
          >
            {t('common:COMMON.CANCEL')}
          </Button>
          <Button
            id="upload-image-button"
            type="button"
            variant="tertiary"
            className="gap-x-4px px-4 py-2"
            onClick={handleComfirm}
          >
            {t('common:COMMON.CONFIRM')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CertificateSelectorModal;
