import React, { useCallback } from 'react';
import { useTranslation } from 'next-i18next';
import { useModalContext } from '@/contexts/modal_context';
import APIHandler from '@/lib/utils/api_handler';
import { IFile } from '@/interfaces/file';
import { ToastType } from '@/interfaces/toastify';
import { UploadType } from '@/constants/file';
import { APIName } from '@/constants/api_connection';
import { ToastId } from '@/constants/toast_id';
import UploadArea from '@/components/upload_area/upload_area';
import { IUploadFile } from '@/components/upload_certificate/upload_file_item';
import { ProgressStatus } from '@/constants/account';
import { ICertificate } from '@/interfaces/certificate';

interface UploadAreaInvoiceProps {
  companyId?: number;
  isDisabled: boolean;
  withScanner: boolean;
  toggleQRCode?: () => void;
  setFiles?: React.Dispatch<React.SetStateAction<IUploadFile[]>>;
}

const UploadAreaInvoice: React.FC<UploadAreaInvoiceProps> = ({
  companyId,
  isDisabled,
  withScanner,
  toggleQRCode,
  setFiles,
}) => {
  const { t } = useTranslation('certificate');
  const { toastHandler } = useModalContext();
  const { trigger: uploadFileAPI } = APIHandler<IFile>(APIName.FILE_UPLOAD);
  // Info: (20241022 - tzuhan) @Murky, <...> 裡面是 CERTIFICATE_POST_V2 API 需要的回傳資料格式
  const { trigger: createCertificateAPI } = APIHandler<ICertificate>(APIName.CERTIFICATE_POST_V2);

  const handleUpload = useCallback(async (file: File) => {
    if (!companyId) return;
    try {
      const selectedCompanyIdStr = String(companyId);
      const formData = new FormData();
      formData.append('file', file);
      if (setFiles) {
        setFiles((prevFiles) => {
          return [
            ...prevFiles,
            {
              name: file.name,
              size: file.size,
              progress: 0,
              status: ProgressStatus.IN_PROGRESS,
            },
          ];
        });
      }
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
      if (success && fileMeta) {
        if (setFiles) {
          setFiles((prevFiles) => {
            const files = {
              ...prevFiles,
            };
            const index = files.findIndex((f) => f.name === file.name);
            files[index].id = fileMeta.id;
            files[index].progress = 50;
            return files;
          });
        }
        // Info: (20241022 - tzuhan) @Murky, 這裡是前端呼叫 CERTIFICATE_POST_V2 API 的地方，以及params、body參數的組合
        const { success: successCreated } = await createCertificateAPI({
          params: {
            companyId,
          },
          body: {
            fileId: fileMeta.id,
          },
        });
        if (setFiles) {
          if (successCreated) {
            setFiles((prevFiles) => {
              const files = {
                ...prevFiles,
              };
              const index = files.findIndex((f) => f.name === file.name);
              files[index].progress = 100;
              return files;
            });
          } else {
            setFiles((prevFiles) => {
              const files = {
                ...prevFiles,
              };
              const index = files.findIndex((f) => f.name === file.name);
              files[index].status = ProgressStatus.FAILED;
              return files;
            });
          }
        } else if (successCreated) {
          toastHandler({
            id: ToastId.UPLOAD_FILE_SUCCESS,
            type: ToastType.SUCCESS,
            closeable: true,
            content: t('common:TOAST.UPLOAD_FILE_SUCCESS'),
          });
        } else {
          toastHandler({
            id: ToastId.UPLOAD_FILE_ERROR,
            type: ToastType.ERROR,
            closeable: true,
            content: t('common:TOAST.UPLOAD_FILE_ERROR'),
          });
        }
      } else if (setFiles) {
        setFiles((prevFiles) => {
          const files = {
            ...prevFiles,
          };
          const index = files.findIndex((f) => f.name === file.name);
          files[index].status = ProgressStatus.FAILED;
          return files;
        });
      } else {
        toastHandler({
          id: ToastId.UPLOAD_FILE_ERROR,
          type: ToastType.ERROR,
          closeable: true,
          content: t('common:TOAST.UPLOAD_FILE_ERROR'),
        });
      }
    } catch (error) {
      toastHandler({
        id: ToastId.UPLOAD_FILE_ERROR,
        type: ToastType.ERROR,
        closeable: true,
        content: t('common:TOAST.UPLOAD_FILE_ERROR'),
      });
    }
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

export default UploadAreaInvoice;
