import { useEffect, useState } from 'react';
import Image from 'next/image';
// Info: (20240808 - Anna) Alpha版先隱藏(事件描述)
// import { FiSend } from 'react-icons/fi';
import { useGlobalCtx } from '@/contexts/global_context';
import { useModalContext } from '@/contexts/modal_context';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { useUserCtx } from '@/contexts/user_context';
import { IOCR } from '@/interfaces/ocr';
import { ToastType } from '@/interfaces/toastify';
import { ProgressStatus } from '@/constants/account';
import UploadedFileItem, {
  PendingUploadedFileItem,
} from '@/components/uploaded_file_item/uploaded_file_item';
// Info: (20240809 - Shirley) disabled for now , 分頁功能在 alpha release 還沒實作
// import Pagination from '@/components/pagination/pagination';
import JournalUploadArea from '@/components/journal_upload_area/journal_upload_area';
import Link from 'next/link';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useTranslation } from 'next-i18next';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';

// Info: (20240808 - Anna) Alpha版先隱藏(事件描述)
// 原本代碼是：
// const StepOneTab = ({
//   inputDescription,
//   handleInputChange,
//   handelClick,
// }: {
//   inputDescription: string;
//   handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
//   handelClick: () => void;
// }) =>
const StepOneTab = () => {
  const { t } = useTranslation(['common', 'journal']);
  const { cameraScannerVisibilityHandler } = useGlobalCtx();
  const { toastHandler } = useModalContext();
  const { selectedAccountBook } = useUserCtx();
  const {
    OCRList,
    OCRListStatus,
    updateOCRListHandler,
    selectOCRHandler,
    deleteOCRHandler,
    pendingOCRList,
  } = useAccountingCtx();
  // Info: (20240809 - Shirley) disabled for now , 分頁功能在 alpha release 還沒實作
  // const [currentFilePage, setCurrentFilePage] = useState<number>(1);
  const [fileList, setFileList] = useState<IOCR[]>(OCRList);
  // const [pendingFileList, setPendingFileList] = useState<IOCR[]>(pendingOCRList);
  // Info: (20240809 - Shirley) disabled for now , 分頁功能在 alpha release 還沒實作
  const [, /* totalPages */ setTotalPages] = useState<number>(1);
  const { trigger: deleteOCRTrigger } = APIHandler<void>(APIName.OCR_DELETE);

  useEffect(() => {
    const companyId = selectedAccountBook?.id;
    updateOCRListHandler(companyId, true);

    return () => updateOCRListHandler(companyId, false);
  }, []);

  useEffect(() => {
    if (OCRListStatus.listSuccess === false) {
      toastHandler({
        id: `listUnprocessedOCR-${OCRListStatus.listCode}`,
        // Info: (20240805 - Anna) 將上傳憑證的吐司通知翻譯
        // content: `Failed to list unprocessed OCRs: ${OCRListStatus.listCode}`,
        content: t('journal:JOURNAL.FAILED_TO_LIST_UNPROCESSED_OCRS', {
          code: OCRListStatus.listCode,
        }),
        type: ToastType.ERROR,
        closeable: true,
      });
    }
    if (OCRListStatus.listSuccess) {
      setFileList(OCRList);
    }

    return () => {};
  }, [OCRList, OCRListStatus]);

  const handleOCRClick = (unprocessOCR: IOCR) => {
    // Info (20240809 - Murky): To Emily, 改成讓只要有圖片 就可以點了
    // if (unprocessOCR.status === ProgressStatus.SUCCESS) {
    //   selectOCRHandler(unprocessOCR);
    // }

    if (unprocessOCR.imageUrl && unprocessOCR.imageUrl.length > 0) {
      selectOCRHandler(unprocessOCR);
    }
  };

  useEffect(() => {
    setTotalPages(Math.ceil(fileList.length / 5));
  }, [fileList]);

  const fileItemPauseHandler = (id: number) => {
    const newList = fileList.map((data) => {
      if (data.id === id) {
        return {
          ...data,
          status:
            data.status === ProgressStatus.PAUSED
              ? ProgressStatus.IN_PROGRESS
              : ProgressStatus.PAUSED,
        };
      }
      return data;
    });
    setFileList(newList);
  };

  const fileItemDeleteHandler = async (aichResultId: string) => {
    // Info: (20240718 - Tzuhan) To Julian, Emily 已串接刪除 item 的 API
    const { success, code } = await deleteOCRTrigger({
      params: { companyId: selectedAccountBook!.id, resultId: aichResultId },
    });
    if (success === false) {
      toastHandler({
        id: `deleteUnprocessedOCR-${code}`,
        /* Info: (20240805 - Anna) 將上傳憑證的吐司通知翻譯 */
        // content: `Failed to delete unprocessed OCR: ${code}, `,
        content: t('journal:JOURNAL.FAILED_TO_DELETE_UNPROCESSED_OCR', { code }),
        type: ToastType.ERROR,
        closeable: true,
      });
    } else if (success) {
      deleteOCRHandler(aichResultId);
      toastHandler({
        id: `deleteUnprocessedOCR-${code}`,
        // Info: (20240805 - Anna) 將上傳憑證的吐司通知翻譯
        // content: `Successfully deleted unprocessed OCR: ${code}`,
        content: t('journal:JOURNAL.SUCCESSFULLY_DELETED_UNPROCESSED_OCR', { code }),
        type: ToastType.SUCCESS,
        closeable: true,
      });
    }
  };

  const qrCodeScanClickHandler = () => {
    if (selectedAccountBook) {
      cameraScannerVisibilityHandler();
    } else {
      toastHandler({
        id: 'qrCodeScanClickHandler',
        content: (
          <div className="flex items-center justify-between">
            <p>{t('journal:JOURNAL.PLEASE_SELECT_A_COMPANY_FIRST')}</p>
            <Link
              href={ISUNFA_ROUTE.DASHBOARD}
              className="font-semibold text-link-text-warning hover:opacity-70"
            >
              {t('journal:JOURNAL.GO_TO_SELECT')}
            </Link>
          </div>
        ),
        type: ToastType.ERROR,
        closeable: true,
      });
    }
  };

  const displayedFileList = fileList.map((data) => (
    <UploadedFileItem
      key={data.id}
      itemData={data}
      pauseHandler={fileItemPauseHandler}
      deleteHandler={fileItemDeleteHandler}
      clickHandler={handleOCRClick}
    />
  ));

  const displayedPendingFileList = pendingOCRList.map((data) => (
    <PendingUploadedFileItem
      key={data.uploadIdentifier}
      imageName={data.name}
      imageSize={data.size}
    />
  ));

  const uploadedFileSection =
    fileList.length > 0 || pendingOCRList.length > 0 ? (
      <>
        <div className="my-5 flex items-center gap-4">
          <hr className="block flex-1 border-divider-stroke-lv-3 md:hidden" />
          <div className="flex items-center gap-2 text-sm">
            <Image
              src="/icons/upload_file_list.svg"
              width={16}
              height={16}
              alt="upload_file_icon"
            />
            <p>{t('journal:JOURNAL.UPLOADED_FILE')}</p>
          </div>
          <hr className="flex-1 border-divider-stroke-lv-3" />
        </div>
        {/* Info: (20240523 - Julian) Uploaded File List */}
        <div className="mb-50px flex flex-col items-center gap-y-50px">
          <div className="flex w-full flex-col items-center gap-y-12px">
            {displayedFileList}
            {displayedPendingFileList}
          </div>

          {/* Info: (20240523 - Julian) Pagination */}
          {/* Info: (20240809 - Shirley) disabled for now , 分頁功能在 alpha release 還沒實作 */}
          {/* {totalPages > 1 && (
            <Pagination
              currentPage={currentFilePage}
              totalPages={totalPages}
              setCurrentPage={setCurrentFilePage}
              pagePrefix="filePage"
            />
          )} */}
        </div>
      </>
    ) : null;

  return (
    <div className="flex flex-col gap-8px">
      {/* Info: (20240523 - Julian) Uploaded File Section */}
      {uploadedFileSection}
      {/* Info: (20240808 - Anna) Alpha版先隱藏(事件描述) */}
      {/* Info: (20240422 - Julian) label */}
      {/* <p className="text-sm font-semibold text-navyBlue2">{t('journal:JOURNAL.DESCRIPTION_OF_EVENTS')}</p> */}
      {/* Info: (20240422 - Julian) input */}
      {/* <div className="flex items-center divide-x divide-input-stroke-input rounded border border-input-stroke-input bg-white">
        <input
          className="flex-1 bg-transparent px-20px text-tertiaryBlue outline-none placeholder:text-input-text-input-placeholder"
          placeholder={t('common:COMMON.ENTER_A_DESCRIPTION')}
          value={inputDescription}
          onChange={handleInputChange}
        />
        <button
          type="button"
          className="flex items-center gap-10px p-20px text-tertiaryBlue hover:text-primaryYellow"
          onClick={handelClick}
        >
          <p className="hidden md:block">{t('common:CONTACT_US.SUBMIT')}</p>
          <FiSend />
        </button>
      </div> */}
      {/* Info: (20240422 - Julian) tip */}
      {/* <p className="text-sm text-input-text-secondary">{t('journal:JOURNAL.DESCRIPTION_EXAMPLE')}</p> */}
      {/* Info: (20240422 - Julian) Divider */}
      <div className="my-5 flex items-center gap-4">
        <hr className="block flex-1 border-divider-stroke-lv-3 md:hidden" />
        <div className="flex items-center gap-2 text-sm">
          <Image src="/icons/upload.svg" width={16} height={16} alt="bill_icon" />
          <p>{t('journal:JOURNAL.UPLOAD_CERTIFICATE')}</p>
        </div>
        <hr className="flex-1 border-divider-stroke-lv-3" />
      </div>
      <div className="my-20px flex flex-col items-center gap-40px md:flex-row">
        {/* Info: (20240422 - Julian) Upload area */}
        <JournalUploadArea />

        <h3 className="text-xl font-bold text-text-neutral-tertiary">{t('common:COMMON.OR')}</h3>

        {/* Info: (20240422 - Julian) Scan QR code */}
        <div className="h-200px w-300px rounded-lg bg-drag-n-drop-surface-primary md:h-240px md:w-auto md:flex-1">
          <button
            type="button"
            onClick={qrCodeScanClickHandler}
            // ToDo: (20240802 - Julian) [Beta] Not released yet
            disabled
            className="group flex h-full w-full flex-col items-center justify-center rounded-lg border border-dashed p-24px hover:border-drag-n-drop-stroke-focus hover:bg-drag-n-drop-surface-hover disabled:border-drag-n-drop-stroke-disable disabled:bg-drag-n-drop-surface-disable md:p-48px"
          >
            <Image
              src="/icons/scan_qrcode.svg"
              width={55}
              height={60}
              alt="scan_qr_code"
              className="group-disabled:grayscale"
            />
            <div className="mt-20px flex items-center gap-10px">
              <Image
                src="/icons/scan.svg"
                width={20}
                height={20}
                alt="scan"
                className="group-disabled:grayscale"
              />
              <p className="font-semibold text-drag-n-drop-text-primary group-disabled:text-drag-n-drop-text-disable">
                {t('journal:JOURNAL.USE_YOUR_PHONE_AS')}{' '}
                <span className="text-text-brand-primary-lv2 group-disabled:text-drag-n-drop-text-disable">
                  {t('journal:JOURNAL.SCANNER')}
                </span>
              </p>
            </div>
            <p className="text-center text-drag-n-drop-text-note group-disabled:text-drag-n-drop-text-disable">
              {t('journal:JOURNAL.SCAN_THE_QRCODE')}
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StepOneTab;
