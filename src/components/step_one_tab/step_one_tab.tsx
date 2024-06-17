import { useEffect, useState } from 'react';
import Image from 'next/image';
import { FiSend } from 'react-icons/fi';
import { useGlobalCtx } from '@/contexts/global_context';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { useUserCtx } from '@/contexts/user_context';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { IUnprocessedOCR } from '@/interfaces/ocr';
import { ToastType } from '@/interfaces/toastify';
import { ProgressStatus } from '@/constants/account';
import UploadedFileItem from '@/components/uploaded_file_item/uploaded_file_item';
import Pagination from '@/components/pagination/pagination';
import Link from 'next/link';
import { ISUNFA_ROUTE } from '@/constants/url';

const StepOneTab = () => {
  const { cameraScannerVisibilityHandler, toastHandler } = useGlobalCtx();
  const { selectedCompany } = useUserCtx();
  const { selectOCRHandler } = useAccountingCtx();
  const [load, setLoad] = useState(true);
  const [currentFilePage, setCurrentFilePage] = useState<number>(1);
  const [fileList, setFileList] = useState<IUnprocessedOCR[]>([]);
  const [totalPages, setTotalPages] = useState<number>(1);

  const {
    trigger: listUnprocessedOCR,
    data: unprocessOCRs,
    error: listError,
    success: listSuccess,
    code: listCode,
  } = APIHandler<IUnprocessedOCR[]>(APIName.OCR_LIST, {
    params: { companyId: selectedCompany?.id || '1' },
  });

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (load) {
      interval = setInterval(() => {
        listUnprocessedOCR();
      }, 2000);
      if (listSuccess === false) {
        toastHandler({
          id: `listUnprocessedOCR-${listCode}`,
          content: `Failed to list unprocessed OCRs: ${listCode}`,
          type: ToastType.ERROR,
          closeable: true,
        });
        setLoad(false);
      }
    }

    return () => clearInterval(interval);
  }, [listError, listSuccess, listCode]);

  const handleOCRClick = (unprocessOCR: IUnprocessedOCR) => {
    if (unprocessOCR.status === ProgressStatus.SUCCESS) {
      selectOCRHandler(unprocessOCR);
    }
  };

  useEffect(() => {
    if (listSuccess && unprocessOCRs) {
      // const newList = dummyFileList.concat(unprocessOCRs);
      setFileList(unprocessOCRs);
    }
  }, [listSuccess, unprocessOCRs]);

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
            <p>Please select a company first</p>
            <Link
              href={ISUNFA_ROUTE.SELECT_COMPANY}
              className="font-semibold text-link-text-warning hover:opacity-70"
            >
              Go to select
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
            <p>Uploaded File</p>
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
      <p className="text-sm font-semibold text-navyBlue2">Description of events</p>

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
          <p className="hidden md:block">Submit</p>
          <FiSend />
        </button>
      </div>

      {/* Info: (20240422 - Julian) tip */}
      <p className="text-sm text-lightGray5">
        Ex: We spent 100 TWD in cash buying an apple from PXmart on Oct. 21, 2023.
      </p>

      {/* Info: (20240422 - Julian) Divider */}
      <div className="my-5 flex items-center gap-4">
        <hr className="block flex-1 border-lightGray4 md:hidden" />
        <div className="flex items-center gap-2 text-sm">
          <Image src="/icons/upload.svg" width={16} height={16} alt="bill_icon" />
          <p>Upload Certificate</p>
        </div>
        <hr className="flex-1 border-lightGray4" />
      </div>

      <div className="my-20px flex flex-col items-center gap-40px md:flex-row">
        {/* Info: (20240422 - Julian) Upload area */}
        <div className="flex h-200px w-300px flex-col items-center justify-center rounded-lg border border-dashed border-lightGray6 bg-white p-24px md:h-240px md:w-auto md:flex-1 md:p-48px">
          <Image src="/icons/upload_file.svg" width={55} height={60} alt="upload_file" />
          <p className="mt-20px font-semibold text-navyBlue2">
            Drop your files here or <span className="text-darkBlue">Browse</span>
          </p>
          <p className="text-center text-lightGray4">Maximum size: 50MB</p>
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
              Use Your Phone as <span className="text-primaryYellow">Scanner</span>
            </p>
          </div>
          <p className="text-center text-lightGray4">
            Please scan the QRcode to start scanning with your phone
          </p>
        </button>
      </div>
    </div>
  );
};

export default StepOneTab;
