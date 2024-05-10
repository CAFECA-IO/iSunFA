/* eslint-disable */
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { RxCross2 } from 'react-icons/rx';
import { LuTag } from 'react-icons/lu';
import { FiPlus } from 'react-icons/fi';
import { Button } from '../button/button';
import { checkboxStyle } from '../../constants/display';
import { IConfirmModal } from '../../interfaces/confirm_modal';
import AccountingVoucherRow from '../accounting_voucher_row/accounting_voucher_row';
import { useAccountingCtx } from '../../contexts/accounting_context';
import { ISUNFA_ROUTE } from '../../constants/url';
import { timestampToString } from '@/lib/utils/common';
import APIHandler from '@/lib/utils/api_handler';
import { IVoucher } from '@/interfaces/voucher';
import { APIName } from '@/constants/api_connection';
import { AccountProgressStatus, AccountVoucher } from '@/interfaces/account';
//import { ILineItem } from '@/interfaces/line_item';

interface IConfirmModalProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
  confirmModalData: IConfirmModal;
}

const ConfirmModal = ({
  isModalVisible,
  modalVisibilityHandler,
  //confirmModalData,
}: IConfirmModalProps) => {
  const { companyId, voucherId } = useAccountingCtx();

  const {
    isLoading,
    trigger: getVoucherPreview,
    data: voucherPreview,
    success: successGetVoucherPreview,
    error: errorGetVoucherPreview,
  } = APIHandler<IVoucher>(APIName.VOUCHER_GET_PREVIEW_VOUCHER_BY_RESULT_ID, {}, false, false);

  const router = useRouter();

  const [voucherType, setVoucherType] = useState<string>('');
  const [date, setDate] = useState<number>(0);
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
  //const [lineItems, setLineItems] = useState<ILineItem[]>([]);

  useEffect(() => {
    if (successGetVoucherPreview && voucherPreview) {
      setVoucherType(voucherPreview.metadatas[0].voucherType);
      setDate(voucherPreview.metadatas[0].date);
      setReason(voucherPreview.metadatas[0].reason);
      setCompanyName(voucherPreview.metadatas[0].companyName);
      setDescription(voucherPreview.metadatas[0].description);
      setTotalPrice(voucherPreview.metadatas[0].payment.price); // Info Murky Edit (20240509)
      setTaxPercentage(voucherPreview.metadatas[0].payment.taxPercentage); // Info Murky Edit (20240509)
      setFee(voucherPreview.metadatas[0].payment.fee); // Info Murky Edit (20240509)
      setPaymentMethod(voucherPreview.metadatas[0].payment.paymentMethod); // Info Murky Edit (20240509)
      setPaymentPeriod(voucherPreview.metadatas[0].payment.paymentPeriod); // Info Murky Edit (20240509)
      setPaymentStatus(voucherPreview.metadatas[0].payment.paymentStatus); // Info Murky Edit (20240509)
      setProject(voucherPreview.metadatas[0].project);
      setContract(voucherPreview.metadatas[0].contract);
    } else if (!isLoading && voucherId) {
      setTimeout(
        () => {
          getVoucherPreview({
            params: {
              companyId,
              voucherId,
            },
          });
        },
        successGetVoucherPreview ? 0 : 2000
      );
      // TODO: Error handling @Julian (20240509 - Tzuhan)
      console.log(`Failed to get voucher preview: `, errorGetVoucherPreview);
    }
  }, [voucherId, voucherPreview]);

  const { accountingVoucher, addVoucherRowHandler, clearVoucherHandler, totalCredit, totalDebit } =
    useAccountingCtx();

  // ToDo: (20240503 - Julian) Get real journalId from API
  const journalId = `${new Date().getFullYear()}${new Date().getMonth() < 10 ? `0${new Date().getMonth() + 1}` : new Date().getMonth() + 1}${new Date().getDate() < 10 ? `0${new Date().getDate()}` : new Date().getDate()}-001`;

  // ToDo: (20240503 - Julian) 串接 API
  const confirmHandler = () => {
    modalVisibilityHandler(); // Info: (20240503 - Julian) 關閉 Modal
    clearVoucherHandler(); // Info: (20240503 - Julian) 清空 Voucher
    router.push(`${ISUNFA_ROUTE.ACCOUNTING}/${journalId}`); // Info: (20240503 - Julian) 將網址導向至 /user/accounting/[id]
  };

  const disableConfirmButton = totalCredit !== totalDebit;

  const displayType = <p className="text-lightRed">{voucherType}</p>;

  const displayDate = <p>{timestampToString(date).date}</p>;

  const displayReason = (
    <div className="flex flex-col items-center gap-x-12px md:flex-row">
      <p>{reason}</p>
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

  // Info: (20240430 - Julian) Get first letter of each word
  const projectCode = project.split(' ').reduce((acc, word) => acc + word[0], '');
  const displayProject =
    project !== 'None' ? (
      <div className="flex w-fit items-center gap-2px rounded bg-primaryYellow3 px-8px py-2px font-medium text-primaryYellow2">
        <div className="flex h-14px w-14px items-center justify-center rounded-full bg-indigo text-xxs text-white">
          {projectCode}
        </div>
        <p>{project}</p>
      </div>
    ) : (
      <p className="font-semibold text-navyBlue2">None</p>
    );

  const displayContract = <p className="font-semibold text-darkBlue">{contract}</p>;

  const accountingVoucherRow = accountingVoucher.map((voucher) => (
    <AccountingVoucherRow key={voucher.id} accountingVoucher={voucher} />
  ));

  // ToDo: (20240429 - Julian) mobile version
  const displayAccountingVoucher = (
    <div className="flex w-full flex-col gap-24px text-sm text-lightGray5 md:text-base">
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

  const isDisplayModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black bg-opacity-50">
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

          {/* Info: (20240430 - Julian) Add Button */}
          <button
            type="button"
            onClick={addVoucherRowHandler}
            className="mx-auto mt-24px rounded-sm border border-navyBlue2 p-12px hover:border-primaryYellow hover:text-primaryYellow"
          >
            <FiPlus size={20} />
          </button>
          {/* Info: (20240429 - Julian) checkbox */}
          <div className="mt-24px flex flex-wrap justify-between gap-y-4px">
            <p className="font-semibold text-navyBlue2">
              Attention: Saving this voucher means it's permanent on the blockchain. Mistakes can't
              be fixed. You'll need new vouchers to make corrections.
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
          {/* ToDo: (20240429 - Julian) API */}
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
