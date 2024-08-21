import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RxCross2 } from 'react-icons/rx';
import { LuTag } from 'react-icons/lu';
import { FiPlus } from 'react-icons/fi';
import { timestampToString } from '@/lib/utils/common';
import APIHandler from '@/lib/utils/api_handler';
import { IVoucherDataForAPIResponse, IVoucherDataForSavingToDB } from '@/interfaces/voucher';
import { APIName } from '@/constants/api_connection';
import { VoucherRowType, useAccountingCtx } from '@/contexts/accounting_context';
import { checkboxStyle } from '@/constants/display';
import { ISUNFA_ROUTE } from '@/constants/url';
import { ILineItem } from '@/interfaces/line_item';
import AccountingVoucherRow from '@/components/accounting_voucher_row/accounting_voucher_row';
import AccountingVoucherRowMobile from '@/components/accounting_voucher_row/accounting_voucher_row_mobile';
import { Button } from '@/components/button/button';
// ToDo: (20240527 - Luphia) Fix me
// eslint-disable-next-line import/no-cycle
import { useGlobalCtx } from '@/contexts/global_context';
import { MessageType } from '@/interfaces/message_modal';
import { ToastType } from '@/interfaces/toastify';
import { IJournal } from '@/interfaces/journal';
import { ProgressStatus } from '@/constants/account';
import { IConfirmModal } from '@/interfaces/confirm_modal';
import { useUserCtx } from '@/contexts/user_context';
import { useTranslation } from 'next-i18next';
import { BUFFER_AMOUNT } from '@/constants/config';

interface IConfirmModalProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
  confirmData: IConfirmModal;
}

const ConfirmModal = ({
  isModalVisible,
  modalVisibilityHandler,
  confirmData,
}: IConfirmModalProps) => {
  const { t } = useTranslation('common');
  const { isAuthLoading, selectedCompany } = useUserCtx();
  const {
    AIStatus,
    getAIStatusHandler,
    totalCredit,
    totalDebit,
    accountList,
    generateAccountTitle,
    accountingVoucher,
    addVoucherRowHandler,
    changeVoucherAccountHandler,
    changeVoucherAmountHandler,
    resetVoucherHandler,
    selectedJournal,
    selectJournalHandler,
  } = useAccountingCtx();

  // // Info: (20240801 - Anna) 函數用來生成會計科目的標題，並進行多語系翻譯
  // const generateAccountTitleWithTranslation = (account: IAccount | null) => {
  //   if (account) {
  //     const title = generateAccountTitle(account);
  //     // 如果標題是 'Account Title'，則進行多語系翻譯
  //     return title === 'Account Title' ? t('JOURNAL.ACCOUNT_TITLE') : title;
  //   }
  //   // 如果 account 是 null 或 undefined，返回預設值或其他處理方式
  //   return '';
  // };

  const { messageModalVisibilityHandler, messageModalDataHandler, toastHandler } = useGlobalCtx();

  const { journalId, askAIId } = confirmData;

  const [eventType, setEventType] = useState<string>('');
  const [dateTimestamp, setDateTimestamp] = useState<number>(0);
  // ToDo: (20240527 - Julian) Add paymentReason
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [reason, setReason] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [taxPercentage, setTaxPercentage] = useState<number>(0);
  const [fee, setFee] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [paymentPeriod, setPaymentPeriod] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [project, setProject] = useState<string>('');
  const [contract, setContract] = useState<string>('');

  // Info: (20240527 - Julian) voucher verification
  const [isEveryRowHasAccount, setIsEveryRowHasAccount] = useState<boolean>(false);
  const [isNoEmptyRow, setIsNoEmptyRow] = useState<boolean>(false);
  const [isBalance, setIsBalance] = useState<boolean>(false);
  const [isTotalDebitBalanced, setIsTotalDebitBalanced] = useState<boolean>(false);
  const [isTotalCreditBalanced, setIsTotalCreditBalanced] = useState<boolean>(false);

  // Info: (20240730 - Julian)
  const [isAILoading, setIsAILoading] = useState<boolean>(false);

  const [journal, setJournal] = useState<IJournal | null>(null);

  // Info: (20240527 - Julian) Get AI 生成的傳票
  const {
    trigger: getAIResult,
    data: AIResult,
    success: AIResultSuccess,
    code: AIResultCode,
  } = APIHandler<{ lineItems: ILineItem[] }>(APIName.AI_ASK_RESULT);
  // Info: (20240527 - Julian) Get journal by id (上半部資料)
  const { trigger: getJournalById } = APIHandler<IJournal>(APIName.JOURNAL_GET_BY_ID);
  // Info: (20240527 - Julian) 建立傳票
  const { trigger: createVoucher } = APIHandler<IVoucherDataForAPIResponse | null>(
    APIName.VOUCHER_CREATE
  );
  const { trigger: updateVoucher } = APIHandler<IVoucherDataForAPIResponse | null>(
    APIName.VOUCHER_UPDATE
  );

  const hasCompanyId = isAuthLoading === false && !!selectedCompany?.id;
  // Info: (20240430 - Julian) Get first letter of each word
  const projectCode = project.split(' ').reduce((acc, word) => acc + word[0], '');
  // ToDo: (20240711 - Julian) Check if AI result is successful
  const hasAIResult = AIResultSuccess && AIResult && AIResult.lineItems.length > 0;

  const addRowHandler = () => addVoucherRowHandler(1);
  const addDebitRowHandler = () => addVoucherRowHandler(1, VoucherRowType.DEBIT);
  const addCreditRowHandler = () => addVoucherRowHandler(1, VoucherRowType.CREDIT);

  const importVoucherHandler = (initialLineItems?: ILineItem[]) => {
    try {
      // Info: (20240529 - Julian) 取得 AI 生成的傳票 or 日記帳的初始傳票
      const items = initialLineItems ?? AIResult?.lineItems ?? [];

      // Info: (20240529 - Julian) 清空 accountingVoucher
      resetVoucherHandler();

      // Info: (20240716 - Julian) 根據 AI 生成的傳票數量，新增 accountingVoucher
      addVoucherRowHandler(items.length - 1);

      // Info: (20240716 - Julian) 將 AI 生成的傳票逐一寫入 accountingVoucher
      items.forEach((lineItem, index) => {
        // Info: (20240716 - Julian) 在 accountList 中找到對應的 account
        const rowAccount = accountList.find((account) => account.id === lineItem.accountId);
        const rowAmount = lineItem.amount;
        // Info: (20240716 - Julian) 判斷 row type
        const rowType = lineItem.debit ? VoucherRowType.DEBIT : VoucherRowType.CREDIT;
        const rowDescription = lineItem.description;

        // Info: (20240716 - Julian) 寫入 account
        changeVoucherAccountHandler(index, rowAccount);
        // Info: (20240716 - Julian) 寫入 description 和 amount
        changeVoucherAmountHandler(index, rowAmount, rowType, rowDescription);
      });
    } catch (err) {
      // Debug: (20240726 - Tzuhan) Show error message
      // eslint-disable-next-line no-console
      console.log(`importVoucherHandler err: `, err);
    }
  };

  const analysisBtnClickHandler = () => {
    // Info: (20240605 - Julian) Show warning message after clicking the button
    messageModalDataHandler({
      messageType: MessageType.WARNING,
      title: 'Replace Input',
      subMsg: 'Are you sure you want to use Ai information?',
      content: 'The text you entered will be replaced.',
      submitBtnStr: t('JOURNAL.CONFIRM'),
      // Info: (20240716 - Julian) 從 API response 取出傳票列表
      submitBtnFunction: importVoucherHandler,
      backBtnStr: t('REPORTS_HISTORY_LIST.CANCEL'),
      backBtnFunction: () => {
        getAIStatusHandler(undefined, false);
        messageModalVisibilityHandler();
      },
    });
    messageModalVisibilityHandler();
  };

  const closeHandler = () => {
    modalVisibilityHandler();
    getAIStatusHandler(undefined, false);
    resetVoucherHandler();
    setIsAILoading(true);
  };

  const convertToLineItems = () => {
    const newLineItems = accountingVoucher
      .filter((voucher) => voucher.account)
      .map((voucher) => {
        const isDebit = voucher.debit !== null;
        const debitAmount = voucher.debit ?? 0;
        const creditAmount = voucher.credit ?? 0;

        return {
          accountId: voucher.account!.id,
          lineItemIndex: `${voucher.id}`,
          account: generateAccountTitle(voucher.account),
          // // Info: (20240801 - Anna) 使用 generateAccountTitleWithTranslation 函數生成會計科目的標題(翻譯後的)，取代原本的 generateAccountTitle 函數）
          // account: generateAccountTitleWithTranslation(voucher.account),
          description: voucher.particulars,
          debit: isDebit,
          amount: isDebit ? debitAmount : creditAmount,
        };
      });
    return newLineItems;
  };

  const handleAPIResponse = (res: {
    success: boolean;
    data: IVoucherDataForAPIResponse | null;
    code: string;
    error: Error | null;
  }) => {
    if (res.success && res.data && journal) {
      // Info: (20240503 - Julian) 關閉 Modal、清空 Voucher、清空 AI 狀態、清空 Journal
      closeHandler();
      selectJournalHandler(undefined);

      // Info: (20240527 - Julian) Toast notification
      toastHandler({
        id: `Voucher-${res.data.id}`,
        type: ToastType.SUCCESS,
        content: (
          <div className="flex items-center justify-between">
            <p>{t('CONFIRM_MODAL.UPLOADED_SUCCESSFULLY')}</p>
            <Link
              href={ISUNFA_ROUTE.USERS_MY_REPORTS}
              className="font-semibold text-link-text-success hover:opacity-70"
            >
              {t('AUDIT_REPORT.GO_CHECK_IT')}
            </Link>
          </div>
        ),
        closeable: true,
      });

      // Info: (20240503 - Julian) 將網址導向至 /user/accounting/[id]
      window.location.href = `${ISUNFA_ROUTE.ACCOUNTING}/${res.data.journalId}`;
    }
    if (res.success === false) {
      messageModalDataHandler({
        title: t('CONFIRM_MODAL.UPLOAD_FAILED'),
        subMsg: t('JOURNAL.TRY_AGAIN_LATER'),
        content: t('COMMON.ERROR_CODE', { code: res.code }),
        messageType: MessageType.ERROR,
        submitBtnStr: t('COMMON.CLOSE'),
        submitBtnFunction: () => messageModalVisibilityHandler(),
      });
      messageModalVisibilityHandler();
    }
  };

  // Info: (20240527 - Julian) 送出 Voucher
  const confirmHandler = async () => {
    const newLineItems = convertToLineItems();

    if (hasCompanyId && journal && journal.invoice && newLineItems) {
      const voucher: IVoucherDataForSavingToDB = {
        journalId: journal.id,
        lineItems: newLineItems,
      };
      if (selectedJournal && journal?.voucher && Object.keys(journal.voucher).length > 0) {
        const updateRes = await updateVoucher({
          params: { companyId: selectedCompany.id },
          body: { voucher },
        });
        handleAPIResponse(updateRes);
      } else {
        const createRes = await createVoucher({
          params: { companyId: selectedCompany.id },
          body: { voucher },
        });
        handleAPIResponse(createRes);
      }
    }
  };

  const openHandler = async () => {
    if (!hasCompanyId || !journalId) return;
    const {
      success: getJournalSuccess,
      data,
      code: getJournalCode,
    } = await getJournalById({
      params: { companyId: selectedCompany.id, journalId },
    });
    if (data && getJournalSuccess) {
      setJournal(data);
      const { invoice, voucher } = data;
      if (invoice) {
        setDateTimestamp(invoice.date);
        setReason(invoice.paymentReason);
        setEventType(invoice.eventType);
        setCompanyName(invoice.vendorOrSupplier);
        setDescription(invoice.description);
        setTotalPrice(invoice.payment.price);
        setTaxPercentage(invoice.payment.taxPercentage);
        setFee(invoice.payment.fee);
        setPaymentMethod(invoice.payment.method);
        setPaymentPeriod(invoice.payment.period);
        setPaymentStatus(invoice.payment.status);
        setProject(invoice.project ?? 'None');
        setContract(invoice.contract ?? 'None');
      }
      if (voucher) {
        importVoucherHandler(voucher.lineItems);
      }
    }
    if (getJournalSuccess === false) {
      messageModalDataHandler({
        title: 'Get Journal Failed',
        subMsg: 'Please try again later',
        content: `Error code: ${getJournalCode}`,
        messageType: MessageType.ERROR,
        submitBtnStr: t('COMMON.CLOSE'),
        submitBtnFunction: () => messageModalVisibilityHandler(),
      });
      messageModalVisibilityHandler();
    }
  };

  useEffect(() => {
    if (!isModalVisible || !hasCompanyId) return; // Info: 在其他頁面沒用到 modal 時不調用 API (20240530 - Shirley)
    openHandler();
    // Info: (20240529 - Julian) 清空 accountingVoucher
    resetVoucherHandler();
    // Info: (20240730 - Julian) 顯示 AI loading
    setIsAILoading(true);

    // Info: (20240528 - Julian) Call AI API first time
    getAIStatusHandler({ companyId: selectedCompany.id!, askAIId: askAIId! }, true);
  }, [isModalVisible]);

  // ToDo: (20240528 - Julian) Error handling
  useEffect(() => {
    if (hasCompanyId && AIStatus === ProgressStatus.SUCCESS) {
      getAIResult({
        params: {
          companyId: selectedCompany.id!,
          resultId: askAIId,
        },
      });
      setIsAILoading(false);
    }
    return () => getAIStatusHandler(undefined, false);
  }, [hasCompanyId, AIStatus]);

  useEffect(() => {
    const isCreditEqualDebit = totalCredit === totalDebit;
    const isNotEmpty = accountingVoucher.every((voucher) => !!voucher.debit || !!voucher.credit);
    const isEveryLineItemHasAccount = accountingVoucher.every((voucher) => !!voucher.account);

    // Info: 計算借貸方科目加總 (20240806 - Shirley)
    const totalDebitAmount = accountingVoucher.reduce(
      (sum, voucher) => sum + (voucher.debit || 0),
      0
    );
    const totalCreditAmount = accountingVoucher.reduce(
      (sum, voucher) => sum + (voucher.credit || 0),
      0
    );

    // Info: 檢查借方總額和貸方總額是否分別等於總金額 (20240806 - Shirley)
    const isDebitValid = Math.abs(totalDebitAmount - totalPrice) < BUFFER_AMOUNT; // Info: 使用小於0.01來避免浮點數精度問題 (20240806 - Shirley)
    const isCreditValid = Math.abs(totalCreditAmount - totalPrice) < BUFFER_AMOUNT;

    setIsBalance(isCreditEqualDebit);
    setIsNoEmptyRow(isNotEmpty);
    setIsEveryRowHasAccount(isEveryLineItemHasAccount);
    setIsTotalDebitBalanced(isDebitValid);
    setIsTotalCreditBalanced(isCreditValid);
  }, [totalCredit, totalDebit, accountingVoucher, totalPrice]);

  // Info: (20240731 - Anna) 創建一個新的變數來儲存翻譯後的字串(會計事件類型)
  // const displayType = <p className="text-lightRed">{eventType}</p>;
  const typeString = eventType && typeof eventType === 'string' ? eventType : '';
  const translatedType = typeString
    ? t(`JOURNAL_TYPES.${typeString.toUpperCase().replace(/ /g, '_')}`)
    : '';

  const displayDate = <p>{timestampToString(dateTimestamp).date}</p>;

  // ToDo: (20240527 - Julian) Interface lacks paymentReason
  // ToDo: (20240729 - Julian) Add Tag functionality
  const displayReason = (
    <div className="flex flex-col items-center gap-x-12px md:flex-row">
      <p>{reason}</p>
      {/* ToDo: (20240711 - Julian) Add Tag functionality */}
      <div className="hidden items-center gap-4px rounded-xs border border-primaryYellow5 px-4px text-sm text-primaryYellow5">
        <LuTag size={14} />
        {t('CONFIRM_MODAL.PRINTER')}
      </div>
    </div>
  );

  const displayVendor = <p className="font-semibold text-navyBlue2">{companyName}</p>;

  const displayDescription = <p className="font-semibold text-navyBlue2">{description}</p>;

  const displayTotalPrice = (
    <div className="flex flex-col items-end">
      <p>
        <span className="font-semibold text-navyBlue2">{totalPrice}</span> {t('JOURNAL.TWD')}
      </p>
      <p>
        (<span className="font-semibold text-navyBlue2">{taxPercentage}%</span> {t('JOURNAL.TAX')}
        <span className="font-semibold text-navyBlue2">{fee}</span>
        {t('JOURNAL.TWD_FEE')})
      </p>
    </div>
  );

  const displayMethod = (
    <p className="text-right font-semibold text-navyBlue2">{t(paymentMethod)}</p>
  );
  // Info: (20240731 - Anna) 創建一個新的變數來儲存翻譯後的字串(付款期間)
  // const displayPeriod = <p className="font-semibold text-navyBlue2">{paymentPeriod}</p>;
  const paymentPeriodString = typeof paymentPeriod === 'string' ? paymentPeriod : '';
  const translatedPeriod = t(`JOURNAL.${paymentPeriodString.toUpperCase().replace(/ /g, '_')}`);

  // Info: (20240731 - Anna) 創建一個新的變數來儲存翻譯後的字串(付款狀態)
  // const displayStatus = <p className="font-semibold text-navyBlue2">{paymentStatus}</p>;
  const paymentStatusString = typeof paymentStatus === 'string' ? paymentStatus : '';
  const translatedStatus = t(`JOURNAL.${paymentStatusString.toUpperCase().replace(/ /g, '_')}`);

  const displayProject =
    project !== 'None' ? (
      <div className="flex w-fit items-center gap-2px rounded bg-primaryYellow3 px-8px py-2px font-medium text-primaryYellow2">
        <div className="flex h-14px w-14px items-center justify-center rounded-full bg-indigo text-xxs text-white">
          {projectCode}
        </div>
        <p>{project}</p>
      </div>
    ) : (
      <p className="font-semibold text-navyBlue2">{t('JOURNAL.NONE')}</p>
    );

  // Info: (20240731 - Anna) 把合約None加上多語系
  // const displayContract = <p className="font-semibold text-darkBlue">{contract}</p>;
  const displayContract =
    contract !== 'None' ? (
      <div className="flex w-fit items-center gap-2px rounded bg-primaryYellow3 px-8px py-2px font-medium text-primaryYellow2">
        <p className="font-semibold text-darkBlue">{contract}</p>
      </div>
    ) : (
      <p className="font-semibold text-navyBlue2">{t('JOURNAL.NONE')}</p>
    );

  const displayedHint =
    ((AIStatus === ProgressStatus.IN_PROGRESS || AIStatus === ProgressStatus.SUCCESS) &&
      isAILoading) ||
    AIResultSuccess === undefined ? (
      <p className="text-slider-surface-bar">
        {t('CONFIRM_MODAL.AI_TECHNOLOGY_PROCESSING')}
        <span className="mx-2px inline-block h-3px w-3px animate-bounce rounded-full bg-slider-surface-bar delay-300"></span>
        <span className="mr-2px inline-block h-3px w-3px animate-bounce rounded-full bg-slider-surface-bar delay-150"></span>
        <span className="inline-block h-3px w-3px animate-bounce rounded-full bg-slider-surface-bar"></span>
      </p>
    ) : hasAIResult ? (
      <p className="text-successGreen">{t('CONFIRM_MODAL.AI_ANALYSIS_COMPLETE')}</p>
    ) : AIResultSuccess === false && AIResultCode ? (
      <p className="text-text-neutral-secondary">
        {t('CONFIRM_MODAL.AI_DETECTION_ERROR_ERROR_CODE')} {AIResultCode}
      </p>
    ) : (
      <p className="text-slider-surface-bar">
        {t('CONFIRM_MODAL.THERE_ARE_NO_RECOMMENDATIONS_FROM_AI')}
      </p>
    );

  const accountingVoucherRow = accountingVoucher.map((voucher) => (
    <AccountingVoucherRow key={voucher.id} accountingVoucher={voucher} />
  ));

  const debitListMobile = accountingVoucher
    .filter((voucher) => !!voucher.debit) // Info: (20240530 - Julian) 找出 Debit 的 Voucher
    .map((debit) => <AccountingVoucherRowMobile type="Debit" accountingVoucher={debit} />);

  const creditListMobile = accountingVoucher
    .filter((voucher) => !!voucher.credit) // Info: (20240530 - Julian) 找出 Credit 的 Voucher
    .map((credit) => <AccountingVoucherRowMobile type="Credit" accountingVoucher={credit} />);

  const displayAccountingVoucherMobile = (
    <div className="flex w-full flex-col gap-24px py-10px text-sm text-lightGray5 md:hidden">
      {/* Info: (20240510 - Julian) Debit */}
      <div className="flex flex-col gap-24px">
        {/* Info: (20240510 - Julian) Divider */}
        <div className="flex items-center gap-4">
          <hr className="flex-1 border-lightGray3" />
          <div className="flex items-center gap-2 text-sm">
            <Image src="/icons/ticket.svg" width={16} height={16} alt="ticket_icon" />
            <p>Debit</p>
          </div>
          <hr className="flex-1 border-lightGray3" />
        </div>
        {/* Info: (20240510 - Julian) List */}
        <div className="flex flex-col">{debitListMobile}</div>

        {/* Info: (20240510 - Julian) Add Button */}
        <button
          id="add-debit-btn-mobile"
          type="button"
          onClick={addDebitRowHandler}
          className="mx-auto mt-24px rounded-sm border border-navyBlue2 p-12px hover:border-primaryYellow hover:text-primaryYellow"
        >
          <FiPlus size={20} />
        </button>
      </div>

      {/* Info: (20240510 - Julian) Credit */}
      <div className="flex flex-col gap-24px">
        {/* Info: (20240510 - Julian) Divider */}
        <div className="flex items-center gap-4">
          <hr className="flex-1 border-lightGray3" />
          <div className="flex items-center gap-2 text-sm">
            <Image src="/icons/ticket.svg" width={16} height={16} alt="ticket_icon" />
            <p>Credit</p>
          </div>
          <hr className="flex-1 border-lightGray3" />
        </div>
        {/* Info: (20240510 - Julian) List */}
        <div className="flex flex-col">{creditListMobile}</div>

        {/* Info: (20240510 - Julian) Add Button */}
        <button
          id="add-credit-btn-mobile"
          type="button"
          onClick={addCreditRowHandler}
          className="mx-auto mt-24px rounded-sm border border-navyBlue2 p-12px hover:border-primaryYellow hover:text-primaryYellow"
        >
          <FiPlus size={20} />
        </button>
      </div>
    </div>
  );

  const displayAccountingVoucher = (
    <div className="hidden w-full flex-col gap-24px text-base text-lightGray5 md:flex">
      {/* Info: (20240429 - Julian) Divider */}
      <div className="flex items-center gap-4">
        <hr className="flex-1 border-lightGray3" />
        <div className="flex items-center gap-2 text-sm">
          <Image src="/icons/ticket.svg" width={16} height={16} alt="ticket_icon" />
          <p>{t('JOURNAL.ACCOUNTING_VOUCHER')}</p>
        </div>
        <hr className="flex-1 border-lightGray3" />
      </div>
      {/* Info: (20240429 - Julian) List */}
      <div className="rounded-sm bg-lightGray7 p-20px">
        <table className="w-full text-left text-navyBlue2">
          {/* Info: (20240429 - Julian) Header */}
          <thead>
            <tr>
              <th>{t('JOURNAL.ACCOUNTING')}</th>
              <th>{t('JOURNAL.PARTICULARS')}</th>
              <th>{t('JOURNAL.DEBIT')}</th>
              <th>{t('JOURNAL.CREDIT')}</th>
            </tr>
          </thead>
          {/* Info: (20240429 - Julian) Body */}
          <tbody>{accountingVoucherRow}</tbody>
        </table>
      </div>
    </div>
  );

  const displayVerifyAcc = (
    <div className="flex items-center gap-12px">
      {isEveryRowHasAccount ? (
        <Image src="/icons/verify_true.svg" width={16} height={16} alt="success_icon" />
      ) : (
        <Image src="/icons/verify_false.svg" width={16} height={16} alt="error_icon" />
      )}
      <p className={isEveryRowHasAccount ? 'text-text-state-success' : 'text-text-state-error'}>
        {/* Each row includes an accounting account. */}
        {t('JOURNAL.EACH_ROW_INCLUDES_AN_ACCOUNTING_ACCOUNT')}
      </p>
    </div>
  );

  const displayVerifyNoEmpty = (
    <div className="flex items-center gap-12px">
      {isNoEmptyRow ? (
        <Image src="/icons/verify_true.svg" width={16} height={16} alt="success_icon" />
      ) : (
        <Image src="/icons/verify_false.svg" width={16} height={16} alt="error_icon" />
      )}
      <p className={isNoEmptyRow ? 'text-text-state-success' : 'text-text-state-error'}>
        {/* Each row includes a debit or credit. */}
        {t('JOURNAL.EACH_ROW_INCLUDES_A_DEBIT_OR_CREDIT')}
      </p>
    </div>
  );

  const displayVerifyBalance = (
    <div className="flex items-center gap-12px">
      {isBalance ? (
        <Image src="/icons/verify_true.svg" width={16} height={16} alt="success_icon" />
      ) : (
        <Image src="/icons/verify_false.svg" width={16} height={16} alt="error_icon" />
      )}
      <p className={isBalance ? 'text-text-state-success' : 'text-text-state-error'}>
        {/* Debits and credits balance out. */}
        {t('JOURNAL.DEBITS_AND_CREDITS_BALANCE_OUT')}
      </p>
    </div>
  );

  const displayVerifyDebitAmount = (
    <div className="flex items-center gap-12px">
      {isTotalDebitBalanced ? (
        <Image src="/icons/verify_true.svg" width={16} height={16} alt="success_icon" />
      ) : (
        <Image src="/icons/verify_false.svg" width={16} height={16} alt="error_icon" />
      )}
      <p className={isTotalDebitBalanced ? 'text-text-state-success' : 'text-text-state-error'}>
        {t('JOURNAL.DEBIT_AMOUNT_BALANCED')}
      </p>
    </div>
  );

  const displayVerifyCreditAmount = (
    <div className="flex items-center gap-12px">
      {isTotalCreditBalanced ? (
        <Image src="/icons/verify_true.svg" width={16} height={16} alt="success_icon" />
      ) : (
        <Image src="/icons/verify_false.svg" width={16} height={16} alt="error_icon" />
      )}
      <p className={isTotalCreditBalanced ? 'text-text-state-success' : 'text-text-state-error'}>
        {t('JOURNAL.CREDIT_AMOUNT_BALANCED')}
      </p>
    </div>
  );

  const isDisplayModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="relative flex max-h-500px w-90vw flex-col rounded-sm bg-white py-16px md:max-h-90vh">
        {/* Info: (20240429 - Julian) title */}
        <div className="flex items-center gap-6px px-20px font-bold text-navyBlue2">
          <Image src="/icons/files.svg" width={20} height={20} alt="files_icon" />
          {/* Info: (20240429 - Julian) desktop title */}
          <h1 className="hidden whitespace-nowrap text-xl md:block">
            {t('CONFIRM_MODAL.PLEASE_MAKE_SURE')}
          </h1>
          {/* Info: (20240429 - Julian) mobile title */}
          <h1 className="block text-xl md:hidden">{t('JOURNAL.CONFIRM')}</h1>
        </div>
        {/* Info: (20240429 - Julian) close button */}
        <button
          type="button"
          onClick={modalVisibilityHandler}
          className="absolute right-20px top-20px text-lightGray5"
        >
          <RxCross2 size={20} />
        </button>

        {/* Info: (20240527 - Julian) Body */}
        <div className="mt-10px flex flex-col overflow-y-auto overflow-x-hidden bg-lightGray7 px-20px pb-20px md:bg-white">
          {/* Info: (20240429 - Julian) content */}
          <div className="mt-20px flex w-full flex-col gap-12px text-sm text-lightGray5 md:text-base">
            {/* Info: (20240429 - Julian) Type */}
            <div className="flex items-center justify-between">
              <p>{t('JOURNAL.TYPE')}</p>
              {/* Info: (20240731 - Anna) 把displayType(會計事件類型)替換成翻譯過的 */}
              <p className="text-lightRed">{translatedType}</p>
            </div>
            {/* Info: (20240507 - Julian) Date */}
            <div className="flex items-center justify-between">
              <p>{t('DATE_PICKER.DATE')}</p>
              {displayDate}
            </div>
            {/* Info: (20240429 - Julian) Reason */}
            <div className="flex items-center justify-between">
              <p>{t('JOURNAL.REASON')}</p>
              {displayReason}
            </div>
            {/* Info: (20240429 - Julian) Vendor/Supplier */}
            <div className="flex items-center justify-between">
              <p>{t('JOURNAL.VENDOR_SUPPLIER')}</p>
              {displayVendor}
            </div>
            {/* Info: (20240429 - Julian) Description */}
            <div className="flex items-center justify-between">
              <p>{t('JOURNAL.DESCRIPTION')}</p>
              {displayDescription}
            </div>
            {/* Info: (20240429 - Julian) Total Price */}
            <div className="flex items-center justify-between">
              <p className="whitespace-nowrap">{t('JOURNAL.TOTAL_PRICE')}</p>
              {displayTotalPrice}
            </div>
            {/* Info: (20240429 - Julian) Payment Method */}
            <div className="flex items-center justify-between">
              <p className="whitespace-nowrap">{t('JOURNAL.PAYMENT_METHOD')}</p>
              {displayMethod}
            </div>
            {/* Info: (20240429 - Julian) Payment Period */}
            <div className="flex items-center justify-between">
              <p className="whitespace-nowrap">{t('JOURNAL.PAYMENT_PERIOD')}</p>
              {/* Info: (20240731 - Anna) 把displayPeriod(付款期間)替換成翻譯過的 */}
              {/* {displayPeriod} */}
              {translatedPeriod && (
                <p className="font-semibold text-navyBlue2">{translatedPeriod}</p>
              )}
            </div>
            {/* Info: (20240429 - Julian) Payment Status */}
            <div className="flex items-center justify-between">
              <p className="whitespace-nowrap">{t('JOURNAL.PAYMENT_STATUS')}</p>
              {/* Info: (20240731 - Anna) 把displayType(付款狀態)替換成翻譯過的 */}
              {translatedStatus && (
                <p className="font-semibold text-navyBlue2">{translatedStatus}</p>
              )}
              {/* {displayStatus} */}
            </div>
            {/* Info: (20240429 - Julian) Project */}
            <div className="flex items-center justify-between">
              <p>{t('REPORTS_HISTORY_LIST.PROJECT')}</p>
              {displayProject}
            </div>
            {/* Info: (20240429 - Julian) Contract */}
            <div className="flex items-center justify-between">
              <p>{t('JOURNAL.CONTRACT')}</p>
              {displayContract}
            </div>
          </div>

          {/* Info: (20240429 - Julian) Accounting Voucher */}
          {displayAccountingVoucher}
          {displayAccountingVoucherMobile}

          <div className="relative mt-24px">
            {/* Info: (20240605 - Julian) AI analysis result */}
            <div className="mt-40px flex flex-col items-center md:mt-0 md:flex-row md:gap-x-16px">
              {/* Info: (20240605 - Julian) button */}
              <button
                id="ai-analysis-btn"
                type="button"
                disabled={!hasAIResult}
                onClick={analysisBtnClickHandler}
                className="flex h-44px w-44px items-center justify-center rounded-xs bg-button-surface-strong-secondary text-button-text-invert hover:cursor-pointer hover:opacity-70 disabled:bg-button-surface-strong-disable disabled:text-button-text-disable hover:disabled:cursor-default hover:disabled:opacity-100"
              >
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
                    d="M14.0386 0.980903C14.3002 -0.213858 16.0014 -0.221295 16.2734 0.971135L16.2861 1.02753L16.2889 1.03999C16.2965 1.07371 16.3037 1.10547 16.3115 1.13843C16.6248 2.47284 17.7048 3.49249 19.0567 3.72766C20.3028 3.94446 20.3028 5.73337 19.0567 5.95016C17.6977 6.1866 16.6134 7.21587 16.3067 8.56079L16.2734 8.70669C16.0014 9.89913 14.3002 9.89169 14.0386 8.69693L14.0112 8.57173C13.7157 7.22187 12.633 6.18494 11.2716 5.9481C10.0277 5.7317 10.0277 3.94613 11.2716 3.72973C12.6282 3.49372 13.7082 2.46316 14.0081 1.1202L14.0283 1.02808L14.0386 0.980903ZM13.1782 10.314C13.701 10.8751 14.4381 11.1541 15.1737 11.15C16.1554 12.552 16.8828 13.9378 17.2611 15.1747C17.6709 16.515 17.7815 18.0855 16.7517 19.1155C16.0839 19.7833 15.1749 19.965 14.3111 19.9131C13.4455 19.8611 12.4932 19.5721 11.5281 19.1334C10.6558 18.737 9.72899 18.198 8.78581 17.5374C7.84264 18.198 6.91581 18.737 6.04361 19.1334C5.07848 19.5721 4.12612 19.8611 3.26058 19.9131C2.39669 19.965 1.48776 19.7831 0.820076 19.1155C0.152394 18.4478 -0.0294329 17.5388 0.022494 16.675C0.0745208 15.8094 0.363472 14.8571 0.802166 13.892C1.19862 13.0198 1.73767 12.0929 2.39821 11.1498C1.73767 10.2066 1.19862 9.27974 0.802166 8.40754C0.363472 7.44242 0.0745205 6.49006 0.0224938 5.62452C-0.0294328 4.76063 0.152394 3.85169 0.820076 3.18402C1.85002 2.15407 3.42058 2.2647 4.76092 2.67453C5.99811 3.05283 7.38425 3.78049 8.78654 4.76264C8.76682 5.50659 9.03604 6.2583 9.59419 6.79002C9.57945 6.80692 9.56411 6.82343 9.54817 6.83953C9.50519 6.88316 9.45911 6.92243 9.41057 6.95729C8.55998 7.59959 7.69078 8.35392 6.84039 9.2043C6.19525 9.84944 5.60742 10.5033 5.08275 11.1498C5.60742 11.7962 6.19525 12.4501 6.84039 13.0952C7.48552 13.7403 8.13941 14.3281 8.78581 14.8528C9.43224 14.3281 10.0861 13.7403 10.7313 13.0952C11.582 12.2445 12.3366 11.3749 12.979 10.524C13.0116 10.4788 13.0479 10.4358 13.0881 10.3954C13.1168 10.3663 13.1469 10.3392 13.1782 10.314ZM4.13434 4.72373C4.95632 4.97507 5.93844 5.45292 7.00162 6.14289C6.43871 6.62036 5.87719 7.13704 5.32517 7.68907C4.77442 8.23981 4.25754 8.80133 3.77896 9.36557C3.35982 8.71974 3.01561 8.09866 2.75295 7.52083C2.37638 6.69239 2.19219 6.00667 2.16149 5.49594C2.13069 4.98354 2.25656 4.77799 2.33531 4.69924C2.46414 4.5704 2.93942 4.35836 4.13434 4.72373ZM2.75295 14.7787C3.01561 14.2008 3.35982 13.5798 3.77895 12.9339C4.25754 13.4982 4.77442 14.0597 5.32517 14.6104C5.87589 15.1611 6.43739 15.678 7.00162 16.1565C6.35579 16.5757 5.73472 16.92 5.15689 17.1827C4.32845 17.5591 3.64274 17.7434 3.13201 17.7741C2.61961 17.8048 2.41405 17.679 2.33531 17.6003C2.25656 17.5215 2.13069 17.316 2.16149 16.8035C2.19219 16.2928 2.37638 15.6071 2.75295 14.7787ZM12.4148 17.1827C11.8369 16.92 11.2158 16.5757 10.57 16.1565C11.1342 15.678 11.6958 15.1611 12.2465 14.6104C12.7985 14.0584 13.3152 13.4969 13.7927 12.9339C14.4827 13.9971 14.9605 14.9793 15.2118 15.8013C15.5772 16.9961 15.3652 17.4714 15.2364 17.6003C15.1577 17.679 14.9521 17.8048 14.4397 17.7741C13.9289 17.7434 13.2432 17.5593 12.4148 17.1827ZM8.78578 9.72174C7.99681 9.72174 7.35721 10.3613 7.35721 11.1503C7.35721 11.9393 7.99681 12.5789 8.78578 12.5789C9.57477 12.5789 10.2144 11.9393 10.2144 11.1503C10.2144 10.3613 9.57477 9.72174 8.78578 9.72174Z"
                    fill="#7F8A9D"
                  />
                </svg>
              </button>
              {displayedHint}
            </div>

            {/* Info: (20240430 - Julian) Add Button */}
            <button
              id="add-row-btn"
              type="button"
              onClick={addRowHandler}
              className="mx-auto hidden rounded-sm border border-navyBlue2 p-12px hover:border-primaryYellow hover:text-primaryYellow md:block"
            >
              <FiPlus size={20} />
            </button>
          </div>

          {/* Info: (20240429 - Julian) checkbox */}
          <div className="my-24px flex flex-wrap justify-between gap-y-4px">
            <p className="text-sm font-semibold text-navyBlue2">
              {/* Info: eslint recommandation `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`.eslint (tzuhan - 20230513) */}
              {t('CONFIRM_MODAL.ATTENTION')}
            </p>
            <label
              htmlFor="addToBook"
              className="ml-auto flex items-center gap-8px text-sm text-navyBlue2"
            >
              <input id="addToBook" className={checkboxStyle} type="checkbox" />
              <p>{t('CONFIRM_MODAL.ADD_ACCOUNTING_VOUCHER')}</p>
            </label>
          </div>

          {/* Info: (20240730 - Julian) Verify Hints */}
          <div className="mx-20px flex flex-col items-center justify-center gap-20px rounded-sm bg-surface-support-soft-maple px-20px py-10px text-sm font-semibold md:flex-row md:py-5px">
            {/* Info: (20240730 - Julian) Verify all rows have account */}
            {displayVerifyAcc}
            {/* Info: (20240730 - Julian) Verify no empty row */}
            {displayVerifyNoEmpty}
            {/* Info: (20240730 - Julian) Verify balancing debits and credits */}
            {displayVerifyBalance}
            {/* Info: (20240806 - Shirley) Verify debit and credit amount */}
            {displayVerifyDebitAmount}
            {displayVerifyCreditAmount}
          </div>
        </div>

        {/* Info: (20240429 - Julian) Buttons */}
        <div className="mx-20px mt-24px flex items-center justify-end gap-12px">
          <button
            id="cancel-btn"
            type="button"
            onClick={closeHandler}
            className="flex items-center gap-4px px-16px py-8px text-secondaryBlue hover:text-primaryYellow"
          >
            {t('REPORTS_HISTORY_LIST.CANCEL')}
          </button>
          <Button
            id="confirm-btn"
            type="button"
            variant="tertiary"
            disabled={
              !(
                isBalance &&
                isNoEmptyRow &&
                isEveryRowHasAccount &&
                isTotalDebitBalanced &&
                isTotalCreditBalanced
              )
            }
            onClick={confirmHandler}
            className="disabled:bg-lightGray6"
          >
            {t('JOURNAL.CONFIRM')}
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default ConfirmModal;
