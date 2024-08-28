import { numberWithCommas, timestampToString } from '@/lib/utils/common';
import Image from 'next/image';
import { RxCross2 } from 'react-icons/rx';
import { Button } from '@/components/button/button';

interface ISalaryBookConfirmModal {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
  data?: {
    invitation?: string;
  };
}

const SalaryBookConfirmModal = ({
  isModalVisible,
  modalVisibilityHandler,
}: ISalaryBookConfirmModal) => {
  // ToDo: (20240716 - Julian) [Beta] Replace with real data
  const type = 'Salary Bookkeeping';
  const dateTimestamp = 1705646390;
  const employeeName = 'John Doe';
  const description = 'March Salary';
  const totalPrice = 23435;
  const workingHours = 160;
  const insurancePayments = 23435;
  const paymentStatus = 'Paid';

  const confirmHandler = () => {
    // ToDo: (20240716 - Julian) [Beta] Add confirm handler

    modalVisibilityHandler();
  };

  const isDisplayedModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="relative flex w-90vw flex-col rounded-sm bg-surface-neutral-surface-lv2 py-16px font-barlow">
        {/* Info: (20240716 - Julian) title */}
        <div className="flex items-center gap-6px px-20px font-bold text-navyBlue2">
          <Image src="/icons/files.svg" width={20} height={20} alt="files_icon" />
          {/* Info: (20240716 - Julian) desktop title */}
          <h1 className="hidden whitespace-nowrap text-xl md:block">
            {'Please make sure all the information are correct !'}
          </h1>
          {/* Info: (20240716 - Julian) mobile title */}
          <h1 className="block text-xl md:hidden">{'Confirm'}</h1>
        </div>
        {/* Info: (20240716 - Julian) close button */}
        <button
          type="button"
          onClick={modalVisibilityHandler}
          className="absolute right-20px top-20px text-icon-surface-single-color-primary"
        >
          <RxCross2 size={20} />
        </button>
        {/* Info: (20240716 - Julian) content */}
        <div className="my-20px flex flex-col gap-y-16px bg-surface-neutral-main-background p-20px text-xs md:bg-transparent md:text-base">
          {/* Info: (20240716 - Julian) type */}
          <div className="flex w-full items-center justify-between">
            <p className="text-text-neutral-secondary">Type</p>
            <p className="font-semibold text-text-brand-primary-lv2">{type}</p>
          </div>
          {/* Info: (20240716 - Julian) date */}
          <div className="flex w-full items-center justify-between">
            <p className="text-text-neutral-secondary">Date</p>
            <p className="font-semibold text-text-neutral-primary">
              {timestampToString(dateTimestamp).date}
            </p>
          </div>
          {/* Info: (20240716 - Julian) Employee */}
          <div className="flex w-full items-center justify-between">
            <p className="text-text-neutral-secondary">Employee</p>
            <p className="font-semibold text-text-neutral-primary">{employeeName}</p>
          </div>
          {/* Info: (20240716 - Julian) Description */}
          <div className="flex w-full items-center justify-between">
            <p className="text-text-neutral-secondary">Description</p>
            <p className="font-semibold text-text-neutral-primary">{description}</p>
          </div>
          {/* Info: (20240716 - Julian) Total Price */}
          <div className="flex w-full items-center justify-between">
            <p className="text-text-neutral-secondary">Total Price</p>
            <p className="font-semibold text-text-neutral-primary">
              {numberWithCommas(totalPrice)} <span className="text-text-neutral-tertiary">TWD</span>
            </p>
          </div>
          {/* Info: (20240716 - Julian) Working hours */}
          <div className="flex w-full items-center justify-between">
            <p className="text-text-neutral-secondary">Working hours for the period</p>
            <p className="font-semibold text-text-neutral-primary">{workingHours}</p>
          </div>
          {/* Info: (20240716 - Julian) Insurance Payments */}
          <div className="flex w-full items-center justify-between">
            <p className="text-text-neutral-secondary">Insurance Payments</p>
            <p className="font-semibold text-text-neutral-primary">
              {numberWithCommas(insurancePayments)}{' '}
              <span className="text-text-neutral-tertiary">TWD</span>
            </p>
          </div>
          {/* Info: (20240716 - Julian) Payment Status */}
          <div className="flex w-full items-center justify-between">
            <p className="text-text-neutral-secondary">Payment Status</p>
            <p className="font-semibold text-text-neutral-primary">{paymentStatus}</p>
          </div>
        </div>
        {/* Info: (20240716 - Julian) buttons */}
        <div className="flex items-center justify-center gap-x-12px px-20px text-sm md:justify-end">
          <Button
            id="salary-bookkeeping-cancel"
            type="button"
            variant={null}
            onClick={modalVisibilityHandler}
          >
            Cancel
          </Button>
          <Button
            id="salary-bookkeeping-confirm"
            type="button"
            variant="tertiary"
            onClick={confirmHandler}
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return isDisplayedModal;
};

export default SalaryBookConfirmModal;
