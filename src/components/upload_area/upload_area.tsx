import React, { useState, useCallback } from 'react';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import { useUserCtx } from '@/contexts/user_context';
import { useGlobalCtx } from '@/contexts/global_context';
import { MessageType } from '@/interfaces/message_modal';
import { IAPIInput } from '@/interfaces/api_connection';
import { IUploadProgress } from '@/interfaces/upload_progress';
import { ProgressStatus } from '@/constants/account';
import { KYCDocumentType } from '@/interfaces/kyc_document_type';

const MAX_SIZE_IN_BYTES = 50 * 1024 * 1024; // 50MB in bytes

const UploadArea = ({
  type,
  uploadFile,
  uploadHandler,
  onUpload,
}: {
  type: KYCDocumentType;
  uploadFile: File | null;
  uploadHandler: (file: File, type: KYCDocumentType) => void;
  onUpload: (
    input?: IAPIInput,
    signal?: AbortSignal
  ) => Promise<{
    success: boolean;
    data: IUploadProgress | null;
    code: string;
    error: Error | null;
  }>;
}) => {
  const { t } = useTranslation('common');
  const { selectedCompany } = useUserCtx();
  const { messageModalDataHandler, messageModalVisibilityHandler } = useGlobalCtx();
  const [isDragOver, setIsDragOver] = useState<boolean>(false); // Info: (20240717 - Tzuhan) 拖曳的樣式
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isError, setIsError] = useState<boolean>(false);

  const handleUploadFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_SIZE_IN_BYTES) {
        messageModalDataHandler({
          title: 'Upload File Failed',
          content: `File size exceeds the limit: ${MAX_SIZE_IN_BYTES} bytes`,
          messageType: MessageType.ERROR,
          submitBtnStr: 'Close',
          submitBtnFunction: () => messageModalVisibilityHandler(),
        });
        messageModalVisibilityHandler();
        return;
      }

      uploadHandler(file, type);

      const reader = new FileReader();
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setUploadProgress(progress);
        }
      };

      reader.onloadend = async () => {
        if (reader.readyState === FileReader.DONE) {
          const formData = new FormData();
          formData.append('file', file);

          const { data, success, code } = await onUpload({
            params: { companyId: selectedCompany!.id },
            body: formData,
          });

          if (success && data) {
            if (
              data.status === ProgressStatus.ALREADY_UPLOAD ||
              data.status === ProgressStatus.SUCCESS ||
              data.status === ProgressStatus.PAUSED ||
              data.status === ProgressStatus.IN_PROGRESS
            ) {
              messageModalDataHandler({
                title: 'Upload Successful',
                content: data.status,
                messageType: MessageType.SUCCESS,
                submitBtnStr: 'Done',
                submitBtnFunction: () => {
                  messageModalVisibilityHandler();
                },
              });
              messageModalVisibilityHandler();
            } else {
              setIsError(true);
              messageModalDataHandler({
                title: 'Upload File Failed',
                content: `Upload File Failed(${code}): ${data?.status ?? 'Unknown error'}`,
                messageType: MessageType.ERROR,
                submitBtnStr: 'Close',
                submitBtnFunction: () => messageModalVisibilityHandler(),
              });
              messageModalVisibilityHandler();
            }
          } else if (success === false && data) {
            setIsError(true);
            messageModalDataHandler({
              title: 'Upload File Failed',
              content: `Upload File Failed(${code}): ${data.status}`,
              messageType: MessageType.ERROR,
              submitBtnStr: 'Close',
              submitBtnFunction: () => messageModalVisibilityHandler(),
            });
            messageModalVisibilityHandler();
          }
        }

        reader.onerror = () => {
          setIsError(true);
          messageModalDataHandler({
            title: 'Upload File Failed',
            content: 'File read failed',
            messageType: MessageType.ERROR,
            submitBtnStr: 'Close',
            submitBtnFunction: () => messageModalVisibilityHandler(),
          });
          messageModalVisibilityHandler();
        };

        reader.readAsArrayBuffer(file);
      };
    },
    [onUpload, selectedCompany]
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      handleUploadFile(file);
    }
  };

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
      handleUploadFile(droppedFile);
      setIsDragOver(false);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`h-200px w-300px rounded-lg bg-white md:h-240px md:w-auto md:flex-1`}
    >
      <label
        htmlFor="journal-upload-area"
        className={`flex h-full w-full flex-col rounded-lg border border-dashed hover:cursor-pointer ${
          isDragOver
            ? 'border-drag-n-drop-stroke-focus bg-drag-n-drop-surface-hover'
            : 'border-drag-n-drop-stroke-primary bg-drag-n-drop-surface-primary'
        } items-center justify-center p-24px hover:border-drag-n-drop-stroke-focus hover:bg-drag-n-drop-surface-hover md:p-48px`}
      >
        {uploadFile ? (
          <>
            <div>{uploadFile.name}</div>
            <div className="inline-flex w-full items-center gap-16px">
              <p className="text-slider-surface-bar">{t('JOURNAL.AI_TECHNOLOGY_RECOGNIZING')}</p>
              <div className="relative h-5px flex-1 rounded-full bg-progress-bar-surface-base">
                <div
                  className={`absolute left-0 top-0 h-5px rounded-full transition-all duration-300 ${
                    isError
                      ? 'bg-file-uploading-text-error'
                      : 'bg-progress-bar-surface-bar-secondary'
                  }`}
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs font-medium leading-tight tracking-tight text-progress-bar-text-indicator">
                {uploadProgress === 100 ? 'Completed' : `${uploadProgress}%`}
              </p>
            </div>
          </>
        ) : (
          <>
            <Image src="/icons/upload_file.svg" width={55} height={60} alt="upload_file" />
            <p className="mt-20px font-semibold text-navyBlue2">
              {t('UPLOAD_AREA.DROP_YOUR_FILES_HERE_OR')}{' '}
              <span className="text-darkBlue">{t('UPLOAD_AREA.BROWSE')}</span>
            </p>
            <p className="text-center text-lightGray4">{t('UPLOAD_AREA.MAXIMUM_SIZE')}</p>

            <input
              id="journal-upload-area"
              name="journal-upload-area"
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />
          </>
        )}
      </label>
    </div>
  );
};

export default UploadArea;
