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
import { IJournalData } from '@/interfaces/journal';
import { ProgressStatus } from '@/constants/account';
import { IConfirmModal } from '@/interfaces/confirm_modal';
import { useUserCtx } from '@/contexts/user_context';

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
  const { selectedCompany } = useUserCtx();
  const {
    accountingVoucher,
    addVoucherRowHandler,
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
  } = APIHandler<IJournalData>(APIName.JOURNAL_GET_BY_ID, {}, false, false);

  const {
    trigger: createVoucher,
    data: result,
    success: createSuccess,
    code: createCode,
  } = APIHandler<{
    id: number;
    lineItems: {
      id: number;
      amount: number;
      description: string;
      debit: boolean;
      accountId: number;
      voucherId: number | null;
    }[];
  }>(APIName.VOUCHER_CREATE, {}, false, false);

  const {
    trigger: getAIStatus,
    data: status,
    success: statusSuccess,
    error: statusError,
    code: statusCode,
  } = APIHandler<ProgressStatus>(APIName.AI_ASK_STATUS, {}, false, false);

  const {
    trigger: getAIResult,
    data: AIResult,
    success: AIResultSuccess,
    code: AIResultCode,
  } = APIHandler<{ lineItems: ILineItem[] }>(APIName.AI_ASK_RESULT, {}, false, false);

  const router = useRouter();

  const [isAskAILoading, setIsAskAILoading] = useState<boolean>(true);

  const [eventType, setEventType] = useState<string>('');
  const [dateTimestamp, setDateTimestamp] = useState<number>(0);
  // const [reason, setReason] = useState<string>('');
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

  const companyId = selectedCompany?.id ?? DEFAULT_DISPLAYED_COMPANY_ID;

  useEffect(() => {
    if (journalId !== undefined) {
      getJournalById({
        params: { companyId, journalId },
      });
    }
  }, [journalId]);

  useEffect(() => {
    clearVoucherHandler();
    // Info: (20240528 - Julian) Reset AI status
    setIsAskAILoading(true);
    // Info: (20240528 - Julian) Call AI API first time
    getAIStatus({
      params: {
        companyId,
        resultId: askAIId,
      },
    });
  }, [isModalVisible]);

  // ToDo: (20240528 - Julian) Error handling
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (askAIId && statusSuccess && status === ProgressStatus.IN_PROGRESS) {
      interval = setInterval(() => {
        getAIStatus({
          params: {
            companyId,
            resultId: askAIId,
          },
        });
      }, 2000);
    }
    if (statusSuccess && status === ProgressStatus.SUCCESS) {
      getAIResult({
        params: {
          companyId,
          resultId: askAIId,
        },
      });
      setIsAskAILoading(false);
    }
    if (statusError && statusCode) {
      setIsAskAILoading(false);
    }
    return () => clearInterval(interval);
  }, [askAIId, statusSuccess, status, statusError, statusCode]);

  useEffect(() => {
    if (journal && getJournalSuccess) {
      const { invoice, voucher } = journal;
      if (invoice) {
        setDateTimestamp(invoice.date);
        // setReason(invoice.paymentReason);
        setEventType(invoice.eventType);
        setCompanyName(invoice.vendorOrSupplier);
        setDescription(invoice.description);
        setTotalPrice(invoice.payment.price);
        setTaxPercentage(invoice.payment.taxPercentage);
        setFee(invoice.payment.fee);
        setPaymentMethod(invoice.payment.paymentMethod);
        setPaymentPeriod(invoice.payment.paymentPeriod);
        setPaymentStatus(invoice.payment.paymentStatus);
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

  const addRowHandler = () => addVoucherRowHandler();
  const addDebitRowHandler = () => addVoucherRowHandler(VoucherRowType.DEBIT);
  const addCreditRowHandler = () => addVoucherRowHandler(VoucherRowType.CREDIT);

  const importVoucherClickHandler = () => {
    const AILineItems = AIResult?.lineItems ?? [];

    // Info: (20240529 - Julian) 清空 accountingVoucher
    clearVoucherHandler();

    // Info: (20240529 - Julian) 先加入空白列，再寫入資料
    AILineItems.forEach((lineItem, index) => {
      addRowHandler();
      changeVoucherAmountHandler(
        index,
        lineItem.amount,
        lineItem.debit ? VoucherRowType.DEBIT : VoucherRowType.CREDIT,
        lineItem.description
      );
    });
  };

  useEffect(() => {
    // Info: (20240529 - Julian) 將 IAccountingVoucher 轉換成 ILineItem
    const newLineItems = accountingVoucher.map((voucher) => {
      const isDebit = voucher.debit !== 0;
      const debitAmount = voucher.debit ?? 0;
      const creditAmount = voucher.credit ?? 0;

      return {
        lineItemIndex: `${voucher.id}`,
        account: voucher.accountTitle,
        description: voucher.particulars,
        debit: isDebit,
        amount: isDebit ? debitAmount : creditAmount,
      };
    });

    setLineItems(newLineItems);
  }, [accountingVoucher]);

  useEffect(() => {
    if (createSuccess && result && journal) {
      // Info: (20240503 - Julian) 關閉 Modal、清空 Voucher、清空 AI 狀態、清空 Journal
      modalVisibilityHandler();
      clearVoucherHandler();
      setIsAskAILoading(true);
      selectJournalHandler(undefined);

      // Info: (20240503 - Julian) 將網址導向至 /user/accounting/[id]
      router.push(`${ISUNFA_ROUTE.ACCOUNTING}/${journal.id}`);
      // Info: (20240527 - Julian) Toast notification
      toastHandler({
        id: `createVoucher-${result.id}`,
        type: ToastType.SUCCESS,
        content: (
          <div className="flex items-center justify-between">
            <p>Uploaded successfully.</p>
            <Link
              href={ISUNFA_ROUTE.USERS_MY_REPORTS}
              className="font-semibold text-link-text-success hover:opacity-70"
            >
              Go check it !
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

  const disableConfirmButton = totalCredit !== totalDebit;

  const displayType = <p className="text-lightRed">{eventType}</p>;

  const displayDate = <p>{timestampToString(dateTimestamp).date}</p>;

  const displayReason = // ToDo: (20240527 - Julian) Interface lacks paymentReason
    (
      <div className="flex flex-col items-center gap-x-12px md:flex-row">
        <p>reason</p>
        <div className="flex items-center gap-4px rounded-xs border border-primaryYellow5 px-4px text-sm text-primaryYellow5">
          <LuTag size={14} />
          Printer
        </div>
      </div>
    );

  const displayVendor = <p className="font-semibold text-navyBlue2">{companyName}</p>;

  const displayDescription = <p className="font-semibold text-navyBlue2">{description}</p>;

  const displayTotalPrice = (
    <div className="flex flex-col items-end">
      <p>
        <span className="font-semibold text-navyBlue2">{totalPrice}</span> TWD
      </p>
      <p>
        (<span className="font-semibold text-navyBlue2">{taxPercentage}%</span> Tax /{' '}
        <span className="font-semibold text-navyBlue2">{fee}</span> TWD fee)
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
      <p className="font-semibold text-navyBlue2">None</p>
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
          <p>Accounting Voucher</p>
        </div>
        <hr className="flex-1 border-lightGray3" />
      </div>
      {/* Info: (20240429 - Julian) List */}
      <div className="overflow-x-auto rounded-sm bg-lightGray7 p-20px">
        <table className="w-full text-left text-navyBlue2">
          {/* Info: (20240429 - Julian) Header */}
          <thead>
            <tr>
              <th>Accounting</th>
              <th>Particulars</th>
              <th>Debit</th>
              <th>Credit</th>
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

  const displayedHint = isAskAILoading ? (
    <p className="absolute left-0 animate-pulse text-text-neutral-secondary">
      AI is working on it...
    </p>
  ) : AIResultSuccess && AIResult && AIResult.lineItems.length > 0 ? (
    <button
      type="button"
      className="rounded-xs bg-badge-surface-soft-primary px-4px py-2px text-badge-text-primary-solid"
      onClick={importVoucherClickHandler}
    >
      Import voucher from AI
    </button>
  ) : AIResultSuccess === false && AIResultCode ? (
    <p className="absolute left-0 text-text-neutral-secondary">
      Failed to get AI result, error code: {AIResultCode}
    </p>
  ) : (
    <p className="absolute left-0 text-text-neutral-secondary">
      There are no recommendations from AI
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
            Please make sure all the information are correct !
          </h1>
          {/* Info: (20240429 - Julian) mobile title */}
          <h1 className="block text-xl md:hidden">Confirm</h1>
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
              <p>Type</p>
              {displayType}
            </div>
            {/* Info: (20240507 - Julian) Date */}
            <div className="flex items-center justify-between">
              <p>Date</p>
              {displayDate}
            </div>
            {/* Info: (20240429 - Julian) Reason */}
            <div className="flex items-center justify-between">
              <p>Reason</p>
              {displayReason}
            </div>
            {/* Info: (20240429 - Julian) Vendor/Supplier */}
            <div className="flex items-center justify-between">
              <p>Vendor/Supplier</p>
              {displayVendor}
            </div>
            {/* Info: (20240429 - Julian) Description */}
            <div className="flex items-center justify-between">
              <p>Description</p>
              {displayDescription}
            </div>
            {/* Info: (20240429 - Julian) Total Price */}
            <div className="flex items-center justify-between">
              <p className="whitespace-nowrap">Total Price</p>
              {displayTotalPrice}
            </div>
            {/* Info: (20240429 - Julian) Payment Method */}
            <div className="flex items-center justify-between">
              <p className="whitespace-nowrap">Payment Method</p>
              {displayMethod}
            </div>
            {/* Info: (20240429 - Julian) Payment Period */}
            <div className="flex items-center justify-between">
              <p className="whitespace-nowrap">Payment Period</p>
              {displayPeriod}
            </div>
            {/* Info: (20240429 - Julian) Payment Status */}
            <div className="flex items-center justify-between">
              <p className="whitespace-nowrap">Payment Status</p>
              {displayStatus}
            </div>
            {/* Info: (20240429 - Julian) Project */}
            <div className="flex items-center justify-between">
              <p>Project</p>
              {displayProject}
            </div>
            {/* Info: (20240429 - Julian) Contract */}
            <div className="flex items-center justify-between">
              <p>Contract</p>
              {displayContract}
            </div>
          </div>

          {/* Info: (20240429 - Julian) Accounting Voucher */}
          {displayAccountingVoucher}
          {displayAccountingVoucherMobile}

          <div className="relative mt-24px">
            {/* Info: (20240527 - Julian) Hint */}
            {displayedHint}

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
              Attention: Saving this voucher means it&#39;s permanent on the blockchain. Mistakes
              can&#39;t be fixed. You&#39;ll need new vouchers to make corrections.
            </p>
            <label htmlFor="addToBook" className="ml-auto flex items-center gap-8px text-navyBlue2">
              <input id="addToBook" className={checkboxStyle} type="checkbox" />
              <p>Add Accounting Voucher to the book</p>
            </label>
          </div>
        </div>

        {/* Info: (20240429 - Julian) Buttons */}
        <div className="mx-20px mt-24px flex items-center justify-end gap-12px">
          <button
            type="button"
            onClick={modalVisibilityHandler}
            className="flex items-center gap-4px px-16px py-8px text-secondaryBlue hover:text-primaryYellow"
          >
            Cancel
          </button>
          <Button
            type="button"
            variant="tertiary"
            disabled={disableConfirmButton}
            onClick={confirmHandler}
            className="disabled:bg-lightGray6"
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default ConfirmModal;
