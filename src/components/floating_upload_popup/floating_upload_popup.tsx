import React, { useState } from 'react';
import UploadCertificateItem from '@/components/upload_certificate/upload_file_item';
import Image from 'next/image';
import { useModalContext } from '@/contexts/modal_context';
import { useTranslation } from 'next-i18next';
import { MessageType } from '@/interfaces/message_modal';
import { ToastType } from '@/interfaces/toastify';
import { IFileUIBeta } from '@/interfaces/file';
import { ToastId } from '@/constants/toast_id';

interface FloatingUploadPopupProps {
  files: IFileUIBeta[];
  pauseFileUpload: (file: IFileUIBeta, index: number) => void;
  deleteFile: (file: IFileUIBeta, index: number) => void;
  uploadedFileCount: number;
  isUploading: boolean;
}

const FloatingUploadPopup: React.FC<FloatingUploadPopupProps> = ({
  files,
  pauseFileUpload,
  deleteFile,
  uploadedFileCount,
  isUploading,
}) => {
  const { t } = useTranslation(['common', 'certificate']);
  const { messageModalDataHandler, messageModalVisibilityHandler, toastHandler } =
    useModalContext();
  const [expanded, setExpanded] = useState(false);

  // Info: (20240919 - tzuhan) 暫停或繼續上傳
  const togglePause = (index: number) => {
    messageModalDataHandler({
      title: t('certificate:PAUSE.TITLE'),
      content: t('certificate:PAUSE.CONTENT'),
      notes: `${files[index].name}?`,
      messageType: MessageType.WARNING,
      submitBtnStr: t('certificate:PAUSE.YES'),
      submitBtnFunction: () => {
        pauseFileUpload(files[index], index);
      },
      backBtnStr: t('certificate:PAUSE.NO'),
    });
    messageModalVisibilityHandler();
  };

  // Info: (20240919 - tzuhan) 刪除上傳文件
  const handleDelete = (index: number) => {
    messageModalDataHandler({
      title: t('certificate:DELETE.TITLE'),
      content: t('certificate:DELETE.CONTENT'),
      notes: `${files[index].name}?`,
      messageType: MessageType.WARNING,
      submitBtnStr: t('certificate:DELETE.YES'),
      submitBtnFunction: () => {
        try {
          deleteFile(files[index], index);
          toastHandler({
            id: ToastId.DELETE_CERTIFICATE_SUCCESS,
            type: ToastType.SUCCESS,
            content: t('certificate:DELETE.SUCCESS'),
            closeable: true,
          });
        } catch (error) {
          toastHandler({
            id: ToastId.DELETE_CERTIFICATE_ERROR,
            type: ToastType.ERROR,
            content: t('certificate:ERROR.WENT_WRONG'),
            closeable: true,
          });
        }
      },
      backBtnStr: t('certificate:DELETE.NO'),
    });
    messageModalVisibilityHandler();
  };

  const popUpBody = isUploading ? (
    <div className="dashboardCardShadow fixed bottom-4 right-4 w-480px overflow-hidden">
      {/* Info: (20240919 - tzuhan) Header: 顯示標題與收縮/展開按鈕 */}
      <div className="flex items-center justify-between p-4">
        <div className="flex-auto flex-col items-center text-center">
          <div className="flex items-center justify-center space-x-2 text-lg font-semibold">
            <Image src="/elements/cloud_upload.svg" width={24} height={24} alt="Upload icon" />
            <div>Upload file</div>
          </div>
          {files.length > 0 && (
            <div className="pb-4 pt-2">
              <p className="text-sm text-file-uploading-text-disable">
                {isUploading
                  ? `Uploading (${files.length - uploadedFileCount}/${files.length})...`
                  : `Completed (${uploadedFileCount}/${files.length})`}
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
              <UploadCertificateItem
                key={`uploading-${index + 1}`}
                file={file}
                onPauseToggle={() => togglePause(index)}
                onDelete={() => handleDelete(index)}
              />
            ))
          ) : (
            <div className="text-center text-gray-500">{t('certificate:UPLOAD.NO_FILE')}</div>
          )}
        </div>
      )}
    </div>
  ) : null;

  return popUpBody;
};

export default FloatingUploadPopup;
