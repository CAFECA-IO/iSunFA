import React, { useState } from 'react';

import { Button } from '@/components/button/button';
import { RxCross1 } from 'react-icons/rx';
import { ProgressStatus } from '@/constants/account';
import UploadFileItem from '@/components/upload_certificate/upload_file_item';
import { GoArrowLeft } from 'react-icons/go';
import CircularProgressBar from '@/components/certificate/circular_progress_bar';
import InvoiceUpload from '@/components/invoice_upload.tsx/invoice_upload';
import { IFileUIBeta } from '@/interfaces/file';

interface CertificateUploaderModalProps {
  isOpen: boolean;
  onClose: () => void; // Info: (20240924 - tzuhan) 關閉模態框的回調函數
  onBack: () => void; // Info: (20240926 - tzuhan) 返回上一步的回調函數
}

const CertificateUploaderModal: React.FC<CertificateUploaderModalProps> = ({
  isOpen,
  onClose,
  onBack,
}) => {
  const [files, setFiles] = useState<IFileUIBeta[]>([]);

  const updateFileStatus = (prevFiles: IFileUIBeta[], index: number) =>
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
    });

  const togglePause = (index: number) => {
    setFiles((prevFiles) => updateFileStatus(prevFiles, index));
  };

  // Info: (20240919 - tzuhan) 刪除上傳文件
  const deleteFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  // Info: (20240924 - tzuhan) 不顯示模態框時返回 null
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/0">
      <div className="relative flex max-h-450px w-90vw max-w-800px flex-col rounded-sm bg-surface-neutral-surface-lv2 p-20px md:max-h-90vh">
        {/* Info: (20240924 - tzuhan) 關閉按鈕 */}
        <button
          type="button"
          className="absolute right-4 top-4 text-checkbox-text-primary"
          onClick={onClose}
        >
          <RxCross1 size={28} />
        </button>
        <button
          type="button"
          className="absolute left-4 top-4 text-checkbox-text-primary"
          onClick={onBack}
        >
          <GoArrowLeft size={28} />
        </button>
        {/* Info: (20240924 - tzuhan) 模態框標題 */}
        <h2 className="flex justify-center text-xl font-semibold">Upload Certificates</h2>
        <p className="flex justify-center text-card-text-secondary">
          Upload the certificates you want to attach with the voucher
        </p>
        <InvoiceUpload withScanner isDisabled={false} setFiles={setFiles} showErrorMessage />
        <div className="h-60 rounded-t-lg border border-file-uploading-stroke-outline p-4">
          <div className="h-full overflow-auto">
            {files.length > 0 ? (
              files.map((file, index) => (
                <UploadFileItem
                  key={`uploading-${index + 1}`}
                  file={file}
                  onPauseToggle={() => togglePause(index)}
                  onDelete={() => deleteFile(index)}
                  withoutImage
                  withoutBorder
                />
              ))
            ) : (
              <div className="text-center text-gray-500">No files uploading</div>
            )}
          </div>
        </div>
        <div className="mb-4 h-60px rounded-b-lg border-b border-l border-r border-file-uploading-stroke-outline px-4 py-2">
          <CircularProgressBar
            size={40} // Info: (20240926 - tzuhan) 圓的直徑
            progress={55} // Info: (20240926 - tzuhan) 進度百分比
            strokeWidth={2} // Info: (20240926 - tzuhan) 線條寬度
            remainingText="2 left" // Info: (20240926 - tzuhan) 顯示的剩餘文字
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button
            id="upload-image-button"
            type="button"
            variant="secondaryOutline"
            className="gap-x-4px px-4 py-2"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            id="upload-image-button"
            type="button"
            variant="tertiary"
            className="gap-x-4px px-4 py-2"
            onClick={() => {}}
            disabled
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CertificateUploaderModal;
