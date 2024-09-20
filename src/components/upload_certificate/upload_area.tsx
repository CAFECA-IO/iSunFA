import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';

const UploadArea = () => {
  const { t } = useTranslation(['common', 'journal']);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      setIsDragOver(false);
    }
  };

  return (
    <div className="my-20px flex flex-col items-center gap-40px md:flex-row">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`h-200px flex-1 rounded-lg bg-drag-n-drop-surface-primary md:h-240px`}
      >
        <label
          htmlFor="certificate-upload"
          className={`flex h-full w-full-available flex-col rounded-lg border border-dashed hover:cursor-pointer ${
            isDragOver
              ? 'border-drag-n-drop-stroke-focus bg-drag-n-drop-surface-hover'
              : 'border-drag-n-drop-stroke-primary bg-drag-n-drop-surface-primary'
          } items-center justify-center p-24px hover:border-drag-n-drop-stroke-focus hover:bg-drag-n-drop-surface-hover md:p-48px`}
        >
          <Image src="/icons/upload_file.svg" width={55} height={60} alt="upload_file" />
          <p className="mt-20px font-semibold text-drag-n-drop-text-primary">
            {t('common:UPLOAD_AREA.DROP_YOUR_FILES_HERE_OR')}{' '}
            <span className="text-link-text-primary">{t('common:UPLOAD_AREA.BROWSE')}</span>
          </p>
          <p className="text-center text-drag-n-drop-text-note">
            {t('common:UPLOAD_AREA.MAXIMUM_SIZE')}
          </p>

          <input
            id="certificate-upload"
            name="certificate-upload"
            accept="application/pdf, image/jpeg, image/png"
            type="file"
            className="hidden"
            onChange={() => {}}
          />
        </label>
      </div>
      <h3 className="text-xl font-bold text-text-neutral-tertiary">{t('common:COMMON.OR')}</h3>
      <div className="h-200px w-300px rounded-lg bg-drag-n-drop-surface-primary md:h-240px md:w-auto md:flex-1">
        <button
          type="button"
          onClick={() => {}}
          className="group flex h-full w-full flex-col items-center justify-center rounded-lg border border-dashed p-24px hover:border-drag-n-drop-stroke-focus hover:bg-drag-n-drop-surface-hover disabled:border-drag-n-drop-stroke-disable disabled:bg-drag-n-drop-surface-disable md:p-48px"
        >
          <Image
            src="/icons/scan_qrcode.svg"
            width={55}
            height={60}
            alt="scan_qr_code"
            className="group-disabled:grayscale"
          />
          <div className="mt-20px flex items-center gap-10px">
            <Image
              src="/icons/scan.svg"
              width={20}
              height={20}
              alt="scan"
              className="group-disabled:grayscale"
            />
            <p className="font-semibold text-drag-n-drop-text-primary group-disabled:text-drag-n-drop-text-disable">
              {t('journal:JOURNAL.USE_YOUR_PHONE_AS')}{' '}
              <span className="text-text-brand-primary-lv2 group-disabled:text-drag-n-drop-text-disable">
                {t('journal:JOURNAL.SCANNER')}
              </span>
            </p>
          </div>
          <p className="text-center text-drag-n-drop-text-note group-disabled:text-drag-n-drop-text-disable">
            {t('journal:JOURNAL.SCAN_THE_QRCODE')}
          </p>
        </button>
      </div>
    </div>
  );
};

export default UploadArea;
