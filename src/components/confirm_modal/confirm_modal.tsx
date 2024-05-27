import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { RxCross2 } from 'react-icons/rx';
import { LuTag } from 'react-icons/lu';
import { FiPlus } from 'react-icons/fi';
import { timestampToString } from '@/lib/utils/common';
import APIHandler from '@/lib/utils/api_handler';
import { IVoucher } from '@/interfaces/voucher';
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

// ToDo: (20240527 - Julian) loading 暫時用這個代替
const tempLoadingSkeleton = (
  <div className="block h-20px w-100px animate-pulse rounded-xs bg-input-stroke-input" />
);

const ConfirmModal = ({
  isModalVisible,
  modalVisibilityHandler,
  // confirmModalData,
}: IConfirmModalProps) => {
  const { companyId, voucherPreview } = useAccountingCtx();
  const { messageModalVisibilityHandler, messageModalDataHandler } = useGlobalCtx();

  const {
    trigger: uploadJournal,
    data: journal,
    success: uploadSuccess,
    code: uploadCode,
    // error: uploadError,
  } = APIHandler<IJournal>(
    APIName.VOUCHER_GENERATE,
    {
      params: { companyId },
    },
    false,
    false
  );

  const router = useRouter();

  const isLoading = !voucherPreview;

  const [isAskAILoading, setIsAskAILoading] = useState<boolean>(true);
  const [askAIResult, setAskAIResult] = useState<ILineItem[]>([]);

  useEffect(() => {
    const result = [
      {
        lineItemIndex: '1',
        account: 'Salary',
        debit: true,
        amount: 1000,
        description: 'Salary for May',
      },
      {
        lineItemIndex: '2',
        account: 'Rent',
        debit: false,
        amount: 200,
        description: 'Rent for May',
      },
    ];

    setTimeout(() => {
      // 隨機回傳 result 或 []
      if (Math.random() > 0.5) {
        setAskAIResult(result);
      } else {
        setAskAIResult([]);
      }
      setIsAskAILoading(false);
    }, 7000);
  }, []);

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
  // const [lineItems, setLineItems] = useState<ILineItem[]>([]);

  // useEffect(() => {
  //   if (voucherPreview) {
  //     setVoucherType(voucherPreview.metadatas[0].voucherType);
  //     setDate(voucherPreview.metadatas[0].date);
  //     setReason(voucherPreview.metadatas[0].reason);
  //     setCompanyName(voucherPreview.metadatas[0].companyName);
  //     setDescription(voucherPreview.metadatas[0].description);
  //     setTotalPrice(voucherPreview.metadatas[0].payment.price);
  //     setTaxPercentage(voucherPreview.metadatas[0].payment.taxPercentage);
  //     setFee(voucherPreview.metadatas[0].payment.fee);
  //     setPaymentMethod(voucherPreview.metadatas[0].payment.paymentMethod);
  //     setPaymentPeriod(voucherPreview.metadatas[0].payment.paymentPeriod);
  //     setPaymentStatus(voucherPreview.metadatas[0].payment.paymentStatus);
  //     setProject(voucherPreview.metadatas[0].project);
  //     setContract(voucherPreview.metadatas[0].contract);
  //   }
  // }, [voucherPreview]);

  const { accountingVoucher, addVoucherRowHandler, clearVoucherHandler, totalCredit, totalDebit } =
    useAccountingCtx();

  // ToDo: (20240503 - Julian) 串接 API
  const confirmHandler = () => {
    if (!isLoading) {
      const voucher: IVoucher = {
        voucherIndex: voucherPreview.voucherIndex,
        invoiceIndex: voucherPreview.invoiceIndex,
        metadatas: [
          {
            date: voucherPreview.metadatas[0].date,
            voucherType: voucherPreview.metadatas[0].voucherType,
            companyId: voucherPreview.metadatas[0].companyId,
            companyName: voucherPreview.metadatas[0].companyName,
            description: voucherPreview.metadatas[0].description,
            reason: voucherPreview.metadatas[0].reason,
            projectId: voucherPreview.metadatas[0].projectId,
            project: voucherPreview.metadatas[0].project,
            contractId: voucherPreview.metadatas[0].contractId,
            contract: voucherPreview.metadatas[0].contract,
            payment: { ...voucherPreview.metadatas[0].payment }, // TODO: replace with user Input @Julian (20240515 - tzuhan)
          },
        ],
        lineItems: voucherPreview.lineItems, // TODO: replace with user Input @Julian (20240515 - tzuhan)
      };
      uploadJournal({ body: { voucher } });
    }
    // TODO: 等待 API 回傳結果時，顯示 Loading 畫面 @Julian (20240510 - tzuhan)
  };

  const addRowHandler = () => addVoucherRowHandler();
  const addDebitRowHandler = () => addVoucherRowHandler(VoucherRowType.DEBIT);
  const addCreditRowHandler = () => addVoucherRowHandler(VoucherRowType.CREDIT);

  useEffect(() => {
    if (uploadSuccess && journal) {
      modalVisibilityHandler(); // Info: (20240503 - Julian) 關閉 Modal
      clearVoucherHandler(); // Info: (20240503 - Julian) 清空 Voucher
      router.push(`${ISUNFA_ROUTE.ACCOUNTING}/${journal.id}`); // Info: (20240503 - Julian) 將網址導向至 /user/accounting/[id]
    }
    if (uploadSuccess === false) {
      // TODO: Error handling @Julian (20240510 - Tzuhan)
      // eslint-disable-next-line no-console
      // console.log(`Failed to generate voucher: `, uploadCode, `error: `, uploadError);
      messageModalDataHandler({
        messageType: MessageType.ERROR,
        title: 'Generate voucher failed',
        subMsg: 'Please try again later',
        content: `Error code: ${uploadCode}`,
        submitBtnStr: 'Close',
        submitBtnFunction: messageModalVisibilityHandler,
      });
      messageModalVisibilityHandler();
    }
  }, [uploadSuccess]);

  const disableConfirmButton = totalCredit !== totalDebit;

  const displayType = !isLoading ? (
    <p className="text-lightRed">{voucherPreview.metadatas[0].companyId}</p>
  ) : (
    tempLoadingSkeleton
  );

  const displayDate = !isLoading ? (
    <p>{timestampToString(voucherPreview.metadatas[0].date).date}</p>
  ) : (
    tempLoadingSkeleton
  );

  const displayReason = !isLoading ? (
    <div className="flex flex-col items-center gap-x-12px md:flex-row">
      <p>{voucherPreview.metadatas[0].reason}</p>
      <div className="flex items-center gap-4px rounded-xs border border-primaryYellow5 px-4px text-sm text-primaryYellow5">
        <LuTag size={14} />
        Printer
      </div>
    </div>
  ) : (
    tempLoadingSkeleton
  );

  const displayVendor = !isLoading ? (
    <p className="font-semibold text-navyBlue2">{voucherPreview.metadatas[0].companyName}</p>
  ) : (
    tempLoadingSkeleton
  );

  const displayDescription = !isLoading ? (
    <p className="font-semibold text-navyBlue2">{voucherPreview.metadatas[0].description}</p>
  ) : (
    tempLoadingSkeleton
  );

  const displayTotalPrice = !isLoading ? (
    <div className="flex flex-col items-end">
      <p>
        <span className="font-semibold text-navyBlue2">
          {voucherPreview.metadatas[0].payment.price}
        </span>{' '}
        TWD
      </p>
      <p>
        (
        <span className="font-semibold text-navyBlue2">
          {voucherPreview.metadatas[0].payment.taxPercentage}%
        </span>{' '}
        Tax /{' '}
        <span className="font-semibold text-navyBlue2">
          {voucherPreview.metadatas[0].payment.fee}
        </span>{' '}
        TWD fee)
      </p>
    </div>
  ) : (
    tempLoadingSkeleton
  );

  const displayMethod = !isLoading ? (
    <p className="text-right font-semibold text-navyBlue2">
      {voucherPreview.metadatas[0].payment.paymentMethod}
    </p>
  ) : (
    tempLoadingSkeleton
  );

  const displayPeriod = !isLoading ? (
    <p className="font-semibold text-navyBlue2">
      {voucherPreview.metadatas[0].payment.paymentPeriod}
    </p>
  ) : (
    tempLoadingSkeleton
  );

  const displayStatus = !isLoading ? (
    <p className="font-semibold text-navyBlue2">
      {voucherPreview.metadatas[0].payment.paymentStatus}
    </p>
  ) : (
    tempLoadingSkeleton
  );

  const projectName = !isLoading ? voucherPreview.metadatas[0].project : '';
  // Info: (20240430 - Julian) Get first letter of each word
  const projectCode = projectName.split(' ').reduce((acc, word) => acc + word[0], '');

  const displayProject =
    projectName !== 'None' ? (
      !isLoading ? (
        <div className="flex w-fit items-center gap-2px rounded bg-primaryYellow3 px-8px py-2px font-medium text-primaryYellow2">
          <div className="flex h-14px w-14px items-center justify-center rounded-full bg-indigo text-xxs text-white">
            {projectCode}
          </div>
          <p>{projectName}</p>
        </div>
      ) : (
        tempLoadingSkeleton
      )
    ) : (
      <p className="font-semibold text-navyBlue2">None</p>
    );

  const displayContract = !isLoading ? (
    <p className="font-semibold text-darkBlue">{voucherPreview.metadatas[0].contract}</p>
  ) : (
    tempLoadingSkeleton
  );

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
