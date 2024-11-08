import Image from 'next/image';
import React from 'react';

import { ICertificateUI } from '@/interfaces/certificate';
import { RxCross1 } from 'react-icons/rx';
import { Button } from '@/components/button/button';

interface CertificatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void; // Info: (20240924 - tzuhan) 關閉模態框的回調函數
  certificate: ICertificateUI | null;
  isOnTopOfModal: boolean;
}

const CertificatePreviewModal: React.FC<CertificatePreviewModalProps> = ({
  isOpen,
  onClose,
  certificate,
  isOnTopOfModal,
}) => {
  if (!isOpen || !certificate) return null;

  return (
    <div
      className={`fixed inset-0 z-70 flex items-center justify-center ${isOnTopOfModal ? '' : 'bg-black/50'}`}
    >
      <div className="relative flex max-h-90vh flex-col rounded-sm bg-surface-neutral-surface-lv2 md:max-h-100vh">
        {/* Info: (20240924 - tzuhan) 關閉按鈕 */}
        <button
          type="button"
          className="absolute right-4 top-4 text-checkbox-text-primary"
          onClick={onClose}
        >
          <RxCross1 size={32} />
        </button>
        {/* Info: (20240924 - tzuhan) 模態框標題 */}
        <h2 className="flex flex-col items-center justify-center gap-2 border-b border-stroke-neutral-quaternary p-2 text-xl font-semibold text-card-text-title">
          <div className="text-xl font-semibold">{certificate.name}</div>
          <div className="text-xs font-normal text-card-text-sub">{certificate.invoice.date}</div>
        </h2>
        <div className="flex justify-end gap-2 border-b border-stroke-neutral-quaternary px-4 py-3">
          <Button type="button" variant="tertiary" className="p-2">
            <Image src="/elements/printer.svg" width={16} height={16} alt="elements" />
          </Button>
          <Button type="button" variant="tertiary" className="p-2">
            <Image src="/elements/downloader.svg" alt="⬇" width={16} height={16} />
          </Button>
        </div>
        <div className="mx-20">
          {/* Info: (20240924 - tzuhan) 發票縮略圖 */}
          <Image
            className="h-60vh items-center"
            src={certificate.file.url}
            width={375}
            height={600}
            alt="certificate"
            priority
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-stroke-neutral-quaternary px-4 py-3">
          <Button
            type="button"
            variant="tertiaryOutlineGrey"
            className="p-2 px-4"
            onClick={onClose}
          >
            <div className="flex items-end gap-2">Close</div>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CertificatePreviewModal;
