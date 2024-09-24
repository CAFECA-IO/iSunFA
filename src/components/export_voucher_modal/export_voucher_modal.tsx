import React, { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { RxCross2 } from 'react-icons/rx';
import { MdOutlineFileDownload } from 'react-icons/md';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { IDatePeriod } from '@/interfaces/date_period';
import { default30DayPeriodInSec } from '@/constants/display';
import { Button } from '@/components/button/button';

interface IExportVoucherModal {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

const ExportVoucherModal = ({ isModalVisible, modalVisibilityHandler }: IExportVoucherModal) => {
  const { t } = useTranslation('common');

  const [selectedPeriod, setSelectedPeriod] = useState<IDatePeriod>(default30DayPeriodInSec);
  const [fromNumber, setFromNumber] = useState<string>('');
  const [toNumber, setToNumber] = useState<string>('');

  useEffect(() => {
    if (!isModalVisible) {
      setSelectedPeriod(default30DayPeriodInSec);
      setFromNumber('');
      setToNumber('');
    }
  }, [isModalVisible]);

  // Info: (20240924 - Julian) 選擇日期區間後，禁用 Voucher Number 輸入框；反之亦然
  const datePickerDisabled = fromNumber !== '' || toNumber !== '';
  const voucherNumberDisabled =
    selectedPeriod.startTimeStamp !== 0 || selectedPeriod.endTimeStamp !== 0;

  // Info: (20240924 - Julian) 當日期區間和 Voucher Number 都沒填入時，禁用 Export 按鈕
  const exportBtnDisabled =
    selectedPeriod.startTimeStamp === 0 &&
    selectedPeriod.endTimeStamp === 0 &&
    (fromNumber === '' || toNumber === '');

  const changeFromNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFromNumber(e.target.value);
  };

  const changeToNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    setToNumber(e.target.value);
  };

  const isDisplayedExportVoucherModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 font-barlow">
      <div className="relative flex w-90vw flex-col items-center gap-24px rounded-md bg-card-surface-primary px-24px py-26px shadow-lg shadow-black/80 md:w-600px">
        {/* Info: (20240924 - Julian) Close button */}
        <button type="button" onClick={modalVisibilityHandler} className="absolute right-4 top-4">
          <RxCross2 size={24} className="text-icon-surface-single-color-primary" />
        </button>
        {/* Info: (20240924 - Julian) Title */}
        <div className="flex flex-col items-center">
          <h1 className="text-xl font-bold text-card-text-primary">
            {t('journal:VOUCHER.EXPORT_VOUCHER_MODAL_TITLE')}
          </h1>
          <p className="text-xs text-card-text-secondary">
            {t('journal:VOUCHER.EXPORT_VOUCHER_MODAL_SUBTITLE')}
          </p>
        </div>
        {/* Info: (20240924 - Julian) Date picker */}
        <div className="flex w-full flex-col items-start gap-8px">
          <p className="text-sm font-bold text-input-text-primary">{t('common:COMMON.PERIOD')}</p>
          <DatePicker
            type={DatePickerType.TEXT_PERIOD}
            period={selectedPeriod}
            setFilteredPeriod={setSelectedPeriod}
            btnClassName="w-full"
            disabled={datePickerDisabled}
          />
        </div>
        {/* Info: (20240924 - Julian) or */}
        <p className="text-xl font-semibold text-text-neutral-tertiary">{t('common:COMMON.OR')}</p>
        {/* Info: (20240924 - Julian) Voucher number */}
        <div className="flex w-full flex-col items-start gap-8px">
          <p className="text-sm font-bold text-input-text-primary">
            {t('journal:VOUCHER.VOUCHER_NUMBER')}
          </p>
          <div className="flex w-full items-center gap-8px">
            <input
              type="text"
              value={fromNumber}
              onChange={changeFromNumber}
              placeholder={t('journal:VOUCHER.FROM_PLACEHOLDER')}
              className="w-full rounded-sm border border-input-stroke-input px-12px py-10px outline-none placeholder:text-input-text-input-placeholder disabled:border-input-stroke-disable disabled:bg-input-surface-input-disable disabled:placeholder:text-input-text-disable"
              disabled={voucherNumberDisabled}
            />
            <p className="text-xl font-semibold text-text-neutral-tertiary">~</p>
            <input
              type="text"
              value={toNumber}
              onChange={changeToNumber}
              placeholder={t('journal:VOUCHER.TO_PLACEHOLDER')}
              className="w-full rounded-sm border border-input-stroke-input px-12px py-10px outline-none placeholder:text-input-text-input-placeholder disabled:border-input-stroke-disable disabled:bg-input-surface-input-disable disabled:placeholder:text-input-text-disable"
              disabled={voucherNumberDisabled}
            />
          </div>
        </div>
        {/* Info: (20240924 - Julian) buttons */}
        <div className="ml-auto flex items-center gap-12px">
          <Button type="button" variant="secondaryOutline" onClick={modalVisibilityHandler}>
            {t('common:COMMON.CANCEL')}
          </Button>
          {/* ToDo: (20240924 - Julian) Implement export function */}
          <Button type="button" disabled={exportBtnDisabled}>
            <p>{t('journal:VOUCHER.EXPORT_BTN')}</p>
            <MdOutlineFileDownload size={20} />
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return isDisplayedExportVoucherModal;
};

export default ExportVoucherModal;
