import Image from 'next/image';
import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { RxCross2 } from 'react-icons/rx';
import { useTranslation } from 'next-i18next';
import { ICertificateUI } from '@/interfaces/certificate';
import { Button } from '@/components/button/button';
// import Magnifier from '@/components/magnifier/magifier';
import ImageZoom from '@/components/image_zoom/image_zoom';
import loggerFront from '@/lib/utils/logger_front';

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
  const printRef = useRef<HTMLImageElement>(null);

  // Info: (20250311 - Julian) 列印發票
  const handlePrint = useReactToPrint({
    contentRef: printRef, // Info: (20250311 - Julian) 指定要列印的元素
    documentTitle: `${certificate?.file.name}`, // Info: (20250311 - Julian) 列印的文件標題
    onBeforePrint: async () => {
      return Promise.resolve(); // Info: (20250311 - Julian) 確保回傳一個 Promise
    },
    onAfterPrint: async () => {
      return Promise.resolve(); // Info: (20250311 - Julian) 確保回傳一個 Promise
    },
  });

  // Info: (20250311 - Julian) 如果模態框未開啟或沒有發票資料，則不顯示模態框
  if (!isOpen || !certificate) return null;

  // Info: (20250311 - Julian) 下載發票
  const handleDownload = async () => {
    const imageUrl = certificate.file.thumbnail?.url || certificate.file.url;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = certificate.file.name;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(blobUrl); // Info: (20250311 - Julian) 釋放 URL 資源
      link.parentNode?.removeChild(link);
    } catch (error) {
      loggerFront.error('Download failed:', error);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-120 flex items-center justify-center ${isOnTopOfModal ? '' : 'bg-black/50'}`}
    >
      <div className="relative flex max-h-90vh w-90vw max-w-800px flex-col rounded-sm bg-surface-neutral-surface-lv2 md:max-h-100vh">
        {/* Info: (20240924 - tzuhan) 關閉按鈕 */}
        <button
          type="button"
          className="absolute right-4 top-4 text-checkbox-text-primary"
          onClick={onClose}
        >
          <RxCross2 size={24} />
        </button>
        {/* Info: (20240924 - tzuhan) 模態框標題 */}
        <h2 className="flex flex-col items-center justify-center gap-2 border-b border-stroke-neutral-quaternary px-40px py-16px text-xl font-semibold text-card-text-primary">
          <div className="text-xl font-semibold">{t('journal:JOURNAL.PREVIEW_INVOICE')}</div>
          <div className="text-xs font-normal text-card-text-secondary">
            {certificate.file.name}
          </div>
        </h2>
        <div className="flex justify-end gap-2 border-b border-stroke-neutral-quaternary px-4 py-3">
          <Button
            type="button"
            variant="tertiary"
            className="p-2"
            size="defaultSquare"
            onClick={() => handlePrint()}
          >
            <Image src="/elements/printer.svg" width={16} height={16} alt="print" />
          </Button>
          <Button
            type="button"
            variant="tertiary"
            className="p-2"
            size="defaultSquare"
            onClick={handleDownload}
          >
            <Image src="/elements/downloader.svg" alt="⬇" width={16} height={16} />
          </Button>
        </div>
        <div className="hide-scrollbar flex justify-center overflow-hidden px-4">
          <ImageZoom
            imageUrl={certificate.file.thumbnail?.url || certificate.file.url}
            className="h-450px w-full tablet:min-w-600px tablet:max-w-1200px"
          />
          <Image
            ref={printRef}
            src={certificate.file.thumbnail?.url || certificate.file.url}
            alt="certificate"
            fill
            objectFit="contain"
            className="absolute hidden print:block"
          />
          {/* <Magnifier
            className="max-h-800px min-h-500px min-w-700px max-w-1200px object-contain"
            imageUrl={certificate.file.thumbnail?.url || certificate.file.url.file.url}
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
