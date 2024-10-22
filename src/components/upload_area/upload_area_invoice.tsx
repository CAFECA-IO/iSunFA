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
  const { trigger: createCertificateAPI } = APIHandler<IFile>(APIName.CERTIFICATE_POST_V2);

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
      const { success, data: fileId } = await uploadFileAPI({
        params: {
          companyId,
        },
        query: {
          type: UploadType.INVOICE,
          targetId: selectedCompanyIdStr,
        },
        body: formData,
      });
      if (success && fileId) {
        if (setFiles) {
          setFiles((prevFiles) => {
            const files = {
              ...prevFiles,
            };
            const index = files.findIndex((f) => f.name === file.name);
            files[index].progress = 50;
            return files;
          });
        }
        const { success: successCreated } = await createCertificateAPI({
          params: {
            companyId,
          },
          body: {
            fileId,
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
