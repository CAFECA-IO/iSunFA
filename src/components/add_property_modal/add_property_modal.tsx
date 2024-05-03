/* eslint-disable */
import { useState } from 'react';
import Image from 'next/image';
import { RxCross2 } from 'react-icons/rx';
import { Button } from '../button/button';
import DatePicker, { DatePickerType } from '../date_picker/date_picker';
import { default30DayPeriodInSec } from '../../constants/display';

interface IAddPropertyModalProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

const AddPropertyModal = ({ isModalVisible, modalVisibilityHandler }: IAddPropertyModalProps) => {
  const [inputName, setInputName] = useState('');
  const [inputDescription, setInputDescription] = useState('');
  const [inputPrice, setInputPrice] = useState(0);
  const [selectedDate, setSelectedDate] = useState(default30DayPeriodInSec);

  const nameChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputName(event.target.value);
  };
  const descriptionChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputDescription(event.target.value);
  };
  const totalPriceChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = Number(event.target.value);
    if (!Number.isNaN(input)) {
      setInputPrice(input);
    }
  };

  const isDisplayModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative flex max-h-450px w-90vw max-w-600px flex-col rounded-sm bg-white p-20px md:max-h-90vh">
        {/* Info: (20240503 - Julian) title */}
        <div className="flex items-center gap-6px font-bold text-navyBlue2">
          <Image src="/icons/assets.svg" width={20} height={20} alt="assets_icon" />
          {/* Info: (20240503 - Julian) desktop title */}
          <h1 className="block whitespace-nowrap text-xl">Asset Management</h1>
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
        <form className="flex w-full flex-col">
          <div className="grid grid-cols-2 items-center gap-x-16px gap-y-50px py-40px text-center text-sm text-navyBlue2">
            {/* Info: (20240503 - Julian) asset name */}
            <div className="flex w-full flex-col items-start gap-y-8px">
              <p className="font-semibold">Asset Name</p>
              <input
                type="text"
                placeholder="Name your asset"
                value={inputName}
                onChange={nameChangeHandler}
                required
                className="h-46px w-full rounded-sm border border-lightGray3 px-12px outline-none placeholder:text-lightGray3"
              />
            </div>
            {/* Info: (20240503 - Julian) description */}
            <div className="flex w-full flex-col items-start gap-y-8px">
              <p className="font-semibold">Description</p>
              <input
                type="text"
                placeholder="Add note"
                value={inputDescription}
                onChange={descriptionChangeHandler}
                required
                className="h-46px w-full rounded-sm border border-lightGray3 px-12px outline-none placeholder:text-lightGray3"
              />
            </div>
            {/* Info: (20240503 - Julian) purchase date */}
            <div className="flex w-full flex-col items-start gap-y-8px">
              <p className="font-semibold">Purchase Date</p>
              <DatePicker
                period={selectedDate}
                setFilteredPeriod={setSelectedDate}
                type={DatePickerType.CHOOSE_PERIOD}
              />
            </div>
            {/* Info: (20240503 - Julian) purchase price */}
            <div className="flex w-full flex-col items-start gap-y-8px">
              <p className="font-semibold">Purchase Price</p>
              <div className="flex h-46px w-full items-center justify-between divide-x divide-lightGray3 rounded-sm border border-lightGray3 bg-white">
                <input
                  id="inputTotalPrice"
                  name="inputTotalPrice"
                  type="number"
                  value={inputPrice}
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
                  <p>TWD</p>
                </div>
              </div>
            </div>
          </div>
          {/* Info: (20240503 - Julian) buttons */}
          <div className="flex items-center justify-end gap-24px">
            <Button
              className="px-16px py-8px"
              type="button"
              onClick={modalVisibilityHandler}
              variant={null}
            >
              Cancel
            </Button>
            <Button
              className="px-16px py-8px"
              type="submit"
              //onClick={submitClickHandler}
              variant="tertiary"
            >
              + Add
            </Button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default AddPropertyModal;
