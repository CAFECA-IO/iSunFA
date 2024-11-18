import React, { useCallback, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { useModalContext } from '@/contexts/modal_context';
import APIHandler from '@/lib/utils/api_handler';
import { IFileUIBeta } from '@/interfaces/file';
import { UploadType } from '@/constants/file';
import { APIName } from '@/constants/api_connection';
import UploadArea from '@/components/upload_area/upload_area';
import { ProgressStatus } from '@/constants/account';
import { ICertificate } from '@/interfaces/certificate';
import { getPusherInstance } from '@/lib/utils/pusher_client';
import { CERTIFICATE_EVENT, PRIVATE_CHANNEL } from '@/constants/pusher';
import { MessageType } from '@/interfaces/message_modal';
import { ToastType } from '@/interfaces/toastify';
import { ToastId } from '@/constants/toast_id';
import { useUserCtx } from '@/contexts/user_context';
import { FREE_COMPANY_ID } from '@/constants/config';

interface InvoiceUploadProps {
  isDisabled: boolean;
  withScanner: boolean;
  toggleQRCode?: () => void;
  setFiles: React.Dispatch<React.SetStateAction<IFileUIBeta[]>>;
  showErrorMessage: boolean;
}

const InvoiceUpload: React.FC<InvoiceUploadProps> = ({
  isDisabled,
  withScanner,
  toggleQRCode,
  setFiles,
  showErrorMessage,
}) => {
  const { t } = useTranslation(['certificate', 'common']);
  const { selectedCompany } = useUserCtx();
  const { toastHandler, messageModalDataHandler, messageModalVisibilityHandler } =
    useModalContext();
  const { trigger: uploadFileAPI } = APIHandler<IFileUIBeta>(APIName.FILE_UPLOAD);
  const { trigger: createCertificateAPI } = APIHandler<ICertificate>(APIName.CERTIFICATE_POST_V2);

  const handleUploadCancelled = useCallback(() => {
    setFiles([]);
    messageModalVisibilityHandler();
  }, [setFiles, messageModalVisibilityHandler]);

  const handleUploadFailed = useCallback(
    (fileName: string, error?: Error) => {
      setFiles((prevFiles) =>
        prevFiles.map((f) => (f.name === fileName ? { ...f, status: ProgressStatus.FAILED } : f))
      );
      if (error) {
        if (showErrorMessage) {
          messageModalDataHandler({
            title: t('certificate:WARNING.UPLOAD_FAILED'),
            content: t('certificate:WARNING.UPLOAD_FAILED_NOTIFY'),
            messageType: MessageType.WARNING,
            submitBtnStr: t('certificate:WARNING.UPLOAD_CANCEL'),
            backBtnStr: t('certificate:WARNING.UPLOAD_CONTINUE'),
            submitBtnFunction: handleUploadCancelled,
          });
          messageModalVisibilityHandler();
        } else {
          toastHandler({
            id: ToastId.UPLOAD_FILE_ERROR,
            type: ToastType.ERROR,
            closeable: true,
            content: t('common:TOAST.UPLOAD_FILE_ERROR'),
          });
        }
      }
    },
    [
      setFiles,
      showErrorMessage,
      toastHandler,
      messageModalDataHandler,
      messageModalVisibilityHandler,
    ]
  );

  const handleUpload = useCallback(
    async (file: File) => {
      try {
        const formData = new FormData();
        formData.append('file', file);

        setFiles((prevFiles) => [
          ...prevFiles,
          {
            id: null,
            name: file.name,
            size: file.size,
            url: URL.createObjectURL(file),
            progress: 0,
            status: ProgressStatus.IN_PROGRESS,
          },
        ]);

        const { success, data: fileMeta } = await uploadFileAPI({
          params: { companyId: selectedCompany?.id ?? FREE_COMPANY_ID },
          query: {
            type: UploadType.INVOICE,
            targetId: String(selectedCompany?.id ?? FREE_COMPANY_ID),
          },
          body: formData,
        });

        if (!success || !fileMeta) {
          handleUploadFailed(file.name, new Error(t('certificate:UPLOAD.FAILED')));
          return;
        }

        setFiles((prevFiles) =>
          prevFiles.map((f) => (f.name === file.name ? { ...f, id: fileMeta.id, progress: 50 } : f))
        );

        const { success: successCreated, data: certificate } = await createCertificateAPI({
          params: { companyId: selectedCompany?.id ?? FREE_COMPANY_ID },
          body: { fileId: fileMeta.id },
        });
        if (!successCreated || !certificate) {
          handleUploadFailed(file.name, new Error(t('certificate:CREATE.FAILED')));
          return;
        }

        setFiles((prevFiles) =>
          prevFiles.map((f) => {
            return f.name === file.name
              ? {
                  ...f,
                  progress: 100,
                  status: ProgressStatus.SUCCESS,
                  certificateId: certificate.id,
                }
              : f;
          })
        );
      } catch (error) {
        handleUploadFailed(file.name, error as Error);
      }
    },
    [selectedCompany?.id, handleUploadFailed, setFiles, t, uploadFileAPI, createCertificateAPI]
  );

  const certificateCreatedHandler = useCallback(
    (data: ICertificate) => {
      setFiles((prevFiles) => prevFiles.filter((f) => f.certificateId !== data.id));
    },
    [setFiles]
  );

  useEffect(() => {
    const pusher = getPusherInstance();
    const channel = pusher.subscribe(PRIVATE_CHANNEL.CERTIFICATE);

    channel.bind(CERTIFICATE_EVENT.CREATE, certificateCreatedHandler);

    return () => {
      channel.unbind(CERTIFICATE_EVENT.CREATE, certificateCreatedHandler);
      pusher.unsubscribe(PRIVATE_CHANNEL.CERTIFICATE);
    };
  }, [certificateCreatedHandler]);

  return (
    <UploadArea
      isDisabled={isDisabled}
      withScanner={withScanner}
      toggleQRCode={toggleQRCode}
      handleUpload={handleUpload}
    />
  );
};

export default InvoiceUpload;
