import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { IInvoice } from '@/interfaces/invoice';
import { IAccountResultStatus } from '@/interfaces/accounting_account';
import { PaymentPeriodType, PaymentStatusType, EventType } from '@/constants/account';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { useGlobalCtx } from '@/contexts/global_context';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { IDatePeriod } from '@/interfaces/date_period';
import { default30DayPeriodInSec, radioButtonStyle } from '@/constants/display';
import { MessageType } from '@/interfaces/message_modal';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import Toggle from '@/components/toggle/toggle';
import { Button } from '@/components/button/button';
import { useUserCtx } from '@/contexts/user_context';
import NumericInput from '@/components/numeric_input/numeric_input';

// Info: (2024709 - Anna) 定義傳票類型到翻譯鍵值的映射
const eventTypeMap: { [key in EventType]: string } = {
  [EventType.PAYMENT]: 'JOURNAL.PAYMENT',
  [EventType.INCOME]: 'PROJECT.INCOME',
  [EventType.TRANSFER]: 'JOURNAL.TRANSFER',
};
const taxRateSelection: number[] = [0, 5, 20, 25];

enum PAYMENT_METHOD {
  CASH = 'PAYMENT_METHOD.CASH',
  TRANSFER = 'PAYMENT_METHOD.TRANSFER',
  CREDIT_CARD = 'PAYMENT_METHOD.CREDIT_CARD',
}

const paymentMethodSelection: PAYMENT_METHOD[] = [
  PAYMENT_METHOD.CASH,
  PAYMENT_METHOD.TRANSFER,
  PAYMENT_METHOD.CREDIT_CARD,
];

enum BANK {
  BANK_OF_TAIWAN = 'JOURNAL.BANK_OF_TAIWAN',
  LAND_BANK_OF_TAIWAN = 'JOURNAL.LAND_BANK_OF_TAIWAN',
  TAIWAN_COOPERATIVE_BANK = 'JOURNAL.TAIWAN_COOPERATIVE_BANK',
  FIRST_COMMERCIAL_BANK = 'JOURNAL.FIRST_COMMERCIAL_BANK',
}

const ficSelection: BANK[] = [
  BANK.BANK_OF_TAIWAN,
  BANK.LAND_BANK_OF_TAIWAN,
  BANK.TAIWAN_COOPERATIVE_BANK,
  BANK.FIRST_COMMERCIAL_BANK,
];

// Info: (20240515 - tzuhan) TO Julian update the type of projectSelection and contractSelection to match the data structure @Julian review
const projectSelection: { id: number | null; name: string }[] = [
  { id: null, name: 'JOURNAL.NONE' },
];
const contractSelection: { id: number | null; name: string }[] = [
  { id: null, name: 'JOURNAL.NONE' },
];

const getIdAndName = (id: number | null, array: { id: number | null; name: string }[]) => {
  const obj = id === null || id < 0 ? undefined : array.find((item) => item.id === id);
  const idAndName =
    obj === undefined
      ? {
          id: array[0].id,
          name: array[0].name,
        }
      : {
          id: obj.id,
          name: obj.name,
        };
  return idAndName;
};

const NewJournalForm = () => {
  const { t } = useTranslation('common');
  const { isAuthLoading, selectedCompany } = useUserCtx();
  const hasCompanyId = isAuthLoading === false && !!selectedCompany?.id;
  const disabledAddNewAsset = true;
  // Info: (20240428 - Julian) get values from context
  const {
    messageModalVisibilityHandler,
    messageModalDataHandler,
    confirmModalVisibilityHandler,
    addAssetModalVisibilityHandler,
    confirmModalDataHandler,
  } = useGlobalCtx();
  const {
    selectedOCR,
    selectOCRHandler,
    selectedJournal,
    getAIStatusHandler,
    inputDescription: description,
    inputDescriptionHandler,
  } = useAccountingCtx();
  const {
    trigger: getOCRResult,
    success: getSuccess,
    data: OCRResult,
    code: getCode,
  } = APIHandler<IInvoice>(APIName.OCR_RESULT_GET_BY_ID);
  const { trigger: createInvoice } = APIHandler<{
    journalId: number;
    resultStatus: IAccountResultStatus;
  }>(APIName.INVOICE_CREATE);
  const { trigger: updateInvoice } = APIHandler<{
    journalId: number;
    resultStatus: IAccountResultStatus;
  }>(APIName.INVOICE_UPDATE);

  // Info: (20240425 - Julian) check if form has changed
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [formHasChanged, setFormHasChanged] = useState<boolean>(false);

  // Info: (20240425 - Julian) Basic Info states
  const [datePeriod, setDatePeriod] = useState<IDatePeriod>(default30DayPeriodInSec);

  const [selectedEventType, setSelectedEventType] = useState<EventType>(EventType.PAYMENT);

  const [inputReason, setInputReason] = useState<string>('');
  const [inputDescription, setInputDescription] = useState<string>(description);
  const [inputVendor, setInputVendor] = useState<string>('');
  // Info: (20240425 - Julian) Payment states
  const [inputTotalPrice, setInputTotalPrice] = useState<number>(0);

  const [taxToggle, setTaxToggle] = useState<boolean>(false);
  const [taxRate, setTaxRate] = useState<number>(taxRateSelection[0]);
  const [feeToggle, setFeeToggle] = useState<boolean>(false);
  const [inputFee, setInputFee] = useState<number>(0);
  const [selectedMethod, setSelectedMethod] = useState<PAYMENT_METHOD>(paymentMethodSelection[0]);
  const [selectedFIC, setSelectedFIC] = useState<string>(ficSelection[0]);
  const [inputAccountNumber, setInputAccountNumber] = useState<string>('');
  const [paymentPeriod, setPaymentPeriod] = useState<PaymentPeriodType>(PaymentPeriodType.AT_ONCE);
  const [inputInstallment, setInputInstallment] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusType>(PaymentStatusType.UNPAID);

  const [inputPartialPaid, setInputPartialPaid] = useState<number>(0);
  // Info: (20240425 - Julian) Project states
  const [selectedProject, setSelectedProject] = useState<{ id: number | null; name: string }>({
    id: projectSelection[0].id,
    name: t(projectSelection[0].name),
  });
  const [selectedContract, setSelectedContract] = useState<{ id: number | null; name: string }>({
    id: contractSelection[0].id,
    name: t(contractSelection[0].name),
  });
  const [progressRate, setProgressRate] = useState<number>(0);
  const [inputEstimatedCost, setInputEstimatedCost] = useState<number>(0);
  const [journalId, setJournalId] = useState<number | null>(selectedJournal?.id || null);

  // Info: (20240723 - Julian) For Hint
  const [isSelectingDate, setIsSelectingDate] = useState<boolean>(true);
  const [isPriceValid, setIsPriceValid] = useState<boolean>(true);
  const [isInstallmentValid, setIsInstallmentValid] = useState<boolean>(true);
  const [isPartialPaidValid, setIsPartialPaidValid] = useState<boolean>(true);
  const [isFeeValid, setIsFeeValid] = useState<boolean>(true);

  useEffect(() => {
    if (selectedOCR !== undefined && hasCompanyId) {
      getOCRResult({
        params: { companyId: selectedCompany.id, resultId: selectedOCR.aichResultId },
      });
    }
  }, [selectedOCR]);

  useEffect(() => {
    if (hasCompanyId && selectedJournal) {
      if (selectedJournal.invoice === null) {
        getOCRResult({
          params: {
            companyId: selectedCompany.id,
            resultId: selectedJournal.aichResultId,
          },
        });
      } else {
        const { invoice } = selectedJournal;
        setDatePeriod({ startTimeStamp: invoice.date, endTimeStamp: invoice.date });
        setInputReason(invoice.paymentReason);
        setSelectedEventType(invoice.eventType as EventType);
        setInputDescription(invoice.description);
        setInputVendor(invoice.vendorOrSupplier);
        setInputTotalPrice(invoice.payment.price);
        setTaxToggle(invoice.payment.hasTax);
        setTaxRate(invoice.payment.taxPercentage);
        setFeeToggle(invoice.payment.hasFee);
        setInputFee(invoice.payment.fee);
        setSelectedMethod(invoice.payment.method as PAYMENT_METHOD);
        // setInputAccountNumber(invoice.payment.accountNumber);
        setPaymentPeriod(invoice.payment.period as PaymentPeriodType);
        setInputInstallment(invoice.payment.installmentPeriod);
        setPaymentStatus(invoice.payment.status as PaymentStatusType);
        setInputPartialPaid(invoice.payment.alreadyPaid);
        const project = getIdAndName(selectedJournal.projectId, projectSelection);
        setSelectedProject({
          id: project.id,
          name: t(project.name),
        });
        const contract = getIdAndName(selectedJournal.contractId, contractSelection);
        setSelectedContract({
          id: contract.id,
          name: t(contract.name),
        });
        setProgressRate(invoice.payment.progress);
      }
      getAIStatusHandler(
        {
          companyId: selectedCompany.id,
          askAIId: selectedJournal.aichResultId,
        },
        true
      );
      confirmModalDataHandler({
        journalId: selectedJournal.id,
        askAIId: selectedJournal.aichResultId,
      });
      confirmModalVisibilityHandler();
    }
  }, [selectedCompany, selectedJournal, selectedOCR]);

  // TODO: update with backend data (20240523 - tzuhan)
  useEffect(() => {
    if (getSuccess && OCRResult) {
      // Info: (20240506 - Julian) 設定表單的預設值
      setDatePeriod({ startTimeStamp: OCRResult.date, endTimeStamp: OCRResult.date });
      setSelectedEventType(OCRResult.eventType);
      setInputReason(OCRResult.paymentReason);
      setInputDescription(OCRResult.description);
      setInputVendor(OCRResult.vendorOrSupplier);
      setInputTotalPrice(OCRResult.payment.price);
      setTaxToggle(OCRResult.payment.hasTax);
      setTaxRate(OCRResult.payment.taxPercentage);
      setFeeToggle(OCRResult.payment.hasFee);
      setInputFee(OCRResult.payment.fee);
      setSelectedMethod(OCRResult.payment.method as PAYMENT_METHOD);
      // setInputAccountNumber(OCRResult.payment.accountNumber);
      setPaymentPeriod(OCRResult.payment.period);
      setInputInstallment(OCRResult.payment.installmentPeriod);
      setPaymentStatus(OCRResult.payment.status);
      setInputPartialPaid(OCRResult.payment.alreadyPaid);
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
  }, [getSuccess, OCRResult]);

  useEffect(() => {
    // Info: (20240527 - Julian) 顯示錯誤須分開處理，避免閃現
    if (getSuccess === false) {
      messageModalDataHandler({
        messageType: MessageType.ERROR,
        title: 'Get OCR result Failed',
        content: `Get OCR result failed: ${getCode}`,
        submitBtnStr: t('COMMON.CLOSE'),
        submitBtnFunction: messageModalVisibilityHandler,
      });
      messageModalVisibilityHandler();
    }
  }, [getSuccess]);

  // ToDo: (20240503 - Julian) Pop up a confirm modal when the user tries to leave the page with unsaved changes
  // useEffect(() => {
  // const onBeforeUnload = (e: BeforeUnloadEvent) => {
  //   if (formHasChanged) {
  //     e.preventDefault();
  //     e.returnValue = '';
  //   }
  // };
  // window.addEventListener('beforeunload', onBeforeUnload);
  // return () => window.removeEventListener('beforeunload', onBeforeUnload);
  // }, [formHasChanged]);

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
  const reasonChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputReason(e.target.value);
  };
  const descriptionChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputDescription(e.target.value);
  };
  const vendorChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputVendor(e.target.value);
  };

  const accountNumberChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputAccountNumber(e.target.value);
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

  // Info: (20240809 - Shirley) 檢查費用是否小於總金額
  const checkFeeValidity = (fee: number, totalPrice: number) => {
    setIsFeeValid(fee <= totalPrice);
  };

  const amountChangeHandler = (value: number, e: React.ChangeEvent<HTMLInputElement>) => {
    // eslint-disable-next-line no-console
    console.log('amountChangeHandler', e.target.name, value);
    // 檢查費用是否有效
    if (e.target.name === 'fee-input') {
      checkFeeValidity(value, inputTotalPrice);
    } else if (e.target.name === 'input-total-price') {
      checkFeeValidity(inputFee, value);
    }
  };

  // Info: (20240423 - Julian) 清空表單的所有欄位
  const clearFormHandler = () => {
    setDatePeriod(default30DayPeriodInSec);
    setSelectedEventType(EventType.INCOME);
    setInputReason('');
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
    selectOCRHandler(undefined);
    inputDescriptionHandler('');
  };

  // Info: (20240425 - Julian) 整理警告視窗的資料
  const dataMessageModal = {
    title: 'Clear form content',
    content: 'Are you sure you want to clear form content?',
    submitBtnStr: t('JOURNAL.CLEAR_ALL'),
    submitBtnFunction: () => clearFormHandler(),
    messageType: MessageType.WARNING,
  };

  // Info: (20240425 - Julian) 點擊 Clear All 按鈕時，彈出警告視窗
  const clearAllClickHandler = () => {
    messageModalDataHandler(dataMessageModal);
    messageModalVisibilityHandler();
  };

  const updateInvoiceHandler = async (updateJournalId: number, invoiceData: IInvoice) => {
    if (!hasCompanyId) return;
    const invoiceDataToUpdate: IInvoice = {
      ...invoiceData,
      journalId: updateJournalId,
    };
    const {
      success: updateSuccess,
      data: updateAIResult,
      code: updateCode,
    } = await updateInvoice({
      params: { companyId: selectedCompany.id, invoiceId: 0 }, // Info: (20240723 - Murky) invoiceId目前沒有作用
      body: { invoice: invoiceDataToUpdate },
    });
    if (
      updateSuccess &&
      updateAIResult?.resultStatus?.resultId &&
      updateAIResult?.resultStatus?.status
    ) {
      getAIStatusHandler(
        {
          companyId: selectedCompany.id,
          askAIId: updateAIResult.resultStatus.resultId,
        },
        true
      );
      confirmModalDataHandler({
        journalId: updateJournalId,
        askAIId: updateAIResult.resultStatus.resultId,
      });
      confirmModalVisibilityHandler();
    } else if (updateSuccess === false) {
      messageModalDataHandler({
        messageType: MessageType.ERROR,
        title: 'Update Invoice Failed',
        content: `Update Invoice failed: ${updateCode}`,
        submitBtnStr: t('COMMON.CLOSE'),
        submitBtnFunction: messageModalVisibilityHandler,
      });
      messageModalVisibilityHandler();
    }
  };

  const createInvoiceHandler = async (invoiceData: IInvoice) => {
    if (!hasCompanyId) return;
    const {
      data: invoice,
      success: createSuccess,
      code: createCode,
    } = await createInvoice({
      params: { companyId: selectedCompany.id },
      body: { invoice: invoiceData, ocrId: selectedOCR?.id },
    });
    if (createSuccess && invoice?.journalId && invoice?.resultStatus) {
      setJournalId(invoice.journalId);
      getAIStatusHandler(
        {
          companyId: selectedCompany.id,
          askAIId: invoice.resultStatus.resultId,
        },
        true
      );
      confirmModalDataHandler({
        journalId: invoice.journalId,
        askAIId: invoice.resultStatus.resultId,
      });
      confirmModalVisibilityHandler();
    } else if (createSuccess === false) {
      messageModalDataHandler({
        messageType: MessageType.ERROR,
        // title: 'Create Invoice Failed',
        title: `${t('JOURNAL.CREATE_INVOICE_FAILED')}`,
        // content: `Create Invoice failed: ${createCode}`,
        content: `${t('JOURNAL.CREATE_INVOICE_FAILED')}:${createCode}`,
        submitBtnStr: t('COMMON.CLOSE'),
        submitBtnFunction: messageModalVisibilityHandler,
      });
      messageModalVisibilityHandler();
    }
  };

  // Info: (20240723 - Julian) 上傳日記帳資料
  const submitHandler = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    getAIStatusHandler(undefined, false);

    // Info: (20240723 - Julian) 檢查日期填寫
    if (datePeriod.startTimeStamp === 0 && datePeriod.endTimeStamp === 0) {
      // Info: (20240723 - Julian) 將錨點指向 date-picker
      document.getElementById('date-picker')?.scrollIntoView();
      setIsSelectingDate(false);
      return;
    } else {
      setIsSelectingDate(true);
    }

    // Info: (20240723 - Julian) 檢查金額是否為正數
    if (inputTotalPrice <= 0) {
      // Info: (20240723 - Julian) 將錨點指向 price
      document.getElementById('price')?.scrollIntoView();
      setIsPriceValid(false);
      return;
    } else {
      setIsPriceValid(true);
    }

    // Info: (20240723 - Julian) 檢查分期付款是否為正數
    if (paymentPeriod === PaymentPeriodType.INSTALLMENT && inputInstallment <= 0) {
      // Info: (20240723 - Julian) 將錨點指向 installment
      document.getElementById('installment')?.scrollIntoView();
      setIsInstallmentValid(false);
      return;
    } else {
      setIsInstallmentValid(true);
    }

    // Info: (20240723 - Julian) 檢查部分付款是否為正數
    if (paymentStatus === PaymentStatusType.PARTIAL && inputPartialPaid <= 0) {
      // Info: (20240723 - Julian) 將錨點指向 partial-paid
      document.getElementById('partial-paid')?.scrollIntoView();
      setIsPartialPaidValid(false);
      return;
    } else {
      setIsPartialPaidValid(true);
    }

    // Info: (20240723 - Julian) 整理日記帳資料
    const invoiceData: IInvoice = {
      journalId: selectedJournal?.id || null,
      date: datePeriod.startTimeStamp,
      eventType: selectedEventType,
      paymentReason: inputReason,
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
        method: selectedMethod,
        installmentPeriod: inputInstallment,
        alreadyPaid: inputPartialPaid,
        isRevenue: true,
        progress: progressRate,
        period: paymentPeriod,
        status: paymentStatus,
      },
    };
    const updateJournalId = selectedJournal?.id || journalId;
    if (updateJournalId) {
      await updateInvoiceHandler(updateJournalId, invoiceData);
    } else {
      await createInvoiceHandler(invoiceData);
    }
  };

  // Info: (20240510 - Julian) 檢查是否要填銀行帳號
  const isAccountNumberVisible = selectedMethod === PAYMENT_METHOD.TRANSFER;

  // Info: (20240715 - Julian) 專案名稱翻譯
  const projectName = selectedProject.id === null ? t(selectedProject.name) : selectedProject.name;
  // Info: (20240715 - Julian) 合約名稱翻譯
  const contractName =
    selectedContract.id === null ? t(selectedContract.name) : selectedContract.name;

  // Info: (20240722 - Julian) 根據收支類型，顯示不同的文字
  const reasonText =
    selectedEventType === EventType.INCOME
      ? t('JOURNAL.RECEIVING_REASON')
      : t('JOURNAL.PAYMENT_REASON');
  const reasonPlaceholder =
    selectedEventType === EventType.INCOME
      ? t('JOURNAL.WHY_YOU_RECEIVE')
      : t('JOURNAL.WHY_YOU_PAY');
  const vendorText =
    selectedEventType === EventType.INCOME
      ? t('JOURNAL.CLIENT_SOURCE')
      : t('JOURNAL.VENDOR_SUPPLIER');
  const vendorPlaceholder =
    selectedEventType === EventType.INCOME ? t('JOURNAL.FROM_WHOM') : t('JOURNAL.TO_WHOM');
  const isHideAddAssetBtn = selectedEventType === EventType.INCOME;

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
        <p>{t(eventTypeMap[type])}</p>
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

  const displayMethodDropmenu = paymentMethodSelection.map((methodKey: PAYMENT_METHOD) => {
    const method = t(methodKey);
    const selectionClickHandler = () => {
      setSelectedMethod(methodKey); // 使用方法鍵值而不是翻譯後的文字
      setIsMethodMenuOpen(false);
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

  const displayFICDropmenu = ficSelection.map((accountKey: string) => {
    const selectionClickHandler = () => {
      setSelectedFIC(accountKey);
    };

    return (
      <li
        key={accountKey}
        onClick={selectionClickHandler}
        className="w-full cursor-pointer px-3 py-2 text-left text-navyBlue2 hover:text-primaryYellow"
      >
        {t(accountKey)}
      </li>
    );
  });

  const displayProjectDropmenu = projectSelection.map(
    (project: { id: number | null; name: string }) => {
      const selectionClickHandler = () => {
        setSelectedProject({
          id: project.id,
          name: project.id === null ? t(project.name) : project.name,
        });
      };

      return (
        <li
          key={project.name}
          onClick={selectionClickHandler}
          className="w-full cursor-pointer px-3 py-2 text-navyBlue2 hover:text-primaryYellow"
        >
          {t(project.name)}
        </li>
      );
    }
  );

  const displayContractDropmenu = contractSelection.map(
    (contract: { id: number | null; name: string }) => {
      const selectionClickHandler = () => {
        setSelectedContract({
          id: contract.id,
          // name: t(contract.name),
          name: contract.id === null ? t(contract.name) : contract.name,
        });
      };

      return (
        <li
          key={contract.name}
          onClick={selectionClickHandler}
          className="w-full cursor-pointer px-3 py-2 text-navyBlue2 hover:text-primaryYellow"
        >
          {t(contract.name)}
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
          <p>{t('JOURNAL.BASIC_INFO')}</p>
        </div>
        <hr className="flex-1 border-lightGray3" />
      </div>

      {/* Info: (20240423 - Julian) Form */}
      <div className="my-20px flex flex-col gap-24px md:gap-40px">
        {/* Info: (20240423 - Julian) First Column */}
        <div className="flex w-full flex-col items-start justify-between gap-y-24px md:flex-row">
          {/* Info: (20240423 - Julian) Date */}
          <div className="relative flex w-full flex-col items-start gap-8px md:w-240px">
            <div id="date-picker" className="absolute -top-20"></div>
            <p className="text-sm font-semibold text-navyBlue2">{t('DATE_PICKER.DATE')}</p>
            <DatePicker
              period={datePeriod}
              setFilteredPeriod={setDatePeriod}
              type={DatePickerType.TEXT_DATE}
            />
            {/* ToDo: (20240723 - Julian) i18n */}
            <div
              className={`ml-auto text-sm text-input-text-error ${isSelectingDate ? 'opacity-0' : 'opacity-100'}`}
            >
              <p>請選擇日期</p>
            </div>
          </div>

          {/* Info: (20240423 - Julian) Event Type */}
          <div className="flex w-full flex-col items-start gap-8px md:w-130px">
            <p className="text-sm font-semibold text-navyBlue2">{t('JOURNAL.EVENT_TYPE')}</p>
            <div
              id="event-type-menu"
              onClick={eventMenuOpenHandler}
              className={`group relative flex h-46px w-full cursor-pointer ${isEventMenuOpen ? 'border-primaryYellow text-primaryYellow' : 'border-lightGray3 text-navyBlue2'} items-center justify-between rounded-sm border bg-white p-10px hover:border-primaryYellow hover:text-primaryYellow`}
            >
              <p>{t(eventTypeMap[selectedEventType])}</p>
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

          {/* Info: (20240423 - Julian) Reason */}
          <div className="flex w-full flex-col items-start gap-8px md:w-3/5">
            <p className="text-sm font-semibold text-navyBlue2">{reasonText}</p>
            <input
              id="input-reason"
              name="input-reason"
              type="text"
              placeholder={reasonPlaceholder}
              value={inputReason}
              onChange={reasonChangeHandler}
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
              className={`ml-auto ${isHideAddAssetBtn ? 'opacity-0' : 'opacity-100'} ${disabledAddNewAsset ? 'text-gray-400' : 'text-secondaryBlue hover:text-primaryYellow'}`}
              disabled={disabledAddNewAsset}
            >
              {t('JOURNAL.ADD_NEW_ASSET')}
            </button>
          </div>
        </div>

        {/* Info: (20240423 - Julian) Second Column */}
        <div className="flex w-full flex-col items-start justify-between gap-x-60px gap-y-24px md:flex-row">
          {/* Info: (20240423 - Julian) Description */}
          <div className="flex w-full flex-1 flex-col items-start gap-8px">
            <p className="text-sm font-semibold text-navyBlue2">{t('JOURNAL.DESCRIPTION')}</p>
            <input
              id="input-description"
              name="input-description"
              type="text"
              placeholder={t('JOURNAL.DESCRIPTION')}
              value={inputDescription}
              onChange={descriptionChangeHandler}
              required
              className="h-46px w-full items-center justify-between rounded-sm border border-lightGray3 bg-white p-10px outline-none"
            />
          </div>

          {/* Info: (20240423 - Julian) vendor */}
          <div className="flex w-full flex-1 flex-col items-start gap-8px">
            <p className="text-sm font-semibold text-navyBlue2">{vendorText}</p>
            <input
              id="input-vendor"
              name="input-vendor"
              type="text"
              placeholder={vendorPlaceholder}
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
          <p>{t('JOURNAL.PAYMENT')}</p>
        </div>
        <hr className="flex-1 border-lightGray3" />
      </div>

      {/* Info: (20240423 - Julian) Form */}
      <div className="my-20px flex flex-col gap-40px">
        {/* Info: (20240423 - Julian) First Column */}
        <div className="flex w-full flex-col items-start justify-between gap-x-60px gap-y-24px md:flex-row md:items-baseline">
          {/* Info: (20240423 - Julian) Total Price */}
          <div className="relative flex w-full flex-1 flex-col items-start gap-8px">
            <div id="price" className="absolute -top-20"></div>
            <p className="text-sm font-semibold text-navyBlue2">{t('JOURNAL.TOTAL_PRICE')}</p>
            <div className="flex w-full items-center">
              <NumericInput
                id="input-total-price"
                name="input-total-price"
                value={inputTotalPrice}
                setValue={setInputTotalPrice}
                isDecimal
                required
                hasComma
                triggerWhenChanged={amountChangeHandler}
                className="h-46px flex-1 rounded-l-sm border border-lightGray3 bg-white p-10px outline-none"
              />
              <div className="flex items-center gap-4px rounded-r-sm border border-l-0 border-lightGray3 bg-white p-12px text-sm text-lightGray4">
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
            {/* Info: (20240723 - Julian) Hint */}
            {/* ToDo: (20240723 - Julian) i18n */}
            <div
              className={`ml-auto text-sm text-input-text-error ${isPriceValid ? 'opacity-0' : 'opacity-100'}`}
            >
              <p>請填入金額</p>
            </div>
          </div>

          {/* Info: (20240423 - Julian) Tax */}
          <div className="flex w-full flex-col gap-8px text-lightGray4 md:w-200px">
            {/* Info: (20240424 - Julian) toggle */}
            <div className="flex items-center gap-18px">
              <p>{t('JOURNAL.NO_SLASH_TAX')}</p>
              <Toggle
                id="tax-toggle"
                initialToggleState={taxToggle}
                getToggledState={taxToggleHandler}
                toggleStateFromParent={taxToggle}
              />
            </div>

            {/* Info: (20240424 - Julian) dropmenu */}
            <button
              id="tax-menu"
              name="tax-menu"
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
              <p>{t('JOURNAL.FEE')}</p>
              <Toggle
                id="fee-toggle"
                initialToggleState={feeToggle}
                getToggledState={feeToggleHandler}
                toggleStateFromParent={feeToggle}
              />
            </div>
            <div
              className={`flex w-full items-center ${feeToggle ? 'bg-white text-navyBlue2' : 'bg-lightGray6 text-lightGray4'} rounded-sm transition-all duration-300 ease-in-out`}
            >
              <NumericInput
                id="fee-input"
                name="fee-input"
                disabled={!feeToggle}
                value={inputFee}
                setValue={setInputFee}
                isDecimal
                required={feeToggle}
                hasComma
                triggerWhenChanged={amountChangeHandler}
                className="h-46px flex-1 rounded-l-sm border border-lightGray3 bg-transparent p-10px outline-none md:w-1/2"
              />
              <div className="flex items-center gap-4px rounded-r-sm border border-l-0 border-lightGray3 p-12px text-sm text-lightGray4">
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
            {feeToggle && !isFeeValid && (
              <div className="ml-auto text-sm text-input-text-error">
                <p>{t('JOURNAL.FEE_EXCEEDS_TOTAL')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Info: (20240424 - Julian) Second Column */}
        <div className="flex w-full flex-col items-start justify-between gap-24px md:flex-row md:items-end">
          {/* Info: (20240424 - Julian) Payment Method */}
          <div className="flex w-full flex-col items-start gap-8px md:w-200px">
            <p className="text-sm font-semibold text-navyBlue2">{t('JOURNAL.PAYMENT_METHOD')}</p>
            <div
              id="payment-method-menu"
              onClick={methodMenuHandler}
              className={`group relative flex h-46px w-full cursor-pointer ${isMethodMenuOpen ? 'border-primaryYellow text-primaryYellow' : 'border-lightGray3 text-navyBlue2'} items-center justify-between rounded-sm border bg-white p-10px hover:border-primaryYellow hover:text-primaryYellow`}
            >
              <p>{t(selectedMethod)}</p>
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
            <p className="text-sm font-semibold text-navyBlue2">{t('JOURNAL.BANK_ACCOUNT')}</p>
            <button
              id="fic-menu"
              type="button"
              onClick={bankAccountMenuHandler}
              disabled={!isAccountNumberVisible}
              className={`group relative flex h-46px w-full cursor-pointer ${isBankAccountMenuOpen ? 'border-primaryYellow text-primaryYellow' : 'border-lightGray3 text-navyBlue2'} items-center justify-between rounded-sm border bg-white p-10px hover:border-primaryYellow hover:text-primaryYellow disabled:cursor-default disabled:bg-lightGray6 disabled:hover:border-lightGray3 disabled:hover:text-navyBlue2`}
            >
              <p>{t(selectedFIC)}</p>
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
              id="input-account-number"
              name="input-account-number"
              type="text"
              placeholder={t('JOURNAL.ACCOUNT_NUMBER')}
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
            <p className="text-sm font-semibold text-navyBlue2">
              {t('REPORTS_HISTORY_LIST.PERIOD')}
            </p>
            {/* Info: (20240424 - Julian) radio buttons */}
            <div className="flex w-full flex-col items-start gap-x-60px gap-y-16px md:flex-row md:items-baseline">
              {/* Info: (20240424 - Julian) At Once */}
              <label
                htmlFor="input-at-once"
                className="flex items-center gap-8px whitespace-nowrap"
              >
                <input
                  type="radio"
                  id="input-at-once"
                  name="payment-period"
                  className={radioButtonStyle}
                  checked={paymentPeriod === PaymentPeriodType.AT_ONCE}
                  onChange={atOnceClickHandler}
                />
                <p>{t('JOURNAL.AT_ONCE')}</p>
              </label>

              {/* Info: (20240424 - Julian) Installment */}
              <div className="relative flex flex-col">
                <div id="installment" className="absolute -top-20"></div>
                <div className="flex w-full flex-1 flex-col items-start gap-8px md:flex-row md:items-center">
                  <label
                    htmlFor="input-installment"
                    className="flex w-full items-center gap-8px whitespace-nowrap"
                  >
                    <input
                      type="radio"
                      id="input-installment"
                      name="payment-period"
                      className={radioButtonStyle}
                      checked={paymentPeriod === PaymentPeriodType.INSTALLMENT}
                      onChange={installmentClickHandler}
                    />
                    {t('JOURNAL.INSTALLMENT')}
                  </label>
                  {/* Info: (20240424 - Julian) input */}
                  <div
                    className={`flex w-full items-center ${paymentPeriod === PaymentPeriodType.INSTALLMENT ? 'bg-white' : 'bg-lightGray6'} rounded-sm transition-all duration-300 ease-in-out`}
                  >
                    <NumericInput
                      id="input-installment-times"
                      name="input-installment-times"
                      value={inputInstallment}
                      setValue={setInputInstallment}
                      required={paymentPeriod === PaymentPeriodType.INSTALLMENT}
                      disabled={paymentPeriod !== PaymentPeriodType.INSTALLMENT}
                      className="h-46px flex-1 rounded-l-sm border border-lightGray3 bg-transparent p-10px outline-none"
                    />
                    <div className="flex items-center gap-4px rounded-r-sm border border-l-0 border-lightGray3 p-12px text-sm text-lightGray4">
                      <p style={{ whiteSpace: 'nowrap' }}>{t('JOURNAL.TIMES')}</p>
                    </div>
                  </div>
                </div>
                {/* ToDo: (20240723 - Julian) i18n */}
                <div
                  className={`ml-auto text-sm text-input-text-error ${isInstallmentValid ? 'opacity-0' : 'opacity-100'}`}
                >
                  <p>請填入次數</p>
                </div>
              </div>
            </div>
          </div>

          {/* Info: (20240424 - Julian) Payment State */}
          <div className="flex w-full flex-col items-start gap-8px">
            <p className="text-sm font-semibold text-navyBlue2">{t('JOURNAL.PAYMENT_STATE')}</p>
            {/* Info: (20240424 - Julian) radio buttons */}
            <div className="flex w-full flex-col items-start gap-x-60px gap-y-24px md:flex-row md:items-baseline md:justify-between">
              {/* Info: (20240424 - Julian) Unpaid */}
              <label htmlFor="input-unpaid" className="flex items-center gap-8px whitespace-nowrap">
                <input
                  type="radio"
                  id="input-unpaid"
                  name="payment-status"
                  className={radioButtonStyle}
                  checked={paymentStatus === PaymentStatusType.UNPAID}
                  onChange={unpaidClickHandler}
                />
                <p>{t('JOURNAL.UNPAID')}</p>
              </label>
              {/* Info: (20240424 - Julian) Partial Paid */}
              <div className="relative flex flex-col">
                <div id="partial-paid" className="absolute -top-20"></div>
                <div className="flex w-full flex-col items-start gap-8px md:flex-row md:items-center">
                  <label
                    htmlFor="input-partial-paid"
                    className="flex items-center gap-8px whitespace-nowrap"
                  >
                    <input
                      type="radio"
                      id="input-partial-paid"
                      name="payment-status"
                      className={radioButtonStyle}
                      checked={paymentStatus === PaymentStatusType.PARTIAL}
                      onChange={partialPaidClickHandler}
                    />
                    <p>{t('JOURNAL.PARTIAL_PAID')}</p>
                  </label>
                  {/* Info: (20240424 - Julian) input */}
                  <div
                    className={`flex w-full items-center ${paymentStatus === PaymentStatusType.PARTIAL ? 'bg-white' : 'bg-lightGray6'} rounded-sm transition-all duration-300 ease-in-out`}
                  >
                    <NumericInput
                      id="input-partial-paid-amount"
                      name="input-partial-paid-amount"
                      value={inputPartialPaid}
                      setValue={setInputPartialPaid}
                      isDecimal
                      hasComma
                      required={paymentStatus === PaymentStatusType.PARTIAL}
                      disabled={paymentStatus !== PaymentStatusType.PARTIAL}
                      className="h-46px flex-1 rounded-l-sm border border-lightGray3 bg-transparent p-10px outline-none md:w-1/2"
                    />
                    <div className="flex items-center gap-4px rounded-r-sm border border-l-0 border-lightGray3 p-12px text-sm text-lightGray4">
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

                {/* ToDo: (20240723 - Julian) i18n */}
                <div
                  className={`ml-auto text-sm text-input-text-error ${isPartialPaidValid ? 'opacity-0' : 'opacity-100'}`}
                >
                  <p>請填入金額</p>
                </div>
              </div>
              {/* Info: (20240424 - Julian) Paid */}
              <label htmlFor="input-paid" className="flex items-center gap-8px whitespace-nowrap">
                <input
                  type="radio"
                  id="input-paid"
                  name="payment-status"
                  className={radioButtonStyle}
                  checked={paymentStatus === PaymentStatusType.PAID}
                  onChange={paidClickHandler}
                />
                <p>{t('JOURNAL.PAID')}</p>
              </label>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const displayedProjectSecondLine =
    selectedEventType === EventType.INCOME ? (
      /* Info: (20240502 - Julian) Estimated Cost */
      <div className="flex w-full flex-col items-start gap-8px">
        <p className="text-sm font-semibold text-navyBlue2">{t('JOURNAL.ESTIMATED_COST')}</p>
        <div className="flex w-full items-center rounded-sm bg-white transition-all duration-300 ease-in-out">
          <NumericInput
            id="input-estimated-cost"
            name="input-estimated-cost"
            value={inputEstimatedCost}
            setValue={setInputEstimatedCost}
            isDecimal
            required={selectedEventType === EventType.INCOME}
            hasComma
            className="h-46px flex-1 rounded-l-sm border border-lightGray3 bg-transparent p-10px outline-none md:w-1/2"
          />
          <div className="flex items-center gap-4px rounded-r-sm border border-l-0 border-lightGray3 p-12px text-sm text-lightGray4">
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
    ) : null;

  const displayedProject = (
    <>
      {/* Info: (20240424 - Julian) Title */}
      <div className="my-5 flex items-center gap-4">
        <hr className="block flex-1 border-lightGray3 md:hidden" />
        <div className="flex items-center gap-2 text-sm">
          <Image src="/icons/rocket_launch.svg" width={16} height={16} alt="rocket_launch_icon" />
          <p>{t('REPORTS_HISTORY_LIST.PROJECT')}</p>
        </div>
        <hr className="flex-1 border-lightGray3" />
      </div>

      {/* Info: (20240424 - Julian) Form */}
      <div className="my-20px flex flex-col gap-40px">
        {/* Info: (20240502 - Julian) First Column */}
        <div className="flex w-full flex-col items-center gap-40px md:flex-row">
          {/* Info: (20240424 - Julian) Project */}
          <div
            id="project-menu"
            onClick={projectMenuHandler}
            className={`group relative flex w-full cursor-pointer ${isProjectMenuOpen ? 'border-primaryYellow text-primaryYellow' : 'border-lightGray3 text-navyBlue2'} items-center justify-between divide-x divide-lightGray3 rounded-sm border bg-white hover:border-primaryYellow hover:text-primaryYellow`}
          >
            <div className="p-12px text-sm text-lightGray4">
              <p style={{ whiteSpace: 'nowrap' }}>{t('REPORTS_HISTORY_LIST.PROJECT')}</p>
            </div>
            <div className="flex w-full items-center p-10px">
              <p className="flex-1">{projectName}</p>
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
            id="contract-menu"
            onClick={contractMenuHandler}
            className={`group relative flex w-full cursor-pointer ${isContractMenuOpen ? 'border-primaryYellow text-primaryYellow' : 'border-lightGray3 text-navyBlue2'} items-center justify-between divide-x divide-lightGray3 rounded-sm border bg-white hover:border-primaryYellow hover:text-primaryYellow`}
          >
            <div className="p-12px text-sm text-lightGray4">
              <p style={{ whiteSpace: 'nowrap' }}>{t('JOURNAL.CONTRACT')}</p>
            </div>
            <div className="flex w-full items-center p-10px">
              <p className="flex-1">{contractName}</p>
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
      <form
        onSubmit={submitHandler}
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
            id="clear-journal-form-btn"
            type="button"
            onClick={clearAllClickHandler}
            className="px-16px py-8px text-secondaryBlue hover:text-primaryYellow"
          >
            {t('JOURNAL.CLEAR_ALL')}
          </button>
          <Button
            id="upload-btn"
            type="submit"
            className="px-16px py-8px"
            // disabled={isUploadDisabled}
          >
            <p>{t('JOURNAL.UPLOAD')}</p>
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
    </div>
  );
};

export default NewJournalForm;
