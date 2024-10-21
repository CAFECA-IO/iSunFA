import React, { useState, useMemo, useEffect } from 'react';
import UploadCertificateItem from '@/components/upload_certificate/upload_file_item';
import { ProgressStatus } from '@/constants/account';
import Image from 'next/image';
import { ICertificateMeta } from '@/interfaces/certificate';
import { useModalContext } from '@/contexts/modal_context';
import { useTranslation } from 'next-i18next';
import { MessageType } from '@/interfaces/message_modal';
import { ToastType } from '@/interfaces/toastify';
import { ToastId } from '@/constants/toast_id';

interface FloatingUploadPopupProps {
  uploadingCertificates: ICertificateMeta[];
}

const FloatingUploadPopup: React.FC<FloatingUploadPopupProps> = ({ uploadingCertificates }) => {
  const { t } = useTranslation(['common', 'certificate']);
  const { messageModalDataHandler, messageModalVisibilityHandler, toastHandler } =
    useModalContext();
  const [certificates, setCertificates] = useState<ICertificateMeta[]>(uploadingCertificates);
  const [expanded, setExpanded] = useState(false);

  // Info: (20241009 - tzuhan) Memoize calculated values to avoid redundant recalculations
  const totalCertificates = useMemo(() => uploadingCertificates.length, [certificates]);
  const completedCertificates = useMemo(
    () => uploadingCertificates.filter((file) => file.status === ProgressStatus.SUCCESS).length,
    [certificates]
  );
  const isUploading = useMemo(
    () =>
      certificates.some(
        (file) => file.progress > 0 && file.progress < 100 && file.status !== ProgressStatus.PAUSED
      ),
    [certificates]
  );
  // Info: (20240919 - tzuhan) 暫停或繼續上傳
  const updateCertificateStatus = (prevCertificates: ICertificateMeta[], index: number) =>
    prevCertificates.map((file, i) => {
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
    messageModalDataHandler({
      title: t('certificate:PAUSE.TITLE'),
      content: t('certificate:PAUSE.CONTENT'),
      notes: `${certificates[index].name}?`,
      messageType: MessageType.WARNING,
      submitBtnStr: t('certificate:PAUSE.YES'),
      submitBtnFunction: () => {
        setCertificates((prevCertificates) => updateCertificateStatus(prevCertificates, index));
      },
      backBtnStr: t('certificate:PAUSE.NO'),
    });
    messageModalVisibilityHandler();
  };

  // Info: (20240919 - tzuhan) 刪除上傳文件
  const deleteCertificate = (index: number) => {
    messageModalDataHandler({
      title: t('certificate:DELETE.TITLE'),
      content: t('certificate:DELETE.CONTENT'),
      notes: `${certificates[index].name}?`,
      messageType: MessageType.WARNING,
      submitBtnStr: t('certificate:DELETE.YES'),
      submitBtnFunction: () => {
        try {
          setCertificates((prevCertificates) => prevCertificates.filter((_, i) => i !== index));
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

  const displayed =
    totalCertificates > 0 ||
    uploadingCertificates.filter((file) => file.status === ProgressStatus.IN_PROGRESS).length > 0;

  useEffect(() => {
    setCertificates(uploadingCertificates);
  }, [uploadingCertificates]);

  const popUpBody = displayed ? (
    <div className="dashboardCardShadow fixed bottom-4 right-4 w-480px overflow-hidden">
      {/* Info: (20240919 - tzuhan) Header: 顯示標題與收縮/展開按鈕 */}
      <div className="flex items-center justify-between p-4">
        <div className="flex-auto flex-col items-center text-center">
          <div className="flex items-center justify-center space-x-2 text-lg font-semibold">
            <Image src="/elements/cloud_upload.svg" width={24} height={24} alt="Upload icon" />
            <div>Upload file</div>
          </div>
          {totalCertificates > 0 && (
            <div className="pb-4 pt-2">
              <p className="text-sm text-file-uploading-text-disable">
                {isUploading
                  ? `Uploading (${totalCertificates - completedCertificates}/${totalCertificates})...`
                  : `Completed (${completedCertificates}/${totalCertificates})`}
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
          {certificates.length > 0 ? (
            certificates.map((file, index) => (
              <UploadCertificateItem
                key={`uploading-${index + 1}`}
                file={file}
                onPauseToggle={() => togglePause(index)}
                onDelete={() => deleteCertificate(index)}
              />
            ))
          ) : (
            <div className="text-center text-gray-500">No certificates uploading</div>
          )}
        </div>
      )}
    </div>
  ) : null;

  return popUpBody;
};

export default FloatingUploadPopup;
