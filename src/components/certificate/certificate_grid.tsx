import React from 'react';
import { ICertificateRC2InputUI } from '@/interfaces/certificate_rc2';
import CertificateThumbnail from '@/components/certificate/certificate_thumbnail';

interface CertificateGridProps {
  certificates: ICertificateRC2InputUI[]; // Info: (20240923 - tzuhan) 項目列表
  activeSelection: boolean; // Info: (20240923 - tzuhan) 是否處於選擇狀態
  handleSelect: (ids: number[], isSelected: boolean) => void;
  onRemove: (id: number) => void;
  onDownload: (id: number) => void;
  onEdit: (id: number) => void;
}

const CertificateGrid: React.FC<CertificateGridProps> = ({
  certificates,
  activeSelection,
  handleSelect,
  onRemove,
  onDownload,
  onEdit,
}) => {
  return (
    <div className="flex flex-wrap gap-5">
      {certificates.map((certificate) => (
        <CertificateThumbnail
          key={certificate.id}
          data={certificate}
          activeSelection={activeSelection}
          handleSelect={handleSelect}
          onRemove={onRemove}
          onDownload={onDownload}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
};

export default CertificateGrid;
