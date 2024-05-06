import Image from 'next/image';
import { FiSend } from 'react-icons/fi';
import { useGlobalCtx } from '@/contexts/global_context';

const StepOneTab = () => {
  const { cameraScannerVisibilityHandler } = useGlobalCtx();

  return (
    <div className="flex flex-col gap-8px">
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
