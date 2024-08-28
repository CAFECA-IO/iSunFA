import { v4 as uuidv4 } from 'uuid';
import React, { useState, useEffect } from 'react';
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
import { getTimestampNow, transformBytesToFileSizeString } from '@/lib/utils/common';
import { encryptFile, exportPublicKey, generateKeyPair, importPublicKey } from '@/lib/utils/crypto';
import { addItem } from '@/lib/utils/indexed_db/ocr';
import { IOCR, IOCRItem } from '@/interfaces/ocr';
import { IV_LENGTH } from '@/constants/config';

interface FileInfo extends IOCRItem {
  file: File;
  name: string;
  size: string;
}

const JournalUploadArea = () => {
  const { t } = useTranslation('common');
  const { userAuth, selectedCompany } = useUserCtx();
  const {
    setInvoiceIdHandler,
    addOCRHandler,
    addPendingOCRHandler,
    deletePendingOCRHandler,
    pendingOCRListFromBrowser,
  } = useAccountingCtx();
  const { messageModalDataHandler, messageModalVisibilityHandler, toastHandler } = useGlobalCtx();

  const {
    trigger: uploadInvoice,
    data: results,
    success: uploadSuccess,
    code: uploadCode,
  } = APIHandler<IOCR[]>(APIName.OCR_UPLOAD);

  // Info: (20240711 - Julian) 上傳的檔案
  const [uploadFile, setUploadFile] = useState<FileInfo | null>(null);
  // Info: (20240711 - Julian) 決定是否顯示 modal 的 flag
  // const [isShowSuccessModal, setIsShowSuccessModal] = useState<boolean>(false);
  // Info: (20240711 - Julian) 拖曳的樣式
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const getPublicKeyAndEncryptFile = async (fileArrayBuffer: ArrayBuffer) => {
    // TODO: 暫時生成 RSA 密鑰對，但 public key 應該要從後端來 (20240822 - Shirley)
    const keyPair = await generateKeyPair();
    const publicKey = await exportPublicKey(keyPair.publicKey);
    // Info: 生成初始向量 (20240822 - Shirley)
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    const { encryptedContent, encryptedSymmetricKey } = await encryptFile(
      fileArrayBuffer,
      await importPublicKey(publicKey),
      iv
    );

    return { encryptedContent, encryptedSymmetricKey, publicKey, iv };
  };

  const storeToIndexedDB = async (fileItem: IOCRItem) => {
    // Info: 檢查是否有使用者和公司資訊 (20240822 - Shirley)
    if (!userAuth?.id || !selectedCompany?.id) {
      return;
    }
    await addItem(fileItem.uploadIdentifier, fileItem);
  };

  const processFile = async (file: File) => {
    const fileSize = transformBytesToFileSizeString(file.size);
    const fileArrayBuffer = await file.arrayBuffer();
    const uuid = uuidv4();
    const { encryptedContent, encryptedSymmetricKey, publicKey, iv } =
      await getPublicKeyAndEncryptFile(fileArrayBuffer);
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
    event.preventDefault();
    const { files } = event.target;
    if (files && files.length > 0) {
      const file = files[0];
      await processFile(file);
    }
  };
  // Info: (20240711 - Julian) 處理拖曳上傳檔案
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      await processFile(droppedFile);
      setIsDragOver(false);
    }
  };

  const upload = async (item: IOCRItem, companyId: number, isNewPendingOCR: boolean) => {
    if (item.companyId !== companyId) {
      toastHandler({
        id: `uploadInvoice-${item.uploadIdentifier}`,
        content: t('JOURNAL.INCONSISTENT_COMPANY_ID'),
        closeable: true,
        type: ToastType.ERROR,
      });
      if (!isNewPendingOCR) {
        deletePendingOCRHandler(item.uploadIdentifier);
      }
      return;
    }
    const formData = new FormData();
    const encryptedFile = new File([item.encryptedContent], item.name, {
      type: item.type,
    });
    formData.append('image', encryptedFile);
    formData.append('imageSize', item.size);
    formData.append('imageName', item.name);
    formData.append('uploadIdentifier', item.uploadIdentifier);
    formData.append('encryptedSymmetricKey', item.encryptedSymmetricKey);
    formData.append('publicKey', JSON.stringify(item.publicKey));
    formData.append('iv', Array.from(item.iv).join(','));

    if (isNewPendingOCR) {
      addPendingOCRHandler(item);
    }

    uploadInvoice({ params: { companyId }, body: formData });
  };

  useEffect(() => {
    if (!selectedCompany?.id || pendingOCRListFromBrowser.length === 0) return;

    pendingOCRListFromBrowser.forEach((item) => {
      upload(item, selectedCompany.id, false);
    });
  }, [pendingOCRListFromBrowser]);

  useEffect(() => {
    if (uploadFile && selectedCompany) {
      upload(uploadFile, selectedCompany?.id || -1, true);
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
            title: 'Upload Invoice Failed',
            content: `Upload invoice failed(${uploadCode}): ${result.status}`,
            messageType: MessageType.ERROR,
            submitBtnStr: t('COMMON.CLOSE'),
            submitBtnFunction: () => messageModalVisibilityHandler(),
          });
          messageModalVisibilityHandler();
        }
      });
    }
    if (uploadSuccess === false) {
      messageModalDataHandler({
        title: 'Upload Invoice Failed',
        content: `Upload invoice failed(${uploadCode})`,
        messageType: MessageType.ERROR,
        submitBtnStr: t('COMMON.CLOSE'),
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
      className={`h-200px w-300px rounded-lg bg-white md:h-240px md:w-auto md:flex-1`}
    >
      <label
        htmlFor="journal-upload-area"
        className={`flex h-full w-full flex-col rounded-lg border border-dashed hover:cursor-pointer ${
          isDragOver
            ? 'border-drag-n-drop-stroke-focus bg-drag-n-drop-surface-hover'
            : 'border-drag-n-drop-stroke-primary bg-drag-n-drop-surface-primary'
        } items-center justify-center p-24px hover:border-drag-n-drop-stroke-focus hover:bg-drag-n-drop-surface-hover md:p-48px`}
      >
        <Image src="/icons/upload_file.svg" width={55} height={60} alt="upload_file" />
        <p className="mt-20px font-semibold text-navyBlue2">
          {t('journal:JOURNAL.DROP_YOUR_FILES_HERE_OR')}{' '}
          <span className="text-darkBlue">{t('journal:JOURNAL.BROWSE')}</span>
        </p>
        <p className="text-center text-lightGray4">{t('journal:JOURNAL.MAXIMUM_SIZE')}</p>

        <input
          id="journal-upload-area"
          name="journal-upload-area"
          accept="image/*,application/pdf"
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
};

export default JournalUploadArea;
