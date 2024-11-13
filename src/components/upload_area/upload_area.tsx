import React, { useState, useCallback } from 'react';
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
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
      if (isUploading || isDisabled || !files) return;

      setIsUploading(true);
      await Promise.all(Array.from(files).map(async (file) => handleUpload(file)));
      setIsUploading(false);
    },
    [isUploading, isDisabled, handleUpload]
  );

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!isDisabled) setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (isDisabled) return;

    handleFileUpload(event.dataTransfer.files);
    setIsDragOver(false);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(event.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFileDialog = () => {
    if (!isDisabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div
      onClick={openFileDialog}
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
        aria-disabled={isDisabled}
      >
        <Image
          src="/icons/upload_file.svg"
          width={55}
          height={60}
          alt="upload file icon"
          aria-hidden={isDisabled}
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
          ref={fileInputRef}
          id="certificate-upload"
          name="certificate-upload"
          accept="application/pdf, image/jpeg, image/png"
          type="file"
          className="hidden"
          onChange={handleFileChange}
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
            onClick={toggleQRCode}
            className="group flex h-full flex-1 flex-col items-center justify-center rounded-r-lg"
            disabled={isDisabled}
            aria-disabled={isDisabled}
          >
            <Image
              src="/icons/scan_qrcode.svg"
              width={55}
              height={60}
              alt="scan QR code icon"
              aria-hidden={isDisabled}
              className="group-disabled:grayscale"
            />
            <div className="mt-4 flex items-center gap-2">
              <Image
                src="/icons/scan.svg"
                width={20}
                height={20}
                alt="scan icon"
                aria-hidden={isDisabled}
                className="group-disabled:grayscale"
              />
              <p className="font-semibold text-drag-n-drop-text-primary group-disabled:text-drag-n-drop-text-disable">
                {t('journal:JOURNAL.USE_YOUR_PHONE_AS')}
                <span className="cursor-pointer text-text-brand-primary-lv2 group-disabled:cursor-not-allowed group-disabled:text-drag-n-drop-text-disable">
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
