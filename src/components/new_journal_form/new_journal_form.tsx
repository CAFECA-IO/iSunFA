import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { FaChevronDown } from 'react-icons/fa';
import useOuterClick from '../../lib/hooks/use_outer_click';
import DatePicker, { DatePickerType } from '../date_picker/date_picker';
import { useGlobalCtx } from '../../contexts/global_context';
import { IDatePeriod } from '../../interfaces/date_period';
import { IJournal } from '../../interfaces/journal';
import { default30DayPeriodInSec } from '../../constants/display';
import { Button } from '../button/button';
import Toggle from '../toggle/toggle';

// Info: (20240425 - Julian) dummy data, will be replaced by API data
const eventTypeSelection: string[] = ['Payment', 'Receiving', 'Transfer'];
const paymentReasonSelection: string[] = [];
const taxRateSelection: number[] = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
const paymentMethodSelection: string[] = ['Transfer', 'Credit Card', 'Cash'];
const ficSelection: string[] = [
  '004 Bank of Taiwan',
  '005 Land Bank of Taiwan',
  '006 Taiwan Cooperative Bank',
  '007 First Commercial Bank',
];
const projectSelection: string[] = ['None', 'Project A', 'Project B', 'Project C'];
const contractSelection: string[] = ['None', 'Contract A', 'Contract B', 'Contract C'];

enum PaymentPeriod {
  AT_ONCE = 'At Once',
  INSTALLMENT = 'Installment',
}

enum PaymentState {
  PAID = 'Paid',
  UNPAID = 'Unpaid',
  PARTIAL_PAID = 'Partial Paid',
}

const NewJournalForm = () => {
  const { warningModalVisibilityHandler, warningModalDataHandler } = useGlobalCtx();

  // Info: (20240425 - Julian) check if form has changed
  const [formHasChanged, setFormHasChanged] = useState<boolean>(false);

  // Info: (20240425 - Julian) Basic Info states
  const [datePeriod, setDatePeriod] = useState<IDatePeriod>(default30DayPeriodInSec);
  const [selectedEventType, setSelectedEventType] = useState<string>(eventTypeSelection[0]);
  const [selectedPaymentReason, setSelectedPaymentReason] = useState<string>(
    paymentReasonSelection[0]
  );
  const [inputDescription, setInputDescription] = useState<string>('');
  const [inputVendor, setInputVendor] = useState<string>('');
  // Info: (20240425 - Julian) Payment states
  const [inputTotalPrice, setInputTotalPrice] = useState<number>(0);
  const [taxToggle, setTaxToggle] = useState<boolean>(false);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [feeToggle, setFeeToggle] = useState<boolean>(false);
  const [inputFee, setInputFee] = useState<number>(0);
  const [selectedMethod, setSelectedMethod] = useState<string>(paymentMethodSelection[0]);
  const [selectedFIC, setSelectedFIC] = useState<string>(ficSelection[0]);
  const [inputAccountNumber, setInputAccountNumber] = useState<string>('');
  const [paymentPeriod, setPaymentPeriod] = useState<PaymentPeriod>(PaymentPeriod.AT_ONCE);
  const [inputInstallment, setInputInstallment] = useState<number>(0);
  const [paymentState, setPaymentState] = useState<PaymentState>(PaymentState.PAID);
  const [inputPartialPaid, setInputPartialPaid] = useState<number>(0);
  // Info: (20240425 - Julian) Project states
  const [selectedProject, setSelectedProject] = useState<string>(projectSelection[0]);
  const [selectedContract, setSelectedContract] = useState<string>(contractSelection[0]);

  // ToDo: (20240425 - Julian) move to context
  const [tempJournalData, setTempJournalData] = useState<IJournal[]>([]);

  // Info: (20240425 - Julian) 整理日記帳資料
  const newJournalData: IJournal = {
    basicInfo: {
      dateStartTimestamp: datePeriod.startTimeStamp,
      dateEndTimestamp: datePeriod.endTimeStamp,
      eventType: selectedEventType,
      paymentReason: selectedPaymentReason,
      description: inputDescription,
      vendor: inputVendor,
    },
    payment: {
      totalPrice: inputTotalPrice,
      tax: taxToggle ? taxRate : undefined,
      fee: feeToggle ? inputFee : undefined,
      paymentMethod: selectedMethod,
      bankAccount: `${selectedFIC} - ${inputAccountNumber}`,
      paymentPeriod: paymentPeriod === PaymentPeriod.AT_ONCE ? 1 : inputInstallment,
      paymentState:
        paymentState === PaymentState.PARTIAL_PAID
          ? `${paymentState}: ${inputPartialPaid}`
          : paymentState,
    },
    project: {
      project: selectedProject,
      contract: selectedContract,
    },
  };

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

  const {
    targetRef: taxRef,
    componentVisible: isTaxMenuOpen,
    setComponentVisible: setIsTaxMenuOpen,
  } = useOuterClick<HTMLUListElement>(false);

  const {
    targetRef: methodRef,
    componentVisible: isMethodMenuOpen,
    setComponentVisible: setIsMethodMenuOpen,
  } = useOuterClick<HTMLUListElement>(false);

  const {
    targetRef: bankAccountRef,
    componentVisible: isBankAccountMenuOpen,
    setComponentVisible: setIsBankAccountMenuOpen,
  } = useOuterClick<HTMLUListElement>(false);

  const {
    targetRef: projectRef,
    componentVisible: isProjectMenuOpen,
    setComponentVisible: setIsProjectMenuOpen,
  } = useOuterClick<HTMLUListElement>(false);

  const {
    targetRef: contractRef,
    componentVisible: isContractMenuOpen,
    setComponentVisible: setIsContractMenuOpen,
  } = useOuterClick<HTMLUListElement>(false);

  // Info: (20240425 - Julian) 開啟/關閉下拉選單
  const eventMenuOpenHandler = () => setIsEventMenuOpen(!isEventMenuOpen);
  const reasonMenuHandler = () => setIsReasonMenuOpen(!isReasonMenuOpen);
  const taxMenuHandler = () => setIsTaxMenuOpen(!isTaxMenuOpen);
  const methodMenuHandler = () => setIsMethodMenuOpen(!isMethodMenuOpen);
  const bankAccountMenuHandler = () => setIsBankAccountMenuOpen(!isBankAccountMenuOpen);
  const projectMenuHandler = () => setIsProjectMenuOpen(!isProjectMenuOpen);
  const contractMenuHandler = () => setIsContractMenuOpen(!isContractMenuOpen);

  // Info: (20240423 - Julian) 處理 input 輸入
  const descriptionChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputDescription(e.target.value);
  };
  const vendorChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputVendor(e.target.value);
  };
  const totalPriceChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = Number(e.target.value);
    if (!Number.isNaN(input)) {
      setInputTotalPrice(Number(e.target.value));
    }
  };
  const feeChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = Number(e.target.value);
    if (!Number.isNaN(input)) {
      setInputFee(Number(e.target.value));
    }
  };
  const accountNumberChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputAccountNumber(e.target.value);
  };
  const installmentChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = Number(e.target.value);
    if (!Number.isNaN(input)) {
      setInputInstallment(Number(e.target.value));
    }
  };
  const partialPaidChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = Number(e.target.value);
    if (!Number.isNaN(input)) {
      setInputPartialPaid(Number(e.target.value));
    }
  };

  // Info: (20240423 - Julian) 處理 toggle 開關
  const taxToggleHandler = () => setTaxToggle(!taxToggle);
  const feeToggleHandler = () => setFeeToggle(!feeToggle);

  // Info: (20240423 - Julian) 處理 radio button 選擇
  const atOnceClickHandler = () => setPaymentPeriod(PaymentPeriod.AT_ONCE);
  const installmentClickHandler = () => setPaymentPeriod(PaymentPeriod.INSTALLMENT);
  const paidClickHandler = () => setPaymentState(PaymentState.PAID);
  const partialPaidClickHandler = () => setPaymentState(PaymentState.PARTIAL_PAID);
  const unpaidClickHandler = () => setPaymentState(PaymentState.UNPAID);

  //  Info: (20240425 - Julian) 檢查表單內容是否有變動
  const formChangedHandler = () => setFormHasChanged(true);

  // Info: (20240423 - Julian) 清空表單的所有欄位
  const clearFormHandler = () => {
    setDatePeriod(default30DayPeriodInSec);
    setSelectedEventType(eventTypeSelection[0]);
    setSelectedPaymentReason(paymentReasonSelection[0]);
    setInputDescription('');
    setInputVendor('');
    setInputTotalPrice(0);
    setTaxRate(taxRateSelection[0]);
    setInputFee(0);
    setSelectedMethod(paymentMethodSelection[0]);
    setSelectedFIC(ficSelection[0]);
    setInputAccountNumber('');
    setPaymentPeriod(PaymentPeriod.AT_ONCE);
    setInputInstallment(0);
    setPaymentState(PaymentState.PAID);
    setInputPartialPaid(0);
    setSelectedProject(projectSelection[0]);
    setSelectedContract(contractSelection[0]);
  };

  // Info: (20240425 - Julian) 整理警告視窗的資料
  const dataWarningModal = {
    title: 'Clear form content',
    content: 'Are you sure you want to clear form content?',
    modalSubmitBtn: 'Clear All',
    submitBtnFunction: () => clearFormHandler(),
  };

  // Info: (20240425 - Julian) 點擊 Clear All 按鈕時，彈出警告視窗
  const clearAllClickHandler = () => {
    warningModalDataHandler(dataWarningModal);
    warningModalVisibilityHandler();
  };

  // Info: (20240425 - Julian) 儲存日記帳資料
  const saveJournalHandler = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTempJournalData([...tempJournalData, newJournalData]);
  };

  // Info: (20240425 - Julian) radio button CSS style
  const radioButtonStyle =
    'relative h-16px w-16px appearance-none rounded-full border border-navyBlue2 bg-white after:absolute after:left-1/2 after:top-1/2 after:-ml-5px after:-mt-5px after:hidden after:h-10px after:w-10px after:rounded-full after:bg-navyBlue2 checked:after:block';

  const router = useRouter();

  // Info (20240220 - Murky) Prevent Unsave leave
  useEffect(() => {
    const warningText = 'You have unsaved changes - are you sure you wish to leave this page?';

    const handleWindowClose = (e: BeforeUnloadEvent) => {
      if (!formHasChanged) return;
      e.preventDefault();
      // return (e.returnValue = warningText);
    };
    const handleBrowseAway = () => {
      if (!formHasChanged) return;

      if (window.confirm(warningText)) return;
      router.events.emit('routeChangeError');
      throw new Error('routeChange aborted.');
    };

    window.addEventListener('beforeunload', handleWindowClose);
    router.events.on('routeChangeStart', handleBrowseAway);
    return () => {
      window.removeEventListener('beforeunload', handleWindowClose);
      router.events.off('routeChangeStart', handleBrowseAway);
    };
  }, [formHasChanged]);

  // Info: (20240425 - Julian) 下拉選單選項
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

  const displayTaxDropmenu = taxRateSelection.map((rate: number) => {
    const selectionClickHandler = () => {
      setTaxRate(rate);
      setIsTaxMenuOpen(false);
    };

    return (
      <li
        key={rate}
        onClick={selectionClickHandler}
        className="w-full cursor-pointer px-3 py-2 text-left text-navyBlue2 hover:text-primaryYellow"
      >
        {rate}%
      </li>
    );
  });

  const displayMethodDropmenu = paymentMethodSelection.map((method: string) => {
    const selectionClickHandler = () => {
      setSelectedMethod(method);
    };

    return (
      <li
        key={method}
        onClick={selectionClickHandler}
        className="w-full cursor-pointer px-3 py-2 text-navyBlue2 hover:text-primaryYellow"
      >
        {method}
      </li>
    );
  });

  const displayFICDropmenu = ficSelection.map((account: string) => {
    const selectionClickHandler = () => {
      setSelectedFIC(account);
    };

    return (
      <li
        key={account}
        onClick={selectionClickHandler}
        className="w-full cursor-pointer px-3 py-2 text-navyBlue2 hover:text-primaryYellow"
      >
        {account}
      </li>
    );
  });

  const displayProjectDropmenu = projectSelection.map((project: string) => {
    const selectionClickHandler = () => {
      setSelectedProject(project);
    };

    return (
      <li
        key={project}
        onClick={selectionClickHandler}
        className="w-full cursor-pointer px-3 py-2 text-navyBlue2 hover:text-primaryYellow"
      >
        {project}
      </li>
    );
  });

  const displayContractDropmenu = contractSelection.map((contract: string) => {
    const selectionClickHandler = () => {
      setSelectedContract(contract);
    };

    return (
      <li
        key={contract}
        onClick={selectionClickHandler}
        className="w-full cursor-pointer px-3 py-2 text-navyBlue2 hover:text-primaryYellow"
      >
        {contract}
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
          <div className="flex flex-col items-start gap-8px md:w-240px">
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
              onClick={eventMenuOpenHandler}
              className={`group relative flex h-46px w-full cursor-pointer ${isEventMenuOpen ? 'border-primaryYellow text-primaryYellow' : 'border-lightGray3 text-navyBlue2'} items-center justify-between rounded-xs border bg-white p-10px hover:border-primaryYellow hover:text-primaryYellow`}
            >
              <p>{selectedEventType}</p>
              <FaChevronDown />
              {/* Info: (20240423 - Julian) Dropmenu */}
              <div
                className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isEventMenuOpen ? 'grid-rows-1 border-lightGray3' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-xs border transition-all duration-300 ease-in-out`}
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
              onClick={reasonMenuHandler}
              className={`group relative flex h-46px w-full cursor-pointer ${isReasonMenuOpen ? 'border-primaryYellow text-primaryYellow' : 'border-lightGray3 text-navyBlue2'} items-center justify-between rounded-xs border bg-white p-10px hover:border-primaryYellow hover:text-primaryYellow`}
            >
              <p>{selectedPaymentReason}</p>
              <FaChevronDown />
              {/* Info: (20240423 - Julian) Dropmenu */}
              <div
                className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isReasonMenuOpen ? 'grid-rows-1 border-lightGray3' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-xs border transition-all duration-300 ease-in-out`}
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
              id="inputDescription"
              name="inputDescription"
              type="text"
              placeholder="Description"
              value={inputDescription}
              onChange={descriptionChangeHandler}
              required
              className="h-46px w-full items-center justify-between rounded-xs border border-lightGray3 bg-white p-10px outline-none"
            />
          </div>

          {/* Info: (20240423 - Julian) Vendor/Supplier */}
          <div className="flex w-full flex-1 flex-col items-start gap-8px">
            <p className="text-sm font-semibold text-navyBlue2">Vendor/Supplier</p>
            <input
              id="inputVendor"
              name="inputVendor"
              type="text"
              placeholder="To whom"
              value={inputVendor}
              onChange={vendorChangeHandler}
              required
              className="h-46px w-full items-center justify-between rounded-xs border border-lightGray3 bg-white p-10px outline-none"
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
      <div className="my-20px flex flex-col gap-40px">
        {/* Info: (20240423 - Julian) First Column */}
        <div className="flex w-full flex-col items-start justify-between gap-x-60px gap-y-24px md:flex-row md:items-end">
          {/* Info: (20240423 - Julian) Total Price */}
          <div className="flex w-full flex-1 flex-col items-start gap-8px">
            <p className="text-sm font-semibold text-navyBlue2">Total Price</p>
            <div className="flex h-46px w-full items-center justify-between divide-x divide-lightGray3 rounded-xs border border-lightGray3 bg-white">
              <input
                id="inputTotalPrice"
                name="inputTotalPrice"
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
          <div className="flex w-full flex-col gap-8px text-lightGray4 md:w-200px">
            {/* Info: (20240424 - Julian) toggle */}
            <div className="flex items-center gap-18px">
              <p>Tax</p>
              <Toggle
                id="taxToggle"
                initialToggleState={taxToggle}
                getToggledState={taxToggleHandler}
              />
            </div>

            {/* Info: (20240424 - Julian) dropmenu */}
            <button
              id="taxMenu"
              name="taxMenu"
              type="button"
              onClick={taxMenuHandler}
              disabled={!taxToggle}
              className={`group relative flex h-46px cursor-pointer ${isTaxMenuOpen ? 'border-primaryYellow text-primaryYellow' : 'border-lightGray3 text-navyBlue2'} items-center justify-between rounded-xs border bg-white p-10px transition-all duration-300 ease-in-out enabled:hover:border-primaryYellow enabled:hover:text-primaryYellow disabled:cursor-default disabled:bg-lightGray6`}
            >
              <p>{taxRate}%</p>
              <FaChevronDown />
              <div
                className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isTaxMenuOpen ? 'grid-rows-1 border-lightGray3' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-xs border transition-all duration-300 ease-in-out`}
              >
                <ul ref={taxRef} className="z-10 flex w-full flex-col items-start bg-white p-8px">
                  {displayTaxDropmenu}
                </ul>
              </div>
            </button>
          </div>

          {/* Info: (20240424 - Julian) Fee */}
          <div className="flex w-full flex-col gap-8px text-lightGray4 md:w-200px">
            {/* Info: (20240424 - Julian) toggle */}
            <div className="flex items-center gap-18px">
              <p>Fee</p>
              <Toggle
                id="feeToggle"
                initialToggleState={feeToggle}
                getToggledState={feeToggleHandler}
              />
            </div>
            <div
              className={`flex h-46px w-full items-center justify-between ${feeToggle ? 'bg-white' : 'bg-lightGray6'} divide-x divide-lightGray3 rounded-xs border border-lightGray3 transition-all duration-300 ease-in-out`}
            >
              <input
                id="feeInput"
                name="feeInput"
                type="number"
                disabled={!feeToggle}
                value={inputFee}
                onChange={feeChangeHandler}
                className="flex-1 bg-transparent px-10px outline-none md:w-1/2"
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

        {/* Info: (20240424 - Julian) Second Column */}
        <div className="flex w-full flex-col items-start justify-between gap-24px md:flex-row md:items-end">
          {/* Info: (20240424 - Julian) Payment Method */}
          <div className="flex w-full flex-col items-start gap-8px md:w-200px">
            <p className="text-sm font-semibold text-navyBlue2">Payment Method</p>
            <div
              id="paymentMethodMenu"
              onClick={methodMenuHandler}
              className={`group relative flex h-46px w-full cursor-pointer ${isMethodMenuOpen ? 'border-primaryYellow text-primaryYellow' : 'border-lightGray3 text-navyBlue2'} items-center justify-between rounded-xs border bg-white p-10px hover:border-primaryYellow hover:text-primaryYellow`}
            >
              <p>{selectedMethod}</p>
              <FaChevronDown />
              {/* Info: (20240424 - Julian) Dropmenu */}
              <div
                className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isMethodMenuOpen ? 'grid-rows-1 border-lightGray3' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-xs border transition-all duration-300 ease-in-out`}
              >
                <ul
                  ref={methodRef}
                  className="z-10 flex w-full flex-col items-start bg-white p-8px"
                >
                  {displayMethodDropmenu}
                </ul>
              </div>
            </div>
          </div>

          {/* Info: (20240424 - Julian) Financial Institution Code */}
          <div className="flex w-full flex-col items-start gap-8px md:w-300px">
            <p className="text-sm font-semibold text-navyBlue2">Bank Account</p>
            <div
              id="ficMenu"
              onClick={bankAccountMenuHandler}
              className={`group relative flex h-46px w-full cursor-pointer ${isBankAccountMenuOpen ? 'border-primaryYellow text-primaryYellow' : 'border-lightGray3 text-navyBlue2'} items-center justify-between rounded-xs border bg-white p-10px hover:border-primaryYellow hover:text-primaryYellow`}
            >
              <p>{selectedFIC}</p>
              <FaChevronDown />
              {/* Info: (20240424 - Julian) Dropmenu */}
              <div
                className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isBankAccountMenuOpen ? 'grid-rows-1 border-lightGray3' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-xs border transition-all duration-300 ease-in-out`}
              >
                <ul
                  ref={bankAccountRef}
                  className="z-10 flex w-full flex-col items-start bg-white p-8px"
                >
                  {displayFICDropmenu}
                </ul>
              </div>
            </div>
          </div>

          {/* Info: (20240424 - Julian) Bank Account */}
          <div className="flex w-full flex-1 flex-col items-start gap-8px">
            <input
              id="inputAccountNumber"
              name="inputAccountNumber"
              type="text"
              placeholder="Account Number"
              value={inputAccountNumber}
              onChange={accountNumberChangeHandler}
              required
              className="h-46px w-full items-center justify-between rounded-xs border border-lightGray3 bg-white p-10px outline-none"
            />
          </div>
        </div>

        {/* Info: (20240424 - Julian) Third Column */}
        <div className="flex w-full flex-col items-start gap-x-60px gap-y-24px md:flex-row md:items-end">
          {/* Info: (20240424 - Julian) Payment Period */}
          <div className="flex w-full flex-col items-start gap-8px md:w-fit">
            <p className="text-sm font-semibold text-navyBlue2">Period</p>
            {/* Info: (20240424 - Julian) radio buttons */}
            <div className="flex w-full flex-col items-start gap-x-60px gap-y-16px md:flex-row md:items-center">
              {/* Info: (20240424 - Julian) At Once */}
              <label htmlFor="inputAtOnce" className="flex items-center gap-8px whitespace-nowrap">
                <input
                  type="radio"
                  id="inputAtOnce"
                  name="paymentPeriod"
                  className={radioButtonStyle}
                  checked={paymentPeriod === PaymentPeriod.AT_ONCE}
                  onChange={atOnceClickHandler}
                />
                <p>At Once</p>
              </label>

              {/* Info: (20240424 - Julian) Installment */}
              <div className="flex w-full flex-1 flex-col items-start gap-8px md:flex-row md:items-center">
                <label
                  htmlFor="inputInstallment"
                  className="flex w-full items-center gap-8px whitespace-nowrap"
                >
                  <input
                    type="radio"
                    id="inputInstallment"
                    name="paymentPeriod"
                    className={radioButtonStyle}
                    checked={paymentPeriod === PaymentPeriod.INSTALLMENT}
                    onChange={installmentClickHandler}
                  />
                  Installment:
                </label>
                {/* Info: (20240424 - Julian) input */}
                <div
                  className={`flex h-46px w-full items-center justify-between ${paymentPeriod === PaymentPeriod.INSTALLMENT ? 'bg-white' : 'bg-lightGray6'} divide-x divide-lightGray3 rounded-xs border border-lightGray3 transition-all duration-300 ease-in-out`}
                >
                  <input
                    id="inputInstallmentTimes"
                    type="number"
                    name="inputInstallmentTimes"
                    value={inputInstallment}
                    onChange={installmentChangeHandler}
                    disabled={paymentPeriod !== PaymentPeriod.INSTALLMENT}
                    className="flex-1 bg-transparent px-10px outline-none"
                  />
                  <div className="flex items-center gap-4px p-12px text-sm text-lightGray4">
                    <p>Times</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info: (20240424 - Julian) Payment State */}
          <div className="flex w-full flex-col items-start gap-8px">
            <p className="text-sm font-semibold text-navyBlue2">Payment State</p>
            {/* Info: (20240424 - Julian) radio buttons */}
            <div className="flex w-full flex-col items-start gap-x-60px gap-y-24px md:flex-row md:items-center md:justify-between">
              {/* Info: (20240424 - Julian) Unpaid */}
              <label htmlFor="inputUnpaid" className=" flex items-center gap-8px whitespace-nowrap">
                <input
                  type="radio"
                  id="inputUnpaid"
                  name="paymentState"
                  className={radioButtonStyle}
                  checked={paymentState === PaymentState.UNPAID}
                  onChange={unpaidClickHandler}
                />
                <p>Unpaid</p>
              </label>
              {/* Info: (20240424 - Julian) Partial Paid */}
              <div className="flex w-full flex-col items-start gap-8px md:flex-row md:items-center">
                <label
                  htmlFor="inputPartialPaid"
                  className="flex items-center gap-8px whitespace-nowrap"
                >
                  <input
                    type="radio"
                    id="inputPartialPaid"
                    name="paymentState"
                    className={radioButtonStyle}
                    checked={paymentState === PaymentState.PARTIAL_PAID}
                    onChange={partialPaidClickHandler}
                  />
                  <p>Partial Paid:</p>
                </label>
                {/* Info: (20240424 - Julian) input */}
                <div
                  className={`flex h-46px w-full items-center justify-between ${paymentState === PaymentState.PARTIAL_PAID ? 'bg-white' : 'bg-lightGray6'} divide-x divide-lightGray3 rounded-xs border border-lightGray3 transition-all duration-300 ease-in-out`}
                >
                  <input
                    id="inputPartialPaidAmount"
                    type="number"
                    name="inputPartialPaidAmount"
                    value={inputPartialPaid}
                    onChange={partialPaidChangeHandler}
                    disabled={paymentState !== PaymentState.PARTIAL_PAID}
                    className="flex-1 bg-transparent px-10px outline-none md:w-1/2"
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
              {/* Info: (20240424 - Julian) Paid */}
              <label htmlFor="inputPaid" className="flex items-center gap-8px whitespace-nowrap">
                <input
                  type="radio"
                  id="inputPaid"
                  name="paymentState"
                  className={radioButtonStyle}
                  checked={paymentState === PaymentState.PAID}
                  onChange={paidClickHandler}
                />
                <p>Paid</p>
              </label>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const displayedProject = (
    <>
      {/* Info: (20240424 - Julian) Title */}
      <div className="my-5 flex items-center gap-4">
        <hr className="block flex-1 border-lightGray3 md:hidden" />
        <div className="flex items-center gap-2 text-sm">
          <Image src="/icons/rocket_launch.svg" width={16} height={16} alt="rocket_launch_icon" />
          <p>Project</p>
        </div>
        <hr className="flex-1 border-lightGray3" />
      </div>

      {/* Info: (20240424 - Julian) Form */}
      <div className="my-20px flex flex-col gap-40px md:flex-row">
        {/* Info: (20240424 - Julian) Project */}
        <div
          id="projectMenu"
          onClick={projectMenuHandler}
          className={`group relative flex w-full cursor-pointer ${isProjectMenuOpen ? 'border-primaryYellow text-primaryYellow' : 'border-lightGray3 text-navyBlue2'} items-center justify-between divide-x divide-lightGray3 rounded-xs border bg-white hover:border-primaryYellow hover:text-primaryYellow`}
        >
          <div className="p-12px text-sm text-lightGray4">
            <p>Project</p>
          </div>
          <div className="flex w-full items-center p-10px">
            <p className="flex-1">{selectedProject}</p>
            <FaChevronDown />
            {/* Info: (20240424 - Julian) Dropmenu */}
            <div
              className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isProjectMenuOpen ? 'grid-rows-1 border-lightGray3' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-xs border transition-all duration-300 ease-in-out`}
            >
              <ul ref={projectRef} className="z-10 flex w-full flex-col items-start bg-white p-8px">
                {displayProjectDropmenu}
              </ul>
            </div>
          </div>
        </div>

        {/* Info: (20240424 - Julian) Contract */}
        <div
          id="contractMenu"
          onClick={contractMenuHandler}
          className={`group relative flex w-full cursor-pointer ${isContractMenuOpen ? 'border-primaryYellow text-primaryYellow' : 'border-lightGray3 text-navyBlue2'} items-center justify-between divide-x divide-lightGray3 rounded-xs border bg-white hover:border-primaryYellow hover:text-primaryYellow`}
        >
          <div className="p-12px text-sm text-lightGray4">
            <p>Contract</p>
          </div>
          <div className="flex w-full items-center p-10px">
            <p className="flex-1">{selectedContract}</p>
            <FaChevronDown />
            {/* Info: (20240424 - Julian) Dropmenu */}
            <div
              className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isContractMenuOpen ? 'grid-rows-1 border-lightGray3' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-xs border transition-all duration-300 ease-in-out`}
            >
              <ul
                ref={contractRef}
                className="z-10 flex w-full flex-col items-start bg-white p-8px"
              >
                {displayContractDropmenu}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // ToDo: (20240425 - Julian) move to <StepTwoTab />
  const displayTempList = (
    <div className="mt-10 flex flex-col justify-center">
      {tempJournalData.map((journal, index) => {
        const deleteTempClickHandler = () => {
          const newData = tempJournalData.filter((_, i) => i !== index);
          setTempJournalData(newData);
        };
        return (
          <div key={journal.basicInfo.description} className="flex">
            <p>
              {index + 1}:{journal.basicInfo.description}
            </p>
            <p className="ml-70px cursor-pointer text-gray-700" onClick={deleteTempClickHandler}>
              Delete
            </p>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <form
        onSubmit={saveJournalHandler}
        onChange={formChangedHandler}
        className="flex flex-col gap-8px"
      >
        {/* Info: (20240423 - Julian) Basic Info */}
        {displayedBasicInfo}

        {/* Info: (20240423 - Julian) Payment */}
        {displayedPayment}

        {/* Info: (20240423 - Julian) Project */}
        {displayedProject}

        {/* Info: (20240423 - Julian) Buttons */}
        <div className="ml-auto flex items-center gap-24px">
          <button
            id="clearJournalFormBtn"
            type="button"
            onClick={clearAllClickHandler}
            className="px-16px py-8px text-secondaryBlue hover:text-primaryYellow"
          >
            Clear all
          </button>
          <Button id="saveJournalBtn" type="submit" className="px-16px py-8px">
            Save
          </Button>
        </div>
      </form>
      {/* ToDo: (20240425 - Julian) Temp Journal List */}
      {displayTempList}
    </>
  );
};

export default NewJournalForm;
