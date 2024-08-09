import React, { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { IAccountResultStatus } from '@/interfaces/accounting_account';
import { useUserCtx } from '@/contexts/user_context';
import { useGlobalCtx } from '@/contexts/global_context';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { ProgressStatus } from '@/constants/account';
import { MessageType } from '@/interfaces/message_modal';

const JournalUploadArea = () => {
  const { t } = useTranslation('common');
  const { selectedCompany } = useUserCtx();
  const { setInvoiceIdHandler } = useAccountingCtx();
  const { messageModalDataHandler, messageModalVisibilityHandler } = useGlobalCtx();

  const {
    trigger: uploadInvoice,
    data: results,
    success: uploadSuccess,
    code: uploadCode,
  } = APIHandler<IAccountResultStatus[]>(APIName.OCR_UPLOAD);

  // Info: (20240711 - Julian) 上傳的檔案
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  // Info: (20240711 - Julian) 決定是否顯示 modal 的 flag
  const [isShowSuccessModal, setIsShowSuccessModal] = useState<boolean>(false);
  // Info: (20240711 - Julian) 拖曳的樣式
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Info: (20240711 - Julian) 處理上傳檔案
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const { files } = event.target;
    if (files && files.length > 0) {
      setUploadFile(files[0]);
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
    const droppedFile = event.dataTransfer.files[0]; // Info: 如果有多個檔案，只取第一個檔案 (20240701 - Shirley)
    if (droppedFile) {
      setUploadFile(droppedFile);
      setIsDragOver(false);
    }
  };

  useEffect(() => {
    if (uploadFile && selectedCompany) {
      const formData = new FormData();
      formData.append('image', uploadFile);

      // Info: (20240711 - Julian) 點擊上傳後才升起 flag
      setIsShowSuccessModal(true);
      uploadInvoice({ params: { companyId: selectedCompany.id }, body: formData });
    }
  }, [uploadFile]);

  useEffect(() => {
    if (uploadSuccess && results && isShowSuccessModal) {
      results.forEach((result) => {
        const { resultId } = result;
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
          messageModalDataHandler({
            // title: 'Upload Successful',
            title: t('JOURNAL.UPLOAD_SUCCESSFUL'),
            /* Info: (20240805 - Anna) 將上傳狀態替換為翻譯過的 */
            // content: result.status,
            content: translatedStatus,
            messageType: MessageType.SUCCESS,
            submitBtnStr: t('JOURNAL.DONE'),
            submitBtnFunction: () => {
              setInvoiceIdHandler(resultId);
              messageModalVisibilityHandler();
            },
          });
          messageModalVisibilityHandler();
          setIsShowSuccessModal(false); // Info: (20240528 - Julian) 顯示完後將 flag 降下
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
  }, [uploadSuccess, results, isShowSuccessModal]);

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
