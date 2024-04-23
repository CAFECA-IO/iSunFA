import Image from 'next/image';
import { useState } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import useOuterClick from '../../lib/hooks/use_outer_click';
import DatePicker, { DatePickerType } from '../date_picker/date_picker';
import { IDatePeriod } from '../../interfaces/date_period';
import { default30DayPeriodInSec } from '../../constants/display';
import { Button } from '../button/button';

const eventTypeSelection: string[] = ['Payment', 'Receiving', 'Transfer'];
const paymentReasonSelection: string[] = [];

const StepTwoTab = () => {
  const [datePeriod, setDatePeriod] = useState<IDatePeriod>(default30DayPeriodInSec);
  const [selectedEventType, setSelectedEventType] = useState<string>(eventTypeSelection[0]);
  const [selectedPaymentReason, setSelectedPaymentReason] = useState<string>(
    paymentReasonSelection[0]
  );
  const [inputDescription, setInputDescription] = useState<string>('');
  const [inputVendor, setInputVendor] = useState<string>('');

  const [inputTotalPrice, setInputTotalPrice] = useState<number>(0);

  const {
    targetRef: eventMenuRef,
    componentVisible: isEventMenuOpen,
    setComponentVisible: setIsEventMenuOpen,
  } = useOuterClick<HTMLUListElement>(false);

  const {
    targetRef: reasonRef,
    componentVisible: isReasonMenuOpen,
    setComponentVisible: setIsReasonMenuOpen,
  } = useOuterClick<HTMLUListElement>(false);

  const toggleEventMenu = () => setIsEventMenuOpen(!isEventMenuOpen);
  const toggleReasonMenu = () => setIsReasonMenuOpen(!isReasonMenuOpen);

  const descriptionChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) =>
    setInputDescription(e.target.value);
  const vendorChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) =>
    setInputVendor(e.target.value);
  const totalPriceChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (Number.isNaN(Number(e.target.value))) return;
    setInputTotalPrice(Number(e.target.value));
  };

  // Info: (20240423 - Julian) 清空所有欄位
  const clearClickHandler = () => {
    setDatePeriod(default30DayPeriodInSec);
    setSelectedEventType(eventTypeSelection[0]);
    setSelectedPaymentReason(paymentReasonSelection[0]);
    setInputDescription('');
    setInputVendor('');
    setInputTotalPrice(0);
  };

  const displayEventDropmenu = eventTypeSelection.map((type: string) => {
    const selectionClickHandler = () => {
      setSelectedEventType(type);
      setIsEventMenuOpen(false);
    };

    return (
      <li
        key={type}
        onClick={selectionClickHandler}
        className="w-full cursor-pointer px-3 py-2 text-navyBlue2 hover:text-primaryYellow"
      >
        {type}
      </li>
    );
  });

  const displayReasonDropmenu = paymentReasonSelection.map((reason: string) => {
    const selectionClickHandler = () => {
      setSelectedPaymentReason(reason);
      setIsReasonMenuOpen(false);
    };

    return (
      <li
        key={reason}
        onClick={selectionClickHandler}
        className="w-full cursor-pointer px-3 py-2 text-navyBlue2 hover:text-primaryYellow"
      >
        {reason}
      </li>
    );
  });

  const displayedBasicInfo = (
    <>
      {/* Info: (20240423 - Julian) Title */}
      <div className="my-5 flex items-center gap-4">
        <hr className="block flex-1 border-lightGray3 md:hidden" />
        <div className="flex items-center gap-2 text-sm">
          <Image src="/icons/info.svg" width={16} height={16} alt="info_icon" />
          <p>Basic Info</p>
        </div>
        <hr className="flex-1 border-lightGray3" />
      </div>

      {/* Info: (20240423 - Julian) Form */}
      <div className="my-20px flex flex-col gap-24px md:gap-40px">
        {/* Info: (20240423 - Julian) First Column */}
        <div className="flex w-full flex-col items-start justify-between gap-y-24px md:flex-row">
          {/* Info: (20240423 - Julian) Date */}
          <div className="flex flex-col items-start gap-8px md:mr-60px">
            <p className="text-sm font-semibold text-navyBlue2">Date</p>
            <DatePicker
              period={datePeriod}
              setFilteredPeriod={setDatePeriod}
              type={DatePickerType.TEXT}
            />
          </div>

          {/* Info: (20240423 - Julian) Event Type */}
          <div className="flex w-full flex-col items-start gap-8px md:w-130px">
            <p className="text-sm font-semibold text-navyBlue2">Event Type</p>
            <div
              id="eventTypeMenu"
              onClick={toggleEventMenu}
              className={`group relative flex h-46px w-full cursor-pointer ${isEventMenuOpen ? 'border-primaryYellow text-primaryYellow' : 'border-lightGray3 text-navyBlue2'} items-center justify-between rounded-md border bg-white p-10px hover:border-primaryYellow hover:text-primaryYellow`}
            >
              <p>{selectedEventType}</p>
              <FaChevronDown />
              {/* Info: (20240423 - Julian) Dropmenu */}
              <div
                className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isEventMenuOpen ? 'grid-rows-1 border-lightGray3' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-md border transition-all duration-300 ease-in-out`}
              >
                <ul
                  ref={eventMenuRef}
                  className="z-10 flex w-full flex-col items-start bg-white p-8px"
                >
                  {displayEventDropmenu}
                </ul>
              </div>
            </div>
          </div>

          {/* Info: (20240423 - Julian) Payment Reason */}
          <div className="flex w-full flex-col items-start gap-8px md:w-3/5">
            <p className="text-sm font-semibold text-navyBlue2">Payment Reason</p>
            <div
              id="paymentReasonMenu"
              onClick={toggleReasonMenu}
              className={`group relative flex h-46px w-full cursor-pointer ${isReasonMenuOpen ? 'border-primaryYellow text-primaryYellow' : 'border-lightGray3 text-navyBlue2'} items-center justify-between rounded-md border bg-white p-10px hover:border-primaryYellow hover:text-primaryYellow`}
            >
              <p>{selectedPaymentReason}</p>
              <FaChevronDown />
              {/* Info: (20240423 - Julian) Dropmenu */}
              <div
                className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isReasonMenuOpen ? 'grid-rows-1 border-lightGray3' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-md border transition-all duration-300 ease-in-out`}
              >
                <ul
                  ref={reasonRef}
                  className="z-10 flex w-full flex-col items-start bg-white p-8px"
                >
                  {displayReasonDropmenu}
                </ul>
              </div>
            </div>
            {/* ToDo: (20240423 - Julian) Add new property */}
            <button type="button" className="ml-auto text-secondaryBlue hover:text-primaryYellow">
              + Add new property
            </button>
          </div>
        </div>

        {/* Info: (20240423 - Julian) Second Column */}
        <div className="flex w-full flex-col items-start justify-between gap-x-60px gap-y-24px md:flex-row">
          {/* Info: (20240423 - Julian) Description */}
          <div className="flex w-full flex-1 flex-col items-start gap-8px">
            <p className="text-sm font-semibold text-navyBlue2">Description</p>
            <input
              id="descriptionInput"
              type="text"
              placeholder="Description"
              value={inputDescription}
              onChange={descriptionChangeHandler}
              required
              className="h-46px w-full items-center justify-between rounded-md border border-lightGray3 bg-white p-10px outline-none"
            />
          </div>

          {/* Info: (20240423 - Julian) Vendor/Supplier */}
          <div className="flex w-full flex-1 flex-col items-start gap-8px">
            <p className="text-sm font-semibold text-navyBlue2">Vendor/Supplier</p>
            <input
              id="vendorInput"
              type="text"
              placeholder="To whom"
              value={inputVendor}
              onChange={vendorChangeHandler}
              required
              className="h-46px w-full items-center justify-between rounded-md border border-lightGray3 bg-white p-10px outline-none"
            />
          </div>
        </div>
      </div>
    </>
  );

  const displayedPayment = (
    <>
      {/* Info: (20240423 - Julian) Title */}
      <div className="my-5 flex items-center gap-4">
        <hr className="block flex-1 border-lightGray3 md:hidden" />
        <div className="flex items-center gap-2 text-sm">
          <Image src="/icons/credit_card.svg" width={16} height={16} alt="credit_card_icon" />
          <p>Payment</p>
        </div>
        <hr className="flex-1 border-lightGray3" />
      </div>

      {/* Info: (20240423 - Julian) Form */}
      <div className="my-20px flex flex-col gap-60px">
        {/* Info: (20240423 - Julian) First Column */}
        <div className="flex w-full items-start justify-between gap-60px">
          {/* Info: (20240423 - Julian) Total Price */}
          <div className="flex flex-1 flex-col items-start gap-8px">
            <p className="text-sm font-semibold text-navyBlue2">Total Price</p>
            <div className="flex h-46px w-full items-center justify-between divide-x divide-lightGray3 rounded-md border border-lightGray3 bg-white">
              <input
                id="totalPriceInput"
                type="number"
                value={inputTotalPrice}
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

          {/* Info: (20240423 - Julian) Tax */}
          <div className="flex flex-col">
            <div className="flex items-center gap-18px">
              <p>Tax</p>
              <div className="inline-flex h-26px w-50px items-center rounded-full bg-gray-300 p-3px">
                <input id="taxCheckbox" type="checkbox" hidden />
                <span className="h-20px w-20px rounded-full bg-white shadow-sm" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <form className="flex flex-col gap-8px">
      {/* Info: (20240423 - Julian) Basic Info */}
      {displayedBasicInfo}

      {/* Info: (20240423 - Julian) Payment */}
      {displayedPayment}

      {/* Info: (20240423 - Julian) Buttons */}
      <div className="ml-auto flex items-center gap-24px">
        <button
          type="button"
          onClick={clearClickHandler}
          className="px-16px py-8px text-secondaryBlue hover:text-primaryYellow"
        >
          Clear all
        </button>
        <Button type="submit" className="px-16px py-8px">
          Save
        </Button>
      </div>
    </form>
  );
};

export default StepTwoTab;
