import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { RxCross2 } from 'react-icons/rx';
import { FaChevronDown } from 'react-icons/fa6';
import { Button } from '@/components/button/button';
import useOuterClick from '@/lib/hooks/use_outer_click';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import NumericInput from '@/components/numeric_input/numeric_input';
import { default30DayPeriodInSec, inputStyle } from '@/constants/display';
import { IDatePeriod } from '@/interfaces/date_period';
import { BiSave } from 'react-icons/bi';
import { useModalContext } from '@/contexts/modal_context';
import { MessageType } from '@/interfaces/message_modal';
import { ToastType } from '@/interfaces/toastify';

interface IAddAssetModalProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

enum DepreciationMethod {
  STRAIGHT_LINE = 'Straight line method',
  DOUBLE_DECLINING = 'Double declining balance method',
  SUM_OF_YEAR_DIGIT = 'Sum of the year digit method',
}

const AddAssetModal: React.FC<IAddAssetModalProps> = ({
  isModalVisible,
  modalVisibilityHandler,
}) => {
  const { t } = useTranslation(['common', 'journal']);
  const { messageModalDataHandler, messageModalVisibilityHandler, toastHandler } =
    useModalContext();

  const {
    targetRef: methodRef,
    componentVisible: isMethodVisible,
    setComponentVisible: setMethodVisible,
  } = useOuterClick<HTMLDivElement>(false);

  const [inputNo, setInputNo] = useState<string>('');
  const [inputName, setInputName] = useState<string>('');
  const [inputAmount, setInputAmount] = useState<number>(1);
  const [inputTotal, setInputTotal] = useState<number>(0);
  const [acquisitionDate, setAcquisitionDate] = useState<IDatePeriod>(default30DayPeriodInSec);
  const [depreciationStartDate, setDepreciationStartDate] =
    useState<IDatePeriod>(default30DayPeriodInSec);
  const [inputUsefulLife, setInputUsefulLife] = useState<number>(0);
  const [selectedDepreciationMethod, setSelectedDepreciationMethod] = useState<DepreciationMethod>(
    DepreciationMethod.STRAIGHT_LINE
  );
  const [inputNote, setInputNote] = useState<string>('');

  const [isShowTotalHint, setIsShowTotalHint] = useState<boolean>(false);
  const [isShowAcquisitionDateHint, setIsShowAcquisitionDateHint] = useState<boolean>(false);
  const [isShowDepreciationStartDateHint, setIsShowDepreciationStartDateHint] =
    useState<boolean>(false);
  const [isShowUsefulLifeHint, setIsShowUsefulLifeHint] = useState<boolean>(false);

  useEffect(() => {
    if (!isModalVisible) {
      setInputNo('');
      setInputName('');
      setInputAmount(1);
      setInputTotal(0);
      setAcquisitionDate(default30DayPeriodInSec);
      setDepreciationStartDate(default30DayPeriodInSec);
      setInputUsefulLife(0);
      setSelectedDepreciationMethod(DepreciationMethod.STRAIGHT_LINE);
      setInputNote('');
    }
  }, [isModalVisible]);

  useEffect(() => {
    if (isShowTotalHint && inputTotal > 0) {
      setIsShowTotalHint(false);
    }
  }, [inputTotal, isShowTotalHint]);

  useEffect(() => {
    if (isShowAcquisitionDateHint && acquisitionDate.startTimeStamp > 0) {
      setIsShowAcquisitionDateHint(false);
    }
  }, [acquisitionDate, isShowAcquisitionDateHint]);

  useEffect(() => {
    if (isShowDepreciationStartDateHint && depreciationStartDate.startTimeStamp > 0) {
      setIsShowDepreciationStartDateHint(false);
    }
  }, [depreciationStartDate, isShowDepreciationStartDateHint]);

  useEffect(() => {
    if (isShowUsefulLifeHint && inputUsefulLife > 0) {
      setIsShowUsefulLifeHint(false);
    }
  }, [inputUsefulLife, isShowUsefulLifeHint]);

  const nameChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputName(event.target.value);
  };
  const assetNoChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputNo(event.target.value);
  };
  const amountChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Info: (20241015 - Julian) 限制只能輸入數字，並去掉前面的0
    const amountOnlyNumber = event.target.value.replace(/[^0-9]/g, '').replace(/^0+/, '');
    setInputAmount(Number(amountOnlyNumber));
  };
  const noteChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputNote(event.target.value);
  };

  const toggleMethodMenu = () => {
    setMethodVisible(!isMethodVisible);
  };

  // ToDo: (20241015 - Julian) API call
  const addNewAsset = async () => {
    // eslint-disable-next-line no-console
    console.log(
      'Add new asset!',
      '\nAsset No:',
      inputNo,
      '\nAsset Name:',
      inputName,
      '\nAmount:',
      inputAmount,
      '\nTotal Price:',
      inputTotal,
      '\nAcquisition Date:',
      acquisitionDate,
      '\nDepreciation Start Date:',
      depreciationStartDate,
      '\nUseful Life:',
      inputUsefulLife,
      '\nDepreciation Method:',
      selectedDepreciationMethod,
      '\nNote:',
      inputNote
    );

    toastHandler({
      id: 'add-asset-toast',
      type: ToastType.SUCCESS,
      content: t('journal:ADD_ASSET_MODAL.TOAST_SUCCESS'),
      closeable: true,
    });
  };

  const addAssetSubmitHandler = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (inputTotal === 0) {
      setIsShowTotalHint(true);
    } else if (acquisitionDate.startTimeStamp === 0) {
      setIsShowAcquisitionDateHint(true);
    } else if (depreciationStartDate.startTimeStamp === 0) {
      setIsShowDepreciationStartDateHint(true);
    } else if (inputUsefulLife === 0) {
      setIsShowUsefulLifeHint(true);
    } else {
      messageModalDataHandler({
        messageType: MessageType.WARNING,
        title: t('journal:ADD_ASSET_MODAL.CONFIRM_MESSAGE_TITLE'),
        content: t('journal:ADD_ASSET_MODAL.CONFIRM_MESSAGE_CONTENT'),
        backBtnStr: t('common:COMMON.CANCEL'),
        submitBtnStr: t('common:COMMON.CONFIRM_MESSAGE_BTN'),
        submitBtnFunction: () => {
          addNewAsset();
          modalVisibilityHandler();
        },
      });
      messageModalVisibilityHandler();
    }
  };

  const translateMethod = (method: DepreciationMethod) => {
    const key = method.toUpperCase().replace(/ /g, '_');
    return t(`journal:ADD_ASSET_MODAL.${key}`);
  };

  const depreciationMethodList = Object.values(DepreciationMethod);

  const depreciationMethodMenu = depreciationMethodList.map((method) => (
    <button
      key={method}
      type="button"
      onClick={() => {
        setSelectedDepreciationMethod(method as DepreciationMethod);
        setMethodVisible(false);
      }}
      className="flex h-46px w-full items-center justify-between px-12px py-8px text-base font-medium text-input-text-input-filled hover:bg-dropdown-surface-item-hover"
    >
      <p>{translateMethod(method)}</p>
    </button>
  ));

  const isDisplayModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="flex max-h-450px w-90vw max-w-600px flex-col rounded-sm bg-surface-neutral-surface-lv2 md:max-h-90vh">
        {/* Info: (20241015 - Julian) title */}
        <div className="relative flex flex-col items-center px-20px py-16px">
          {/* Info: (20241015 - Julian) desktop title */}
          <h1 className="whitespace-nowrap text-xl font-bold text-card-text-primary">
            {t('journal:ADD_ASSET_MODAL.TITLE')}
          </h1>
          <p className="text-sm text-card-text-secondary">
            {t('journal:ADD_ASSET_MODAL.SUBTITLE')}
          </p>
          {/* Info: (20241015 - Julian) close button */}
          <button
            type="button"
            onClick={modalVisibilityHandler}
            className="absolute right-20px top-16px text-icon-surface-single-color-primary"
          >
            <RxCross2 size={20} />
          </button>
        </div>

        {/* Info: (20241015 - Julian) content */}
        <form
          onSubmit={addAssetSubmitHandler}
          className="my-24px flex w-full flex-col gap-y-40px overflow-y-auto overflow-x-hidden px-40px text-sm text-input-text-primary"
        >
          {/* Info: (20241015 - Julian) input fields */}
          <div className="grid grid-cols-1 items-center gap-16px text-center md:grid-cols-2">
            {/* Info: (20241015 - Julian) Asset no */}
            <div className="flex w-full flex-col items-start gap-y-8px">
              <p className="font-semibold">
                {t('journal:ADD_ASSET_MODAL.ASSET_NO')}{' '}
                <span className="text-text-state-error">*</span>
              </p>
              <input
                id="input-no"
                type="text"
                placeholder={t('journal:ADD_ASSET_MODAL.ASSET_NO_PLACEHOLDER')}
                value={inputNo}
                onChange={assetNoChangeHandler}
                required
                className="h-46px w-full rounded-sm border border-input-stroke-input px-12px outline-none placeholder:text-input-text-input-placeholder"
              />
            </div>
            {/* Info: (20241015 - Julian) Asset name */}
            <div className="flex w-full flex-col items-start gap-y-8px">
              <p className="font-semibold">
                {t('journal:ADD_ASSET_MODAL.ASSET_NAME')}{' '}
                <span className="text-text-state-error">*</span>
              </p>
              <input
                id="input-name"
                type="text"
                placeholder={t('journal:ADD_ASSET_MODAL.ASSET_NAME_PLACEHOLDER')}
                value={inputName}
                onChange={nameChangeHandler}
                required
                className="h-46px w-full rounded-sm border border-input-stroke-input px-12px outline-none placeholder:text-input-text-input-placeholder"
              />
            </div>
            {/* Info: (20241015 - Julian) Amount */}
            <div className="col-span-2 flex w-full flex-col items-start gap-y-8px">
              <p className="font-semibold">{t('journal:ADD_ASSET_MODAL.AMOUNT')}</p>
              <input
                id="input-amount"
                type="number"
                value={inputAmount}
                onChange={amountChangeHandler}
                min={1}
                required
                className="h-46px w-full rounded-sm border border-input-stroke-input px-12px outline-none placeholder:text-input-text-input-placeholder"
              />
            </div>
            {/* Info: (20241015 - Julian) Total Price */}
            <div className="col-span-2 flex w-full flex-col items-start gap-y-8px">
              <p className="font-semibold">
                {t('journal:ADD_ASSET_MODAL.TOTAL_PRICE')}{' '}
                <span className="text-text-state-error">*</span>
              </p>
              <div
                className={`flex h-46px w-full items-center justify-between divide-x ${isShowTotalHint ? inputStyle.ERROR : inputStyle.NORMAL} rounded-sm border bg-input-surface-input-background`}
              >
                <NumericInput
                  id="input-total"
                  name="input-total"
                  value={inputTotal}
                  setValue={setInputTotal}
                  isDecimal
                  hasComma
                  required
                  min={1}
                  className="flex-1 bg-transparent px-10px text-right outline-none"
                />
                <div className="flex items-center gap-4px p-12px text-sm text-input-text-input-placeholder">
                  <Image
                    src="/currencies/twd.svg"
                    width={16}
                    height={16}
                    alt="twd_icon"
                    className="rounded-full"
                  />
                  <p>{t('common:COMMON.TWD')}</p>
                </div>
              </div>
            </div>
            {/* Info: (20241015 - Julian) Acquisition Date */}
            <div className="flex w-full flex-col items-start gap-y-8px">
              <p className="font-semibold">
                {t('journal:ADD_ASSET_MODAL.ACQUISITION_DATE')}{' '}
                <span className="text-text-state-error">*</span>
              </p>
              <DatePicker
                type={DatePickerType.TEXT_DATE}
                period={acquisitionDate}
                setFilteredPeriod={setAcquisitionDate}
                btnClassName={isShowAcquisitionDateHint ? inputStyle.ERROR : ''}
              />
            </div>
            {/* Info: (20241015 - Julian) Depreciation Start Date */}
            <div className="flex w-full flex-col items-start gap-y-8px">
              <p className="font-semibold">
                {t('journal:ADD_ASSET_MODAL.DEPRECIATION_START_DATE')}{' '}
                <span className="text-text-state-error">*</span>
              </p>
              <DatePicker
                type={DatePickerType.TEXT_DATE}
                period={depreciationStartDate}
                setFilteredPeriod={setDepreciationStartDate}
                btnClassName={isShowDepreciationStartDateHint ? inputStyle.ERROR : ''}
                calenderClassName="right-0"
              />
            </div>
            {/* Info: (20241015 - Julian) Useful Life (Month) */}
            <div className="col-span-2 flex w-full flex-col items-start gap-y-8px">
              <p className="font-semibold">
                {t('journal:ADD_ASSET_MODAL.USEFUL_LIFE')}{' '}
                <span className="text-text-state-error">*</span>
              </p>
              <div
                className={`flex h-46px w-full items-center justify-between divide-x ${isShowUsefulLifeHint ? inputStyle.ERROR : inputStyle.NORMAL} rounded-sm border bg-input-surface-input-background`}
              >
                <NumericInput
                  id="input-useful-life"
                  name="input-useful-life"
                  value={inputUsefulLife}
                  setValue={setInputUsefulLife}
                  isDecimal
                  hasComma
                  required
                  className="flex-1 bg-transparent px-10px text-right outline-none"
                />
                <div className="flex w-60px items-center justify-center p-12px text-sm text-input-text-input-placeholder">
                  <p>{t('common:COMMON.MONTH')}</p>
                </div>
              </div>
            </div>
            {/* Info: (20241015 - Julian) Depreciation Method */}
            <div className="col-span-2 flex w-full flex-col items-start gap-y-8px">
              <p className="font-semibold">{t('journal:ADD_ASSET_MODAL.DEPRECIATION_METHOD')}</p>
              <div
                onClick={toggleMethodMenu}
                className="relative flex h-46px w-full items-center justify-between rounded-sm border border-input-stroke-input px-12px text-base font-medium text-input-text-input-filled hover:cursor-pointer"
              >
                <p>{translateMethod(selectedDepreciationMethod)}</p>
                <FaChevronDown />
                <div
                  ref={methodRef}
                  className={`absolute left-0 top-50px grid w-full overflow-hidden ${
                    isMethodVisible ? 'grid-rows-1' : 'grid-rows-0'
                  } drop-shadow transition-all duration-150 ease-in-out`}
                >
                  <div className="flex flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px">
                    {depreciationMethodMenu}
                  </div>
                </div>
              </div>
            </div>
            {/* Info: (20241015 - Julian) Note */}
            <div className="col-span-2 flex w-full flex-col items-start gap-y-8px">
              <p className="font-semibold">{t('journal:ADD_ASSET_MODAL.NOTE')}</p>
              <input
                id="input-note"
                type="text"
                placeholder={t('journal:ADD_ASSET_MODAL.NOTE_PLACEHOLDER')}
                value={inputNote}
                onChange={noteChangeHandler}
                className="h-46px w-full rounded-sm border border-input-stroke-input px-12px outline-none placeholder:text-input-text-input-placeholder"
              />
            </div>
          </div>

          {/* Info: (20240503 - Julian) confirm buttons */}
          <div className="flex items-center justify-end gap-12px">
            <Button
              className="px-16px py-8px"
              type="button"
              onClick={modalVisibilityHandler}
              variant="secondaryOutline"
            >
              {t('common:COMMON.CANCEL')}
            </Button>
            <Button className="px-16px py-8px" type="submit" variant="tertiary">
              <p>{t('common:COMMON.SAVE')}</p>
              <BiSave size={20} />
            </Button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default AddAssetModal;
