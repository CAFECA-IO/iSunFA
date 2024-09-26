import React from 'react';

import FilterSection from '@/components/filter_section/filter_section';
import { ICertificate, ICertificateUI } from '@/interfaces/certificate';
import { APIName } from '@/constants/api_connection';
import SelectionPannl from '@/components/certificate/selection_pannel';
import { Button } from '@/components/button/button';
import { RxCross1 } from 'react-icons/rx';

interface CertificateSelectorModalProps {
  isOpen: boolean;
  onClose: () => void; // Info: (20240924 - tzuhan) 關閉模態框的回調函數
  selectedCertificates: ICertificateUI[]; // Info: (20240926 - tzuhan) 已選擇的證書
  handleSelect: (ids: number[], isSelected: boolean) => void; // Info: (20240926 - tzuhan) 保存數據的回調函數
  certificates: ICertificateUI[]; // Info: (20240926 - tzuhan) 證書列表
  handleApiResponse: (data: ICertificate[]) => void; // Info: (20240926 - tzuhan) 處理 API 回應的回調函數
  openUploaderModal: () => void; // Info: (20240926 - tzuhan) 打開上傳模態框的回調函數
}

const CertificateSelectorModal: React.FC<CertificateSelectorModalProps> = ({
  isOpen,
  onClose,
  handleSelect,
  selectedCertificates,
  handleApiResponse,
  certificates,
  openUploaderModal,
}) => {
  // Info: (20240924 - tzuhan) 不顯示模態框時返回 null
  if (!isOpen) return null;

  const handleSelectAll = () => {
    handleSelect(
      certificates.map((item) => item.id),
      true
    );
  };

  const handleComfirm = () => {
    handleSelect(
      selectedCertificates.map((item) => item.id),
      true
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="relative flex max-h-450px w-90vw max-w-800px flex-col rounded-sm bg-surface-neutral-surface-lv2 p-20px md:max-h-90vh">
        {/* Info: (20240924 - tzuhan) 關閉按鈕 */}
        <button
          type="button"
          className="absolute right-4 top-4 text-checkbox-text-primary"
          onClick={onClose}
        >
          <RxCross1 size={32} />
        </button>
        {/* Info: (20240924 - tzuhan) 模態框標題 */}
        <h2 className="flex justify-center gap-2 text-xl font-semibold">Select Certificates</h2>
        <p className="flex justify-center text-card-text-secondary">
          Choosing the certificates you want to attach with the voucher
        </p>
        <FilterSection
          apiName={APIName.CERTIFICATE_LIST}
          onApiResponse={handleApiResponse}
          types={['All', 'Invoice', 'Receipt']}
        />
        <div className="px-4">
          <div className="flex items-center justify-between">
            <div className="font-medium text-text-neutral-secondary">
              (Select {selectedCertificates.length}/{certificates.length})
            </div>
            <button
              type="button"
              className="text-link-text-primary hover:underline"
              onClick={handleSelectAll}
            >
              Select All
            </button>
          </div>
        </div>
        <SelectionPannl
          certificates={certificates}
          handleSelect={handleSelect}
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
            Cancel
          </Button>
          <Button
            id="upload-image-button"
            type="button"
            variant="tertiary"
            className="gap-x-4px px-4 py-2"
            onClick={handleComfirm}
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CertificateSelectorModal;
