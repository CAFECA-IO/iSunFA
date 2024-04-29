/* eslint-disable */
import Image from 'next/image';
import { RxCross2 } from 'react-icons/rx';
import { LuTag } from 'react-icons/lu';
import { Button } from '../button/button';

interface IConfirmModalProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

const ConfirmModal = ({ isModalVisible, modalVisibilityHandler }: IConfirmModalProps) => {
  const displayType = <p className="text-lightRed">Expense</p>;

  const displayReason = (
    <div className="flex items-center gap-12px">
      <p>Equipment</p>
      <div className="flex items-center gap-4px rounded-xs border border-primaryYellow5 px-4px text-sm text-primaryYellow5">
        <LuTag size={14} />
        Printer
      </div>
    </div>
  );

  const displayVendor = <p className="font-semibold text-navyBlue2">華碩雲端股份有限公司</p>;

  const displayDescription = <p className="font-semibold text-navyBlue2">Buy a new printer</p>;

  const displayTotalPrice = (
    <div className="flex flex-col items-end">
      <p>
        <span className="font-semibold text-navyBlue2">30,000</span> TWD
      </p>
      <p>
        (Includes <span className="font-semibold text-navyBlue2">5%</span> Tax and{' '}
        <span className="font-semibold text-navyBlue2">0</span> TWD fee)
      </p>
    </div>
  );

  const displayMethod = (
    <p className="font-semibold text-navyBlue2">Transfer- 004 2888810000824888</p>
  );

  const displayPeriod = <p className="font-semibold text-navyBlue2">Pay at once</p>;

  const displayStatus = <p className="font-semibold text-navyBlue2">Paid</p>;

  const displayProject = (
    <div className="flex w-fit items-center gap-2px rounded bg-primaryYellow3 px-8px py-2px font-medium text-primaryYellow2">
      <div className="flex h-14px w-14px items-center justify-center rounded-full bg-indigo text-xxs text-white">
        BF
      </div>
      <p>BAIFA</p>
    </div>
  );

  const displayContract = <p className="font-semibold text-darkBlue">Contract Name</p>;

  const isDisplayModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative flex h-fit w-90vw flex-col rounded-xs  bg-white px-20px py-16px">
        {/* Info: (20240429 - Julian) title */}
        <div className="flex items-center gap-6px">
          <Image
            src="/icons/files.svg"
            width={20}
            height={20}
            alt="files_icon"
            className="hidden md:block"
          />
          <h1 className="whitespace-nowrap text-xs font-bold text-navyBlue2 md:text-xl">
            Please make sure all the information are correct !
          </h1>
        </div>
        {/* Info: (20240429 - Julian) close button */}
        <button
          type="button"
          onClick={modalVisibilityHandler}
          className="absolute right-12px top-12px text-lightGray5"
        >
          <RxCross2 size={20} />
        </button>

        {/* Info: (20240429 - Julian) content */}
        <div className="mt-20px flex w-full flex-col gap-12px text-sm text-lightGray5 md:text-base">
          {/* Info: (20240429 - Julian) Type */}
          <div className="flex items-center justify-between">
            <p>Type</p>
            {displayType}
          </div>
          {/* Info: (20240429 - Julian) Reason */}
          <div className="flex items-center justify-between">
            <p>Reason</p>
            {displayReason}
          </div>
          {/* Info: (20240429 - Julian) Vendor/Supplier */}
          <div className="flex items-center justify-between">
            <p>Vendor/Supplier</p>
            {displayVendor}
          </div>
          {/* Info: (20240429 - Julian) Description */}
          <div className="flex items-center justify-between">
            <p>Description</p>
            {displayDescription}
          </div>
          {/* Info: (20240429 - Julian) Total Price */}
          <div className="flex items-center justify-between">
            <p>Total Price</p>
            {displayTotalPrice}
          </div>
          {/* Info: (20240429 - Julian) Payment Method */}
          <div className="flex items-center justify-between">
            <p>Payment Method</p>
            {displayMethod}
          </div>
          {/* Info: (20240429 - Julian) Payment Period */}
          <div className="flex items-center justify-between">
            <p>Payment Period</p>
            {displayPeriod}
          </div>
          {/* Info: (20240429 - Julian) Payment Status */}
          <div className="flex items-center justify-between">
            <p>Payment Status</p>
            {displayStatus}
          </div>
          {/* Info: (20240429 - Julian) Project */}
          <div className="flex items-center justify-between">
            <p>Project</p>
            {displayProject}
          </div>
          {/* Info: (20240429 - Julian) Contract */}
          <div className="flex items-center justify-between">
            <p>Contract</p>
            {displayContract}
          </div>
        </div>

        {/* Info: (20240429 - Julian) Accounting Voucher */}
        <div className="flex w-full flex-col gap-24px text-sm text-lightGray5 md:text-base">
          {/* Info: (20240429 - Julian) Divider */}
          <div className="flex items-center gap-4">
            <hr className="flex-1 border-lightGray3" />
            <div className="flex items-center gap-2 text-sm">
              <Image src="/icons/ticket.svg" width={16} height={16} alt="ticket_icon" />
              <p>Accounting Voucher</p>
            </div>
            <hr className="flex-1 border-lightGray3" />
          </div>
          {/* Info: (20240429 - Julian) List */}
          <div className="flex flex-col rounded-sm bg-[#F4F5F7] p-20px font-semibold text-navyBlue2">
            <div className="flex items-center">
              <p className="w-1/4">Accounting</p>
              <p className="w-1/4">Particulars</p>
              <p className="w-1/4">Debit</p>
              <p className="w-1/4">Credit</p>
            </div>
            <div className="mt-8px flex flex-col items-center gap-24px"></div>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default ConfirmModal;
