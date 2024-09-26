import React, { useState } from 'react';
import { FaChevronDown } from 'react-icons/fa6';
import { BiSave } from 'react-icons/bi';
import { useTranslation } from 'next-i18next';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { Button } from '@/components/button/button';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import Toggle from '@/components/toggle/toggle';
import { IDatePeriod } from '@/interfaces/date_period';
import { default30DayPeriodInSec } from '@/constants/display';
import { VoucherType } from '@/constants/account';

const NewVoucherForm = () => {
  const { t } = useTranslation('common');

  const [date, setDate] = useState<IDatePeriod>(default30DayPeriodInSec);
  const [type, setType] = useState<string>(VoucherType.EXPENSE);
  const [note, setNote] = useState<string>('');
  const [counterparty, setCounterparty] = useState<string>('');
  const [isRecurring, setIsRecurring] = useState<boolean>(false);

  // ToDo: (20240926 - Julian) Add 'credit not equal to debit'
  const saveBtnDisabled = (date.startTimeStamp === 0 && date.endTimeStamp === 0) || type === '';

  const {
    targetRef: typeRef,
    componentVisible: typeVisible,
    setComponentVisible: setTypeVisible,
  } = useOuterClick<HTMLDivElement>(false);

  const typeToggleHandler = () => {
    setTypeVisible(!typeVisible);
  };

  const noteChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNote(e.target.value);
  };

  const counterpartyChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCounterparty(e.target.value);
  };

  const recurringToggleHandler = () => {
    setIsRecurring(!isRecurring);
  };

  // ToDo: (20240926 - Julian) Save voucher function
  const saveVoucher = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  // ToDo: (20240926 - Julian) type 字串轉換
  const translateType = (voucherType: string) => {
    return t(`journal:ADD_NEW_VOUCHER.TYPE_${voucherType.toUpperCase()}`);
  };

  const typeDropdownMenu = typeVisible ? (
    <div
      ref={typeRef}
      className="absolute left-0 top-50px flex w-full flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px text-dropdown-text-primary shadow-dropmenu"
    >
      {Object.values(VoucherType).map((voucherType) => {
        const typeClickHandler = () => {
          setType(voucherType);
          setTypeVisible(false);
        };

        return (
          <button
            key={voucherType}
            id={`type-${voucherType}`}
            type="button"
            className="px-12px py-8px text-left hover:bg-dropdown-surface-item-hover"
            onClick={typeClickHandler}
          >
            {translateType(voucherType)}
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <div className="relative flex flex-col items-center gap-40px px-40px py-40px">
      {/* ToDo: (20240926 - Julian) AI analyze */}
      <div className="w-full bg-surface-brand-primary-moderate p-40px text-center text-white">
        This is AI analyze
      </div>
      {/* ToDo: (20240926 - Julian) Uploaded certificates */}
      <div className="w-full bg-stroke-neutral-quaternary p-40px text-center text-white">
        Uploaded certificates
      </div>

      {/* Info: (20240926 - Julian) form */}
      <form onSubmit={saveVoucher} className="grid w-full grid-cols-2 gap-24px">
        {/* Info: (20240926 - Julian) Date */}
        <div className="flex flex-col gap-8px">
          <p className="font-bold text-input-text-primary">
            {t('journal:ADD_NEW_VOUCHER.VOUCHER_DATE')}
            <span className="text-text-state-error">*</span>
          </p>
          <DatePicker type={DatePickerType.TEXT_DATE} period={date} setFilteredPeriod={setDate} />
        </div>
        {/* Info: (20240926 - Julian) Type */}
        <div className="flex flex-col gap-8px">
          <p className="font-bold text-input-text-primary">
            {t('journal:ADD_NEW_VOUCHER.VOUCHER_TYPE')}
            <span className="text-text-state-error">*</span>
          </p>
          <div
            onClick={typeToggleHandler}
            className="relative flex items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px hover:cursor-pointer hover:border-input-stroke-input-hover"
          >
            <p className="text-base text-input-text-input-filled">{translateType(type)}</p>
            <FaChevronDown size={20} />
            {/* Info: (20240926 - Julian) Type dropdown */}
            {typeDropdownMenu}
          </div>
        </div>
        {/* Info: (20240926 - Julian) Note */}
        <div className="col-span-2 flex flex-col gap-8px">
          <p className="font-bold text-input-text-primary">{t('journal:ADD_NEW_VOUCHER.NOTE')}</p>
          <input
            id="note-input"
            type="text"
            value={note}
            onChange={noteChangeHandler}
            placeholder={t('journal:ADD_NEW_VOUCHER.NOTE')}
            className="rounded-sm border border-input-stroke-input px-12px py-10px outline-none placeholder:text-input-text-input-placeholder"
          />
        </div>
        {/* Info: (20240926 - Julian) Counterparty */}
        <div className="col-span-2 flex flex-col gap-8px">
          <p className="font-bold text-input-text-primary">
            {t('journal:ADD_NEW_VOUCHER.COUNTERPARTY')}
          </p>
          <input
            id="counterparty-input"
            type="text"
            value={counterparty}
            onChange={counterpartyChangeHandler}
            placeholder={t('journal:ADD_NEW_VOUCHER.COUNTERPARTY')}
            className="rounded-sm border border-input-stroke-input px-12px py-10px outline-none placeholder:text-input-text-input-placeholder"
          />
        </div>
        {/* Info: (20240926 - Julian) switch */}
        <div className="col-span-2 flex items-center gap-16px text-switch-text-primary">
          <Toggle id="recurring-toggle" getToggledState={recurringToggleHandler} />
          <p>{t('journal:ADD_NEW_VOUCHER.RECURRING_ENTRY')}</p>
        </div>
        {/* ToDo: (20240926 - Julian) voucher block */}
        <div className="col-span-2 w-full bg-surface-brand-secondary-moderate p-40px text-center text-white">
          This is voucher block
        </div>
        {/* Info: (20240926 - Julian) buttons */}
        <div className="col-span-2 ml-auto flex items-center gap-12px">
          <Button type="button" variant="secondaryOutline">
            {t('journal:JOURNAL.CLEAR_ALL')}
          </Button>
          <Button type="submit" disabled={saveBtnDisabled}>
            <p>{t('common:COMMON.SAVE')}</p>
            <BiSave size={20} />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewVoucherForm;
