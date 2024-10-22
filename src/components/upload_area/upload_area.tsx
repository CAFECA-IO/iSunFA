import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';

interface UploadAreaProps {
  isDisabled: boolean;
  withScanner: boolean;
  toggleQRCode?: () => void;
  handleUpload: (file: File) => Promise<void>;
}

const UploadArea: React.FC<UploadAreaProps> = ({
  isDisabled,
  withScanner,
  toggleQRCode,
  handleUpload,
}) => {
  const { t } = useTranslation(['common', 'journal']);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (isDisabled) {
      event.stopPropagation();
      return;
    }
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (isDisabled) {
      event.stopPropagation();
      return;
    }

    const { files } = event.dataTransfer;
    if (files && files.length > 0) {
      Array.from(files).map(async (droppedFile: File) => {
        if (droppedFile) {
          await handleUpload(droppedFile);
        }
        return null;
      });
      setIsDragOver(false);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex items-center justify-center rounded-lg border border-dashed py-10 ${
        !isDisabled && isDragOver
          ? 'border-drag-n-drop-stroke-focus bg-drag-n-drop-surface-hover'
          : 'border-drag-n-drop-stroke-primary bg-drag-n-drop-surface-primary'
      } ${isDisabled ? 'cursor-not-allowed border-drag-n-drop-stroke-disable bg-drag-n-drop-surface-disable' : 'hover:border-drag-n-drop-stroke-focus hover:bg-drag-n-drop-surface-hover'}`}
    >
      <button
        type="button"
        className="group flex h-full flex-1 flex-col items-center justify-center rounded-l-lg"
        disabled={isDisabled}
      >
        <Image
          src="/icons/upload_file.svg"
          width={55}
          height={60}
          alt="upload_file"
          className="group-disabled:grayscale"
        />
        <p className="mt-4 font-semibold text-drag-n-drop-text-primary group-disabled:text-drag-n-drop-text-disable">
          {t('common:UPLOAD_AREA.DROP_YOUR_FILES_HERE_OR')}
          <span className="cursor-pointer text-link-text-primary group-disabled:cursor-not-allowed group-disabled:text-drag-n-drop-text-disable">
            {t('common:UPLOAD_AREA.BROWSE')}
          </span>
        </p>
        <p className="text-center text-drag-n-drop-text-note group-disabled:text-drag-n-drop-text-disable">
          {t('common:UPLOAD_AREA.MAXIMUM_SIZE')}
        </p>

        <input
          id="certificate-upload"
          name="certificate-upload"
          accept="application/pdf, image/jpeg, image/png"
          type="file"
          className="hidden"
          onChange={() => {}}
          disabled={isDisabled}
        />
      </button>

      {withScanner && toggleQRCode && (
        <>
          <h3 className="px-4 text-xl font-bold text-text-neutral-tertiary">
            {t('common:COMMON.OR')}
          </h3>

          <button
            type="button"
            className="group flex h-full flex-1 flex-col items-center justify-center rounded-r-lg"
            disabled={isDisabled}
          >
            <Image
              src="/icons/scan_qrcode.svg"
              width={55}
              height={60}
              alt="scan_qr_code"
              className="group-disabled:grayscale"
            />
            <div className="mt-4 flex items-center gap-2">
              <Image
                src="/icons/scan.svg"
                width={20}
                height={20}
                alt="scan"
                className="group-disabled:grayscale"
              />
              <p className="font-semibold text-drag-n-drop-text-primary group-disabled:text-drag-n-drop-text-disable">
                {t('journal:JOURNAL.USE_YOUR_PHONE_AS')}
                <span
                  className="cursor-pointer text-text-brand-primary-lv2 group-disabled:cursor-not-allowed group-disabled:text-drag-n-drop-text-disable"
                  onClick={toggleQRCode}
                >
                  {t('journal:JOURNAL.SCANNER')}
                </span>
              </p>
            </div>
            <p className="text-center text-drag-n-drop-text-note group-disabled:text-drag-n-drop-text-disable">
              {t('journal:JOURNAL.SCAN_THE_QRCODE')}
            </p>
          </button>
        </>
      )}
    </div>
  );
};

export default UploadArea;
