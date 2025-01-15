import { ProgressStatus } from '@/constants/account';
import { sizeFormatter } from '@/constants/kyc';
import Image from 'next/image';
import React, { useState } from 'react';
import { FiPauseCircle, FiPlay, FiTrash2 } from 'react-icons/fi';
import { Button } from '@/components/button/button';
import { useTranslation } from 'next-i18next';
import { IFileUIBeta } from '@/interfaces/file';

interface UploadFileItemProps {
  file: IFileUIBeta;
  onPauseToggle: () => void;
  onDelete: () => void;
  withoutImage?: boolean;
  withoutBorder?: boolean;
}

const UploadFileItem: React.FC<UploadFileItemProps> = ({
  file,
  onPauseToggle,
  onDelete,
  withoutImage,
  withoutBorder,
}) => {
  const { t } = useTranslation(['common', 'journal']);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const displayedPauseButton =
    file.status === ProgressStatus.PAUSED ? <FiPlay size={20} /> : <FiPauseCircle size={20} />;

  const displayedStatus =
    file.status === ProgressStatus.FAILED ? (
      <div className="flex items-center gap-4 px-2 py-1">
        <Image src="/icons/refresh-ccw-01.svg" width={20} height={20} alt="refresh" />
        <Image src="/icons/red_warning.svg" width={20} height={20} alt="error_icon" />
      </div>
    ) : file.progress === 100 ? (
      <div className="flex items-center px-2 py-1">
        <Image src="/icons/success_icon.svg" width={20} height={20} alt="success_icon" />
      </div>
    ) : (
      <Button
        type="button"
        variant={'tertiaryBorderless'}
        size={'extraSmall'}
        onClick={onPauseToggle}
      >
        {displayedPauseButton}
      </Button>
    );
  const displayedProgress =
    file.progress === 100 ? t('common:COMMON.COMPLETED') : `${file.progress}%`;

  return (
    <div
      className={`mb-2 flex items-start justify-between rounded-md ${withoutBorder ? '' : 'border'} p-2 ${file.status === ProgressStatus.FAILED ? 'border-stroke-state-error' : 'border-file-uploading-stroke-outline'}`}
    >
      <div className="flex grow flex-col">
        <div className="mb-3 flex grow">
          <div className={`flex grow`}>
            <Image
              className="mx-1 my-2"
              src="/elements/cloud_upload.svg"
              width={24}
              height={24}
              alt="clock"
            />
            {!withoutImage && (
              <Image
                className="mx-1 my-2"
                src="/elements/file_pdf.svg"
                width={32}
                height={32}
                alt="clock"
              />
            )}
            <div className="flex grow flex-col">
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-text-neutral-mute"> {sizeFormatter(file.size)}</p>
              {file.status === ProgressStatus.FAILED && file.error && (
                <p className="text-xs text-text-state-error">{file.error}</p>
              )}
            </div>
          </div>
          {displayedStatus}
          {file.status !== ProgressStatus.SUCCESS && (
            <Button
              variant={'tertiaryBorderless'}
              size={'extraSmall'}
              disabled={isDeleting}
              type="button"
              onClick={() => {
                onDelete();
                setIsDeleting(true);
              }}
            >
              <FiTrash2 size={20} />
            </Button>
          )}
        </div>
        <div className="inline-flex w-full items-center gap-16px">
          <div className="relative h-5px flex-1 rounded-full bg-progress-bar-surface-base">
            <div
              className={`absolute left-0 top-0 h-5px rounded-full transition-all duration-300 ${file.status === ProgressStatus.SYSTEM_ERROR ? 'bg-file-uploading-text-error' : 'bg-progress-bar-surface-bar-secondary'}`}
              style={{ width: `${file.progress}%` }}
            />
          </div>
          <p className="text-xs font-medium leading-tight tracking-tight text-progress-bar-text-indicator">
            {displayedProgress}
          </p>
        </div>
      </div>
      <div className="absolute right-0 z-10 flex items-center gap-10px text-icon-surface-single-color-primary"></div>
    </div>
  );
};

export default UploadFileItem;
