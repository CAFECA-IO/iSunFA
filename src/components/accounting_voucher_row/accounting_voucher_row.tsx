import { useState } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import { RiDeleteBinLine } from 'react-icons/ri';
import useOuterClick from '../../lib/hooks/use_outer_click';
import {
  useAccountingCtx,
  IAccountingVoucher,
  VoucherRowType,
  VoucherString,
} from '../../contexts/accounting_context';

const accountingList = ['1441- Machinery', '1113- Cash in banks'];

interface IAccountingVoucherRow {
  accountingVoucher: IAccountingVoucher;
}

interface IAccountingVoucherRowMobile {
  type: 'Debit' | 'Credit';
  accountingVoucher: IAccountingVoucher;
}

const AccountingVoucherRow = ({ accountingVoucher }: IAccountingVoucherRow) => {
  const { id, particulars, debit, credit } = accountingVoucher;
  const { deleteVoucherRowHandler, changeVoucherStringHandler, changeVoucherAmountHandler } =
    useAccountingCtx();

  const [selectAccountTitle, setSelectAccountTitle] = useState<string>(accountingList[0]);

  const {
    targetRef: accountingRef,
    componentVisible: isAccountingMenuOpen,
    setComponentVisible: setAccountingMenuOpen,
  } = useOuterClick<HTMLUListElement>(false);

  // Info: (20240430 - Julian) 判斷是借方還是貸方
  const voucherRowType = debit ? VoucherRowType.DEBIT : credit ? VoucherRowType.CREDIT : '';

  // Info: (20240430 - Julian) 選單開關
  const accountingMenuHandler = () => setAccountingMenuOpen(!isAccountingMenuOpen);

  // Info: (20240430 - Julian) 修改 input 的值
  const changeParticularHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    changeVoucherStringHandler(id, event.target.value, VoucherString.PARTICULARS);
  };
  const changeDebitHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    changeVoucherAmountHandler(id, Number(event.target.value), VoucherRowType.DEBIT);
  };
  const changeCreditHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    changeVoucherAmountHandler(id, Number(event.target.value), VoucherRowType.CREDIT);
  };
  const deleteClickHandler = () => deleteVoucherRowHandler(id);

  const displayAccountingDropmenu = accountingList.map((title: string) => {
    // Info: (20240430 - Julian) 點擊選單選項
    const clickHandler = () => {
      setSelectAccountTitle(title);
      changeVoucherStringHandler(id, title, VoucherString.ACCOUNT_TITLE);
      setAccountingMenuOpen(false);
    };

    return (
      <li
        key={title}
        onClick={clickHandler}
        className="w-full cursor-pointer px-3 py-2 text-navyBlue2 hover:text-primaryYellow"
      >
        {title}
      </li>
    );
  });

  return (
    <tr>
      {/* Info: (20240429 - Julian) Accounting */}
      <td className="w-1/4 min-w-200px">
        <div
          id="accountingMenu"
          onClick={accountingMenuHandler}
          className={`group relative flex h-46px w-271px cursor-pointer ${isAccountingMenuOpen ? 'border-primaryYellow text-primaryYellow' : 'border-lightGray3 text-navyBlue2'} items-center justify-between rounded-xs border bg-white p-10px hover:border-primaryYellow hover:text-primaryYellow`}
        >
          <p>{selectAccountTitle}</p>
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
      <td className="w-1/4 min-w-200px">
        <input
          id="particularsInput"
          name="particularsInput"
          type="text"
          value={particulars ?? ''}
          onChange={changeParticularHandler}
          className={`h-46px w-9/10 rounded-xs border border-lightGray3 bg-white p-10px text-navyBlue2 outline-none`}
        />
      </td>
      {/* Info: (20240429 - Julian) Debit */}
      <td className="w-1/4 min-w-200px">
        <input
          id="debitInput"
          name="debitInput"
          type="number"
          value={debit ?? ''}
          onChange={changeDebitHandler}
          disabled={voucherRowType === VoucherRowType.CREDIT} // Info: (20240430 - Julian) 如果是借方，則不能輸入 credit
          onWheel={(e) => e.currentTarget.blur()} // Info: (20240503 - Julian) 防止滾輪滾動
          className={`h-46px w-9/10 rounded-xs border border-lightGray3 bg-white p-10px text-navyBlue2 outline-none transition-all duration-300 ease-in-out disabled:bg-lightGray6 disabled:text-lightGray4`}
        />
      </td>
      {/* Info: (20240429 - Julian) Credit */}
      <td className="w-1/4 min-w-200px">
        <input
          id="creditInput"
          name="creditInput"
          type="number"
          value={credit ?? ''}
          disabled={voucherRowType === VoucherRowType.DEBIT} // Info: (20240430 - Julian) 如果是貸方，則不能輸入 debit
          onChange={changeCreditHandler}
          onWheel={(e) => e.currentTarget.blur()} // Info: (20240503 - Julian) 防止滾輪滾動
          className={`h-46px w-9/10 rounded-xs border border-lightGray3 bg-white p-10px text-navyBlue2 outline-none transition-all duration-300 ease-in-out disabled:bg-lightGray6 disabled:text-lightGray4`}
        />
      </td>
      {/* Info: (20240429 - Julian) Delete Button */}
      <td className="w-50px">
        <button type="button" className="p-12px" onClick={deleteClickHandler}>
          <RiDeleteBinLine size={24} />
        </button>
      </td>
    </tr>
  );
};

export const AccountingVoucherRowMobile = ({
  type,
  accountingVoucher,
}: IAccountingVoucherRowMobile) => {
  const isDebit = type === 'Debit';

  const { id, accountTitle, particulars, debit, credit } = accountingVoucher;
  const { deleteVoucherRowHandler, changeVoucherStringHandler, changeVoucherAmountHandler } =
    useAccountingCtx();

  const selectAccountTitleHandler = (event: React.ChangeEvent<HTMLSelectElement>) => {
    changeVoucherStringHandler(id, event.target.value, VoucherString.ACCOUNT_TITLE);
  };

  const changeParticularMobileHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    changeVoucherStringHandler(id, event.target.value, VoucherString.PARTICULARS);
  };

  const changeAmountHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    changeVoucherAmountHandler(
      id,
      Number(event.target.value),
      isDebit ? VoucherRowType.DEBIT : VoucherRowType.CREDIT
    );
  };

  const debitAmount = debit ?? 0;
  const creditAmount = credit ?? 0;

  const amountTitle = isDebit ? 'Debit' : 'Credit';

  return (
    <div key={id} className="flex flex-col gap-y-16px rounded-sm p-20px">
      {/* Info: (20240508 - Julian) Accounting */}
      <div className="flex flex-col gap-y-8px">
        <p className="text-navyBlue2">Accounting</p>
        <select
          id="accountTitleSelectMobile"
          name="accountTitleSelectMobile"
          value={accountTitle}
          onChange={selectAccountTitleHandler}
          className={`relative flex h-46px w-full cursor-pointer items-center justify-between rounded-xs border border-lightGray3 bg-white p-10px text-navyBlue2 outline-none hover:border-primaryYellow hover:text-primaryYellow hover:outline-none`}
        >
          {accountingList.map((title: string) => (
            <option key={title} value={title}>
              {title}
            </option>
          ))}
        </select>
      </div>
      {/* Info: (20240508 - Julian) Particulars */}
      <div className="flex flex-col gap-y-8px">
        <p className="text-navyBlue2">Particulars</p>
        <input
          id="particularsInputMobile"
          name="particularsInputMobile"
          type="text"
          value={particulars ?? ''}
          onChange={changeParticularMobileHandler}
          className={`h-46px rounded-xs border border-lightGray3 bg-white p-10px text-navyBlue2 outline-none`}
        />
      </div>
      {/* Info: (20240508 - Julian) amount */}
      <div className="flex flex-col gap-y-8px">
        <p className="text-navyBlue2">{amountTitle}</p>
        <input
          id={isDebit ? 'debitInputMobile' : 'creditInputMobile'}
          name={isDebit ? 'debitInputMobile' : 'creditInputMobile'}
          type="number"
          value={isDebit ? debitAmount : creditAmount}
          onChange={changeAmountHandler}
          onWheel={(e) => e.currentTarget.blur()} // Info: (20240503 - Julian) 防止滾輪滾動
          className={`h-46px rounded-xs border border-lightGray3 bg-white p-10px text-navyBlue2 outline-none transition-all duration-300 ease-in-out disabled:bg-lightGray6 disabled:text-lightGray4`}
        />
      </div>
      {/* Info: (20240510 - Julian) Buttons */}
      <div className="flex items-center justify-center">
        <button type="button" onClick={() => deleteVoucherRowHandler(id)}>
          <RiDeleteBinLine size={24} />
        </button>
      </div>
    </div>
  );
};

export default AccountingVoucherRow;
