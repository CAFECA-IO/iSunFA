import React from 'react';
import CertificateThumbnail from '@/components/certificate/certificate_thumbnail'; // 引入 CertificateThumbnail 組件
import { ICertificateUI } from '@/interfaces/certificate';

interface CertificateGridProps {
  data: ICertificateUI[]; // Info: (20240923 - tzuhan) 項目列表
  activeSelection: boolean; // Info: (20240923 - tzuhan) 是否處於選擇狀態
  handleSelect: (ids: number[], isSelected: boolean) => void;
  onRemove: (id: number) => void;
  onDownload: (id: number) => void;
  onEdit: (id: number) => void;
}

const CertificateGrid: React.FC<CertificateGridProps> = ({
  data,
  activeSelection,
  handleSelect,
  onRemove,
  onDownload,
  onEdit,
}) => {
  return (
    <div className="grid-cols-dynamic-fit grid place-items-center gap-4">
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
  );
};

export default CertificateGrid;
