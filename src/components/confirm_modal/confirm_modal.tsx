import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { RxCross2 } from 'react-icons/rx';
import { LuTag } from 'react-icons/lu';
import { FiPlus } from 'react-icons/fi';
import { timestampToString } from '@/lib/utils/common';
import APIHandler from '@/lib/utils/api_handler';
import { IVoucherDataForSavingToDB } from '@/interfaces/voucher';
import { APIName } from '@/constants/api_connection';
import { VoucherRowType, useAccountingCtx } from '@/contexts/accounting_context';
import { DEFAULT_DISPLAYED_COMPANY_ID, checkboxStyle } from '@/constants/display';
import { ISUNFA_ROUTE } from '@/constants/url';
import { ILineItem } from '@/interfaces/line_item';
import AccountingVoucherRow, {
  AccountingVoucherRowMobile,
} from '@/components/accounting_voucher_row/accounting_voucher_row';
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
  const { selectedCompany } = useUserCtx();
  const {
    getAIStatusHandler,
    accountList,
    AIStatus,
    generateAccountTitle,
    accountingVoucher,
    addVoucherRowHandler,
    changeVoucherAccountHandler,
    changeVoucherAmountHandler,
    clearVoucherHandler,
    totalCredit,
    totalDebit,
    selectJournalHandler,
  } = useAccountingCtx();
  const { messageModalDataHandler, messageModalVisibilityHandler, toastHandler } = useGlobalCtx();

  const { journalId, askAIId } = confirmData;

  // Info: (20240527 - Julian) Get journal by id (上半部資料)
  const {
    trigger: getJournalById,
    success: getJournalSuccess,
    data: journal,
    code: getJournalCode,
  } = APIHandler<IJournal>(APIName.JOURNAL_GET_BY_ID, {}, false, false);

  const {
    trigger: createVoucher,
    data: result,
    success: createSuccess,
    code: createCode,
  } = APIHandler<{
    id: number;
    createdAt: number;
    updatedAt: number;
    journalId: number;
    no: string;
    lineItems: {
      id: number;
      amount: number;
      description: string;
      debit: boolean;
      accountId: number;
      voucherId: number;
      createdAt: number;
      updatedAt: number;
    }[];
  } | null>(APIName.VOUCHER_CREATE, {}, false, false);

  const {
    trigger: getAIResult,
    data: AIResult,
    success: AIResultSuccess,
    code: AIResultCode,
  } = APIHandler<{ lineItems: ILineItem[] }>(APIName.AI_ASK_RESULT, {}, false, false);

  const router = useRouter();

  const [eventType, setEventType] = useState<string>('');
  const [dateTimestamp, setDateTimestamp] = useState<number>(0);
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
  const [lineItems, setLineItems] = useState<ILineItem[]>([]);
  const [disableConfirmButton, setDisableConfirmButton] = useState<boolean>(true);

  const companyId = selectedCompany?.id ?? DEFAULT_DISPLAYED_COMPANY_ID;

  const hasAIResult = AIResultSuccess && AIResult && AIResult.lineItems.length > 0;

  useEffect(() => {
    if (journalId !== undefined) {
      getJournalById({
        params: { companyId, journalId },
      });
    }
  }, [journalId]);

  useEffect(() => {
    if (!isModalVisible) return; // Info: 在其他頁面沒用到 modal 時不調用 API (20240530 - Shirley)
    clearVoucherHandler();

    // Info: (20240528 - Julian) Call AI API first time
    getAIStatusHandler({ companyId, askAIId: askAIId! }, true);
  }, [isModalVisible]);

  // ToDo: (20240528 - Julian) Error handling
  useEffect(() => {
    if (AIStatus === ProgressStatus.SUCCESS) {
      getAIResult({
        params: {
          companyId,
          resultId: askAIId,
        },
      });
    }
    return () => getAIStatusHandler(undefined, false);
  }, [AIStatus]);

  useEffect(() => {
    if (journal && getJournalSuccess) {
      const { invoice, voucher } = journal;
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
        setLineItems(voucher.lineItems);
      }
    }
    if (getJournalSuccess === false) {
      messageModalDataHandler({
        title: 'Get Journal Failed',
        subMsg: 'Please try again later',
        content: `Error code: ${getJournalCode}`,
        messageType: MessageType.ERROR,
        submitBtnStr: 'Close',
        submitBtnFunction: () => messageModalVisibilityHandler(),
      });
      messageModalVisibilityHandler();
    }
  }, [journal, getJournalSuccess, getJournalCode]);

  // Info: (20240527 - Julian) 送出 Voucher
  const confirmHandler = () => {
    if (journal && journal.invoice && lineItems) {
      const voucher: IVoucherDataForSavingToDB = {
        journalId: journal.id,
        lineItems,
      };
      createVoucher({
        params: { companyId },
        body: { voucher },
      });
    }
  };

  const closeHandler = () => {
    modalVisibilityHandler();
    getAIStatusHandler(undefined, false);
  };

  const addRowHandler = () => addVoucherRowHandler();
  const addDebitRowHandler = () => addVoucherRowHandler(VoucherRowType.DEBIT);
  const addCreditRowHandler = () => addVoucherRowHandler(VoucherRowType.CREDIT);

  const importVoucherHandler = () => {
    const AILineItems = AIResult?.lineItems ?? [];

    // Info: (20240529 - Julian) 清空 accountingVoucher
    clearVoucherHandler();

    // Info: (20240529 - Julian) 先加入空白列，再寫入資料
    AILineItems.forEach((lineItem, index) => {
      addRowHandler();
      const account = accountList.find((acc) => acc.id === lineItem.accountId);
      changeVoucherAccountHandler(index, account);
      changeVoucherAmountHandler(
        index,
        lineItem.amount,
        lineItem.debit ? VoucherRowType.DEBIT : VoucherRowType.CREDIT,
        lineItem.description
      );
    });
  };

  const analysisBtnClickHandler = () => {
    // Info: (20240605 - Julian) Show warning message after clicking the button
    messageModalDataHandler({
      messageType: MessageType.WARNING,
      title: 'Replace Input',
      subMsg: 'Are you sure you want to use Ai information?',
      content: 'The text you entered will be replaced.',
      submitBtnStr: 'Confirm',
      submitBtnFunction: importVoucherHandler,
      backBtnStr: 'Cancel',
      backBtnFunction: () => getAIStatusHandler(undefined, false),
    });
    messageModalVisibilityHandler();
  };

  useEffect(() => {
    // Info: (20240529 - Julian) 將 IAccountingVoucher 轉換成 ILineItem
    const newLineItems = accountingVoucher
      .filter((voucher) => voucher.account)
      .map((voucher) => {
        const isDebit = voucher.debit !== 0;
        const debitAmount = voucher.debit ?? 0;
        const creditAmount = voucher.credit ?? 0;

        return {
          accountId: voucher.account!.id,
          lineItemIndex: `${voucher.id}`,
          account: generateAccountTitle(voucher.account),
          description: voucher.particulars,
          debit: isDebit,
          amount: isDebit ? debitAmount : creditAmount,
        };
      });

    setLineItems(newLineItems);
  }, [accountingVoucher]);

  useEffect(() => {
    const isCreditEqualDebit = totalCredit === totalDebit;
    const isNotZero = totalCredit !== 0 && totalDebit !== 0;
    const isEveryLineItemHasAccount = accountingVoucher.every((voucher) => !!voucher.account);

    setDisableConfirmButton(!(isCreditEqualDebit && isNotZero && isEveryLineItemHasAccount));
  }, [totalCredit, totalDebit, accountingVoucher]);

  useEffect(() => {
    if (createSuccess && result && journal) {
      // Info: (20240503 - Julian) 關閉 Modal、清空 Voucher、清空 AI 狀態、清空 Journal
      closeHandler();
      clearVoucherHandler();
      selectJournalHandler(undefined);

      // Info: (20240503 - Julian) 將網址導向至 /user/accounting/[id]
      router.push(`${ISUNFA_ROUTE.ACCOUNTING}/${journal.id}`);
      // Info: (20240527 - Julian) Toast notification
      toastHandler({
        id: `createVoucher-${result.id}`,
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
    }
    if (createSuccess === false) {
      messageModalDataHandler({
        title: 'Create Voucher Failed',
        subMsg: 'Please try again later',
        content: `Error code: ${createCode}`,
        messageType: MessageType.ERROR,
        submitBtnStr: 'Close',
        submitBtnFunction: () => messageModalVisibilityHandler(),
      });
      messageModalVisibilityHandler();
    }
  }, [createSuccess, createCode]);

  const displayType = <p className="text-lightRed">{eventType}</p>;

  const displayDate = <p>{timestampToString(dateTimestamp).date}</p>;

  const displayReason = // ToDo: (20240527 - Julian) Interface lacks paymentReason
    (
      <div className="flex flex-col items-center gap-x-12px md:flex-row">
        <p>{reason}</p>
        <div className="flex items-center gap-4px rounded-xs border border-primaryYellow5 px-4px text-sm text-primaryYellow5">
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
        <span className="font-semibold text-navyBlue2">{totalPrice}</span>
        {t('JOURNAL.TWD')}
      </p>
      <p>
        (<span className="font-semibold text-navyBlue2">{taxPercentage}%</span> {t('JOURNAL.TAX')}
        <span className="font-semibold text-navyBlue2">{fee}</span>
        {t('JOURNAL.TWD_FEE')})
      </p>
    </div>
  );

  const displayMethod = <p className="text-right font-semibold text-navyBlue2">{paymentMethod}</p>;

  const displayPeriod = <p className="font-semibold text-navyBlue2">{paymentPeriod}</p>;

  const displayStatus = <p className="font-semibold text-navyBlue2">{paymentStatus}</p>;

  const projectName = project; // ToDo: (20240527 - Julian) Get project name from somewhere
  // Info: (20240430 - Julian) Get first letter of each word
  const projectCode = projectName.split(' ').reduce((acc, word) => acc + word[0], '');

  const displayProject =
    projectName !== 'None' ? (
      <div className="flex w-fit items-center gap-2px rounded bg-primaryYellow3 px-8px py-2px font-medium text-primaryYellow2">
        <div className="flex h-14px w-14px items-center justify-center rounded-full bg-indigo text-xxs text-white">
          {projectCode}
        </div>
        <p>{projectName}</p>
      </div>
    ) : (
      <p className="font-semibold text-navyBlue2">{t('JOURNAL.NONE')}</p>
    );

  const displayContract = <p className="font-semibold text-darkBlue">{contract}</p>; // ToDo: (20240527 - Julian) Get contract name from somewhere

  const accountingVoucherRow = accountingVoucher.map((voucher) => (
    <AccountingVoucherRow key={voucher.id} accountingVoucher={voucher} />
  ));

  const displayAccountingVoucher = (
    <div className="hidden w-full flex-col gap-24px text-base text-lightGray5 md:flex">
      {/* Info: (20240429 - Julian) Divider */}
      <div className="flex items-center gap-4">
        <hr className="flex-1 border-lightGray3" />
        <div className="flex items-center gap-2 text-sm">
          <Image src="/icons/ticket.svg" width={16} height={16} alt="ticket_icon" />
          <p>{t('JOURNAL.Accounting Voucher')}</p>
        </div>
        <hr className="flex-1 border-lightGray3" />
      </div>
      {/* Info: (20240429 - Julian) List */}
      <div className="overflow-x-auto rounded-sm bg-lightGray7 p-20px">
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

  const debitListMobile = accountingVoucher
    .filter((voucher) => !!voucher.debit) // Info: (20240530 - Julian) 找出 Debit 的 Voucher
    .map((debit) => AccountingVoucherRowMobile({ type: 'Debit', accountingVoucher: debit }));

  const creditListMobile = accountingVoucher
    .filter((voucher) => !!voucher.credit) // Info: (20240530 - Julian) 找出 Credit 的 Voucher
    .map((credit) => AccountingVoucherRowMobile({ type: 'Credit', accountingVoucher: credit }));

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
          type="button"
          onClick={addCreditRowHandler}
          className="mx-auto mt-24px rounded-sm border border-navyBlue2 p-12px hover:border-primaryYellow hover:text-primaryYellow"
        >
          <FiPlus size={20} />
        </button>
      </div>
    </div>
  );

  const displayedHint =
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
          onClick={closeHandler}
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
              {displayType}
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
              {displayPeriod}
            </div>
            {/* Info: (20240429 - Julian) Payment Status */}
            <div className="flex items-center justify-between">
              <p className="whitespace-nowrap">{t('JOURNAL.PAYMENT_STATUS')}</p>
              {displayStatus}
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
              type="button"
              onClick={addRowHandler}
              className="mx-auto hidden rounded-sm border border-navyBlue2 p-12px hover:border-primaryYellow hover:text-primaryYellow md:block"
            >
              <FiPlus size={20} />
            </button>
          </div>

          {/* Info: (20240429 - Julian) checkbox */}
          <div className="mt-24px flex flex-wrap justify-between gap-y-4px">
            <p className="font-semibold text-navyBlue2">
              {/* Info: eslint recommandation `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`.eslint (tzuhan - 20230513) */}
              {t('CONFIRM_MODAL.ATTENTION')}&#39;{t('CONFIRM_MODAL.PERMANENT_ON_THE_BLOCKCHAIN')}
              &#39;{t('CONFIRM_MODAL.CANT_BE_FIXED')}&#39;{t('CONFIRM_MODAL.MAKE_CORRECTIONS.')}
            </p>
            <label htmlFor="addToBook" className="ml-auto flex items-center gap-8px text-navyBlue2">
              <input id="addToBook" className={checkboxStyle} type="checkbox" />
              <p>{t('CONFIRM_MODAL.ADD_ACCOUNTING_VOUCHER')}</p>
            </label>
          </div>
        </div>

        {/* Info: (20240429 - Julian) Buttons */}
        <div className="mx-20px mt-24px flex items-center justify-end gap-12px">
          <button
            type="button"
            onClick={closeHandler}
            className="flex items-center gap-4px px-16px py-8px text-secondaryBlue hover:text-primaryYellow"
          >
            {t('REPORTS_HISTORY_LIST.CANCEL')}
          </button>
          <Button
            type="button"
            variant="tertiary"
            disabled={disableConfirmButton}
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
