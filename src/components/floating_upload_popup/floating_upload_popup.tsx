import React, { useState } from 'react';
import UploadFileItem from '@/components/upload_certificate/upload_file_item';
import { ProgressStatus } from '@/constants/account';
import Image from 'next/image';
import { ICertificateInfo } from '@/interfaces/certificate';

interface FloatingUploadPopupProps {
  uploadingCertificates: ICertificateInfo[];
}

const FloatingUploadPopup: React.FC<FloatingUploadPopupProps> = ({ uploadingCertificates }) => {
  const [files, setFiles] = useState<ICertificateInfo[]>(uploadingCertificates);
  // const [files, setFiles] = useState<UploadFile[]>([
  //   { name: 'preline-ui.xls', size: 7, progress: 20, status: ProgressStatus.IN_PROGRESS },
  //   { name: 'preline-ui.xls', size: 7, progress: 50, status: ProgressStatus.IN_PROGRESS },
  //   { name: 'preline-ui.xls', size: 7, progress: 80, status: ProgressStatus.IN_PROGRESS },
  // ]);
  const [expanded, setExpanded] = useState(false); // Info: (20240919 - tzuhan) 控制展開/收縮狀態

  // Info: (20240919 - tzuhan) 計算總上傳進度和狀態
  const totalFiles = files.length;
  const completedFiles = files.filter((file) => file.progress === 100).length;
  const isUploading = files.some(
    (file) => file.progress > 0 && file.progress < 100 && file.status !== ProgressStatus.PAUSED
  );

  // Info: (20240919 - tzuhan) 暫停或繼續上傳
  const updateFileStatus = (prevFiles: ICertificateInfo[], index: number) =>
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

  // Info: (20240919 - tzuhan) 暫停或繼續上傳
  const togglePause = (index: number) => {
    setFiles((prevFiles) => updateFileStatus(prevFiles, index));
  };

  // Info: (20240919 - tzuhan) 刪除上傳文件
  const deleteFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  return (
    <div className="dashboardCardShadow fixed bottom-4 right-4 w-480px overflow-hidden">
      {/* Info: (20240919 - tzuhan) Header: 顯示標題與收縮/展開按鈕 */}
      <div className="flex items-center justify-between p-4">
        <div className="flex-auto flex-col items-center text-center">
          <div className="flex items-center justify-center space-x-2 text-lg font-semibold">
            <Image src="/elements/cloud_upload.svg" width={24} height={24} alt="clock" />
            <div>Upload file</div>
          </div>
          {totalFiles > 0 && (
            <div className="pb-4 pt-2">
              <p className="text-sm text-file-uploading-text-disable">
                {isUploading
                  ? `Uploading (${totalFiles - completedFiles}/${totalFiles})...`
                  : `Completed (${completedFiles}/${totalFiles})`}
              </p>
            </div>
          )}
        </div>
        <button
          type="button"
          className={`${expanded ? '' : 'rotate-180'}`}
          onClick={() => setExpanded(!expanded)}
        >
          <Image src="/elements/arrow_down.svg" alt="arrow_down" width={20} height={20} />
        </button>
      </div>

      {/* Info: (20240919 - tzuhan) 當 expanded 為 true 時顯示上傳文件列表 */}
      {expanded && (
        <div className="max-h-96 overflow-auto p-4">
          {files.length > 0 ? (
            files.map((file, index) => (
              <UploadFileItem
                key={`uploading-${index + 1}`}
                file={file}
                onPauseToggle={() => togglePause(index)}
                onDelete={() => deleteFile(index)}
              />
            ))
          ) : (
            <div className="text-center text-gray-500">No files uploading</div>
          )}
        </div>
      )}
    </div>
  );
};

export default FloatingUploadPopup;
