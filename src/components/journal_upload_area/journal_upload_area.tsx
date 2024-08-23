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
import { addItem, deleteItem } from '@/lib/utils/indexed_db/ocr';
import { IOCR, IOCRItem } from '@/interfaces/ocr';

interface FileInfo {
  file: File;
  name: string;
  size: string;
}

const JournalUploadArea = () => {
  const { t } = useTranslation('common');
  const { userAuth, selectedCompany } = useUserCtx();
  const { setInvoiceIdHandler, addPendingOCRHandler, deletePendingOCRHandler, addOCRHandler } =
    useAccountingCtx();
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

  const encryptFileAndSaveToIndexedDB = async (file: File) => {
    // Info: 檢查是否有使用者和公司資訊 (20240822 - Shirley)
    if (!userAuth?.id || !selectedCompany?.id) {
      return;
    }

    const fileSize = transformBytesToFileSizeString(file.size);

    // Info: 讀取文件內容為 ArrayBuffer (20240822 - Shirley)
    const fileArrayBuffer = await file.arrayBuffer();
    const uuid = uuidv4();
    // Info: 生成 RSA 密鑰對 (20240822 - Shirley)
    const keyPair = await generateKeyPair();
    const publicKey = await exportPublicKey(keyPair.publicKey);

    // Info: 生成初始向量 (20240822 - Shirley)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Info: 使用混合加密方法加密文件 (20240822 - Shirley)
    const { encryptedContent, encryptedSymmetricKey } = await encryptFile(
      fileArrayBuffer,
      await importPublicKey(publicKey),
      iv
    );

    // Info: 將加密後的文件數據存儲到 IndexedDB (20240822 - Shirley)
    const now = getTimestampNow();
    const testId = uuid;
    const testData: IOCRItem = {
      name: file.name,
      size: fileSize,
      type: file.type,
      encryptedContent,
      timestamp: now,
      uploadIdentifier: uuid,
      encryptedSymmetricKey,
      publicKey,
      companyId: selectedCompany?.id || -1,
      iv,
      userId: userAuth?.id || -1,
    };
    await addItem(testId, testData);
  };

  // Info: (20240711 - Julian) 處理上傳檔案
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const { files } = event.target;
    if (files && files.length > 0) {
      const file = files[0];
      const fileSize = transformBytesToFileSizeString(file.size);
      setUploadFile({
        file,
        name: file.name,
        size: fileSize,
      });

      encryptFileAndSaveToIndexedDB(file);
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

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      const fileSize = transformBytesToFileSizeString(droppedFile.size);
      setUploadFile({
        file: droppedFile,
        name: droppedFile.name,
        size: fileSize,
      });
      setIsDragOver(false);

      encryptFileAndSaveToIndexedDB(droppedFile);
    }
  };

  useEffect(() => {
    if (uploadFile && selectedCompany) {
      const formData = new FormData();
      const uuid = uuidv4();
      formData.append('image', uploadFile.file);
      formData.append('imageSize', uploadFile.size);
      formData.append('imageName', uploadFile.name);
      formData.append('uploadIdentifier', uuid);

      addPendingOCRHandler(uploadFile.name, uploadFile.size, uuid);
      uploadInvoice({ params: { companyId: selectedCompany.id }, body: formData });
    }
  }, [uploadFile]);

  useEffect(() => {
    if (uploadSuccess && results) {
      results.forEach(async (result) => {
        /* Info: (20240805 - Anna) 將狀態的翻譯key值存到變數 */
        const translatedStatus = t(
          `PROGRESS_STATUS.${result.status.toUpperCase().replace(/_/g, '_')}`
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
            // Info: 刪除 IndexedDB 中的數據 (20240822 - Shirley)
            await deleteItem(result?.uploadIdentifier);
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
          {t('JOURNAL.DROP_YOUR_FILES_HERE_OR')}{' '}
          <span className="text-darkBlue">{t('JOURNAL.BROWSE')}</span>
        </p>
        <p className="text-center text-lightGray4">{t('JOURNAL.MAXIMUM_SIZE')}</p>

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
