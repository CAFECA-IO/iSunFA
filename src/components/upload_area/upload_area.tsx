import React, { useState, useCallback } from 'react';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';

interface UploadAreaProps {
  isDisabled: boolean;
  toggleQRCode?: () => void;
  handleUpload: (file: File) => Promise<void>;
  multiple?: boolean;
}

const UploadArea: React.FC<UploadAreaProps> = ({
  isDisabled,
  toggleQRCode,
  handleUpload,
  multiple = false,
}) => {
  const { t } = useTranslation(['common', 'certificate']);
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
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center rounded-lg border border-dashed px-lv-5 py-lv-3 tablet:flex-row tablet:py-10 ${
        !isDisabled && isDragOver
          ? 'border-drag-n-drop-stroke-focus bg-drag-n-drop-surface-hover'
          : 'border-drag-n-drop-stroke-primary bg-drag-n-drop-surface-primary'
      } ${isDisabled ? 'cursor-not-allowed border-drag-n-drop-stroke-disable bg-drag-n-drop-surface-disable' : 'hover:border-drag-n-drop-stroke-focus hover:bg-drag-n-drop-surface-hover'}`}
    >
      <button
        type="button"
        className="group flex h-full flex-1 flex-col items-center justify-center rounded-l-lg p-lv-7 tablet:pl-6"
        disabled={isDisabled}
        aria-disabled={isDisabled}
        onClick={openFileDialog}
      >
        <Image
          src="/icons/upload_file.svg"
          width={55}
          height={60}
          alt="upload file icon"
          aria-hidden={isDisabled}
          className="group-disabled:grayscale"
        />
        <p className="mt-4 text-sm font-semibold text-drag-n-drop-text-primary group-disabled:text-drag-n-drop-text-disable tablet:text-base">
          {t('common:UPLOAD_AREA.DROP_YOUR_FILES_HERE_OR')}
          <span className="cursor-pointer text-link-text-primary group-disabled:cursor-not-allowed group-disabled:text-drag-n-drop-text-disable">
            {t('common:UPLOAD_AREA.BROWSE')}
          </span>
        </p>
        <p className="mt-4px text-center text-xs text-drag-n-drop-text-note group-disabled:text-drag-n-drop-text-disable tablet:text-sm">
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
          multiple={multiple}
        />
      </button>

      {toggleQRCode && (
        <>
          <h3 className="p-4 text-xl font-bold text-text-neutral-tertiary">
            {t('common:COMMON.OR')}
          </h3>

          <button
            type="button"
            onClick={toggleQRCode}
            className="group flex h-full flex-1 flex-col items-center justify-center rounded-r-lg p-lv-7 tablet:pr-6"
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
              <p className="text-sm font-semibold text-drag-n-drop-text-primary group-disabled:text-drag-n-drop-text-disable tablet:text-base">
                {t('certificate:UPLOAD.USE_YOUR_PHONE_AS')}
                <span className="cursor-pointer text-link-text-primary group-disabled:cursor-not-allowed group-disabled:text-drag-n-drop-text-disable">
                  {t('certificate:UPLOAD.SCANNER')}
                </span>
              </p>
            </div>
            <p className="text-center text-xs text-drag-n-drop-text-note group-disabled:text-drag-n-drop-text-disable tablet:text-sm">
              {t('certificate:UPLOAD.SCAN_THE_QRCODE')}
            </p>
          </button>
        </>
      )}
    </div>
  );
};

export default UploadArea;
