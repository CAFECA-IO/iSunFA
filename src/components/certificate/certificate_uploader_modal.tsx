import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/button/button';
import { useTranslation } from 'next-i18next';
import { RxCross2 } from 'react-icons/rx';
import { ProgressStatus } from '@/constants/account';
import UploadFileItem from '@/components/upload_certificate/upload_file_item';
import { GoArrowLeft } from 'react-icons/go';
import CircularProgressBar from '@/components/certificate/circular_progress_bar';
import CertificateFileUpload from '@/components/certificate/certificate_file_upload';
import { IFileUIBeta } from '@/interfaces/file';
import { useModalContext } from '@/contexts/modal_context';
import { MessageType } from '@/interfaces/message_modal';

interface CertificateUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CertificateUploaderModal: React.FC<CertificateUploaderModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation(['certificate', 'common']);
  const { messageModalDataHandler, messageModalVisibilityHandler } = useModalContext();
  const [files, setFiles] = useState<IFileUIBeta[]>([]);
  const [progress, setProgress] = useState<number>(0);

  const handleUploadCancelled = useCallback(() => {
    setFiles([]);
    setProgress(0);
    onClose();
  }, [setFiles, messageModalVisibilityHandler]);

  const handleConfirm = () => {
    handleUploadCancelled();
    messageModalVisibilityHandler();
  };

  const handleClose = () => {
    if (files.length > 0 && files.some((file) => file.status === ProgressStatus.FAILED)) {
      messageModalDataHandler({
        title: t('certificate:WARNING.UPLOAD_FAILED'),
        content: t('certificate:WARNING.UPLOAD_FAILED_NOTIFY'),
        messageType: MessageType.WARNING,
        submitBtnStr: t('certificate:WARNING.UPLOAD_CANCEL'),
        backBtnStr: t('certificate:WARNING.UPLOAD_CONTINUE'),
        submitBtnFunction: handleConfirm,
      });
      messageModalVisibilityHandler();
    } else {
      handleUploadCancelled();
    }
  };

  // Info: (20241213 - tzuhan) 工具函數：更新文件狀態
  const updateFileStatus = (index: number) => {
    setFiles((prevFiles) =>
      prevFiles.map((file, i) => {
        return i === index
          ? {
              ...file,
              status:
                file.status === ProgressStatus.PAUSED
                  ? ProgressStatus.IN_PROGRESS
                  : ProgressStatus.PAUSED,
            }
          : file;
      })
    );
  };

  // Info: (20241213 - tzuhan) 工具函數：刪除文件
  const deleteFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  // Info: (20241213 - tzuhan) 計算進度條進度
  useEffect(() => {
    const validFiles = files.filter((file) => file.status !== ProgressStatus.FAILED);
    if (validFiles.length > 0) {
      const totalProgress = validFiles.reduce((acc, file) => acc + file.progress, 0);
      setProgress(totalProgress / validFiles.length);
    } else {
      setProgress(0);
    }
  }, [files]);

  if (!isOpen) return null;

  const filterFiles = files.reduce(
    (acc, file) => {
      if (file.progress < 100 && file.status === ProgressStatus.IN_PROGRESS) {
        acc.inProgressFiles.push(file);
      }
      if (file.status === ProgressStatus.FAILED) {
        acc.failedFiles.push(file);
      }
      if (file.status === ProgressStatus.PAUSED) {
        acc.pausedFiles.push(file);
      }
      if (file.progress === 100 && file.status === ProgressStatus.SUCCESS) {
        acc.completedFiles.push(file);
      }
      return acc;
    },
    { inProgressFiles: [], failedFiles: [], pausedFiles: [], completedFiles: [] } as {
      inProgressFiles: IFileUIBeta[];
      failedFiles: IFileUIBeta[];
      pausedFiles: IFileUIBeta[];
      completedFiles: IFileUIBeta[];
    }
  );

  // Info: (20241213 - tzuhan) 渲染文件列表
  const renderFileList = () => {
    if (files.length === 0) {
      return (
        <div className="text-center text-text-neutral-mute">{t('certificate:UPLOAD.NO_FILE')}</div>
      );
    }
    return files.map((file, index) => (
      <UploadFileItem
        key={`uploading-${index + 1}`}
        file={file}
        onPauseToggle={() => updateFileStatus(index)}
        onDelete={() => deleteFile(index)}
        withoutImage
        withoutBorder
      />
    ));
  };

  return (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/0">
      <div className="relative flex max-h-600px w-90vw max-w-800px flex-col gap-2 rounded-sm bg-surface-neutral-surface-lv2 md:max-h-90vh">
        <div className="p-16px">
          {/* Info: (20241213 - tzuhan) 關閉按鈕 */}
          <button
            type="button"
            className="absolute right-4 top-4 text-checkbox-text-primary"
            onClick={handleClose}
          >
            <RxCross2 size={24} />
          </button>
          {/* Info: (20241213 - tzuhan) 返回按鈕 */}
          <button
            type="button"
            className="absolute left-4 top-4 text-checkbox-text-primary"
            onClick={handleClose}
          >
            <GoArrowLeft size={28} />
          </button>
          {/* Info: (20241213 - tzuhan) 標題與內容 */}
          <h2 className="flex justify-center text-xl font-bold text-card-text-primary">
            {t('certificate:UPLOAD.TITLE')}
          </h2>
          <p className="flex justify-center text-xs text-card-text-secondary">
            {t('certificate:UPLOAD.CONTENT')}
          </p>
        </div>
        <div className="flex flex-col gap-12px overflow-y-auto px-lv-4 py-lv-3">
          {/* Info: (20241213 - tzuhan) 上傳組件 */}
          <CertificateFileUpload isDisabled={false} setFiles={setFiles} />
          <div>
            {/* Info: (20241213 - tzuhan) 文件列表 */}
            <div className="h-60 rounded-t-lg border border-file-uploading-stroke-outline p-4">
              <div className="h-full overflow-auto">{renderFileList()}</div>
            </div>
            {/* Info: (20241213 - tzuhan) 進度條 */}
            <div className="h-60px rounded-b-lg border-b border-l border-r border-file-uploading-stroke-outline px-4 py-2">
              <CircularProgressBar
                size={40}
                progress={progress}
                strokeWidth={2}
                remainingText={
                  progress < 100
                    ? t('certificate:UPLOAD.REMAIN', {
                        count: filterFiles.inProgressFiles.length,
                      })
                    : t('certificate:UPLOAD.COMPLETE', {
                        success: filterFiles.completedFiles.length,
                        failed: filterFiles.failedFiles.length,
                      })
                }
              />
            </div>
          </div>
        </div>
        {/* Info: (20241213 - tzuhan) 按鈕區域 */}
        <div className="flex items-center gap-12px px-lv-4 py-16px tablet:justify-end">
          <Button
            id="cancel-button"
            type="button"
            variant="secondaryOutline"
            className="w-full px-4 py-2 tablet:w-auto"
            onClick={handleClose}
          >
            {t('common:COMMON.CANCEL')}
          </Button>
          <Button
            id="confirm-button"
            type="button"
            variant="tertiary"
            className="w-full px-4 py-2 tablet:w-auto"
            onClick={handleClose}
            disabled={filterFiles.completedFiles.length <= 0}
          >
            {t('common:COMMON.CONFIRM')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CertificateUploaderModal;
