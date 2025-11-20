import React, { useState, ChangeEvent } from 'react';
import { RxCross2 } from 'react-icons/rx';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import ImageZoom from '@/components/image_zoom/image_zoom';
import { Button } from '@/components/button/button';
import { IDatePeriod } from '@/interfaces/date_period';
import { default30DayPeriodInSec } from '@/constants/display';

interface ITaxEditModalProps {
  isModalOpen: boolean;
  onClose: () => void;
}

const TaxEditModal: React.FC<ITaxEditModalProps> = ({ isModalOpen, onClose }) => {
  const [noInputValue, setNoInputValue] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<IDatePeriod>(default30DayPeriodInSec);

  const handleNoInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNoInputValue(e.target.value);
  };

  const isDisplayedModal = isModalOpen ? (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="flex flex-col gap-32px rounded-lg bg-surface-neutral-surface-lv2 px-40px py-16px">
        {/* Info: (20251120 - Julian) Modal Header */}
        <div className="relative flex flex-col items-center">
          <h2 className="test-xl font-bold text-card-text-primary">Edit Voucher</h2>
          <p className="text-xs font-normal text-card-text-secondary">Invoice information</p>
          <button
            type="button"
            className="absolute right-0 p-10px text-button-text-secondary"
            onClick={onClose}
          >
            <RxCross2 size={20} />
          </button>
        </div>
        {/* Info: (20251120 - Julian) Modal Body */}
        <div className="grid grid-cols-2">
          {/* Info: (20251120 - Julian) Left part */}
          <div className="w-400px pr-24px">
            <ImageZoom
              imageUrl="/images/demo_certifate.png"
              className="h-full w-full"
              controlPosition="bottom-right"
              isControlBackground
            />
          </div>
          {/* Info: (20251120 - Julian) Right part */}
          <div className="grid grid-cols-2 gap-16px border-l border-divider-stroke-lv-4 pl-24px">
            {/* Info: (20251120 - Julian) ========= Invoice No. ========= */}
            <div className="col-span-2 flex flex-col gap-8px">
              <p className="text-sm font-semibold text-input-text-primary">
                Invoice No. <span className="text-text-state-error">*</span>
              </p>
              <div className="rounded-sm border border-input-text-input-placeholder px-12px py-10px">
                <input
                  type="text"
                  value={noInputValue}
                  onChange={handleNoInputChange}
                  placeholder="12345678"
                  className="bg-transparent outline-none placeholder:text-input-text-input-placeholder"
                />
              </div>
            </div>
            {/* Info: (20251120 - Julian) ========= Issue Date ========= */}
            <div className="col-span-2 flex flex-col gap-8px">
              <p className="text-sm font-semibold text-input-text-primary">
                Issue Date <span className="text-text-state-error">*</span>
              </p>
              <DatePicker
                type={DatePickerType.TEXT_DATE}
                period={selectedDate}
                setFilteredPeriod={setSelectedDate}
                btnClassName="border-input-text-input-placeholder"
              />
            </div>
            {/* Info: (20251120 - Julian) ========= Trading Partner ========= */}
            <div className="col-span-2 flex flex-col gap-8px">
              <p className="text-sm font-semibold text-input-text-primary">Trading Partner</p>
              <div className="rounded-sm border border-input-text-input-placeholder px-12px py-10px">
                <input
                  type="text"
                  placeholder="12345678"
                  className="bg-transparent outline-none placeholder:text-input-text-input-placeholder"
                />
              </div>
            </div>
            {/* Info: (20251120 - Julian) ========= Tax Type ========= */}
            <div className="col-span-2 flex flex-col gap-8px">
              <p className="text-sm font-semibold text-input-text-primary">
                Tax Type <span className="text-text-state-error">*</span>
              </p>
              <div className="rounded-sm border border-input-text-input-placeholder px-12px py-10px">
                <input
                  type="text"
                  placeholder="12345678"
                  className="bg-transparent outline-none placeholder:text-input-text-input-placeholder"
                />
              </div>
            </div>
            {/* Info: (20251120 - Julian) ========= Sales Amount ========= */}
            <div className="flex flex-col gap-8px">
              <p className="text-sm font-semibold text-input-text-primary">
                Sales Amount <span className="text-text-state-error">*</span>
              </p>
              <div className="rounded-sm border border-input-text-input-placeholder px-12px py-10px">
                <input
                  type="text"
                  placeholder="12345678"
                  className="bg-transparent outline-none placeholder:text-input-text-input-placeholder"
                />
              </div>
            </div>
            {/* Info: (20251120 - Julian) ========= Tax ========= */}
            <div className="flex flex-col gap-8px">
              <p className="text-sm font-semibold text-input-text-primary">
                Tax <span className="text-text-state-error">*</span>
              </p>
              <div className="rounded-sm border border-input-text-input-placeholder px-12px py-10px">
                <input
                  type="text"
                  placeholder="12345678"
                  className="bg-transparent outline-none placeholder:text-input-text-input-placeholder"
                />
              </div>
            </div>
          </div>
        </div>
        {/* Info: (20251120 - Julian) Buttons */}
        <div className="ml-auto flex items-center gap-12px">
          <Button type="button" variant="tertiaryOutline">
            Cancel
          </Button>
          <Button type="button" variant="tertiary">
            Save
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return isDisplayedModal;
};

export default TaxEditModal;
