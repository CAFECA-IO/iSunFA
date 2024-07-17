import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import { useUserCtx } from '@/contexts/user_context';
import { useGlobalCtx } from '@/contexts/global_context';
import { ProgressStatus } from '@/constants/account';
import { MessageType } from '@/interfaces/message_modal';
import { IAPIInput } from '@/interfaces/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { IUploadProgress } from '@/interfaces/upload_progress';

const MAX_SIZE_IN_BYTES = 50 * 1024 * 1024; // Info: (20240717 - Tzuhan) 50MB in bytes

const UploadArea = ({
  uploadFile,
  uploadHandler,
  onUpload,
}: {
  uploadFile: File | null;
  uploadHandler: (file: File) => void;
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
  const [fileId, setFileId] = useState<string | undefined>(undefined);
  const [isDragOver, setIsDragOver] = useState<boolean>(false); // Info: (20240717 - Tzuhan) 拖曳的樣式
  const {
    trigger: getUploadProgress,
    data: uploadProgress,
    success: uploadProgressSuccess,
    code: uploadProgressCode,
  } = APIHandler<IUploadProgress>(APIName.FILE_UPLOAD_PROGRESS, {}, false, false);
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

      uploadHandler(file);

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
          setFileId(data.fileId);
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
          // Info: (20240717 - Tzuhan) 顯示上傳失敗的錯誤訊息
          messageModalDataHandler({
            title: 'Upload File Failed',
            content: `Upload File Failed(${code}): ${data.status}`,
            messageType: MessageType.ERROR,
            submitBtnStr: 'Close',
            submitBtnFunction: () => messageModalVisibilityHandler(),
          });
          messageModalVisibilityHandler();
        }
      } else if (success === false) {
        messageModalDataHandler({
          title: 'Upload File Failed',
          content: `Upload File Failed(${code})`,
          messageType: MessageType.ERROR,
          submitBtnStr: 'Close',
          submitBtnFunction: () => messageModalVisibilityHandler(),
        });
        messageModalVisibilityHandler();
      }
    },
    [onUpload, selectedCompany]
  );

  // Info: (20240717 - Tzuhan) 處理上傳檔案
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      handleUploadFile(file);
    }
  };
  // Info: (20240717 - Tzuhan) 處理拖曳上傳檔案
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (fileId) return;
    event.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0]; // Info: 如果有多個檔案，只取第一個檔案 (20240717 - Tzuhan)
    if (droppedFile) {
      handleUploadFile(droppedFile);
      setIsDragOver(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (
      selectedCompany &&
      fileId &&
      (!uploadProgress || uploadProgress.status === ProgressStatus.IN_PROGRESS) &&
      (uploadProgressSuccess === undefined || uploadProgressSuccess)
    ) {
      interval = setInterval(() => {
        getUploadProgress({
          params: {
            companyId: selectedCompany.id,
            fileId,
          },
        });
      }, 2000);
    }
    if (
      uploadProgressSuccess === false ||
      (uploadProgress &&
        ![
          ProgressStatus.SUCCESS,
          ProgressStatus.PAUSED,
          ProgressStatus.IN_PROGRESS,
          ProgressStatus.ALREADY_UPLOAD,
        ].includes(uploadProgress.status))
    ) {
      setIsError(true);
    }
    return () => clearInterval(interval);
  }, [selectedCompany, fileId, uploadProgress, uploadProgressSuccess, uploadProgressCode]);

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
                  className={`absolute left-0 top-0 h-5px rounded-full transition-all duration-300 ${isError ? 'bg-file-uploading-text-error' : 'bg-progress-bar-surface-bar-secondary'}`}
                  style={{ width: `${uploadProgress?.progress ?? 0}%` }}
                />
              </div>
              <p className="text-xs font-medium leading-tight tracking-tight text-progress-bar-text-indicator">
                {uploadProgress?.progress === 100
                  ? 'Completed'
                  : `${uploadProgress?.progress ?? 0}%`}
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
              // accept="image/*, .txt, .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx" // Info: (20240717 - Tzuhan) 不設限檔案類型
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
