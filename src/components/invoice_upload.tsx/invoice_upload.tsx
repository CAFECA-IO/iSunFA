import React, { useCallback, useState } from 'react';
import { useTranslation } from 'next-i18next';
import APIHandler from '@/lib/utils/api_handler';
import { IFileUIBeta } from '@/interfaces/file';
import { UploadType } from '@/constants/file';
import { APIName } from '@/constants/api_connection';
import UploadArea from '@/components/upload_area/upload_area';
import { ProgressStatus } from '@/constants/account';
import { ICertificate } from '@/interfaces/certificate';
import { useUserCtx } from '@/contexts/user_context';
import { FREE_ACCOUNT_BOOK_ID } from '@/constants/config';
import { compressImageToTargetSize } from '@/lib/utils/image_compress';
import { encryptFileWithPublicKey, importPublicKey } from '@/lib/utils/crypto';
import { InvoiceDirection, CurrencyCode } from '@/constants/invoice_rc2';
import { IInvoiceRC2Input, IInvoiceRC2Output } from '@/interfaces/invoice_rc2';

interface InvoiceUploadProps {
  isDisabled: boolean;
  direction?: InvoiceDirection;
  toggleQRCode?: () => void;
  setFiles: React.Dispatch<React.SetStateAction<IFileUIBeta[]>>;
}

const InvoiceUpload: React.FC<InvoiceUploadProps> = ({
  isDisabled,
  toggleQRCode,
  setFiles,
  direction,
}) => {
  const { t } = useTranslation(['certificate']);
  const { connectedAccountBook } = useUserCtx();
  const [publicKey, setPublicKey] = useState<CryptoKey | null>(null);
  const { trigger: uploadFileAPI } = APIHandler<IFileUIBeta>(APIName.FILE_UPLOAD);
  const { trigger: createCertificateAPI } = APIHandler<ICertificate>(APIName.CERTIFICATE_POST_V2);
  const { trigger: createInvoiceRC2Input } = APIHandler<IInvoiceRC2Input>(
    APIName.CREATE_INVOICE_RC2_INPUT
  );
  const { trigger: createInvoiceRC2Output } = APIHandler<IInvoiceRC2Output>(
    APIName.CREATE_INVOICE_RC2_OUTPUT
  );
  const { trigger: fetchPublicKey } = APIHandler<JsonWebKey>(APIName.PUBLIC_KEY_GET);

  const handleUploadFailed = useCallback(
    (fileName: string, errorMessage?: string) => {
      setFiles((prevFiles) =>
        prevFiles.map((f) => {
          return f.name === fileName
            ? {
                ...f,
                status: ProgressStatus.FAILED,
                error: errorMessage || t('certificate:TOAST.UPLOAD_FILE_ERROR', { name: fileName }),
              }
            : f;
        })
      );
    },
    [setFiles, t]
  );

  const encryptFileWithKey = async (file: File) => {
    try {
      let key = publicKey;
      if (!key) {
        const { success, data } = await fetchPublicKey({
          params: { accountBookId: connectedAccountBook?.id ?? FREE_ACCOUNT_BOOK_ID },
        });
        if (!success || !data) {
          throw new Error(t('certificate:UPLOAD.FAILED'));
        }
        const cryptokey = await importPublicKey(data);
        setPublicKey(cryptokey);
        key = cryptokey;
      }
      const { encryptedFile, iv, encryptedSymmetricKey } = await encryptFileWithPublicKey(
        file,
        key
      );
      const formData = new FormData();
      formData.append('file', encryptedFile);
      formData.append('encryptedSymmetricKey', encryptedSymmetricKey);
      formData.append('publicKey', JSON.stringify(key));
      formData.append('iv', Array.from(iv).join(','));
      return formData;
    } catch (error) {
      throw new Error(t('certificate:ERROR.ENCRYPT_FILE'));
    }
  };

  const handleUpload = useCallback(
    async (file: File) => {
      try {
        // Info: (20250108 - tzuhan) 預先將檔案加入檔案列表，進行初始化
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
        const formData = await encryptFileWithKey(file);
        const targetSize = 1 * 1024 * 1024; // Info: (20241206 - tzuhan) 1MB
        const maxSize = 4 * 1024 * 1024;
        if (file.size > maxSize) {
          handleUploadFailed(file.name, t('certificate:UPLOAD.FILE_SIZE_EXCEEDED'));
          return;
        }
        const compressedFile = await compressImageToTargetSize(file, targetSize);

        // Info: (20250108 - tzuhan) 更新檔案列表，壓縮後重新設定進度
        setFiles((prevFiles) =>
          prevFiles.map((f) => {
            return f.name === file.name
              ? {
                  ...f,
                  size: compressedFile.file.size,
                  url: URL.createObjectURL(compressedFile.file),
                  status: ProgressStatus.IN_PROGRESS,
                }
              : f;
          })
        );

        const { success, data: fileMeta } = await uploadFileAPI({
          params: { companyId: connectedAccountBook?.id ?? FREE_ACCOUNT_BOOK_ID },
          query: {
            type: UploadType.INVOICE,
            targetId: String(connectedAccountBook?.id ?? FREE_ACCOUNT_BOOK_ID),
          },
          body: formData,
        });

        if (!success || !fileMeta) {
          handleUploadFailed(compressedFile.file.name);
          return;
        }

        setFiles((prevFiles) =>
          prevFiles.map((f) => {
            return f.name === compressedFile.file.name
              ? { ...f, id: fileMeta.id, progress: 50 }
              : f;
          })
        );

        let successCreated: boolean;
        let certificate: ICertificate | IInvoiceRC2Input | IInvoiceRC2Output | null = null;
        if (direction) {
          switch (direction) {
            case InvoiceDirection.INPUT: {
              const result = await createInvoiceRC2Input({
                params: { accountBookId: connectedAccountBook?.id ?? FREE_ACCOUNT_BOOK_ID },
                body: {
                  fileId: fileMeta.id,
                  direction: InvoiceDirection.INPUT,
                  isGenerated: false,
                  currencyCode: CurrencyCode.TWD,
                },
              });
              successCreated = result.success;
              certificate = result.data;
              break;
            }
            case InvoiceDirection.OUTPUT: {
              const result = await createInvoiceRC2Output({
                params: { accountBookId: connectedAccountBook?.id ?? FREE_ACCOUNT_BOOK_ID },
                body: {
                  fileId: fileMeta.id,
                  direction: InvoiceDirection.OUTPUT,
                  isGenerated: false,
                  currencyCode: CurrencyCode.TWD,
                },
              });
              successCreated = result.success;
              certificate = result.data;
              break;
            }
            default:
              successCreated = false;
              certificate = null;
              break;
          }
        } else {
          const result = await createCertificateAPI({
            params: { accountBookId: connectedAccountBook?.id ?? FREE_ACCOUNT_BOOK_ID },
            body: { fileIds: [fileMeta.id] }, // Info: (20241126 - Murky) @tsuhan 這邊已經可以使用批次上傳, 但是我不知道怎麼改，所以先放在array
          });
          successCreated = result.success;
          certificate = result.data;
        }
        if (!successCreated || !certificate) {
          handleUploadFailed(compressedFile.file.name);
          return;
        }

        setFiles((prevFiles) =>
          prevFiles.map((f) => {
            return f.name === compressedFile.file.name
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
        handleUploadFailed(file.name, (error as Error).message);
      }
    },
    [connectedAccountBook?.id, handleUploadFailed, setFiles, t, uploadFileAPI]
  );

  return (
    <UploadArea
      isDisabled={isDisabled}
      toggleQRCode={toggleQRCode}
      handleUpload={handleUpload}
      multiple
    />
  );
};

export default InvoiceUpload;
