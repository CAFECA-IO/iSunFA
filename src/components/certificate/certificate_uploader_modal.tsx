import React, { useEffect, useState } from 'react';
import { Button } from '@/components/button/button';
import { useTranslation } from 'next-i18next';
import { RxCross1 } from 'react-icons/rx';
import { ProgressStatus } from '@/constants/account';
import UploadFileItem from '@/components/upload_certificate/upload_file_item';
import { GoArrowLeft } from 'react-icons/go';
import CircularProgressBar from '@/components/certificate/circular_progress_bar';
import CertificateFileUpload from '@/components/certificate/certificate_file_upload';
import { IFileUIBeta } from '@/interfaces/file';

interface CertificateUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
}

const CertificateUploaderModal: React.FC<CertificateUploaderModalProps> = ({
  isOpen,
  onClose,
  onBack,
}) => {
  const { t } = useTranslation(['certificate', 'common']);
  const [files, setFiles] = useState<IFileUIBeta[]>([]);
  const [progress, setProgress] = useState<number>(0);

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

  // Info: (20241213 - tzuhan) 工具函數：確認操作
  const onConfirm = () => {
    setFiles([]);
    setProgress(0);
    onBack();
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

  const inProgressFiles = files.filter(
    (file) => file.progress < 100 && file.status === ProgressStatus.IN_PROGRESS
  );
  const failedFiles = files.filter((file) => file.status === ProgressStatus.FAILED);

  // Info: (20241213 - tzuhan) 渲染文件列表
  const renderFileList = () => {
    if (inProgressFiles.length === 0) {
      return <div className="text-center text-gray-500">{t('certificate:UPLOAD.NO_FILE')}</div>;
    }
    return inProgressFiles.map((file, index) => (
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
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/0">
      <div className="relative ml-250px flex max-h-450px w-90vw max-w-800px flex-col gap-2 rounded-sm bg-surface-neutral-surface-lv2 p-20px md:max-h-90vh">
        {/* Info: (20241213 - tzuhan) 關閉按鈕 */}
        <button
          type="button"
          className="absolute right-4 top-4 text-checkbox-text-primary"
          onClick={onClose}
        >
          <RxCross1 size={28} />
        </button>
        {/* Info: (20241213 - tzuhan) 返回按鈕 */}
        <button
          type="button"
          className="absolute left-4 top-4 text-checkbox-text-primary"
          onClick={onBack}
        >
          <GoArrowLeft size={28} />
        </button>
        {/* Info: (20241213 - tzuhan) 標題與內容 */}
        <h2 className="flex justify-center text-xl font-semibold">
          {t('certificate:UPLOAD.TITLE')}
        </h2>
        <p className="flex justify-center text-card-text-secondary">
          {t('certificate:UPLOAD.CONTENT')}
        </p>
        {/* Info: (20241213 - tzuhan) 上傳組件 */}
        <CertificateFileUpload isDisabled={false} setFiles={setFiles} showErrorMessage />
        {/* Info: (20241213 - tzuhan) 文件列表 */}
        <div className="h-60 rounded-t-lg border border-file-uploading-stroke-outline p-4">
          <div className="h-full overflow-auto">{renderFileList()}</div>
        </div>
        {/* Info: (20241213 - tzuhan) 進度條 */}
        <div className="-mt-2 mb-4 h-60px rounded-b-lg border-b border-l border-r border-file-uploading-stroke-outline px-4 py-2">
          <CircularProgressBar
            size={40}
            progress={progress}
            strokeWidth={2}
            remainingText={
              progress < 100
                ? t('certificate:UPLOAD.REMAIN', {
                    count: inProgressFiles.length,
                  })
                : t('certificate:UPLOAD.COMPLETE', {
                    success: files.length - failedFiles.length,
                    failed: failedFiles.length,
                  })
            }
          />
        </div>
        {/* Info: (20241213 - tzuhan) 按鈕區域 */}
        <div className="flex items-center justify-end gap-2">
          <Button
            id="cancel-button"
            type="button"
            variant="secondaryOutline"
            className="gap-x-4px px-4 py-2"
            onClick={onClose}
          >
            {t('common:COMMON.CANCEL')}
          </Button>
          <Button
            id="confirm-button"
            type="button"
            variant="tertiary"
            className="gap-x-4px px-4 py-2"
            onClick={onConfirm}
            disabled={inProgressFiles.length > 0}
          >
            {t('common:COMMON.CONFIRM')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CertificateUploaderModal;
