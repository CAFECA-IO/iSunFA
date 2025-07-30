import React, { useState } from 'react';
import UploadCertificateItem from '@/components/upload_certificate/upload_file_item';
import Image from 'next/image';
import { FaChevronDown } from 'react-icons/fa6';
import { useModalContext } from '@/contexts/modal_context';
import { useTranslation } from 'next-i18next';
import { MessageType } from '@/interfaces/message_modal';
import { ToastType } from '@/interfaces/toastify';
import { IFileUIBeta } from '@/interfaces/file';
import { ToastId } from '@/constants/toast_id';
import { ProgressStatus } from '@/constants/account';

interface FloatingUploadPopupProps {
  files: IFileUIBeta[];
  pauseFileUpload: (fileId: number | null, fileName: string) => void;
  deleteFile: (fileId: number | null, fileName: string) => void;
}

const FloatingUploadPopup: React.FC<FloatingUploadPopupProps> = ({
  files,
  pauseFileUpload,
  deleteFile,
}) => {
  const { t } = useTranslation(['common', 'certificate']);
  const { messageModalDataHandler, messageModalVisibilityHandler, toastHandler } =
    useModalContext();
  const [expanded, setExpanded] = useState(false);
  const uploadingFileCount = files.filter(
    (file) =>
      (file.progress < 100 && file.status === ProgressStatus.IN_PROGRESS) ||
      file.status === ProgressStatus.PAUSED ||
      file.status === ProgressStatus.FAILED
  ).length;

  // Info: (20240919 - tzuhan) 暫停或繼續上傳
  const togglePause = (file: IFileUIBeta) => {
    messageModalDataHandler({
      title: t('certificate:PAUSE.TITLE'),
      content: t('certificate:PAUSE.CONTENT'),
      notes: `${file.name}?`,
      messageType: MessageType.WARNING,
      submitBtnStr: t('certificate:PAUSE.YES'),
      submitBtnFunction: () => {
        pauseFileUpload(file.id, file.name);
      },
      backBtnStr: t('certificate:PAUSE.NO'),
    });
    messageModalVisibilityHandler();
  };

  // Info: (20240919 - tzuhan) 刪除上傳文件
  const handleDelete = (file: IFileUIBeta) => {
    messageModalDataHandler({
      title: t('certificate:DELETE.TITLE'),
      content: t('certificate:DELETE.CONTENT'),
      notes: `${file.name}?`,
      messageType: MessageType.WARNING,
      submitBtnStr: t('certificate:DELETE.YES'),
      submitBtnFunction: () => {
        try {
          deleteFile(file.id, file.name);
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

  const popUpBody =
    uploadingFileCount > 0 ? (
      <div className="dashboardCardShadow fixed bottom-4 right-4 z-50 w-480px overflow-hidden">
        {/* Info: (20240919 - tzuhan) Header: 顯示標題與收縮/展開按鈕 */}
        <div className="flex items-center justify-between p-4">
          <div className="flex-auto flex-col items-center text-center">
            <div className="flex items-center justify-center space-x-2 text-lg font-semibold">
              <Image src="/elements/cloud_upload.svg" width={24} height={24} alt="Upload icon" />
              <div>{t('certificate:UPLOAD.FILE')}</div>
            </div>
            {files.length > 0 && (
              <div className="pb-4 pt-2">
                <p className="text-sm text-file-uploading-text-disable">
                  {uploadingFileCount > 0
                    ? `${t('certificate:UPLOAD.UPLOADING')} (${uploadingFileCount}/${files.length})...`
                    : `${t('certificate:UPLOAD.COMPLETED')} (${files.length - uploadingFileCount}/${files.length})`}
                </p>
              </div>
            )}
          </div>
          <button
            type="button"
            className={`${expanded ? '' : 'rotate-180'}`}
            onClick={() => setExpanded(!expanded)}
          >
            <FaChevronDown size={20} />
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
                  onPauseToggle={() => togglePause(file)}
                  onDelete={() => handleDelete(file)}
                />
              ))
            ) : (
              <div className="text-center text-text-neutral-primary">
                {t('certificate:UPLOAD.NO_FILE')}
              </div>
            )}
          </div>
        )}
      </div>
    ) : null;

  return popUpBody;
};

export default FloatingUploadPopup;
