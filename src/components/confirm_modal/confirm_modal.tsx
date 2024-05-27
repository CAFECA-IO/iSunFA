/* eslint-disable @typescript-eslint/no-unused-vars */
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { RxCross2 } from 'react-icons/rx';
import { LuTag } from 'react-icons/lu';
import { FiPlus } from 'react-icons/fi';
import { timestampToString } from '@/lib/utils/common';
import APIHandler from '@/lib/utils/api_handler';
import { IVoucherDataForSavingToDB } from '@/interfaces/voucher';
import { APIName } from '@/constants/api_connection';
import { IJournal } from '@/interfaces/journal';
import { VoucherRowType, useAccountingCtx } from '@/contexts/accounting_context';
import { IConfirmModal } from '@/interfaces/confirm_modal';
import { checkboxStyle } from '@/constants/display';
import { ISUNFA_ROUTE } from '@/constants/url';
import { ILineItem } from '@/interfaces/line_item';
import AccountingVoucherRow, {
  AccountingVoucherRowMobile,
} from '@/components/accounting_voucher_row/accounting_voucher_row';
import { Button } from '@/components/button/button';
// eslint-disable-next-line import/no-cycle
import { useGlobalCtx } from '@/contexts/global_context';
import { MessageType } from '@/interfaces/message_modal';

interface IConfirmModalProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
  confirmModalData: IConfirmModal;
}

const ConfirmModal = ({
  isModalVisible,
  modalVisibilityHandler,
  // confirmModalData,
}: IConfirmModalProps) => {
  const {
    companyId,
    selectedJournal,
    accountingVoucher,
    addVoucherRowHandler,
    clearVoucherHandler,
    totalCredit,
    totalDebit,
  } = useAccountingCtx();
  const { messageModalDataHandler, messageModalVisibilityHandler } = useGlobalCtx();

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
  }>(
    APIName.VOUCHER_CREATE,
    {
      params: { companyId },
    },
    false,
    false
  );

  const router = useRouter();

  // ToDo: (20240527 - Julian) 串接 API
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isAskAILoading, setIsAskAILoading] = useState<boolean>(true);
  const [askAIResult, setAskAIResult] = useState<string[]>([]);

  // const [voucherType, setVoucherType] = useState<VoucherType>(VoucherType.EXPENSE);
  // const [date, setDate] = useState<number>(0);
  // const [reason, setReason] = useState<string>('');
  // const [companyName, setCompanyName] = useState<string>('');
  // const [description, setDescription] = useState<string>('');
  // const [totalPrice, setTotalPrice] = useState<number>(0);
  // const [taxPercentage, setTaxPercentage] = useState<number>(0);
  // const [fee, setFee] = useState<number>(0);
  // const [paymentMethod, setPaymentMethod] = useState<string>('');
  // const [paymentPeriod, setPaymentPeriod] = useState<PaymentPeriodType>(PaymentPeriodType.AT_ONCE);
  // const [paymentStatus, setPaymentStatus] = useState<PaymentStatusType>(PaymentStatusType.PAID);
  // const [project, setProject] = useState<string>('');
  // const [contract, setContract] = useState<string>('');
  const [lineItems, setLineItems] = useState<ILineItem[]>([]);

  // useEffect(() => {
  //   if (selectedJournal) {
  //     const { invoice, voucher } = selectedJournal;
  //     if (invoice) {
  //       // setDate(invoice.date);
  //       // setReason(invoice.paymentReason);
  //       setCompanyName(invoice.vendorOrSupplier);
  //       setDescription(invoice.description);
  //       setTotalPrice(invoice.payment.price);
  //       setTaxPercentage(invoice.payment.taxPercentage);
  //       setFee(invoice.payment.fee);
  //       setPaymentMethod(invoice.payment.paymentMethod);
  //       setPaymentPeriod(invoice.payment.paymentPeriod as PaymentPeriodType);
  //       setPaymentStatus(invoice.payment.paymentStatus as PaymentStatusType);
  //       // setProject(selectedJournal.projectId ?? 'None');
  //       // setContract(selectedJournal.contractId ?? 'None');
  //     }
  //     if (voucher) {
  //       setLineItems(voucher.lineItems);
  //     }
  //   }
  // }, [selectedJournal?.voucher]);

  // Info: (20240527 - Julian) 送出 AI 請求
  const confirmHandler = () => {
    if (selectedJournal && selectedJournal.invoice && selectedJournal.voucher) {
      const voucher: IVoucherDataForSavingToDB = {
        journalId: selectedJournal.id,
        lineItems,
      };
      createVoucher({ params: { companyId }, body: { voucher } });
    }
  };

  const addRowHandler = () => addVoucherRowHandler();
  const addDebitRowHandler = () => addVoucherRowHandler(VoucherRowType.DEBIT);
  const addCreditRowHandler = () => addVoucherRowHandler(VoucherRowType.CREDIT);

  useEffect(() => {
    if (createSuccess && result && selectedJournal) {
      modalVisibilityHandler(); // Info: (20240503 - Julian) 關閉 Modal
      clearVoucherHandler(); // Info: (20240503 - Julian) 清空 Voucher
      router.push(`${ISUNFA_ROUTE.ACCOUNTING}/${selectedJournal.id}`); // Info: (20240503 - Julian) 將網址導向至 /user/accounting/[id]
    }
    if (createSuccess === false) {
      // TODO: Error handling @Julian (20240510 - Tzuhan)
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
  }, [createSuccess]);

  const disableConfirmButton = totalCredit !== totalDebit;

  const displayType = <p className="text-lightRed">{selectedJournal?.invoice?.eventType}</p>;

  const displayDate = <p>{timestampToString(0).date}</p>; // ToDo: (20240527 - Julian) Interface lacks date

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

  const displayVendor = (
    <p className="font-semibold text-navyBlue2">{selectedJournal?.invoice?.vendorOrSupplier}</p>
  );

  const displayDescription = (
    <p className="font-semibold text-navyBlue2">{selectedJournal?.invoice?.description}</p>
  );

  const displayTotalPrice = (
    <div className="flex flex-col items-end">
      <p>
        <span className="font-semibold text-navyBlue2">
          {selectedJournal?.invoice?.payment.price}
        </span>{' '}
        TWD
      </p>
      <p>
        (
        <span className="font-semibold text-navyBlue2">
          {selectedJournal?.invoice?.payment.taxPercentage}%
        </span>{' '}
        Tax /{' '}
        <span className="font-semibold text-navyBlue2">
          {selectedJournal?.invoice?.payment.fee}
        </span>{' '}
        TWD fee)
      </p>
    </div>
  );

  const displayMethod = (
    <p className="text-right font-semibold text-navyBlue2">
      {selectedJournal?.invoice?.payment.paymentMethod}
    </p>
  );

  const displayPeriod = (
    <p className="font-semibold text-navyBlue2">
      {selectedJournal?.invoice?.payment.paymentPeriod}
    </p>
  );

  const displayStatus = (
    <p className="font-semibold text-navyBlue2">
      {selectedJournal?.invoice?.payment.paymentStatus}
    </p>
  );

  const projectName = selectedJournal?.projectId ? `${selectedJournal.projectId}` : 'None'; // ToDo: (20240527 - Julian) Get project name from somewhere
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

  const displayContract = (
    <p className="font-semibold text-darkBlue">{selectedJournal?.contractId}</p>
  ); // ToDo: (20240527 - Julian) Get contract name from somewhere

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
    .filter((voucher) => !!voucher.debit)
    .map((debit) => AccountingVoucherRowMobile({ type: 'Debit', accountingVoucher: debit }));

  const creditListMobile = accountingVoucher
    .filter((voucher) => !!voucher.credit)
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
    <p className="absolute left-0 text-text-neutral-secondary">AI is working on it...</p>
  ) : askAIResult.length > 0 ? (
    // ToDo: (20240527 - Julian) 串接 API
    <button
      type="button"
      className="rounded-xs bg-badge-surface-soft-primary px-4px py-2px text-badge-text-primary-solid"
    >
      Import data
    </button>
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
