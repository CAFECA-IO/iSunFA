import React, { useState } from 'react';
import Image from 'next/image';
import { ICertificateUI } from '@/interfaces/certificate';
import CertificatePreviewModal from './certificate_preview_modal';

interface CertificateSelectorThumbnailProps {
  certificate: ICertificateUI;
  isSelected: boolean;
  isSelectable: boolean;
  isDeletable: boolean;
  handleSelect?: (id: number) => void;
  onDelete?: (id: number) => void;
  isOnTopOfModal?: boolean;
}

const CertificateSelectorThumbnail: React.FC<CertificateSelectorThumbnailProps> = ({
  certificate,
  handleSelect,
  isSelected,
  isDeletable,
  isSelectable,
  onDelete,
  isOnTopOfModal = false,
}) => {
  const [selectedCertificate, setSelectedCertificate] = useState<ICertificateUI | null>(null);

  const handleClicked = (
    e: React.MouseEvent<HTMLDivElement>,
    clickedCertificate: ICertificateUI
  ) => {
    e.stopPropagation();
    if (selectedCertificate?.id !== certificate.id) {
      setSelectedCertificate(clickedCertificate);
    } else {
      setSelectedCertificate(null);
    }
  };
  return (
    <>
      <CertificatePreviewModal
        isOpen={!!selectedCertificate}
        onClose={() => setSelectedCertificate(null)}
        certificate={selectedCertificate}
        isOnTopOfModal={isOnTopOfModal}
      />
      <div
        key={certificate.id}
        className={`flex flex-col items-center gap-2 rounded-sm px-4 py-3 ${isSelected || !isSelectable ? (isSelectable ? 'border border-stroke-brand-primary bg-surface-brand-primary-30' : 'hover:group') : ''}`}
        onClick={handleSelect?.bind(null, certificate.id)}
      >
        <div className={`relative h-136px w-85px ${!isSelected || !isSelectable ? 'group' : ''}`}>
          <Image
            src={certificate.file.url}
            alt="AI"
            width={85}
            height={136}
            className="h-full w-full"
          />
          <div className="absolute left-0 top-0 hidden h-full w-full bg-black/50 group-hover:block">
            {isDeletable && (
              <div
                className="absolute -right-5px top-0 -translate-y-1/2 cursor-pointer rounded-full border border-stroke-neutral-quaternary bg-white p-1"
                onClick={onDelete?.bind(null, certificate.id)}
              >
                <Image src="/elements/x-close.svg" alt="close" width={10} height={10} />
              </div>
            )}
            <div
              className="absolute bottom-0 right-0 cursor-pointer rounded-xs bg-white/50 text-white hover:bg-white"
              onClick={(e) => handleClicked(e, certificate)}
            >
              <div className="p-2 hover:invert">
                <Image src="/elements/search.svg" alt="search" width={20} height={20} />
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs font-medium text-text-neutral-primary">{certificate.name}</p>
      </div>
    </>
  );
};

export default CertificateSelectorThumbnail;
