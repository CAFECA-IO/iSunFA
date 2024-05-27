import Image from 'next/image';
import { useState, useEffect } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { IInvoiceDataForSavingToDB } from '@/interfaces/invoice';
import { IAccountResultStatus } from '@/interfaces/accounting_account';
import {
  PaymentPeriodType,
  PaymentStatusType,
  EventType,
  ProgressStatus,
} from '@/constants/account';
import { firstCharToUpperCase } from '@/lib/utils/common';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { useGlobalCtx } from '@/contexts/global_context';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { IDatePeriod } from '@/interfaces/date_period';
import { default30DayPeriodInSec, radioButtonStyle } from '@/constants/display';
import { MessageType } from '@/interfaces/message_modal';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import Toggle from '@/components/toggle/toggle';
import ProgressBar from '@/components/progress_bar/progress_bar';
import { Button } from '@/components/button/button';
import { IJournalData } from '@/interfaces/journal';
import { ILineItem } from '@/interfaces/line_item';

const taxRateSelection: number[] = [0, 5, 20, 25];
const paymentMethodSelection: string[] = ['Cash', 'Transfer', 'Credit Card'];
const ficSelection: string[] = [
  '004 Bank of Taiwan',
  '005 Land Bank of Taiwan',
  '006 Taiwan Cooperative Bank',
  '007 First Commercial Bank',
];

// Info: (20240515 - tzuhan) TO Julian update the type of projectSelection and contractSelection to match the data structure @Julian review
const projectSelection: { id: number | null; name: string }[] = [
  { id: null, name: 'None' },
  { id: 1, name: 'Project A' },
  { id: 2, name: 'Project B' },
  { id: 3, name: 'Project C' },
];
const contractSelection: { id: number | null; name: string }[] = [
  { id: null, name: 'None' },
  { id: 1, name: 'Contract A' },
  { id: 2, name: 'Contract B' },
  { id: 3, name: 'Contract C' },
];

const NewJournalForm = () => {
  // Info: (20240428 - Julian) get values from context
  const {
    messageModalVisibilityHandler,
    messageModalDataHandler,
    confirmModalVisibilityHandler,
    addAssetModalVisibilityHandler,
  } = useGlobalCtx();

  const {
    companyId,
    selectedUnprocessedJournal,
    selectUnprocessedJournalHandler,
    selectJournalHandler,
  } = useAccountingCtx();

  const {
    trigger: getJournalById,
    success: getJournalSuccess,
    data: journal,
    code: getJournalCode,
  } = APIHandler<IJournalData>(APIName.JOURNAL_GET_BY_ID, {}, false, false);

  const {
    trigger: getOCRResult,
    success: getSuccess,
    data: OCRResult,
    code: getCode,
  } = APIHandler<IInvoiceDataForSavingToDB>(APIName.OCR_RESULT_GET_BY_ID, {}, false, false);

  const {
    trigger: createInvoice,
    data: result,
    success: createSuccess,
    code: createCode,
  } = APIHandler<IAccountResultStatus>(APIName.INVOICE_CREATE, {}, false, false);

  const {
    trigger: getAIStatus,
    data: status,
    success: statusSuccess,
    code: statusCode,
  } = APIHandler<ProgressStatus>(APIName.AI_ASK_STATUS, {}, false, false);

  const {
    trigger: getAIResult,
    data: AIResult,
    success: AIResultSuccess,
    code: AIResultCode,
  } = APIHandler<{ journalId: string; lineItem: ILineItem[] }>(
    APIName.AI_ASK_RESULT,
    {},
    false,
    false
  );

  // Info: (20240425 - Julian) check if form has changed
  const [formHasChanged, setFormHasChanged] = useState<boolean>(false);

  // Info: (20240425 - Julian) Basic Info states
  const [datePeriod, setDatePeriod] = useState<IDatePeriod>(default30DayPeriodInSec);

  const [selectedEventType, setSelectedEventType] = useState<EventType>(EventType.INCOME);

  const [inputPaymentReason, setInputPaymentReason] = useState<string>('');
  const [inputDescription, setInputDescription] = useState<string>('');
  const [inputVendor, setInputVendor] = useState<string>('');
  // Info: (20240425 - Julian) Payment states
  const [inputTotalPrice, setInputTotalPrice] = useState<number>(0);
  const [taxToggle, setTaxToggle] = useState<boolean>(false);
  const [taxRate, setTaxRate] = useState<number>(taxRateSelection[0]);
  const [feeToggle, setFeeToggle] = useState<boolean>(false);
  const [inputFee, setInputFee] = useState<number>(0);
  const [selectedMethod, setSelectedMethod] = useState<string>(paymentMethodSelection[0]);
  const [selectedFIC, setSelectedFIC] = useState<string>(ficSelection[0]);
  const [inputAccountNumber, setInputAccountNumber] = useState<string>('');
  const [paymentPeriod, setPaymentPeriod] = useState<PaymentPeriodType>(PaymentPeriodType.AT_ONCE);
  const [inputInstallment, setInputInstallment] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusType>(PaymentStatusType.UNPAID);

  const [inputPartialPaid, setInputPartialPaid] = useState<number>(0);
  // Info: (20240425 - Julian) Project states
  const [selectedProject, setSelectedProject] = useState<{ id: number | null; name: string }>(
    projectSelection[0]
  );
  const [selectedContract, setSelectedContract] = useState<{ id: number | null; name: string }>(
    contractSelection[0]
  );
  const [progressRate, setProgressRate] = useState<number>(0);
  const [inputEstimatedCost, setInputEstimatedCost] = useState<number>(0);

  useEffect(() => {
    if (selectedUnprocessedJournal !== undefined) {
      getJournalById({ params: { companyId, journalId: selectedUnprocessedJournal.id } });
    }
  }, [selectedUnprocessedJournal]);

  useEffect(() => {
    if (selectedUnprocessedJournal && getJournalSuccess && journal) {
      selectJournalHandler(journal);
      if (journal.invoice === null) {
        getOCRResult({ params: { companyId, resultId: selectedUnprocessedJournal.aichResultId } }); // selectedUnprocessedJournal.aichResultId
      } else {
        const { invoice } = journal;
        // Info: update form data with journal data (20240524 - tzuhan)
        // setDatePeriod({ startTimeStamp: invoice.date, endTimeStamp: invoice.date });
        // setInputPaymentReason(invoice.paymentReason);
        setSelectedEventType(invoice.eventType as EventType);
        setInputDescription(invoice.description);
        setInputVendor(invoice.vendorOrSupplier);
        setInputTotalPrice(invoice.payment.price);
        setTaxToggle(invoice.payment.hasTax);
        setTaxRate(invoice.payment.taxPercentage);
        setFeeToggle(invoice.payment.hasFee);
        setInputFee(invoice.payment.fee);
        setSelectedMethod(invoice.payment.paymentMethod);
        // setInputAccountNumber(invoice.payment.accountNumber);
        setPaymentPeriod(invoice.payment.paymentPeriod as PaymentPeriodType);
        setInputInstallment(invoice.payment.installmentPeriod);
        setPaymentStatus(invoice.payment.paymentStatus as PaymentStatusType);
        setInputPartialPaid(invoice.payment.paymentAlreadyDone);
        setSelectedProject(
          projectSelection.find(
            (project) => journal.projectId && project.id === journal.projectId
          ) || projectSelection[0]
        );
        setSelectedContract(
          contractSelection.find(
            (contract) => journal.contractId && contract.id === journal.contractId
          ) || contractSelection[0]
        );
        setProgressRate(invoice.payment.progress);
      }
      if (journal.voucher) {
        confirmModalVisibilityHandler();
      }
    }
    if (getJournalSuccess === false) {
      messageModalDataHandler({
        messageType: MessageType.ERROR,
        title: 'Get Journal Failed',
        content: `Get Journal failed: ${getJournalCode}`,
        submitBtnStr: 'Close',
        submitBtnFunction: messageModalVisibilityHandler,
      });
      messageModalVisibilityHandler();
    }
  }, [getJournalSuccess, journal, selectedUnprocessedJournal]);

  // TODO: update with backend data (20240523 - tzuhan)
  useEffect(() => {
    if (getSuccess && OCRResult) {
      // Info: (20240506 - Julian) 設定表單的預設值
      setDatePeriod({ startTimeStamp: OCRResult.date, endTimeStamp: OCRResult.date });
      setSelectedEventType(OCRResult.eventType);
      setInputPaymentReason(OCRResult.paymentReason);
      setInputDescription(OCRResult.description);
      setInputVendor(OCRResult.vendorOrSupplier);
      setInputTotalPrice(OCRResult.payment.price);
      setTaxToggle(OCRResult.payment.hasTax);
      setTaxRate(OCRResult.payment.taxPercentage);
      setFeeToggle(OCRResult.payment.hasFee);
      setInputFee(OCRResult.payment.fee);
      setSelectedMethod(OCRResult.payment.paymentMethod);
      // setInputAccountNumber(OCRResult.payment.accountNumber);
      setPaymentPeriod(OCRResult.payment.paymentPeriod);
      setInputInstallment(OCRResult.payment.installmentPeriod);
      setPaymentStatus(OCRResult.payment.paymentStatus);
      setInputPartialPaid(OCRResult.payment.paymentAlreadyDone);
      setSelectedProject(
        projectSelection.find((project) => project.id === OCRResult.projectId) ||
        projectSelection[0]
      );
      setSelectedContract(
        contractSelection.find((contract) => contract.id === OCRResult.contractId) ||
        contractSelection[0]
      );
      setProgressRate(OCRResult.payment.progress);
    }
    if (getSuccess === false) {
      // Info: (20240522 - Julian) 有取得 invoiceId 的狀態下才顯示錯誤訊息
      messageModalDataHandler({
        messageType: MessageType.ERROR,
        title: 'Get OCR result Failed',
        content: `Get OCR result failed: ${getCode}`,
        submitBtnStr: 'Close',
        submitBtnFunction: messageModalVisibilityHandler,
      });
      messageModalVisibilityHandler();
    }
  }, [getSuccess, OCRResult]);

  // ToDo: (20240503 - Julian) Pop up a confirm modal when the user tries to leave the page with unsaved changes
  useEffect(() => {
    // const onBeforeUnload = (e: BeforeUnloadEvent) => {
    //   if (formHasChanged) {
    //     e.preventDefault();
    //     e.returnValue = '';
    //   }
    // };
    // window.addEventListener('beforeunload', onBeforeUnload);
    // return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [formHasChanged]);

  const {
    targetRef: eventMenuRef,
    componentVisible: isEventMenuOpen,
    setComponentVisible: setIsEventMenuOpen,
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
  const taxMenuHandler = () => setIsTaxMenuOpen(!isTaxMenuOpen);
  const methodMenuHandler = () => setIsMethodMenuOpen(!isMethodMenuOpen);
  const bankAccountMenuHandler = () => setIsBankAccountMenuOpen(!isBankAccountMenuOpen);
  const projectMenuHandler = () => setIsProjectMenuOpen(!isProjectMenuOpen);
  const contractMenuHandler = () => setIsContractMenuOpen(!isContractMenuOpen);

  // Info: (20240423 - Julian) 處理 input 輸入
  const paymentReasonChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputPaymentReason(e.target.value);
  };
  const descriptionChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputDescription(e.target.value);
  };
  const vendorChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputVendor(e.target.value);
  };
  const totalPriceChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = Number(e.target.value);
    if (!Number.isNaN(input)) {
      setInputTotalPrice(input);
    }
  };
  const feeChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = Number(e.target.value);
    if (!Number.isNaN(input)) {
      setInputFee(input);
    }
  };
  const accountNumberChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputAccountNumber(e.target.value);
  };
  const installmentChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = Number(e.target.value);
    if (!Number.isNaN(input)) {
      setInputInstallment(input);
    }
  };
  const partialPaidChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = Number(e.target.value);
    if (!Number.isNaN(input)) {
      setInputPartialPaid(input);
    }
  };

  const progressRateChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = Number(e.target.value);
    if (!Number.isNaN(input)) {
      // Info: (20240425 - Julian) 限制輸入範圍 0 ~ 100
      if (input <= 100 && input >= 0) {
        setProgressRate(input);
      }
    }
  };
  const estimatedCostChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = Number(e.target.value);
    if (!Number.isNaN(input)) {
      setInputEstimatedCost(input);
    }
  };

  // Info: (20240423 - Julian) 處理 toggle 開關
  const taxToggleHandler = () => setTaxToggle(!taxToggle);
  const feeToggleHandler = () => setFeeToggle(!feeToggle);

  // Info: (20240423 - Julian) 處理 radio button 選擇
  const atOnceClickHandler = () => setPaymentPeriod(PaymentPeriodType.AT_ONCE);
  const installmentClickHandler = () => setPaymentPeriod(PaymentPeriodType.INSTALLMENT);
  const paidClickHandler = () => setPaymentStatus(PaymentStatusType.PAID);
  const partialPaidClickHandler = () => setPaymentStatus(PaymentStatusType.PARTIAL);
  const unpaidClickHandler = () => setPaymentStatus(PaymentStatusType.UNPAID);

  //  Info: (20240425 - Julian) 檢查表單內容是否有變動
  const formChangedHandler = () => setFormHasChanged(true);

  // Info: (20240423 - Julian) 清空表單的所有欄位
  const clearFormHandler = () => {
    setDatePeriod(default30DayPeriodInSec);
    setSelectedEventType(EventType.INCOME);
    setInputPaymentReason('');
    setInputDescription('');
    setInputVendor('');
    setInputTotalPrice(0);
    setTaxRate(taxRateSelection[0]);
    setInputFee(0);
    setSelectedMethod(paymentMethodSelection[0]);
    setSelectedFIC(ficSelection[0]);
    setInputAccountNumber('');
    setPaymentPeriod(PaymentPeriodType.AT_ONCE);
    setInputInstallment(0);
    setPaymentStatus(PaymentStatusType.UNPAID);
    setInputPartialPaid(0);
    setSelectedProject(projectSelection[0]);
    setSelectedContract(contractSelection[0]);
    setProgressRate(0);
    setInputEstimatedCost(0);
    // Info: (20240510 - Julian) 取得 API 回傳的資料後，將 invoiceId 重置
    selectUnprocessedJournalHandler(undefined);
  };

  // Info: (20240425 - Julian) 整理警告視窗的資料
  const dataMessageModal = {
    title: 'Clear form content',
    content: 'Are you sure you want to clear form content?',
    submitBtnStr: 'Clear All',
    submitBtnFunction: () => clearFormHandler(),
    messageType: MessageType.WARNING,
  };

  // Info: (20240425 - Julian) 點擊 Clear All 按鈕時，彈出警告視窗
  const clearAllClickHandler = () => {
    messageModalDataHandler(dataMessageModal);
    messageModalVisibilityHandler();
  };

  // Info: (20240429 - Julian) 上傳日記帳資料
  const createInvoiceHandler = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const invoiceData: IInvoiceDataForSavingToDB = {
      journalId: selectedUnprocessedJournal?.id || null,
      date: datePeriod.startTimeStamp,
      eventType: selectedEventType,
      paymentReason: inputPaymentReason,
      description: inputDescription,
      vendorOrSupplier: inputVendor,
      project: selectedProject.name,
      projectId: selectedProject.id,
      contract: selectedContract.name,
      contractId: selectedContract.id,
      payment: {
        price: inputTotalPrice,
        hasTax: taxToggle,
        taxPercentage: taxRate,
        hasFee: feeToggle,
        fee: inputFee,
        paymentMethod: selectedMethod,
        installmentPeriod: inputInstallment,
        paymentAlreadyDone: inputPartialPaid,
        isRevenue: true,
        progress: 0,
        paymentPeriod,
        paymentStatus,
      },
    };

    createInvoice({ params: { companyId }, body: { invoice: invoiceData } });
  };

  useEffect(() => {
    if (createSuccess && result) {
      const { resultId } = result;
      getAIStatus({
        params: {
          companyId,
          resultId,
        },
      });
    } else if (createSuccess === false) {
      messageModalDataHandler({
        messageType: MessageType.ERROR,
        title: 'Create Invoice Failed',
        content: `Create Invoice failed: ${createCode}`,
        submitBtnStr: 'Close',
        submitBtnFunction: messageModalVisibilityHandler,
      });
      messageModalVisibilityHandler();
    }
  }, [createSuccess, result, createCode]);

  useEffect(() => {
    if (result && statusSuccess && status === ProgressStatus.IN_PROGRESS) {
      setTimeout(() => {
        getAIStatus({
          params: {
            companyId,
            resultId: result.resultId,
          },
        });
      }, 2000);
    }
    if (statusSuccess === false) {
      messageModalDataHandler({
        messageType: MessageType.ERROR,
        title: 'Upload Journal Failed',
        content: `Upload journal failed: ${statusCode}`,
        submitBtnStr: 'Close',
        submitBtnFunction: messageModalVisibilityHandler,
      });
      messageModalVisibilityHandler();
    }
    if (
      status === ProgressStatus.INVALID_INPUT ||
      status === ProgressStatus.LLM_ERROR ||
      status === ProgressStatus.SYSTEM_ERROR ||
      status === ProgressStatus.NOT_FOUND ||
      status === ProgressStatus.PAUSED
    ) {
      messageModalDataHandler({
        messageType: MessageType.ERROR,
        title: 'Upload Journal Failed',
        content: `Upload journal status: ${status}`,
        submitBtnStr: 'Close',
        submitBtnFunction: messageModalVisibilityHandler,
      });
      messageModalVisibilityHandler();
    }
    if (result && (status === ProgressStatus.SUCCESS || status === ProgressStatus.ALREADY_UPLOAD)) {
      if (journal?.id) {
        getJournalById({ params: { companyId, journalId: journal?.id } });
      } else {
        getAIResult({
          params: {
            companyId,
            resultId: result.resultId,
          },
        });
      }
    }
  }, [result, statusSuccess, status]);

  useEffect(() => {
    if (AIResultSuccess && AIResult) {
      getJournalById({ params: { companyId, journalId: AIResult.journalId } });
    }
    if (AIResultSuccess === false) {
      messageModalDataHandler({
        messageType: MessageType.ERROR,
        title: 'Get Voucher Preview Failed',
        content: `Get voucher preview failed: ${AIResultCode}`,
        submitBtnStr: 'Close',
        submitBtnFunction: messageModalVisibilityHandler,
      });
      messageModalVisibilityHandler();
    }
  }, [AIResultSuccess, AIResult, AIResultCode]);

  // Info: (20240510 - Julian) 檢查是否要填銀行帳號
  const isAccountNumberVisible = selectedMethod === 'Transfer';
  // Info: (20240513 - Julian) 如果為轉帳，則檢查是否有填寫銀行帳號
  const isAccountNumberInvalid = isAccountNumberVisible && inputAccountNumber === '';

  // Info: (20240429 - Julian) 檢查表單是否填寫完整，若有空欄位，則無法上傳
  const isUploadDisabled =
    // Info: (20240429 - Julian) 檢查日期是否有填寫
    datePeriod.startTimeStamp === 0 ||
    datePeriod.endTimeStamp === 0 ||
    inputPaymentReason === '' ||
    inputDescription === '' ||
    inputVendor === '' ||
    isAccountNumberInvalid ||
    // Info: (20240429 - Julian) 檢查手續費是否有填寫
    (!!feeToggle && inputFee === 0) ||
    // Info: (20240429 - Julian) 檢查總價是否有填寫
    (paymentPeriod === PaymentPeriodType.INSTALLMENT && inputInstallment === 0) ||
    // Info: (20240429 - Julian) 檢查部分支付是否有填寫
    (paymentStatus === PaymentStatusType.PARTIAL && inputPartialPaid === 0);

  // Info: (20240425 - Julian) 下拉選單選項
  const displayEventDropmenu = Object.values(EventType).map((type: EventType) => {
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
        {firstCharToUpperCase(type)}
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
        className="w-full cursor-pointer px-3 py-2 text-left text-navyBlue2 hover:text-primaryYellow"
      >
        {account}
      </li>
    );
  });

  const displayProjectDropmenu = projectSelection.map(
    (project: { id: number | null; name: string }) => {
      const selectionClickHandler = () => {
        setSelectedProject(project);
      };

      return (
        <li
          key={project.name}
          onClick={selectionClickHandler}
          className="w-full cursor-pointer px-3 py-2 text-navyBlue2 hover:text-primaryYellow"
        >
          {project.name}
        </li>
      );
    }
  );

  const displayContractDropmenu = contractSelection.map(
    (contract: { id: number | null; name: string }) => {
      const selectionClickHandler = () => {
        setSelectedContract(contract);
      };

      return (
        <li
          key={contract.name}
          onClick={selectionClickHandler}
          className="w-full cursor-pointer px-3 py-2 text-navyBlue2 hover:text-primaryYellow"
        >
          {contract.name}
        </li>
      );
    }
  );

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
          <div className="flex w-full flex-col items-start gap-8px md:w-240px">
            <p className="text-sm font-semibold text-navyBlue2">Date</p>
            <DatePicker
              period={datePeriod}
              setFilteredPeriod={setDatePeriod}
              type={DatePickerType.CHOOSE_DATE}
            />
          </div>

          {/* Info: (20240423 - Julian) Event Type */}
          <div className="flex w-full flex-col items-start gap-8px md:w-130px">
            <p className="text-sm font-semibold text-navyBlue2">Event Type</p>
            <div
              id="eventTypeMenu"
              onClick={eventMenuOpenHandler}
              className={`group relative flex h-46px w-full cursor-pointer ${isEventMenuOpen ? 'border-primaryYellow text-primaryYellow' : 'border-lightGray3 text-navyBlue2'} items-center justify-between rounded-sm border bg-white p-10px hover:border-primaryYellow hover:text-primaryYellow`}
            >
              <p>{firstCharToUpperCase(selectedEventType)}</p>
              <FaChevronDown />
              {/* Info: (20240423 - Julian) Dropmenu */}
              <div
                className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isEventMenuOpen ? 'grid-rows-1 border-lightGray3' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-sm border transition-all duration-300 ease-in-out`}
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
            <input
              id="inputPaymentReason"
              name="inputPaymentReason"
              type="text"
              placeholder="Why you pay"
              value={inputPaymentReason}
              onChange={paymentReasonChangeHandler}
              required
              className="h-46px w-full items-center justify-between rounded-sm border border-lightGray3 bg-white p-10px outline-none"
            />
            {/*             <div
              id="paymentReasonMenu"
              onClick={reasonMenuHandler}
              className={`group relative flex h-46px w-full cursor-pointer ${isReasonMenuOpen ? 'border-primaryYellow text-primaryYellow' : 'border-lightGray3 text-navyBlue2'} items-center justify-between rounded-sm border bg-white p-10px hover:border-primaryYellow hover:text-primaryYellow`}
            >
              <p>{selectedPaymentReason}</p>
              <FaChevronDown />
              <div
                className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isReasonMenuOpen ? 'grid-rows-1 border-lightGray3' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-sm border transition-all duration-300 ease-in-out`}
              >
                <ul
                  ref={reasonRef}
                  className="z-10 flex w-full flex-col items-start bg-white p-8px"
                >
                  {displayReasonDropmenu}
                </ul>
              </div>
            </div> */}
            <button
              type="button"
              onClick={addAssetModalVisibilityHandler}
              className="ml-auto text-secondaryBlue hover:text-primaryYellow"
            >
              + Add new asset
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
              className="h-46px w-full items-center justify-between rounded-sm border border-lightGray3 bg-white p-10px outline-none"
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
              className="h-46px w-full items-center justify-between rounded-sm border border-lightGray3 bg-white p-10px outline-none"
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
            <div className="flex h-46px w-full items-center justify-between divide-x divide-lightGray3 rounded-sm border border-lightGray3 bg-white">
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
                toggleStateFromParent={taxToggle}
              />
            </div>

            {/* Info: (20240424 - Julian) dropmenu */}
            <button
              id="taxMenu"
              name="taxMenu"
              type="button"
              onClick={taxMenuHandler}
              disabled={!taxToggle}
              className={`group relative flex h-46px cursor-pointer ${isTaxMenuOpen ? 'border-primaryYellow text-primaryYellow' : 'border-lightGray3 text-navyBlue2'} items-center justify-between rounded-sm border bg-white p-10px transition-all duration-300 ease-in-out enabled:hover:border-primaryYellow enabled:hover:text-primaryYellow disabled:cursor-default disabled:bg-lightGray6`}
            >
              <p>{taxRate}%</p>
              <FaChevronDown />
              <div
                className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isTaxMenuOpen ? 'grid-rows-1 border-lightGray3' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-sm border transition-all duration-300 ease-in-out`}
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
                toggleStateFromParent={feeToggle}
              />
            </div>
            <div
              className={`flex h-46px w-full items-center justify-between ${feeToggle ? 'bg-white' : 'bg-lightGray6'} divide-x divide-lightGray3 rounded-sm border border-lightGray3 transition-all duration-300 ease-in-out`}
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
              className={`group relative flex h-46px w-full cursor-pointer ${isMethodMenuOpen ? 'border-primaryYellow text-primaryYellow' : 'border-lightGray3 text-navyBlue2'} items-center justify-between rounded-sm border bg-white p-10px hover:border-primaryYellow hover:text-primaryYellow`}
            >
              <p>{selectedMethod}</p>
              <FaChevronDown />
              {/* Info: (20240424 - Julian) Dropmenu */}
              <div
                className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isMethodMenuOpen ? 'grid-rows-1 border-lightGray3' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-sm border transition-all duration-300 ease-in-out`}
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
            <button
              id="ficMenu"
              type="button"
              onClick={bankAccountMenuHandler}
              disabled={!isAccountNumberVisible}
              className={`group relative flex h-46px w-full cursor-pointer ${isBankAccountMenuOpen ? 'border-primaryYellow text-primaryYellow' : 'border-lightGray3 text-navyBlue2'} items-center justify-between rounded-sm border bg-white p-10px hover:border-primaryYellow hover:text-primaryYellow disabled:cursor-default disabled:bg-lightGray6 disabled:hover:border-lightGray3 disabled:hover:text-navyBlue2`}
            >
              <p>{selectedFIC}</p>
              <FaChevronDown />
              {/* Info: (20240424 - Julian) Dropmenu */}
              <div
                className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isBankAccountMenuOpen ? 'grid-rows-1 border-lightGray3' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-sm border transition-all duration-300 ease-in-out`}
              >
                <ul
                  ref={bankAccountRef}
                  className="z-10 flex w-full flex-col items-start bg-white p-8px"
                >
                  {displayFICDropmenu}
                </ul>
              </div>
            </button>
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
              required={isAccountNumberVisible}
              disabled={!isAccountNumberVisible}
              className="h-46px w-full items-center justify-between rounded-sm border border-lightGray3 bg-white p-10px outline-none disabled:cursor-default disabled:bg-lightGray6"
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
                  checked={paymentPeriod === PaymentPeriodType.AT_ONCE}
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
                    checked={paymentPeriod === PaymentPeriodType.INSTALLMENT}
                    onChange={installmentClickHandler}
                  />
                  Installment:
                </label>
                {/* Info: (20240424 - Julian) input */}
                <div
                  className={`flex h-46px w-full items-center justify-between ${paymentPeriod === PaymentPeriodType.INSTALLMENT ? 'bg-white' : 'bg-lightGray6'} divide-x divide-lightGray3 rounded-sm border border-lightGray3 transition-all duration-300 ease-in-out`}
                >
                  <input
                    id="inputInstallmentTimes"
                    type="number"
                    name="inputInstallmentTimes"
                    value={inputInstallment}
                    onChange={installmentChangeHandler}
                    disabled={paymentPeriod !== PaymentPeriodType.INSTALLMENT}
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
                  name="paymentStatus"
                  className={radioButtonStyle}
                  checked={paymentStatus === PaymentStatusType.UNPAID}
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
                    name="paymentStatus"
                    className={radioButtonStyle}
                    checked={paymentStatus === PaymentStatusType.PARTIAL}
                    onChange={partialPaidClickHandler}
                  />
                  <p>Partial Paid:</p>
                </label>
                {/* Info: (20240424 - Julian) input */}
                <div
                  className={`flex h-46px w-full items-center justify-between ${paymentStatus === PaymentStatusType.PARTIAL ? 'bg-white' : 'bg-lightGray6'} divide-x divide-lightGray3 rounded-sm border border-lightGray3 transition-all duration-300 ease-in-out`}
                >
                  <input
                    id="inputPartialPaidAmount"
                    type="number"
                    name="inputPartialPaidAmount"
                    value={inputPartialPaid}
                    onChange={partialPaidChangeHandler}
                    disabled={paymentStatus !== PaymentStatusType.PARTIAL}
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
                  name="paymentStatus"
                  className={radioButtonStyle}
                  checked={paymentStatus === PaymentStatusType.PAID}
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

  const displayedProjectSecondLine =
    selectedEventType === EventType.INCOME ? (
      <div className="flex flex-col items-start gap-40px md:flex-row">
        {/* Info: (20240502 - Julian) Progress */}
        <ProgressBar
          progressRate={progressRate}
          progressRateChangeHandler={progressRateChangeHandler}
        />
        {/* Info: (20240502 - Julian) Estimated Cost */}
        <div className="flex w-full flex-col items-start gap-8px">
          <p className="text-sm font-semibold text-navyBlue2">Estimated Cost</p>
          <div
            className={`flex h-46px w-full items-center justify-between divide-x divide-lightGray3 rounded-sm border border-lightGray3 bg-white transition-all duration-300 ease-in-out`}
          >
            <input
              id="inputEstimatedCost"
              type="number"
              name="inputEstimatedCost"
              value={inputEstimatedCost}
              onChange={estimatedCostChangeHandler}
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
    ) : null;

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
      <div className="my-20px flex flex-col gap-40px">
        {/* Info: (20240502 - Julian) First Column */}
        <div className="flex w-full flex-col items-center gap-40px md:flex-row">
          {/* Info: (20240424 - Julian) Project */}
          <div
            id="projectMenu"
            onClick={projectMenuHandler}
            className={`group relative flex w-full cursor-pointer ${isProjectMenuOpen ? 'border-primaryYellow text-primaryYellow' : 'border-lightGray3 text-navyBlue2'} items-center justify-between divide-x divide-lightGray3 rounded-sm border bg-white hover:border-primaryYellow hover:text-primaryYellow`}
          >
            <div className="p-12px text-sm text-lightGray4">
              <p>Project</p>
            </div>
            <div className="flex w-full items-center p-10px">
              <p className="flex-1">{selectedProject.name}</p>
              <FaChevronDown />
              {/* Info: (20240424 - Julian) Dropmenu */}
              <div
                className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isProjectMenuOpen ? 'grid-rows-1 border-lightGray3' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-sm border transition-all duration-300 ease-in-out`}
              >
                <ul
                  ref={projectRef}
                  className="z-10 flex w-full flex-col items-start bg-white p-8px"
                >
                  {displayProjectDropmenu}
                </ul>
              </div>
            </div>
          </div>

          {/* Info: (20240424 - Julian) Contract */}
          <div
            id="contractMenu"
            onClick={contractMenuHandler}
            className={`group relative flex w-full cursor-pointer ${isContractMenuOpen ? 'border-primaryYellow text-primaryYellow' : 'border-lightGray3 text-navyBlue2'} items-center justify-between divide-x divide-lightGray3 rounded-sm border bg-white hover:border-primaryYellow hover:text-primaryYellow`}
          >
            <div className="p-12px text-sm text-lightGray4">
              <p>Contract</p>
            </div>
            <div className="flex w-full items-center p-10px">
              <p className="flex-1">{selectedContract.name}</p>
              <FaChevronDown />
              {/* Info: (20240424 - Julian) Dropmenu */}
              <div
                className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isContractMenuOpen ? 'grid-rows-1 border-lightGray3' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-sm border transition-all duration-300 ease-in-out`}
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
        {/* Info: (20240502 - Julian) Second Column */}
        {displayedProjectSecondLine}
      </div>
    </>
  );

  return (
    <div>
      {status && status === ProgressStatus.IN_PROGRESS ? (
        <p>Loading...</p>
      ) : (
        <form
          onSubmit={createInvoiceHandler}
          onChange={formChangedHandler}
          className="flex flex-col gap-8px"
        >
          {/* Info: (20240423 - Julian) Basic Info */}
          {displayedBasicInfo}

          {/* Info: (20240423 - Julian) Payment */}
          {displayedPayment}

          {/* Info: (20240423 - Julian) Project */}
          {displayedProject}
          {/* ToDo: (20240429 - Julian) Progress Bar */}

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
            <Button
              id="uploadBtn"
              type="submit"
              className="px-16px py-8px"
              disabled={isUploadDisabled}
            >
              <p>Upload</p>
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  className="fill-current"
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M10.0025 2.41797C5.81436 2.41797 2.41919 5.81314 2.41919 10.0013C2.41919 12.8073 3.94278 15.2583 6.2114 16.5706C6.56995 16.778 6.69247 17.2368 6.48506 17.5953C6.27765 17.9539 5.81886 18.0764 5.46031 17.869C2.74726 16.2996 0.919189 13.3644 0.919189 10.0013C0.919189 4.98472 4.98593 0.917969 10.0025 0.917969C15.0191 0.917969 19.0859 4.98471 19.0859 10.0013C19.0859 13.5056 17.1013 16.5451 14.1982 18.0595C14.1867 18.0655 14.1751 18.0715 14.1635 18.0776C13.8925 18.2192 13.6009 18.3714 13.2694 18.4579C12.8996 18.5543 12.5243 18.5611 12.0662 18.499C11.6557 18.4434 11.202 18.2326 10.8434 18.0152C10.4848 17.7978 10.0881 17.4931 9.84892 17.1548C9.25119 16.3095 9.25174 15.5048 9.25247 14.4473C9.2525 14.4101 9.25252 14.3725 9.25252 14.3346V8.47863L7.19952 10.5316C6.90663 10.8245 6.43175 10.8245 6.13886 10.5316C5.84597 10.2387 5.84597 9.76387 6.13886 9.47097L9.47219 6.13764C9.61285 5.99699 9.80361 5.91797 10.0025 5.91797C10.2014 5.91797 10.3922 5.99699 10.5329 6.13764L13.8662 9.47097C14.1591 9.76386 14.1591 10.2387 13.8662 10.5316C13.5733 10.8245 13.0984 10.8245 12.8055 10.5316L10.7525 8.47863V14.3346C10.7525 15.539 10.7749 15.8663 11.0737 16.2888C11.1393 16.3816 11.3338 16.5584 11.621 16.7325C11.9082 16.9066 12.1549 16.9973 12.2676 17.0126C12.5969 17.0572 12.7647 17.0393 12.8909 17.0064C13.041 16.9673 13.1873 16.895 13.5045 16.7296C15.9316 15.4635 17.5859 12.9249 17.5859 10.0013C17.5859 5.81314 14.1907 2.41797 10.0025 2.41797Z"
                  fill="#996301"
                />
              </svg>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default NewJournalForm;
