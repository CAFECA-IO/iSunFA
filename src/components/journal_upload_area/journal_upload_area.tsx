import { v4 as uuidv4 } from 'uuid';
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import { useGlobalCtx } from '@/contexts/global_context';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { ProgressStatus } from '@/constants/account';
import { MessageType } from '@/interfaces/message_modal';
import { ToastType } from '@/interfaces/toastify';
import { cn, getTimestampNow, transformBytesToFileSizeString } from '@/lib/utils/common';
import { encryptFile, importPublicKey } from '@/lib/utils/crypto';
import { addItem } from '@/lib/utils/indexed_db/ocr';
import { IOCR, IOCRItem } from '@/interfaces/ocr';
import { IV_LENGTH } from '@/constants/config';
import { UploadType } from '@/constants/file';
import { IFile } from '@/interfaces/file';

interface FileInfo extends IOCRItem {
  file: File;
  name: string;
  size: string;
}

const JournalUploadArea = () => {
  const { t } = useTranslation([
    'common',
    'project',
    'journal',
    'kyc',
    'report_401',
    'salary',
    'setting',
    'terms',
  ]);
  const { userAuth, selectedCompany } = useUserCtx();
  const {
    setInvoiceIdHandler,
    addOCRHandler,
    addPendingOCRHandler,
    deletePendingOCRHandler,
    pendingOCRListFromBrowser,
  } = useAccountingCtx();
  const { messageModalDataHandler, messageModalVisibilityHandler, toastHandler } = useGlobalCtx();

  const { trigger: uploadInvoiceImgToLocal } = APIHandler<IFile>(APIName.FILE_UPLOAD);

  const {
    trigger: uploadInvoice,
    data: results,
    success: uploadSuccess,
    code: uploadCode,
  } = APIHandler<IOCR[]>(APIName.OCR_UPLOAD);

  const {
    trigger: fetchPublicKey,
    data: publicKeyData,
    success: fetchPublicKeySuccess,
  } = APIHandler<JsonWebKey>(APIName.PUBLIC_KEY_GET);

  // Info: (20240711 - Julian) 上傳的檔案
  const [uploadFile, setUploadFile] = useState<FileInfo | null>(null);
  // Info: (20240711 - Julian) 拖曳的樣式
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isUploadDisabled, setIsUploadDisabled] = useState<boolean>(true);

  const getPublicKeyAndEncryptFile = useCallback(
    async (
      fileArrayBuffer: ArrayBuffer
    ): Promise<{
      encryptedContent: ArrayBuffer;
      encryptedSymmetricKey: string;
      publicKey: JsonWebKey;
      iv: Uint8Array;
    } | null> => {
      if (!selectedCompany?.id || !publicKeyData || fetchPublicKeySuccess === false) {
        toastHandler({
          id: 'uploadFile',
          content: t('journal:JOURNAL.FAILED_TO_UPLOAD_FILE'),
          closeable: true,
          type: ToastType.ERROR,
        });
        return null;
      }

      // Info: 生成初始向量 (20240822 - Shirley)
      const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

      const { encryptedContent, encryptedSymmetricKey } = await encryptFile(
        fileArrayBuffer,
        await importPublicKey(publicKeyData),
        iv
      );

      return { encryptedContent, encryptedSymmetricKey, publicKey: publicKeyData, iv };
    },
    [publicKeyData, fetchPublicKeySuccess]
  );

  const storeToIndexedDB = async (fileItem: IOCRItem) => {
    // Info: 檢查是否有使用者和公司資訊 (20240822 - Shirley)
    if (!userAuth?.id || !selectedCompany?.id) {
      return;
    } else if (fileItem.companyId !== selectedCompany.id || fileItem.userId !== userAuth.id) {
      return;
    }
    await addItem(fileItem.uploadIdentifier, fileItem);
  };

  const processFile = async (file: File) => {
    const fileSize = transformBytesToFileSizeString(file.size);
    const fileArrayBuffer = await file.arrayBuffer();
    const uuid = uuidv4();
    const encryptedRelatedData = await getPublicKeyAndEncryptFile(fileArrayBuffer);
    if (!encryptedRelatedData) {
      return;
    }
    const { encryptedContent, encryptedSymmetricKey, publicKey, iv } = encryptedRelatedData;
    const now = getTimestampNow();
    const encryptedFile = new File([encryptedContent], file.name, {
      type: file.type,
    });
    const newItem: IOCRItem = {
      name: file.name,
      size: fileSize,
      type: file.type,
      encryptedContent,
      uploadIdentifier: uuid,
      iv,
      timestamp: now,
      encryptedSymmetricKey,
      publicKey,
      companyId: selectedCompany?.id || -1,
      userId: userAuth?.id || -1,
    };
    const newFile: FileInfo = {
      ...newItem,
      file: encryptedFile,
    };
    setUploadFile(newFile);
    storeToIndexedDB(newItem);
  };

  // Info: (20240711 - Julian) 處理上傳檔案
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isUploadDisabled) {
      return;
    }
    event.preventDefault();
    const { files } = event.target;
    if (files && files.length > 0) {
      const file = files[0];
      await processFile(file);
    }
  };
  // Info: (20240711 - Julian) 處理拖曳上傳檔案
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (isUploadDisabled) {
      return;
    }
    event.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (isUploadDisabled) {
      return;
    }
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    if (isUploadDisabled) {
      return;
    }
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      await processFile(droppedFile);
      setIsDragOver(false);
    }
  };

  const uploadToFileApi = async (companyId: number, item: IOCRItem) => {
    const formData = new FormData();
    const encryptedFile = new File([item.encryptedContent], item.name, {
      type: item.type,
    });

    formData.append('file', encryptedFile);

    // Info: (20240829 - Murky) 下面的部份目前file upload的api沒有用到
    formData.append('fileSize', item.size);
    formData.append('fileName', item.name);
    formData.append('encryptedSymmetricKey', item.encryptedSymmetricKey);
    formData.append('publicKey', JSON.stringify(item.publicKey));
    formData.append('iv', Array.from(item.iv).join(','));

    const { data } = await uploadInvoiceImgToLocal({
      query: {
        type: UploadType.INVOICE,
        targetId: companyId,
      },
      body: formData,
    });

    return data;
  };
  const upload = async (
    item: IOCRItem,
    companyId: number,
    isNewPendingOCR: boolean,
    fileName?: string,
    fileId?: number
  ) => {
    if (item.companyId !== companyId) {
      toastHandler({
        id: `uploadInvoice-${item.uploadIdentifier}`,
        content: t('journal:JOURNAL.INCONSISTENT_COMPANY_ID'),
        closeable: true,
        type: ToastType.ERROR,
      });
      if (!isNewPendingOCR) {
        deletePendingOCRHandler(item.uploadIdentifier);
      }
      return;
    }

    if (isNewPendingOCR) {
      addPendingOCRHandler(item);
    }

    uploadInvoice({
      params: {
        companyId,
      },
      body: {
        fileId,
        imageName: fileName || item.name,
        imageSize: item.size,
        uploadIdentifier: item.uploadIdentifier,
        encryptedSymmetricKey: item.encryptedSymmetricKey,
        publicKey: item.publicKey,
        imageType: item.type,
        iv: Array.from(item.iv).join(','),
      },
    });
  };

  useEffect(() => {
    if (selectedCompany?.id) {
      fetchPublicKey({ params: { companyId: selectedCompany.id } });
    }
  }, [selectedCompany?.id]);

  useEffect(() => {
    if (fetchPublicKeySuccess === false) {
      setIsUploadDisabled(true);
      toastHandler({
        id: 'fetchPublicKey',
        content: t('journal:JOURNAL.FAILED_TO_FETCH_PUBLIC_KEY'),
        closeable: true,
        type: ToastType.ERROR,
      });
    } else if (fetchPublicKeySuccess === true) {
      setIsUploadDisabled(false);
    }
  }, [fetchPublicKeySuccess]);

  useEffect(() => {
    if (!selectedCompany?.id || pendingOCRListFromBrowser.length === 0) return;

    pendingOCRListFromBrowser.forEach(async (item) => {
      const file = await uploadToFileApi(selectedCompany?.id, item);
      await upload(item, selectedCompany.id, false, file?.name, file?.id);
    });
  }, [pendingOCRListFromBrowser]);

  useEffect(() => {
    if (uploadFile && selectedCompany) {
      const uploadFileToOcr = async () => {
        // Info: (20240829 - Murky) To Shirely 更改這邊
        const file = await uploadToFileApi(selectedCompany?.id, uploadFile);
        await upload(uploadFile, selectedCompany?.id || -1, true, file?.name, file?.id);
      };
      uploadFileToOcr();
      setUploadFile(null);
    }
  }, [uploadFile]);

  useEffect(() => {
    if (uploadSuccess && results) {
      results.forEach(async (result) => {
        /* Info: (20240805 - Anna) 將狀態的翻譯key值存到變數 */
        const translatedStatus = t(
          `journal:PROGRESS_STATUS.${result.status.toUpperCase().replace(/_/g, '_')}`
        );
        if (
          result.status === ProgressStatus.ALREADY_UPLOAD ||
          result.status === ProgressStatus.SUCCESS ||
          result.status === ProgressStatus.PAUSED ||
          result.status === ProgressStatus.IN_PROGRESS
        ) {
          toastHandler({
            id: `uploadInvoice-${result.status}`,
            content: translatedStatus,
            closeable: true,
            type: ToastType.SUCCESS,
          });
          setInvoiceIdHandler(result.aichResultId);
          if (
            result?.uploadIdentifier &&
            result?.aichResultId &&
            result?.imageName &&
            result?.imageUrl &&
            result?.imageSize
          ) {
            addOCRHandler(
              result.aichResultId,
              result.imageName,
              result.imageUrl,
              result.imageSize,
              result.uploadIdentifier
            );
            deletePendingOCRHandler(result?.uploadIdentifier);
          }
        } else {
          // Info: (20240522 - Julian) 顯示上傳失敗的錯誤訊息
          messageModalDataHandler({
            title: t('journal:JOURNAL.UPLOAD_INVOICE_FAILED'),
            content: t('journal:JOURNAL.UPLOAD_INVOICE_FAILED_INSERT', {
              uploadCode,
              status: result.status,
            }),
            messageType: MessageType.ERROR,
            submitBtnStr: t('common:COMMON.CLOSE'),
            submitBtnFunction: () => messageModalVisibilityHandler(),
          });
          messageModalVisibilityHandler();
        }
      });
    }
    if (uploadSuccess === false) {
      messageModalDataHandler({
        title: t('journal:JOURNAL.UPLOAD_INVOICE_FAILED'),
        content: t('journal:JOURNAL.UPLOAD_INVOICE_FAILED_WITH_CODE', { uploadCode }),
        messageType: MessageType.ERROR,
        submitBtnStr: t('common:COMMON.CLOSE'),
        submitBtnFunction: () => messageModalVisibilityHandler(),
      });
      messageModalVisibilityHandler();
    }
  }, [uploadSuccess, results]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`h-200px w-300px rounded-lg bg-drag-n-drop-surface-primary md:h-240px md:w-auto md:flex-1`}
    >
      <label
        htmlFor="journal-upload-area"
        className={cn(
          'flex h-full w-full flex-col items-center justify-center rounded-lg border border-dashed p-24px md:p-48px',
          isUploadDisabled
            ? 'cursor-not-allowed border-drag-n-drop-stroke-disable bg-drag-n-drop-surface-disable'
            : [
                'hover:cursor-pointer hover:border-drag-n-drop-stroke-focus hover:bg-drag-n-drop-surface-hover',
                isDragOver
                  ? 'border-drag-n-drop-stroke-focus bg-drag-n-drop-surface-hover'
                  : 'border-drag-n-drop-stroke-primary bg-drag-n-drop-surface-primary',
              ]
        )}
      >
        <Image
          src="/icons/upload_file.svg"
          width={55}
          height={60}
          alt="upload_file"
          className={isUploadDisabled ? 'grayscale' : ''}
        />
        <p
          className={`mt-20px font-semibold ${isUploadDisabled ? 'text-drag-n-drop-text-disable' : 'text-drag-n-drop-text-primary'}`}
        >
          {t('journal:JOURNAL.DROP_YOUR_FILES_HERE_OR')}{' '}
          <span
            className={
              isUploadDisabled ? 'text-drag-n-drop-text-disable' : 'text-link-text-primary'
            }
          >
            {t('journal:JOURNAL.BROWSE')}
          </span>
        </p>
        <p className="text-center text-drag-n-drop-text-note">
          {t('journal:JOURNAL.MAXIMUM_SIZE')}
        </p>

        <input
          id="journal-upload-area"
          name="journal-upload-area"
          accept="image/*,application/pdf"
          type="file"
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploadDisabled}
        />
      </label>
    </div>
  );
};

export default JournalUploadArea;
