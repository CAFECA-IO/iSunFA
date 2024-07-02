import { useState } from 'react';
import Image from 'next/image';
import { RxCross2 } from 'react-icons/rx';
import { FaPlus } from 'react-icons/fa6';
import { FiMinus, FiPlus } from 'react-icons/fi';
import { PiWrenchFill } from 'react-icons/pi';
import { Button } from '@/components/button/button';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { default30DayPeriodInSec, radioButtonStyle } from '@/constants/display';
import { useTranslation } from 'next-i18next';

interface IAddAssetModalProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

const AddAssetModal = ({ isModalVisible, modalVisibilityHandler }: IAddAssetModalProps) => {
  const { t } = useTranslation('common');
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
  const purchasePriceChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = Number(event.target.value);
    if (!Number.isNaN(input)) {
      setInputPurchasePrice(input);
    }
  };
  const amountChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = Number(event.target.value);
    if (!Number.isNaN(input)) {
      setInputAmount(input);
    }
  };
  const totalPriceChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = Number(event.target.value);
    if (!Number.isNaN(input)) {
      setInputTotal(input);
    }
  };
  const usefulLifeChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = Number(event.target.value);
    if (!Number.isNaN(input)) {
      setInputUsefulLife(input);
    }
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

  // ToDo: (20240508 - Julian) Add Property Submit Handler
  const addAssetSubmitHandler = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  const isDisplayModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="relative flex max-h-450px w-90vw max-w-600px flex-col rounded-sm bg-white p-20px md:max-h-90vh">
        {/* Info: (20240503 - Julian) title */}
        <div className="flex items-center gap-6px font-bold text-navyBlue2">
          <Image src="/icons/assets.svg" width={20} height={20} alt="assets_icon" />
          {/* Info: (20240503 - Julian) desktop title */}
          <h1 className="block whitespace-nowrap text-xl">
            {t('ADD_ASSET_MODAL.ASSET_MANAGEMENT')}
          </h1>
        </div>
        {/* Info: (20240503 - Julian) close button */}
        <button
          type="button"
          onClick={modalVisibilityHandler}
          className="absolute right-12px top-12px text-lightGray5"
        >
          <RxCross2 size={20} />
        </button>
        {/* Info: (20240503 - Julian) content */}
        <form
          onSubmit={addAssetSubmitHandler}
          className="flex w-full flex-col gap-y-40px overflow-y-auto overflow-x-hidden text-sm text-navyBlue2"
        >
          {/* Info: (20240503 - Julian) input fields */}
          <div className="grid grid-cols-1 items-center gap-x-16px gap-y-50px pt-40px text-center md:grid-cols-2">
            {/* Info: (20240503 - Julian) asset name */}
            <div className="flex w-full flex-col items-start gap-y-8px">
              <p className="font-semibold">{t('ADD_ASSET_MODAL.ASSET_NAME')}</p>
              <input
                type="text"
                placeholder={t('ADD_ASSET_MODAL.NAME_YOUR_ASSET')}
                value={inputName}
                onChange={nameChangeHandler}
                required
                className="h-46px w-full rounded-sm border border-lightGray3 px-12px outline-none placeholder:text-lightGray3"
              />
            </div>
            {/* Info: (20240503 - Julian) description */}
            <div className="flex w-full flex-col items-start gap-y-8px">
              <p className="font-semibold">{t('JOURNAL.DESCRIPTION')}</p>
              <input
                type="text"
                placeholder={t('ADD_ASSET_MODAL.ADD_NOTE')}
                value={inputDescription}
                onChange={descriptionChangeHandler}
                required
                className="h-46px w-full rounded-sm border border-lightGray3 px-12px outline-none placeholder:text-lightGray3"
              />
            </div>
            {/* Info: (20240503 - Julian) purchase date */}
            <div className="flex w-full flex-col items-start gap-y-8px">
              <p className="font-semibold">{t('ADD_ASSET_MODAL.PURCHASE_DATE')}</p>
              <DatePicker
                period={selectedDate}
                setFilteredPeriod={setSelectedDate}
                type={DatePickerType.TEXT_DATE}
              />
            </div>
            {/* Info: (20240503 - Julian) purchase price */}
            <div className="flex w-full flex-col items-start gap-y-8px">
              <p className="font-semibold">{t('ADD_ASSET_MODAL.PURCHASE_PRICE')}</p>
              <div className="flex h-46px w-full items-center justify-between divide-x divide-lightGray3 rounded-sm border border-lightGray3 bg-white">
                <input
                  id="inputPurchasePrice"
                  name="inputPurchasePrice"
                  type="number"
                  value={inputPurchasePrice}
                  onChange={purchasePriceChangeHandler}
                  required
                  className="flex-1 bg-transparent px-10px outline-none"
                />
                <div className="flex items-center gap-4px p-12px text-sm text-lightGray4">
                  <Image
                    src="/currencies/twd.svg"
                    width={16}
                    height={16}
                    alt="twd_icon"
                    className="rounded-full"
                  />
                  <p>{t('JOURNAL.TWD')}</p>
                </div>
              </div>
            </div>
            {/* Info: (20240508 - Julian) amount */}
            <div className="flex w-full flex-col items-start gap-y-8px">
              <p className="font-semibold">{t('ADD_ASSET_MODAL.AMOUNT')}</p>
              <div className="flex h-46px w-full items-center justify-between divide-x divide-lightGray3 rounded-sm border border-lightGray3 bg-white">
                <button type="button" className="p-12px" onClick={minusAmountHandler}>
                  <FiMinus size={20} />
                </button>
                <input
                  id="inputAmount"
                  name="inputAmount"
                  type="number"
                  min={1}
                  value={inputAmount}
                  onChange={amountChangeHandler}
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
              <p className="font-semibold">{t('ADD_ASSET_MODAL.TOTAL')}</p>
              <div className="flex h-46px w-full items-center justify-between divide-x divide-lightGray3 rounded-sm border border-lightGray3 bg-white">
                <input
                  id="inputTotal"
                  name="inputTotal"
                  type="number"
                  value={inputTotal}
                  onChange={totalPriceChangeHandler}
                  required
                  className="flex-1 bg-transparent px-10px outline-none"
                />
                <div className="flex items-center gap-4px p-12px text-sm text-lightGray4">
                  <Image
                    src="/currencies/twd.svg"
                    width={16}
                    height={16}
                    alt="twd_icon"
                    className="rounded-full"
                  />
                  <p>{t('JOURNAL.TWD')}</p>
                </div>
              </div>
            </div>
          </div>
          {/* Info: (20240503 - Julian) radio buttons */}
          <div className="flex flex-col justify-between gap-10px md:flex-row md:items-center">
            <p className="font-semibold">{t('ADD_ASSET_MODAL.ASSET_TYPE')}</p>
            <div className="flex items-center gap-x-20px">
              <label
                htmlFor="intangibleAssets"
                className="flex items-center gap-8px whitespace-nowrap"
              >
                <input
                  type="radio"
                  id="intangibleAssets"
                  name="assetType"
                  className={radioButtonStyle}
                  onChange={intangibleAssetsClickHandler}
                  checked={inputAssetType === 'Intangible Assets'}
                />
                <p>{t('ADD_ASSET_MODAL.INTANGIBLE ASSETS')}</p>
              </label>
              <label
                htmlFor="tangibleAssets"
                className="flex items-center gap-8px whitespace-nowrap"
              >
                <input
                  type="radio"
                  id="tangibleAssets"
                  name="assetType"
                  className={radioButtonStyle}
                  onChange={tangibleAssetsClickHandler}
                  checked={inputAssetType === 'Tangible Assets'}
                />
                <p>{t('ADD_ASSET_MODAL.TANGIBLE_ASSETS')}</p>
              </label>
            </div>
          </div>
          {/* Info: (20240503 - Julian) depreciation */}
          <div className="flex flex-col gap-40px">
            {/* Info: (20240508 - Julian) depreciation divider */}
            <div className="flex items-center gap-4">
              <hr className="flex-1 border-lightGray3" />
              <div className="flex items-center gap-2 text-sm">
                <PiWrenchFill size={16} />
                <p>{t('ADD_ASSET_MODAL.DEPRECIATION')}</p>
              </div>
              <hr className="flex-1 border-lightGray3" />
            </div>
            {/* Info: (20240508 - Julian) depreciation method */}
            <div className="flex flex-col gap-y-8px">
              <p className="font-semibold">{t('ADD_ASSET_MODAL.DEPRECIATION_METHOD')}</p>
              <select
                id="depreciationMethod"
                name="depreciationMethod"
                value={inputDepreciationMethod}
                onChange={selectedDepreciationMethod}
                className="h-46px w-full rounded-sm border border-lightGray3 px-12px outline-none"
              >
                <option value="straightLine" className="bg-white">
                  {t('ADD_ASSET_MODAL.STRAIGHT_LINE')}
                </option>
                <option value="doubleDeclining className='bg-white'">
                  {t('ADD_ASSET_MODAL.DOUBLE_DECLINING')}
                </option>
                <option value="unitsOfProduction" className="bg-white">
                  {t('ADD_ASSET_MODAL.UNITS_OF_PRODUCTION')}
                </option>
              </select>
            </div>
            {/* Info: (20240508 - Julian) estimated useful life */}
            <div className="flex flex-col gap-y-8px">
              <p className="font-semibold">{t('ADD_ASSET_MODAL.ESTIMATED_USEFUL_LIFE')}</p>
              <div className="flex h-46px w-full items-center justify-between divide-x divide-lightGray3 overflow-hidden rounded-sm border border-lightGray3 bg-white">
                <input
                  id="inputUsefulLife"
                  name="inputUsefulLife"
                  type="number"
                  value={inputUsefulLife}
                  onChange={usefulLifeChangeHandler}
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
                  <option value="year" className="bg-white">
                    {t('ADD_ASSET_MODAL.YEAR')}Year
                  </option>
                  <option value="month" className="bg-white">
                    {t('ADD_ASSET_MODAL.MONTH')}
                  </option>
                  <option value="day" className="bg-white">
                    {t('ADD_ASSET_MODAL.DAY')}
                  </option>
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
              {t('REPORTS_HISTORY_LIST.CANCEL')}
            </Button>
            <Button
              className="px-16px py-8px"
              type="submit"
              variant="tertiary"
              disabled={isAddButtonDisabled}
            >
              <p>{t('PROJECT.ADD')}</p> <FaPlus />
            </Button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default AddAssetModal;
