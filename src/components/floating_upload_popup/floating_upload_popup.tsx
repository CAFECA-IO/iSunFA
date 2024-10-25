import React, { useState, useMemo, useEffect, useCallback } from 'react';
import UploadCertificateItem from '@/components/upload_certificate/upload_file_item';
import { ProgressStatus } from '@/constants/account';
import Image from 'next/image';
import { useModalContext } from '@/contexts/modal_context';
import { useTranslation } from 'next-i18next';
import { MessageType } from '@/interfaces/message_modal';
import { ToastType } from '@/interfaces/toastify';
import { IFileUIBeta } from '@/interfaces/file';
import { ToastId } from '@/constants/toast_id';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { ICertificate } from '@/interfaces/certificate';
import { getPusherInstance } from '@/lib/utils/pusher_client';
import { CERTIFICATE_EVENT, PRIVATE_CHANNEL } from '@/constants/pusher';

interface FloatingUploadPopupProps {
  companyId?: number;
  mobileUploadFiles: IFileUIBeta[];
  desktopUploadFiles: IFileUIBeta[];
}

const FloatingUploadPopup: React.FC<FloatingUploadPopupProps> = ({
  companyId,
  mobileUploadFiles,
  desktopUploadFiles,
}) => {
  const { t } = useTranslation(['common', 'certificate']);
  const [files, setFiles] = useState<IFileUIBeta[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<IFileUIBeta[]>([]);
  // Info: (20241022 - tzuhan) @Murky, <...> 裡面是 CERTIFICATE_POST_V2 API 需要的回傳資料格式
  const { trigger: createCertificateAPI } = APIHandler<ICertificate>(APIName.CERTIFICATE_POST_V2);
  const { messageModalDataHandler, messageModalVisibilityHandler, toastHandler } =
    useModalContext();
  const [expanded, setExpanded] = useState(false);
  const isUploading = useMemo(
    () =>
      files.some(
        (file) => file.progress > 0 && file.progress < 100 && file.status !== ProgressStatus.PAUSED
      ),
    [files]
  );
  // Info: (20240919 - tzuhan) 暫停或繼續上傳
  const updateCertificateStatus = (prevCertificates: IFileUIBeta[], index: number) =>
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
      notes: `${files[index].name}?`,
      messageType: MessageType.WARNING,
      submitBtnStr: t('certificate:PAUSE.YES'),
      submitBtnFunction: () => {
        setFiles((prevCertificates) => updateCertificateStatus(prevCertificates, index));
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
      notes: `${files[index].name}?`,
      messageType: MessageType.WARNING,
      submitBtnStr: t('certificate:DELETE.YES'),
      submitBtnFunction: () => {
        try {
          setFiles((prevCertificates) => prevCertificates.filter((_, i) => i !== index));
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

  const displayed = files.filter((file) => file.status === ProgressStatus.IN_PROGRESS).length > 0;

  // Info: (20241022 - tzuhan) @Murky, 這裡是前端訂閱 PUSHER (CERTIFICATE_EVENT.CREATE) 的地方，當 file 對應的 certificate 生成會刪除上傳列表的 file
  useEffect(() => {
    if (!companyId) return;
    const uploadFiles = [...mobileUploadFiles, ...desktopUploadFiles];
    setFiles(uploadFiles);
    uploadFiles.map(async (file, index) => {
      if (!file.certificateId) {
        const { success: successCreated, data } = await createCertificateAPI({
          params: {
            companyId,
          },
          body: {
            fileId: file.id,
          },
        });
        if (successCreated && data) {
          setFiles((prevFiles) => {
            const updateFiles = [...prevFiles];
            updateFiles[index].progress = 100;
            updateFiles[index].status = ProgressStatus.SUCCESS;
            updateFiles[index].certificateId = data.id;
            return updateFiles;
          });
          setUploadedFiles((prevFiles) => [...prevFiles, file]);
        }
      } else {
        setFiles((prevFiles) => {
          const updateFiles = [...prevFiles];
          updateFiles[index].progress = 100;
          updateFiles[index].status = ProgressStatus.SUCCESS;
          return updateFiles;
        });
        setUploadedFiles((prevFiles) => [...prevFiles, file]);
      }
      return null;
    });
  }, [mobileUploadFiles, desktopUploadFiles]);

  const certificateCreatedHandler = useCallback((data: ICertificate) => {
    setFiles((prevFiles) => {
      return prevFiles.filter((f) => f.certificateId !== data.id);
    });
  }, []);

  useEffect(() => {
    const pusher = getPusherInstance();
    const channel = pusher.subscribe(PRIVATE_CHANNEL.CERTIFICATE);

    channel.bind(CERTIFICATE_EVENT.CREATE, certificateCreatedHandler);

    return () => {
      channel.unbind(CERTIFICATE_EVENT.CREATE, certificateCreatedHandler);
      pusher.unsubscribe(PRIVATE_CHANNEL.CERTIFICATE);
    };
  }, []);

  const popUpBody = displayed ? (
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
                  ? `Uploading (${files.length - uploadedFiles.length}/${files.length})...`
                  : `Completed (${uploadedFiles.length}/${files.length})`}
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
                onDelete={() => deleteCertificate(index)}
              />
            ))
          ) : (
            <div className="text-center text-gray-500">No files uploading</div>
          )}
        </div>
      )}
    </div>
  ) : null;

  return popUpBody;
};

export default FloatingUploadPopup;
