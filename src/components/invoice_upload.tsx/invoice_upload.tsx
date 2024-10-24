import React, { useCallback, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { useModalContext } from '@/contexts/modal_context';
import APIHandler from '@/lib/utils/api_handler';
import { IFile, IFileUIBeta } from '@/interfaces/file';
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

interface InvoiceUploadProps {
  companyId?: number;
  isDisabled: boolean;
  withScanner: boolean;
  toggleQRCode?: () => void;
  setFiles: React.Dispatch<React.SetStateAction<IFileUIBeta[]>>;
  showErrorMessage: boolean;
}

const InvoiceUpload: React.FC<InvoiceUploadProps> = ({
  companyId,
  isDisabled,
  withScanner,
  toggleQRCode,
  setFiles,
  showErrorMessage,
}) => {
  const { t } = useTranslation('certificate');
  const { toastHandler, messageModalDataHandler, messageModalVisibilityHandler } =
    useModalContext();
  const { trigger: uploadFileAPI } = APIHandler<IFile>(APIName.FILE_UPLOAD);
  // Info: (20241022 - tzuhan) @Murky, <...> 裡面是 CERTIFICATE_POST_V2 API 需要的回傳資料格式
  const { trigger: createCertificateAPI } = APIHandler<ICertificate>(APIName.CERTIFICATE_POST_V2);

  const handleUploadCancelled = useCallback(() => {
    setFiles([]);
    messageModalVisibilityHandler();
  }, []);

  const handleUploadFailed = useCallback((fileName: string, error?: Error) => {
    setFiles((prevFiles) => {
      const files = {
        ...prevFiles,
      };
      const index = files.findIndex((f) => f.name === fileName);
      files[index].status = ProgressStatus.FAILED;
      return files;
    });
    if (error) {
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
    }
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    if (!companyId) return;
    try {
      const selectedCompanyIdStr = String(companyId);
      const formData = new FormData();
      formData.append('file', file);

      setFiles((prevFiles) => {
        return [
          ...prevFiles,
          {
            id: null,
            name: file.name,
            size: file.size,
            url: URL.createObjectURL(file),
            progress: 0,
            status: ProgressStatus.IN_PROGRESS,
          },
        ];
      });

      const { success, data: fileMeta } = await uploadFileAPI({
        params: {
          companyId,
        },
        // Info: (20241022 - tzuhan) @Murky, 這裡是前端呼叫 FILE_UPLOAD API 的地方，以及query參數的組合
        query: {
          type: UploadType.INVOICE, // Info: (20241022 - tzuhan) @Murky, 這個是我新增的，請確認是否正確
          targetId: selectedCompanyIdStr,
        },
        body: formData,
      });

      if (!success || !fileMeta) {
        handleUploadFailed(file.name);
        return;
      }

      if (success && fileMeta) {
        setFiles((prevFiles) => {
          const files = {
            ...prevFiles,
          };
          const index = files.findIndex((f) => f.name === file.name);
          files[index].id = fileMeta.id;
          files[index].progress = 50;
          return files;
        });
        // Info: (20241022 - tzuhan) @Murky, 這裡是前端呼叫 CERTIFICATE_POST_V2 API 的地方，以及params、body參數的組合
        const { success: successCreated, data: certificate } = await createCertificateAPI({
          params: {
            companyId,
          },
          body: {
            fileId: fileMeta.id,
          },
        });
        if (!successCreated || !certificate) {
          handleUploadFailed(file.name);
          return;
        }
        if (successCreated && certificate) {
          setFiles((prevFiles) => {
            const files = {
              ...prevFiles,
            };
            const index = files.findIndex((f) => f.name === file.name);
            files[index].progress = 100;
            files[index].status = ProgressStatus.SUCCESS;
            files[index].certificateId = certificate.id;
            return files;
          });
        }
      }
    } catch (error) {
      handleUploadFailed(file.name, error as Error);
    }
  }, []);

  const certificateCreatedHandler = useCallback((data: ICertificate) => {
    setFiles((prevFiles) => {
      return prevFiles.filter((f) => f.certificateId !== data.id);
    });
  }, []);

  // Info: (20241022 - tzuhan) @Murky, 這裡是前端訂閱 PUSHER (CERTIFICATE_EVENT.CREATE) 的地方，當 file 對應的 certificate 生成會刪除上傳列表的 file
  useEffect(() => {
    const pusher = getPusherInstance();
    const channel = pusher.subscribe(PRIVATE_CHANNEL.CERTIFICATE);

    channel.bind(CERTIFICATE_EVENT.CREATE, certificateCreatedHandler);

    return () => {
      channel.unbind(CERTIFICATE_EVENT.CREATE, certificateCreatedHandler);
      pusher.unsubscribe(PRIVATE_CHANNEL.CERTIFICATE);
    };
  }, []);

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
