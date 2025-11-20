import React, { useState, ChangeEvent } from 'react';
import Image from 'next/image';
import { RxCross2 } from 'react-icons/rx';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import ImageZoom from '@/components/image_zoom/image_zoom';
import { Button } from '@/components/button/button';
import TaxMenu from '@/components/invoice/invoice_tax_menu';
import NumericInput from '@/components/numeric_input/numeric_input';
import { IDatePeriod } from '@/interfaces/date_period';
import { default30DayPeriodInSec } from '@/constants/display';
import { TaxType } from '@/constants/invoice_rc2';

interface ITaxEditModalProps {
  isModalOpen: boolean;
  onClose: () => void;
}

const TaxEditModal: React.FC<ITaxEditModalProps> = ({ isModalOpen, onClose }) => {
  // ToDo: (20251120 - Julian) Get data from props or API
  const imageUrl: string = '/images/demo_certifate.png';
  const currency: string = 'TWD';
  const initialTaxType: TaxType = TaxType.TAXABLE;
  const initialTaxRate: number | null = 5;

  const [noInputValue, setNoInputValue] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<IDatePeriod>(default30DayPeriodInSec);
  const [selectedTaxType, setSelectedTaxType] = useState<TaxType>(initialTaxType);
  const [selectedTaxRate, setSelectedTaxRate] = useState<number | null>(initialTaxRate);
  const [salesAmountValue, setSalesAmountValue] = useState<number>(0);
  const [taxValue, setTaxValue] = useState<number>(0);

  // ToDo: (20251120 - Julian) Disable save button when input is not complete/changed
  const saveDisabled = noInputValue === '' || salesAmountValue === 0 || taxValue === 0;

  const handleNoInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNoInputValue(e.target.value);
  };

  const selectTaxHandler = ({ taxRate, taxType }: { taxRate: number | null; taxType: TaxType }) => {
    setSelectedTaxType(taxType);
    setSelectedTaxRate(taxRate);
  };

  const saveHandler = () => {
    const data = {
      invoiceNo: noInputValue,
      issueDate: selectedDate,
      taxType: selectedTaxType,
      taxRate: selectedTaxRate,
      salesAmount: salesAmountValue,
      tax: taxValue,
    };

    // ToDo: (20251120 - Julian) post data to API
    // eslint-disable-next-line no-console
    console.log('Save! :', data);

    onClose();
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
              imageUrl={imageUrl}
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
                  className="bg-transparent text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder"
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
                buttonStyleAfterDateSelected="border-input-text-input-placeholder text-input-text-input-filled"
              />
            </div>
            {/* Info: (20251120 - Julian) ========= Trading Partner ========= */}
            <div className="col-span-2 flex flex-col gap-8px">
              <p className="text-sm font-semibold text-input-text-primary">Trading Partner</p>
              <div className="rounded-sm border border-input-text-input-placeholder px-12px py-10px">
                {/* ToDo: (20251120 - Julian) During Develop */}
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
              <TaxMenu
                selectTaxHandler={selectTaxHandler}
                initialTaxType={initialTaxType}
                initialTaxRate={initialTaxRate}
                btnClassName="border-input-text-input-placeholder text-input-text-input-filled"
              />
            </div>
            {/* Info: (20251120 - Julian) ========= Sales Amount ========= */}
            <div className="flex flex-col gap-8px">
              <p className="text-sm font-semibold text-input-text-primary">
                Sales Amount <span className="text-text-state-error">*</span>
              </p>
              <div className="flex rounded-sm border border-input-text-input-placeholder">
                <NumericInput
                  id="input-sales-amount"
                  name="input-sales-amount"
                  value={salesAmountValue}
                  setValue={setSalesAmountValue}
                  isDecimal
                  hasComma
                  required
                  className="w-0 flex-1 bg-transparent px-12px py-10px text-right text-input-text-input-filled outline-none"
                />
                <div className="flex items-center gap-4px border-l border-input-text-input-placeholder px-12px py-10px text-sm text-input-text-input-placeholder">
                  <div className="size-16px shrink-0 overflow-hidden rounded-full">
                    <Image
                      src={`/currencies/${currency.toLowerCase()}.svg`}
                      width={16}
                      height={16}
                      alt={`${currency}_icon`}
                    />
                  </div>
                  <p>{currency}</p>
                </div>
              </div>
            </div>
            {/* Info: (20251120 - Julian) ========= Tax ========= */}
            <div className="flex flex-col gap-8px">
              <p className="text-sm font-semibold text-input-text-primary">
                Tax <span className="text-text-state-error">*</span>
              </p>
              <div className="flex rounded-sm border border-input-text-input-placeholder">
                <NumericInput
                  id="input-tax"
                  name="input-tax"
                  value={taxValue}
                  setValue={setTaxValue}
                  isDecimal
                  hasComma
                  required
                  className="w-0 flex-1 bg-transparent px-12px py-10px text-right text-input-text-input-filled outline-none"
                />
                <div className="flex items-center gap-4px border-l border-input-text-input-placeholder px-12px py-10px text-sm text-input-text-input-placeholder">
                  <div className="size-16px shrink-0 overflow-hidden rounded-full">
                    <Image
                      src={`/currencies/${currency.toLowerCase()}.svg`}
                      width={16}
                      height={16}
                      alt={`${currency}_icon`}
                    />
                  </div>
                  <p>{currency}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Info: (20251120 - Julian) Buttons */}
        <div className="ml-auto flex items-center gap-12px">
          <Button type="button" variant="tertiaryOutline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="tertiary" disabled={saveDisabled} onClick={saveHandler}>
            Save
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return isDisplayedModal;
};

export default TaxEditModal;
