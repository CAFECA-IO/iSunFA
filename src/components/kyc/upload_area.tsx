import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import { useModalContext } from '@/contexts/modal_context';
import { MessageType } from '@/interfaces/message_modal';
import { ProgressStatus } from '@/constants/account';
import { FiPauseCircle, FiPlay, FiTrash2 } from 'react-icons/fi';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import {
  KYCFiles,
  MAX_FILE_SIZE_IN_MB,
  MAX_SIZE_IN_BYTES,
  sizeFormatter,
  UploadDocumentKeys,
} from '@/constants/kyc';
import { loadFileFromLocalStorage, deleteFileFromLocalStorage } from '@/lib/utils/common';
import { ToastType } from '@/interfaces/toastify';
import { IFile } from '@/interfaces/file';
import { UploadType } from '@/constants/file';

const UploadArea = ({
  localStorageFilesKey = KYCFiles,
  type,
  onChange,
}: {
  localStorageFilesKey: string;
  type: UploadDocumentKeys;
  onChange: (key: UploadDocumentKeys, id: number | undefined) => void;
}) => {
  const { t } = useTranslation(['common', 'kyc']);
  const { isAuthLoading, connectedAccountBook } = useUserCtx();
  const hasCompanyId = isAuthLoading === false && !!connectedAccountBook?.id;
  const { toastHandler, messageModalDataHandler, messageModalVisibilityHandler } =
    useModalContext();
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isError, setIsError] = useState<boolean>(false);
  const [status, setStatus] = useState<ProgressStatus>(ProgressStatus.IN_PROGRESS);
  const readerRef = useRef<FileReader | null>(null);
  const { trigger: uploadFileAPI } = APIHandler<IFile>(APIName.FILE_UPLOAD);
  const { trigger: deleteFileAPI } = APIHandler<IFile>(APIName.FILE_DELETE);
  const [uploadedFile, setUploadedFile] = useState<File | undefined>(undefined);
  const [uploadedFileId, setUploadedFileId] = useState<number | undefined>(undefined);
  const {
    trigger: getFile,
    data: getData,
    success: getSuccess,
    code: getCode,
  } = APIHandler<IFile>(APIName.FILE_GET);

  const handleError = useCallback(
    (title: string, content: string) => {
      setIsError(true);
      messageModalDataHandler({
        title,
        content,
        messageType: MessageType.ERROR,
        submitBtnStr: t('common:COMMON.CLOSE'),
        submitBtnFunction: () => messageModalVisibilityHandler(),
      });
      messageModalVisibilityHandler();
    },
    [messageModalDataHandler, messageModalVisibilityHandler]
  );

  const updateFileIdInLocalStorage = (fileType: UploadDocumentKeys, fileId: number) => {
    const currentData = JSON.parse(localStorage.getItem(localStorageFilesKey) || '{}');
    const data = currentData;

    if (data[fileType]) {
      data[fileType].id = fileId;
      localStorage.setItem(localStorageFilesKey, JSON.stringify(data));
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!hasCompanyId) return;
    const selectedCompanyIdStr = String(connectedAccountBook?.id);
    const formData = new FormData();
    formData.append('file', file);
    const { success, code, data } = await uploadFileAPI({
      params: {
        companyId: connectedAccountBook?.id,
      },
      query: {
        type: UploadType.KYC,
        targetId: selectedCompanyIdStr,
      },
      body: formData,
    });
    if (success === false) {
      handleError(t('kyc:KYC.UPLOAD_FILE_FAILED'), t('kyc:KYC.FILE_UPLOAD_ERROR', { code }));
      onChange(type, undefined);
      setStatus(ProgressStatus.SYSTEM_ERROR);
    }
    if (success && data) {
      // Info: (20240830 - Murky) To Emily and Jacky To Emily and Jacky, File update down below
      onChange(type, data.id);
      setUploadedFileId(data.id);
      updateFileIdInLocalStorage(type, data.id);
      setStatus(ProgressStatus.SUCCESS);
    }
  };

  const saveFileToLocalStorage = useCallback(
    async (file: File) => {
      if (file.size > MAX_SIZE_IN_BYTES) {
        handleError(
          t('kyc:KYC.UPLOAD_FILE_FAILED'),
          t('kyc:KYC.FILE_SIZE_EXCEEDS_LIMIT', { size: `${MAX_FILE_SIZE_IN_MB}MB` })
        );
        return;
      }

      const currentData = JSON.parse(localStorage.getItem(localStorageFilesKey) || '{}');
      const localStorageData = currentData;
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
          const base64File = reader.result;
          const newData = {
            ...localStorageData,
            [type]: {
              id: undefined,
              name: file.name,
              type: file.type,
              file: base64File,
            },
          };
          localStorage.setItem(localStorageFilesKey, JSON.stringify(newData));
          setUploadedFile(file);

          await handleFileUpload(file);
        }

        reader.onerror = () => {
          handleError(t('kyc:KYC.READ_FILE_FAILED'), t('kyc:KYC.FILE_READ_ERROR'));
          onChange(type, undefined);
        };
      };

      reader.readAsDataURL(file);
    },
    [onChange, messageModalDataHandler, messageModalVisibilityHandler]
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (uploadedFile) return;
    event.preventDefault();
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png']; // Info: (20240801 - tzuhan) 'image/bmp', 'image/tiff' is not supported
      if (validTypes.includes(file.type)) {
        saveFileToLocalStorage(file);
      } else {
        handleError(t('kyc:KYC.UPLOAD_FILE_FAILED'), t('kyc:KYC.ONLY_PDF_JPEG_PNG_SUPPORTED'));
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (uploadedFile) return;
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (uploadedFile) return;
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      saveFileToLocalStorage(droppedFile);
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
      } else if (status === ProgressStatus.PAUSED) {
        saveFileToLocalStorage(uploadedFile!);
        setStatus(ProgressStatus.IN_PROGRESS);
      }
    }
  };

  const deleteClickHandler = async () => {
    if (!hasCompanyId) return;
    if (readerRef.current) {
      readerRef.current.abort();
    }
    let success: boolean = true;
    if (uploadedFileId) {
      const result = await deleteFileAPI({
        params: {
          accountBookId: connectedAccountBook?.id,
          fileId: uploadedFileId,
        },
      });
      success = result.success && result.data?.existed === false;
      if (!success) {
        handleError(
          t('kyc:KYC.DELETE_FILE_FAILED'),
          t('kyc:KYC.FILE_DELETE_ERROR', { code: result.code })
        );
      }
    }
    if (success) {
      setUploadProgress(0);
      setStatus(ProgressStatus.NOT_FOUND);
      onChange(type, undefined);
      deleteFileFromLocalStorage(type, localStorageFilesKey, uploadedFileId);
      setUploadedFile(undefined);
      setUploadedFileId(undefined);
    }
  };

  useEffect(() => {
    if (!hasCompanyId) return;
    try {
      const { id, file } = loadFileFromLocalStorage(type, localStorageFilesKey);
      setUploadedFile(file);
      setUploadedFileId(Number(id));
      setUploadProgress(100);
      if (id && file) {
        getFile({
          params: {
            accountBookId: connectedAccountBook?.id,
            fileId: id,
          },
        });
      } else if (file) {
        handleFileUpload(file);
      }
    } catch (error) {
      (error as Error).message += ' (讀取本地檔案失敗)';
      handleError(t('kyc:KYC.READ_FILE_FAILED'), t('kyc:KYC.FILE_READ_ERROR'));
    }
  }, []);

  useEffect(() => {
    if (getSuccess) {
      if (uploadedFile && ((getData && !getData.existed) || !getData)) {
        handleFileUpload(uploadedFile);
      }
    }
    if (getSuccess === false) {
      toastHandler({
        id: `getFile-${getCode}`,
        content: t('kyc:KYC.FAILED_TO_LIST_UPLOADED_FILES', { getCode }),
        type: ToastType.ERROR,
        closeable: true,
      });
      if (uploadedFile) {
        handleFileUpload(uploadedFile);
      }
    }
  }, [getSuccess, getData, getCode, uploadedFile]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`h-200px w-300px rounded-lg bg-drag-n-drop-surface-primary md:h-240px md:w-full`}
    >
      {uploadedFile ? (
        <div className="flex h-full w-full flex-col items-center justify-center rounded-lg border border-dashed p-24px md:p-48px">
          <div className="inline-flex w-full items-center gap-16px">
            <Image src="/icons/upload_cloud.svg" width={24} height={24} alt="error_icon" />
            <div className="flex flex-col items-start gap-5px">
              <div>
                {/* Info: (20240802 - Julian) 超過 10 個字元時，只顯示前 3 個字元 + ... + 最後 3 個字元（檔名） */}
                <p>
                  {uploadedFile.name.length > 10
                    ? uploadedFile.name.slice(0, 3) + '...' + uploadedFile.name.slice(-3)
                    : uploadedFile.name}
                </p>
                <p className="text-xs font-normal leading-tight tracking-tight text-file-uploading-text-disable">
                  {sizeFormatter(uploadedFile.size)}
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
            id={type}
            name={type}
            accept="application/pdf, image/jpeg, image/png"
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      )}
    </div>
  );
};

export default UploadArea;
