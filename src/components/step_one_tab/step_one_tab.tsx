import Image from 'next/image';
import { FiSend } from 'react-icons/fi';

const StepOneTab = () => {
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
        <button type="button" className="flex items-center gap-10px p-20px text-tertiaryBlue">
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

      <div className="flex items-center justify-between gap-40px">
        <div className="flex flex-col rounded border border-dashed border-lightGray6 bg-white p-48px">
          <p>Drop your files here or</p>
        </div>
      </div>
    </div>
  );
};

export default StepOneTab;
