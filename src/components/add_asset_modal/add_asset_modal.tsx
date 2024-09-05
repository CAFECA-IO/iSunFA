import { useState } from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { RxCross2 } from 'react-icons/rx';
import { FaPlus } from 'react-icons/fa6';
import { FiMinus, FiPlus } from 'react-icons/fi';
import { PiWrenchFill } from 'react-icons/pi';
import { Button } from '@/components/button/button';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import NumericInput from '@/components/numeric_input/numeric_input';
import { default30DayPeriodInSec, radioButtonStyle } from '@/constants/display';

interface IAddAssetModalProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

const AddAssetModal = ({ isModalVisible, modalVisibilityHandler }: IAddAssetModalProps) => {
  const { t } = useTranslation(['common', 'journal']);
  const [inputName, setInputName] = useState('');
  const [inputDescription, setInputDescription] = useState('');
  const [inputPurchasePrice, setInputPurchasePrice] = useState(0);
  const [selectedDate, setSelectedDate] = useState(default30DayPeriodInSec);
  const [inputAmount, setInputAmount] = useState(1);
  const [inputTotal, setInputTotal] = useState(0);
  const [inputAssetType, setInputAssetType] = useState('Intangible Assets');
  const [inputDepreciationMethod, setInputDepreciationMethod] = useState('Straight Line');
  const [inputUsefulLife, setInputUsefulLife] = useState(0);
  const [inputUsefulLifeUnit, setInputUsefulLifeUnit] = useState('Year');

  const nameChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputName(event.target.value);
  };
  const descriptionChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputDescription(event.target.value);
  };

  const minusAmountHandler = () => {
    if (inputAmount > 1) {
      setInputAmount(inputAmount - 1);
    }
  };
  const plusAmountHandler = () => {
    setInputAmount(inputAmount + 1);
  };

  const intangibleAssetsClickHandler = () => {
    setInputAssetType('Intangible Assets');
  };
  const tangibleAssetsClickHandler = () => {
    setInputAssetType('Tangible Assets');
  };

  const selectedDepreciationMethod = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setInputDepreciationMethod(event.target.value);
  };
  const selectedUsefulLifeUnit = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setInputUsefulLifeUnit(event.target.value);
  };

  const isAddButtonDisabled =
    inputName === '' ||
    inputDescription === '' ||
    selectedDate.startTimeStamp === 0 ||
    inputPurchasePrice === 0 ||
    inputAmount === 0 ||
    inputTotal === 0 ||
    inputUsefulLife === 0;

  // ToDo: (20240508 - Julian) [Beta] Add Property Submit Handler
  const addAssetSubmitHandler = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  const isDisplayModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="relative flex max-h-450px w-90vw max-w-600px flex-col rounded-sm bg-surface-neutral-surface-lv2 p-20px md:max-h-90vh">
        {/* Info: (20240503 - Julian) title */}
        <div className="flex items-center gap-6px font-bold text-card-text-primary">
          <Image src="/icons/assets.svg" width={20} height={20} alt="assets_icon" />
          {/* Info: (20240503 - Julian) desktop title */}
          <h1 className="block whitespace-nowrap text-xl">
            {t('journal:ADD_ASSET_MODAL.ASSET_MANAGEMENT')}
          </h1>
        </div>
        {/* Info: (20240503 - Julian) close button */}
        <button
          type="button"
          onClick={modalVisibilityHandler}
          className="absolute right-12px top-12px text-icon-surface-single-color-primary"
        >
          <RxCross2 size={20} />
        </button>
        {/* Info: (20240503 - Julian) content */}
        <form
          onSubmit={addAssetSubmitHandler}
          className="flex w-full flex-col gap-y-40px overflow-y-auto overflow-x-hidden text-sm text-input-text-primary"
        >
          {/* Info: (20240503 - Julian) input fields */}
          <div className="grid grid-cols-1 items-center gap-x-16px gap-y-50px pt-40px text-center md:grid-cols-2">
            {/* Info: (20240503 - Julian) asset name */}
            <div className="flex w-full flex-col items-start gap-y-8px">
              <p className="font-semibold">{t('journal:ADD_ASSET_MODAL.ASSET_NAME')}</p>
              <input
                type="text"
                placeholder={t('journal:ADD_ASSET_MODAL.NAME_YOUR_ASSET')}
                value={inputName}
                onChange={nameChangeHandler}
                required
                className="h-46px w-full rounded-sm border border-input-stroke-input px-12px outline-none placeholder:text-input-text-input-placeholder"
              />
            </div>
            {/* Info: (20240503 - Julian) description */}
            <div className="flex w-full flex-col items-start gap-y-8px">
              <p className="font-semibold">{t('journal:JOURNAL.DESCRIPTION')}</p>
              <input
                type="text"
                placeholder={t('journal:ADD_ASSET_MODAL.ADD_NOTE')}
                value={inputDescription}
                onChange={descriptionChangeHandler}
                required
                className="h-46px w-full rounded-sm border border-input-stroke-input px-12px outline-none placeholder:text-input-text-input-placeholder"
              />
            </div>
            {/* Info: (20240503 - Julian) purchase date */}
            <div className="flex w-full flex-col items-start gap-y-8px">
              <p className="font-semibold">{t('journal:ADD_ASSET_MODAL.PURCHASE_DATE')}</p>
              <DatePicker
                period={selectedDate}
                setFilteredPeriod={setSelectedDate}
                type={DatePickerType.TEXT_DATE}
              />
            </div>
            {/* Info: (20240503 - Julian) purchase price */}
            <div className="flex w-full flex-col items-start gap-y-8px">
              <p className="font-semibold">{t('journal:ADD_ASSET_MODAL.PURCHASE_PRICE')}</p>
              <div className="flex h-46px w-full items-center justify-between divide-x divide-input-stroke-input rounded-sm border border-input-stroke-input bg-input-surface-input-background">
                <NumericInput
                  id="input-purchase-price"
                  name="input-purchase-price"
                  value={inputPurchasePrice}
                  setValue={setInputPurchasePrice}
                  isDecimal
                  required
                  className="flex-1 bg-transparent px-10px outline-none"
                />
                <div className="flex items-center gap-4px p-12px text-sm text-input-text-input-placeholder">
                  <Image
                    src="/currencies/twd.svg"
                    width={16}
                    height={16}
                    alt="twd_icon"
                    className="rounded-full"
                  />
                  <p>{t('journal:JOURNAL.TWD')}</p>
                </div>
              </div>
            </div>
            {/* Info: (20240508 - Julian) amount */}
            <div className="flex w-full flex-col items-start gap-y-8px">
              <p className="font-semibold">{t('journal:ADD_ASSET_MODAL.AMOUNT')}</p>
              <div className="flex h-46px w-full items-center justify-between divide-x divide-input-stroke-input rounded-sm border border-input-stroke-input bg-input-surface-input-background">
                <button type="button" className="p-12px" onClick={minusAmountHandler}>
                  <FiMinus size={20} />
                </button>
                <NumericInput
                  id="input-amount"
                  name="input-amount"
                  min={1}
                  value={inputAmount}
                  setValue={setInputAmount}
                  required
                  className="h-full flex-1 bg-transparent px-10px outline-none"
                />
                <button type="button" className="p-12px" onClick={plusAmountHandler}>
                  <FiPlus size={20} />
                </button>
              </div>
            </div>
            {/* Info: (20240508 - Julian) total */}
            <div className="flex w-full flex-col items-start gap-y-8px">
              <p className="font-semibold">{t('journal:ADD_ASSET_MODAL.TOTAL')}</p>
              <div className="flex h-46px w-full items-center justify-between divide-x divide-input-stroke-input rounded-sm border border-input-stroke-input bg-input-surface-input-background">
                <NumericInput
                  id="input-total"
                  name="input-total"
                  value={inputTotal}
                  setValue={setInputTotal}
                  isDecimal
                  required
                  className="flex-1 bg-transparent px-10px outline-none"
                />
                <div className="flex items-center gap-4px p-12px text-sm text-input-text-input-placeholder">
                  <Image
                    src="/currencies/twd.svg"
                    width={16}
                    height={16}
                    alt="twd_icon"
                    className="rounded-full"
                  />
                  <p>{t('journal:JOURNAL.TWD')}</p>
                </div>
              </div>
            </div>
          </div>
          {/* Info: (20240503 - Julian) radio buttons */}
          <div className="flex flex-col justify-between gap-10px md:flex-row md:items-center">
            <p className="font-semibold">{t('journal:ADD_ASSET_MODAL.ASSET_TYPE')}</p>
            <div className="flex items-center gap-x-20px">
              <label
                htmlFor="intangible-assets"
                className="flex items-center gap-8px whitespace-nowrap"
              >
                <input
                  type="radio"
                  id="intangible-assets"
                  name="asset-type"
                  className={radioButtonStyle}
                  onChange={intangibleAssetsClickHandler}
                  checked={inputAssetType === 'Intangible Assets'}
                />
                <p>{t('journal:ADD_ASSET_MODAL.INTANGIBLE ASSETS')}</p>
              </label>
              <label
                htmlFor="tangibleAssets"
                className="flex items-center gap-8px whitespace-nowrap"
              >
                <input
                  type="radio"
                  id="tangible-assets"
                  name="asset-type"
                  className={radioButtonStyle}
                  onChange={tangibleAssetsClickHandler}
                  checked={inputAssetType === 'Tangible Assets'}
                />
                <p>{t('journal:ADD_ASSET_MODAL.TANGIBLE_ASSETS')}</p>
              </label>
            </div>
          </div>
          {/* Info: (20240503 - Julian) depreciation */}
          <div className="flex flex-col gap-40px">
            {/* Info: (20240508 - Julian) depreciation divider */}
            <div className="flex items-center gap-4">
              <hr className="flex-1 border-divider-stroke-lv-1" />
              <div className="flex items-center gap-2 text-sm text-divider-text-lv-1">
                <PiWrenchFill size={16} />
                <p>{t('journal:ADD_ASSET_MODAL.DEPRECIATION')}</p>
              </div>
              <hr className="flex-1 border-divider-stroke-lv-1" />
            </div>
            {/* Info: (20240508 - Julian) depreciation method */}
            <div className="flex flex-col gap-y-8px">
              <p className="font-semibold">{t('journal:ADD_ASSET_MODAL.DEPRECIATION_METHOD')}</p>
              <select
                id="depreciationMethod"
                name="depreciationMethod"
                value={inputDepreciationMethod}
                onChange={selectedDepreciationMethod}
                className="h-46px w-full rounded-sm border border-input-stroke-input px-12px outline-none"
              >
                <option value="straightLine">{t('journal:ADD_ASSET_MODAL.STRAIGHT_LINE')}</option>
                <option value="doubleDeclining">
                  {t('journal:ADD_ASSET_MODAL.DOUBLE_DECLINING')}
                </option>
                <option value="unitsOfProduction">
                  {t('journal:ADD_ASSET_MODAL.UNITS_OF_PRODUCTION')}
                </option>
              </select>
            </div>
            {/* Info: (20240508 - Julian) estimated useful life */}
            <div className="flex flex-col gap-y-8px">
              <p className="font-semibold">{t('journal:ADD_ASSET_MODAL.ESTIMATED_USEFUL_LIFE')}</p>
              <div className="flex h-46px w-full items-center justify-between divide-x divide-input-stroke-input overflow-hidden rounded-sm border border-input-stroke-input bg-input-surface-input-background">
                <NumericInput
                  id="input-useful-life"
                  name="input-useful-life"
                  value={inputUsefulLife}
                  setValue={setInputUsefulLife}
                  required
                  className="flex-1 bg-transparent px-10px outline-none"
                />
                <select
                  id="estimatedUsefulLifeUnit"
                  name="estimatedUsefulLifeUnit"
                  value={inputUsefulLifeUnit}
                  onChange={selectedUsefulLifeUnit}
                  className="h-full p-12px outline-none"
                >
                  <option value="year">{t('common:COMMON.YEAR')}</option>
                  <option value="month">{t('common:COMMON.MONTH')}</option>
                  <option value="day">{t('journal:ADD_ASSET_MODAL.DAY')}</option>
                </select>
              </div>
            </div>
          </div>
          {/* Info: (20240503 - Julian) confirm buttons */}
          <div className="flex items-center justify-end gap-12px">
            <Button
              className="px-16px py-8px"
              type="button"
              onClick={modalVisibilityHandler}
              variant={null}
            >
              {t('common:COMMON.CANCEL')}
            </Button>
            <Button
              className="px-16px py-8px"
              type="submit"
              variant="tertiary"
              disabled={isAddButtonDisabled}
            >
              <p>{t('common:COMMON.ADD')}</p> <FaPlus />
            </Button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default AddAssetModal;
