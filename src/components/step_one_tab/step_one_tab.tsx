import { useEffect, useState } from 'react';
import Image from 'next/image';
import { FiSend } from 'react-icons/fi';
import { useGlobalCtx } from '@/contexts/global_context';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { useUserCtx } from '@/contexts/user_context';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { IUnprocessedJournal } from '@/interfaces/journal';
import { ToastType } from '@/interfaces/toastify';
import { ProgressStatus } from '@/constants/account';
import UploadedFileItem from '@/components/uploaded_file_item/uploaded_file_item';
import Pagination from '@/components/pagination/pagination';

/**  ToDo: (20240523 - Julian) replace dummyFileList with real data */
// const dummyFileList: IUnprocessedJournal[] = [
//   {
//     id: 1,
//     aichResultId: 'b6e8a6c6e7',
//     imageName: 'invoice_0001.pdf',
//     imageUrl: '/elements/anonymous_avatar.svg',
//     imageSize: '100 KB',
//     progress: 100,
//     status: ProgressStatus.SUCCESS,
//     createdAt: Date.now(),
//   },
//   {
//     id: 2,
//     aichResultId: 'invoiceId-0002',
//     imageName: 'invoice_0002.pdf',
//     imageUrl: '/elements/anonymous_avatar.svg',
//     imageSize: '150 KB',
//     progress: 82,
//     status: ProgressStatus.IN_PROGRESS,
//     createdAt: Date.now(),
//   },
//   {
//     id: 3,
//     aichResultId: 'invoiceId-0003',
//     imageName: 'invoice_0003.pdf',
//     imageUrl: '/elements/anonymous_avatar.svg',
//     imageSize: '175 KB',
//     progress: 40,
//     status: ProgressStatus.PAUSED,
//     createdAt: Date.now(),
//   },
//   {
//     id: 4,
//     aichResultId: 'invoiceId-0004',
//     imageName: 'invoice_0004.pdf',
//     imageUrl: '/elements/anonymous_avatar.svg',
//     imageSize: '200 KB',
//     progress: 30,
//     status: ProgressStatus.LLM_ERROR,
//     createdAt: Date.now(),
//   },
// ];

const StepOneTab = () => {
  const { cameraScannerVisibilityHandler, toastHandler } = useGlobalCtx();
  const { selectedCompany } = useUserCtx();
  const { selectUnprocessedJournalHandler } = useAccountingCtx();
  const [load, setLoad] = useState(true);
  const [currentFilePage, setCurrentFilePage] = useState<number>(1);
  const [fileList, setFileList] = useState<IUnprocessedJournal[]>([]);
  const [totalPages, setTotalPages] = useState<number>(1);

  const {
    trigger: listUnprocessedJournal,
    data: unprocessJournals,
    error: listError,
    success: listSuccess,
    code: listCode,
  } = APIHandler<IUnprocessedJournal[]>(APIName.JOURNAL_LIST_UNPROCESSED, {
    params: { companyId: selectedCompany?.id || '1' },
  });

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (load) {
      interval = setInterval(() => {
        listUnprocessedJournal();
      }, 2000);
      if (listSuccess === false) {
        toastHandler({
          id: `listUnprocessedJournal-${listCode}`,
          content: `Failed to list unprocessed journals: ${listCode}`,
          type: ToastType.ERROR,
          closeable: true,
        });
        setLoad(false);
      }
    }

    return () => clearInterval(interval);
  }, [listError, listSuccess, listCode]);

  const handleJournalClick = (unprocessJournal: IUnprocessedJournal) => {
    if (unprocessJournal.status === ProgressStatus.SUCCESS) {
      selectUnprocessedJournalHandler(unprocessJournal);
    }
  };

  useEffect(() => {
    if (listSuccess && unprocessJournals) {
      //const newList = dummyFileList.concat(unprocessJournals);
      setFileList(unprocessJournals);
    }
  }, [listSuccess, unprocessJournals]);

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

  const displayedFileList = fileList.map((data) => (
    <UploadedFileItem
      key={data.id}
      itemData={data}
      pauseHandler={fileItemPauseHandler}
      deleteHandler={fileItemDeleteHandler}
      clickHandler={handleJournalClick}
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
          onClick={cameraScannerVisibilityHandler}
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
