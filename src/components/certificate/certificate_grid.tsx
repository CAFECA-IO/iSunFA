import React from 'react';
import { ICertificateUI } from '@/interfaces/certificate';
import CertificateThumbnail from '@/components/certificate/certificate_thumbnail';
import FloatingUploadPopup from '@/components/floating_upload_popup/floating_upload_popup';

interface CertificateGridProps {
  data: ICertificateUI[]; // Info: (20240923 - tzuhan) 項目列表
  activeSelection: boolean; // Info: (20240923 - tzuhan) 是否處於選擇狀態
  activeTab: number;
  handleSelect: (ids: number[], isSelected: boolean) => void;
  onRemove: (id: number) => void;
  onDownload: (id: number) => void;
  onEdit: (id: number) => void;
}

const CertificateGrid: React.FC<CertificateGridProps> = ({
  data,
  activeSelection,
  activeTab,
  handleSelect,
  onRemove,
  onDownload,
  onEdit,
}) => {
  return (
    <>
      <div className="grid grid-cols-dynamic-fit place-items-center gap-4">
        {data.map((certificate) => (
          <CertificateThumbnail
            data={certificate}
            activeSelection={activeSelection}
            handleSelect={handleSelect}
            onRemove={onRemove}
            onDownload={onDownload}
            onEdit={onEdit}
          />
        ))}
      </div>
      {/* Info: (20240926- tzuhan) Floating Upload Popup */}
      {activeTab === 0 && <FloatingUploadPopup />}
    </>
  );
};

export default CertificateGrid;
