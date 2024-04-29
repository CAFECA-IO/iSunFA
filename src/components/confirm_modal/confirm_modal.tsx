/* eslint-disable */
import Image from 'next/image';
import { RxCross2 } from 'react-icons/rx';
import { LuTag } from 'react-icons/lu';
import { FaChevronDown } from 'react-icons/fa';
import { FiPlus } from 'react-icons/fi';
import { RiDeleteBinLine } from 'react-icons/ri';
import useOuterClick from '../../lib/hooks/use_outer_click';
import { Button } from '../button/button';
import { checkboxStyle } from '../../constants/display';

const accountingList = ['1441- Machinery', '1113- Cash in banks'];

interface IConfirmModalProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

const ConfirmModal = ({ isModalVisible, modalVisibilityHandler }: IConfirmModalProps) => {
  const {
    targetRef: accountingRef,
    componentVisible: isAccountingMenuOpen,
    setComponentVisible: setAccountingMenuOpen,
  } = useOuterClick<HTMLUListElement>(false);

  const accountingMenuHandler = () => setAccountingMenuOpen(!isAccountingMenuOpen);

  const displayType = <p className="text-lightRed">Expense</p>;

  const displayReason = (
    <div className="flex flex-col items-center gap-x-12px md:flex-row">
      <p>Equipment</p>
      <div className="flex items-center gap-4px rounded-xs border border-primaryYellow5 px-4px text-sm text-primaryYellow5">
        <LuTag size={14} />
        Printer
      </div>
    </div>
  );

  const displayVendor = <p className="font-semibold text-navyBlue2">華碩雲端股份有限公司</p>;

  const displayDescription = <p className="font-semibold text-navyBlue2">Buy a new printer</p>;

  const displayTotalPrice = (
    <div className="flex flex-col items-end">
      <p>
        <span className="font-semibold text-navyBlue2">30,000</span> TWD
      </p>
      <p>
        (<span className="font-semibold text-navyBlue2">5%</span> Tax /{' '}
        <span className="font-semibold text-navyBlue2">0</span> TWD fee)
      </p>
    </div>
  );

  const displayMethod = (
    <p className="text-right font-semibold text-navyBlue2">Transfer- 004 2888810000824888</p>
  );

  const displayPeriod = <p className="font-semibold text-navyBlue2">Pay at once</p>;

  const displayStatus = <p className="font-semibold text-navyBlue2">Paid</p>;

  const displayProject = (
    <div className="flex w-fit items-center gap-2px rounded bg-primaryYellow3 px-8px py-2px font-medium text-primaryYellow2">
      <div className="flex h-14px w-14px items-center justify-center rounded-full bg-indigo text-xxs text-white">
        BF
      </div>
      <p>BAIFA</p>
    </div>
  );

  const displayContract = <p className="font-semibold text-darkBlue">Contract Name</p>;

  const displayAccountingDropmenu = accountingList.map((reason: string) => {
    return (
      <li
        key={reason}
        className="w-full cursor-pointer px-3 py-2 text-navyBlue2 hover:text-primaryYellow"
      >
        {reason}
      </li>
    );
  });

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
      <div className="rounded-sm bg-lightGray7 p-20px">
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
          <tbody>
            <tr>
              {/* Info: (20240429 - Julian) Accounting */}
              <td className="w-1/4">
                <div
                  id="accountingMenu"
                  onClick={accountingMenuHandler}
                  className={`group relative flex h-46px w-9/10 cursor-pointer ${isAccountingMenuOpen ? 'border-primaryYellow text-primaryYellow' : 'border-lightGray3 text-navyBlue2'} items-center justify-between rounded-xs border bg-white p-10px hover:border-primaryYellow hover:text-primaryYellow`}
                >
                  <p>{accountingList[0]}</p>
                  <FaChevronDown />
                  {/* Info: (20240423 - Julian) Dropmenu */}
                  <div
                    className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isAccountingMenuOpen ? 'grid-rows-1 border-lightGray3' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-xs border transition-all duration-300 ease-in-out`}
                  >
                    <ul
                      ref={accountingRef}
                      className="z-10 flex w-full flex-col items-start bg-white p-8px"
                    >
                      {displayAccountingDropmenu}
                    </ul>
                  </div>
                </div>
              </td>
              {/* Info: (20240429 - Julian) Particulars */}
              <td className="w-1/4">
                <input
                  id="particularsInput"
                  name="particularsInput"
                  type="text"
                  required
                  className={`h-46px w-9/10 rounded-xs border border-lightGray3 bg-white p-10px text-navyBlue2 outline-none`}
                />
              </td>
              {/* Info: (20240429 - Julian) Debit */}
              <td className="w-1/4">
                <input
                  id="debitInput"
                  name="debitInput"
                  type="number"
                  required
                  className={`h-46px w-9/10 rounded-xs border border-lightGray3 bg-white p-10px text-navyBlue2 outline-none`}
                />
              </td>
              {/* Info: (20240429 - Julian) Credit */}
              <td className="w-1/4">
                <input
                  id="creditInput"
                  name="creditInput"
                  type="number"
                  required
                  className={`h-46px w-9/10 rounded-xs border border-lightGray3 bg-white p-10px text-navyBlue2 outline-none`}
                />
              </td>
              {/* Info: (20240429 - Julian) Delete Button */}
              <td className="w-50px">
                <button type="button" className="p-12px">
                  <RiDeleteBinLine size={24} />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  const isDisplayModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative flex max-h-450px w-90vw flex-col rounded-sm bg-white py-16px md:max-h-90vh">
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

        <div className="mt-10px flex flex-col overflow-y-auto overflow-x-hidden bg-lightGray7 px-20px md:bg-white">
          {/* Info: (20240429 - Julian) content */}
          <div className="mt-20px flex w-full flex-col gap-12px text-sm text-lightGray5 md:text-base">
            {/* Info: (20240429 - Julian) Type */}
            <div className="flex items-center justify-between">
              <p>Type</p>
              {displayType}
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

          {/* ToDo: (20240429 - Julian) Add Button */}
          <button
            type="button"
            className="mx-auto mt-24px rounded-sm border border-navyBlue2 p-12px hover:border-primaryYellow hover:text-primaryYellow"
          >
            <FiPlus size={20} />
          </button>

          {/* Info: (20240429 - Julian) checkbox */}
          <div className="mt-24px flex flex-wrap justify-between gap-y-4px">
            <p className="text-lightRed">
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
          <Button type="button" variant="tertiary">
            Confirm
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default ConfirmModal;
