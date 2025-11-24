import React, { useState } from 'react';
import { FaChevronDown } from 'react-icons/fa6';
import { RxCross2 } from 'react-icons/rx';
import { useTranslation } from 'next-i18next';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { IDatePeriod } from '@/interfaces/date_period';
import { ILineItemUI, initialVoucherLine } from '@/interfaces/line_item';
import { Button } from '@/components/button/button';
import VoucherLineBlock from '@/components/voucher/voucher_line_block';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { VoucherType, EventType, EVENT_TYPE_TO_VOUCHER_TYPE_MAP } from '@/constants/account';

interface IVoucherEditModalProps {
  isModalOpen: boolean;
  onClose: () => void;
}

const VoucherEditModal: React.FC<IVoucherEditModalProps> = ({ isModalOpen, onClose }) => {
  const { t } = useTranslation('journal');

  const initialLineItems: ILineItemUI[] = [initialVoucherLine, { ...initialVoucherLine, id: 1 }];

  const [selectedDate, setSelectedDate] = useState<IDatePeriod>({
    startTimeStamp: 0,
    endTimeStamp: 0,
  });
  const [selectedType, setSelectedType] = useState<VoucherType>(VoucherType.RECEIVE);
  const [noteInputValue, setNoteInputValue] = useState<string>('');

  // Info: (20251124 - Julian) 傳票列
  const [lineItems, setLineItems] = useState<ILineItemUI[]>(initialLineItems);

  // Info: (20251124 - Julian) 傳票列驗證條件
  const [isTotalNotEqual, setIsTotalNotEqual] = useState<boolean>(false);
  const [isTotalZero, setIsTotalZero] = useState<boolean>(false);
  const [haveZeroLine, setHaveZeroLine] = useState<boolean>(false);
  const [isAccountingNull, setIsAccountingNull] = useState<boolean>(false);
  const [isVoucherLineEmpty, setIsVoucherLineEmpty] = useState<boolean>(false);

  // Info: (20251124 - Julian) 追加項目
  // ToDo: (20251124 - Julian) remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isCounterpartyRequired, setIsCounterpartyRequired] = useState<boolean>(false);
  // ToDo: (20251124 - Julian) remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isAssetRequired, setIsAssetRequired] = useState<boolean>(false);

  const {
    targetRef: typeRef,
    componentVisible: typeVisible,
    setComponentVisible: setTypeVisible,
  } = useOuterClick<HTMLDivElement>(false);

  // Info: (20250116 - Julian) 不顯示 Opening
  const typeList = Object.values(VoucherType).filter((type) => type !== VoucherType.OPENING);

  // ToDo: (20251120 - Julian) Disable save button when input is not complete/changed
  const saveDisabled =
    isTotalNotEqual || isTotalZero || haveZeroLine || isAccountingNull || isVoucherLineEmpty;

  const typeToggleHandler = () => setTypeVisible((prev) => !prev);

  const saveHandler = () => {
    const data = {};

    // ToDo: (20251120 - Julian) post data to API
    // eslint-disable-next-line no-console
    console.log('Save! :', data);

    onClose();
  };

  const handleNoteInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNoteInputValue(e.target.value);
  };

  // Info: (20240926 - Julian) type 字串轉換
  const translateType = (voucherType: string) => {
    const typeStr = EVENT_TYPE_TO_VOUCHER_TYPE_MAP[voucherType as EventType];

    if (typeStr) {
      return t(`journal:ADD_NEW_VOUCHER.TYPE_${typeStr.toUpperCase()}`);
    } else {
      return t(`journal:ADD_NEW_VOUCHER.TYPE_${voucherType.toUpperCase()}`);
    }
  };

  const typeDropdownMenu = typeVisible ? (
    <div className="absolute left-0 top-50px z-10 flex w-full flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px text-dropdown-text-primary shadow-dropmenu">
      {typeList.map((voucherType) => {
        const typeClickHandler = () => {
          setSelectedType(voucherType);
          setTypeVisible(false);
        };

        return (
          <button
            key={voucherType}
            id={`type-${voucherType}`}
            type="button"
            className="px-12px py-10px text-left hover:bg-dropdown-surface-item-hover"
            onClick={typeClickHandler}
          >
            {translateType(voucherType)}
          </button>
        );
      })}
    </div>
  ) : null;

  const isDisplayedModal = isModalOpen ? (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="flex flex-col gap-32px rounded-lg bg-surface-neutral-surface-lv2 px-40px py-16px">
        {/* Info: (20251120 - Julian) Modal Header */}
        <div className="relative flex flex-col items-center">
          <h2 className="text-xl font-bold text-card-text-primary">Edit Voucher</h2>
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
        <div className="grid grid-cols-2 gap-24px">
          {/* Info: (20251120 - Julian) ========= Voucher Date ========= */}
          <div className="z-50 flex flex-col gap-8px">
            <p className="text-sm font-semibold text-input-text-primary">
              Voucher Date <span className="text-text-state-error">*</span>
            </p>
            <DatePicker
              type={DatePickerType.TEXT_DATE}
              period={selectedDate}
              setFilteredPeriod={setSelectedDate}
            />
          </div>
          {/* Info: (20251120 - Julian) ========= Voucher Type ========= */}
          <div className="flex flex-col gap-8px">
            <p className="text-sm font-semibold text-input-text-primary">
              Voucher Type <span className="text-text-state-error">*</span>
            </p>
            <div ref={typeRef} className="relative">
              <button
                id="voucher-type"
                type="button"
                onClick={typeToggleHandler}
                className="flex w-full items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px hover:cursor-pointer hover:border-input-stroke-input-hover"
              >
                <p className="text-base text-input-text-input-filled">
                  {translateType(selectedType)}
                </p>
                <div className={typeVisible ? 'rotate-180' : 'rotate-0'}>
                  <FaChevronDown size={20} />
                </div>
              </button>
              {/* Info: (20240926 - Julian) Type dropdown */}
              {typeDropdownMenu}
            </div>
          </div>
          {/* Info: (20251120 - Julian) ========= Note ========= */}
          <div className="col-span-2 flex flex-col gap-8px">
            <p className="text-sm font-semibold text-input-text-primary">Note</p>
            <div className="rounded-sm border border-input-text-input-placeholder px-12px py-10px">
              <input
                type="text"
                value={noteInputValue}
                onChange={handleNoteInputChange}
                className="bg-transparent text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder"
              />
            </div>
          </div>

          {/* Info: (20251124 - Julian) ========= Note ========= */}
          <div className="col-span-2 overflow-x-auto">
            <VoucherLineBlock
              lineItems={lineItems}
              setLineItems={setLineItems}
              flagOfClear={false}
              flagOfSubmit={false}
              isShowReverseHint={false}
              setIsTotalZero={setIsTotalZero}
              setIsTotalNotEqual={setIsTotalNotEqual}
              setHaveZeroLine={setHaveZeroLine}
              setIsAccountingNull={setIsAccountingNull}
              setIsVoucherLineEmpty={setIsVoucherLineEmpty}
              setIsCounterpartyRequired={setIsCounterpartyRequired}
              setIsAssetRequired={setIsAssetRequired}
            />
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

export default VoucherEditModal;
