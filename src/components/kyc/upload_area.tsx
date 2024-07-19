import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import { useGlobalCtx } from '@/contexts/global_context';
import { MessageType } from '@/interfaces/message_modal';
import { ProgressStatus } from '@/constants/account';
import { FiPauseCircle, FiPlay, FiTrash2 } from 'react-icons/fi';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import { IAccountResultStatus } from '@/interfaces/accounting_account';
import { UploadDocumentKeys } from '@/constants/kyc';

const MAX_SIZE_IN_BYTES = 50 * 1024 * 1024; // 50MB in bytes

const sizeFormatter = (size: number): string => {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  } else if (size >= 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  } else {
    return `${size} Bytes`;
  }
};

const UploadArea = ({
  type,
  uploadFile,
  uploadHandler,
}: {
  type: UploadDocumentKeys;
  uploadFile: File | null;
  uploadHandler: (file: File | null, status: ProgressStatus | null, fileId: string | null) => void;
}) => {
  const { t } = useTranslation('common');
  const { selectedCompany } = useUserCtx();
  const { messageModalDataHandler, messageModalVisibilityHandler } = useGlobalCtx();
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isError, setIsError] = useState<boolean>(false);
  const [status, setStatus] = useState<ProgressStatus>(ProgressStatus.IN_PROGRESS);
  const readerRef = useRef<FileReader | null>(null);
  const { trigger: uploadFileAPI } = APIHandler<IAccountResultStatus>(
    APIName.FILE_UPLOAD,
    {},
    false,
    false
  );
  const { trigger: deleteFileAPI } = APIHandler<void>(APIName.FILE_DELETE, {}, false, false);
  const [fileId, setFileId] = useState<string | null>(null);

  const handleError = useCallback(
    (code: string | undefined) => {
      setIsError(true);
      messageModalDataHandler({
        title: 'Upload File Failed',
        content: `File read failed${code ? ` , error code: ${code}` : ''}`,
        messageType: MessageType.ERROR,
        submitBtnStr: 'Close',
        submitBtnFunction: () => messageModalVisibilityHandler(),
      });
      messageModalVisibilityHandler();
    },
    [messageModalDataHandler, messageModalVisibilityHandler]
  );

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

      uploadHandler(file, ProgressStatus.IN_PROGRESS, null);

      const reader = new FileReader();
      readerRef.current = reader;

      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setUploadProgress(progress);
        }
      };

      reader.onloadend = async () => {
        if (reader.readyState === FileReader.DONE) {
          setUploadProgress(100);
          // uploadHandler(file, ProgressStatus.SUCCESS);
          const formData = new FormData();
          formData.append('file', file);
          const { success, code, data } = await uploadFileAPI({
            params: {
              companyId: selectedCompany?.id,
            },
            query: {
              type,
            },
            body: formData,
          });
          if (success === false) {
            handleError(code);
            uploadHandler(file, ProgressStatus.SYSTEM_ERROR, null);
          }
          if (success && data) {
            setFileId(data.resultId);
            uploadHandler(file, ProgressStatus.SUCCESS, data.resultId);
          }
        }

        reader.onerror = () => {
          handleError(undefined);
        };
      };

      reader.readAsArrayBuffer(file);
    },
    [uploadHandler, messageModalDataHandler, messageModalVisibilityHandler]
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (uploadFile) return;
    event.preventDefault();
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      handleUploadFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (uploadFile) return;
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (uploadFile) return;
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      handleUploadFile(droppedFile);
      setIsDragOver(false);
    }
  };

  const pauseClickHandler = () => {
    if (uploadProgress === 100) return;
    const reader = readerRef.current;
    if (reader) {
      if (status === ProgressStatus.IN_PROGRESS) {
        reader.abort();
        setStatus(ProgressStatus.PAUSED);
      } else {
        handleUploadFile(uploadFile!);
        setStatus(ProgressStatus.IN_PROGRESS);
      }
    }
  };

  const deleteClickHandler = async () => {
    if (readerRef.current) {
      readerRef.current.abort();
    }
    if (fileId) {
      await deleteFileAPI({
        params: {
          companyId: selectedCompany?.id,
          fileId,
        },
      });
    }
    setUploadProgress(0);
    setStatus(ProgressStatus.IN_PROGRESS);
    uploadHandler(null, null, null);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`h-200px w-300px rounded-lg bg-white md:h-240px md:w-auto md:flex-1`}
    >
      {uploadFile ? (
        <div className="flex h-full w-full flex-col items-center justify-center rounded-lg border border-dashed p-24px md:p-48px">
          <div className="inline-flex w-full items-center gap-16px">
            <Image src="/icons/upload_cloud.svg" width={24} height={24} alt="error_icon" />
            <div className="flex flex-col items-start gap-5px">
              <div>
                {uploadFile.name}
                <p className="text-xs font-normal leading-tight tracking-tight text-file-uploading-text-disable">
                  {sizeFormatter(uploadFile.size)}
                </p>
              </div>
            </div>
          </div>
          <div className="mb-4 flex w-full items-center gap-16px">
            <div className="relative h-5px flex-1 rounded-full bg-progress-bar-surface-base">
              <div
                className={`absolute left-0 top-0 h-5px rounded-full transition-all duration-300 ${
                  isError ? 'bg-file-uploading-text-error' : 'bg-progress-bar-surface-bar-secondary'
                }`}
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs font-medium leading-tight tracking-tight text-progress-bar-text-indicator">
              {`${uploadProgress}%`}
            </p>
          </div>

          {/* Tool Buttons */}
          <div className="z-10 flex items-center gap-10px text-icon-surface-single-color-primary">
            {isError ? (
              <Image src="/icons/red_warning.svg" width={20} height={20} alt="error_icon" />
            ) : uploadProgress === 100 ? (
              <Image src="/icons/success_icon.svg" width={20} height={20} alt="success_icon" />
            ) : (
              <button type="button" onClick={pauseClickHandler}>
                {status === ProgressStatus.PAUSED ? (
                  <FiPlay size={20} />
                ) : (
                  <FiPauseCircle size={20} />
                )}
              </button>
            )}
            <button type="button" onClick={deleteClickHandler}>
              <FiTrash2 size={20} />
            </button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={type}
          className={`flex h-full w-full flex-col rounded-lg border border-dashed hover:cursor-pointer ${
            isDragOver
              ? 'border-drag-n-drop-stroke-focus bg-drag-n-drop-surface-hover'
              : 'border-drag-n-drop-stroke-primary bg-drag-n-drop-surface-primary'
          } items-center justify-center p-24px hover:border-drag-n-drop-stroke-focus hover:bg-drag-n-drop-surface-hover md:p-48px`}
        >
          <Image src="/icons/upload_file.svg" width={55} height={60} alt="upload_file" />
          <p className="mt-20px font-semibold text-navyBlue2">
            {t('UPLOAD_AREA.DROP_YOUR_FILES_HERE_OR')}{' '}
            <span className="text-darkBlue">{t('UPLOAD_AREA.BROWSE')}</span>
          </p>
          <p className="text-center text-lightGray4">{t('UPLOAD_AREA.MAXIMUM_SIZE')}</p>

          <input
            id={type}
            name={type}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploadFile !== null}
          />
        </label>
      )}
    </div>
  );
};

export default UploadArea;
