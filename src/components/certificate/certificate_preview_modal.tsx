import Image from 'next/image';
import React from 'react';

import { ICertificateUI } from '@/interfaces/certificate';
import { RxCross1 } from 'react-icons/rx';
import { Button } from '@/components/button/button';
// import Magnifier from '@/components/magnifier/magifier';
import ImageZoom from '@/components/image_zoom/image_zoom';
import { useTranslation } from 'next-i18next';

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
  const { t } = useTranslation(['common']);
  if (!isOpen || !certificate) return null;

  return (
    <div
      className={`fixed inset-0 z-120 flex items-center justify-center ${isOnTopOfModal ? '' : 'bg-black/50'}`}
    >
      <div className="relative flex max-h-90vh flex-col rounded-sm bg-surface-neutral-surface-lv2 md:max-h-100vh">
        {/* Info: (20240924 - tzuhan) 關閉按鈕 */}
        <button
          type="button"
          className="absolute right-4 top-4 text-checkbox-text-primary"
          onClick={onClose}
        >
          <RxCross1 size={24} />
        </button>
        {/* Info: (20240924 - tzuhan) 模態框標題 */}
        <h2 className="flex flex-col items-center justify-center gap-2 border-b border-stroke-neutral-quaternary px-40px py-16px text-xl font-semibold text-card-text-title">
          <div className="text-xl font-semibold">{t('journal:JOURNAL.PREVIEW_INVOICE')}</div>
          <div className="text-xs font-normal text-card-text-secondary">
            {certificate.file.name}
          </div>
        </h2>
        <div className="flex justify-end gap-2 border-b border-stroke-neutral-quaternary px-4 py-3">
          <Button type="button" variant="tertiary" className="p-2" size="defaultSquare">
            <Image src="/elements/printer.svg" width={16} height={16} alt="elements" />
          </Button>
          <Button type="button" variant="tertiary" className="p-2" size="defaultSquare">
            <Image src="/elements/downloader.svg" alt="⬇" width={16} height={16} />
          </Button>
        </div>
        <div className="hide-scrollbar flex justify-center overflow-scroll px-4">
          <ImageZoom
            imageUrl={certificate.file.url}
            className="max-h-700px min-h-500px min-w-600px max-w-1200px"
          />
          {/* <Magnifier
            className="max-h-800px min-h-500px min-w-700px max-w-1200px object-contain"
            imageUrl={certificate.file.url}
            zoomLevelX={2}
            useNaturalSize
          /> */}
        </div>
        <div className="flex justify-end gap-2 border-t border-stroke-neutral-quaternary px-4 py-3">
          <Button
            type="button"
            variant="tertiaryOutlineGrey"
            className="p-2 px-4"
            onClick={onClose}
          >
            <div className="flex items-end gap-2">{t('common:COMMON.CLOSE')}</div>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CertificatePreviewModal;
