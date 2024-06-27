import { useEffect, useState } from 'react';
import Image from 'next/image';
import { FiSend } from 'react-icons/fi';
import { useGlobalCtx } from '@/contexts/global_context';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { useUserCtx } from '@/contexts/user_context';
import { IUnprocessedOCR } from '@/interfaces/ocr';
import { ToastType } from '@/interfaces/toastify';
import { ProgressStatus } from '@/constants/account';
import UploadedFileItem from '@/components/uploaded_file_item/uploaded_file_item';
import Pagination from '@/components/pagination/pagination';
import Link from 'next/link';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useTranslation } from 'next-i18next';

const StepOneTab = () => {
  const { t } = useTranslation('common');
  const { cameraScannerVisibilityHandler, toastHandler } = useGlobalCtx();
  const { selectedCompany } = useUserCtx();
  const { OCRList, OCRListStatus, updateOCRListHandler, selectOCRHandler } = useAccountingCtx();
  const [currentFilePage, setCurrentFilePage] = useState<number>(1);
  const [fileList, setFileList] = useState<IUnprocessedOCR[]>(OCRList);
  const [totalPages, setTotalPages] = useState<number>(1);

  useEffect(() => {
    updateOCRListHandler(selectedCompany!.id, true);

    return () => updateOCRListHandler(selectedCompany!.id, false);
  }, []);

  useEffect(() => {
    if (OCRListStatus.listSuccess === false) {
      toastHandler({
        id: `listUnprocessedOCR-${OCRListStatus.listCode}`,
        content: `Failed to list unprocessed OCRs: ${OCRListStatus.listCode}`,
        type: ToastType.ERROR,
        closeable: true,
      });
    }
    if (OCRListStatus.listSuccess) {
      setFileList(OCRList);
    }

    return () => {};
  }, [OCRList, OCRListStatus]);

  const handleOCRClick = (unprocessOCR: IUnprocessedOCR) => {
    if (unprocessOCR.status === ProgressStatus.SUCCESS) {
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

  const fileItemDeleteHandler = (id: number) => {
    // ToDo: (20240528 - Julian) 應串接刪除 item 的 API
    const newList = fileList.filter((data) => data.id !== id);
    setFileList(newList);
  };

  const qrCodeScanClickHandler = () => {
    if (selectedCompany) {
      cameraScannerVisibilityHandler();
    } else {
      toastHandler({
        id: 'qrCodeScanClickHandler',
        content: (
          <div className="flex items-center justify-between">
            <p>{t('JOURNAL.PLEASE_SELECT_A_COMPANY_FIRST')}</p>
            <Link
              href={ISUNFA_ROUTE.SELECT_COMPANY}
              className="font-semibold text-link-text-warning hover:opacity-70"
            >
              {t('JOURNAL.GO_TO_SELECT')}
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

  const uploadedFileSection =
    fileList.length > 0 ? (
      <>
        <div className="my-5 flex items-center gap-4">
          <hr className="block flex-1 border-lightGray4 md:hidden" />
          <div className="flex items-center gap-2 text-sm">
            <Image
              src="/icons/upload_file_list.svg"
              width={16}
              height={16}
              alt="upload_file_icon"
            />
            <p>{t('JOURNAL.UPLOADED FILE')}</p>
          </div>
          <hr className="flex-1 border-lightGray4" />
        </div>
        {/* Info: (20240523 - Julian) Uploaded File List */}
        <div className="mb-50px flex flex-col items-center gap-y-50px">
          <div className="flex w-full flex-col items-center gap-y-12px">{displayedFileList}</div>
          {/* Info: (20240523 - Julian) Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentFilePage}
              totalPages={totalPages}
              setCurrentPage={setCurrentFilePage}
              pagePrefix="filePage"
            />
          )}
        </div>
      </>
    ) : null;

  return (
    <div className="flex flex-col gap-8px">
      {/* Info: (20240523 - Julian) Uploaded File Section */}
      {uploadedFileSection}

      {/* Info: (20240422 - Julian) label */}
      <p className="text-sm font-semibold text-navyBlue2">{t('JOURNAL.DESCRIPTION_OF_EVENTS')}</p>

      {/* Info: (20240422 - Julian) input */}
      <div className="flex items-center divide-x divide-lightGray3 rounded border border-lightGray3 bg-white">
        <input
          className="flex-1 bg-transparent px-20px text-tertiaryBlue outline-none placeholder:text-lightGray4"
          placeholder="Enter a description"
        />
        <button
          type="button"
          className="flex items-center gap-10px p-20px text-tertiaryBlue hover:text-primaryYellow"
        >
          <p className="hidden md:block">
            {t('CONTACT_US.SUBMIT')}
            {t('CONTACT_US.SUBMIT')}
          </p>
          <FiSend />
        </button>
      </div>

      {/* Info: (20240422 - Julian) tip */}
      <p className="text-sm text-lightGray5">{t('JOURNAL.DESCRIPTION_EXAMPLE')}</p>

      {/* Info: (20240422 - Julian) Divider */}
      <div className="my-5 flex items-center gap-4">
        <hr className="block flex-1 border-lightGray4 md:hidden" />
        <div className="flex items-center gap-2 text-sm">
          <Image src="/icons/upload.svg" width={16} height={16} alt="bill_icon" />
          <p>{t('JOURNAL.UPLOAD_CERTIFICATE')}</p>
        </div>
        <hr className="flex-1 border-lightGray4" />
      </div>

      <div className="my-20px flex flex-col items-center gap-40px md:flex-row">
        {/* Info: (20240422 - Julian) Upload area */}
        <div className="flex h-200px w-300px flex-col items-center justify-center rounded-lg border border-dashed border-lightGray6 bg-white p-24px md:h-240px md:w-auto md:flex-1 md:p-48px">
          <Image src="/icons/upload_file.svg" width={55} height={60} alt="upload_file" />
          <p className="mt-20px font-semibold text-navyBlue2">
            {t('JOURNAL.DROP_YOUR_FILES_HERE_OR')}{' '}
            <span className="text-darkBlue">{t('JOURNAL.BROWSE')}</span>
          </p>
          <p className="text-center text-lightGray4">{t('JOURNAL.MAXIMUM_SIZE')}</p>
        </div>

        <h3 className="text-xl font-bold text-lightGray4">OR</h3>

        {/* Info: (20240422 - Julian) Scan QR code */}
        <button
          type="button"
          onClick={qrCodeScanClickHandler}
          className="flex h-200px w-300px flex-col items-center justify-center rounded-lg border border-dashed border-lightGray6 bg-white p-24px md:h-240px md:w-auto md:flex-1 md:p-48px"
        >
          <Image src="/icons/scan_qrcode.svg" width={55} height={60} alt="scan_qr_code" />
          <div className="mt-20px flex items-center gap-10px">
            <Image src="/icons/scan.svg" width={20} height={20} alt="scan" />
            <p className="font-semibold text-navyBlue2">
              {t('JOURNAL.USE_YOUR_PHONE_AS')}{' '}
              <span className="text-primaryYellow">{t('JOURNAL.SCANNER')}</span>
            </p>
          </div>
          <p className="text-center text-lightGray4">{t('JOURNAL.SCAN_THE_QRCODE')}</p>
        </button>
      </div>
    </div>
  );
};

export default StepOneTab;
