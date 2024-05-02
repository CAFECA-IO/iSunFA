import { useState } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import { RiDeleteBinLine } from 'react-icons/ri';
import useOuterClick from '../../lib/hooks/use_outer_click';
import {
  useAccountingCtx,
  IAccountingVoucher,
  VoucherType,
  VoucherString,
} from '../../contexts/accounting_context';

const accountingList = ['1441- Machinery', '1113- Cash in banks'];

interface IAccountingVoucherRow {
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
  const voucherRowType = debit ? VoucherType.DEBIT : credit ? VoucherType.CREDIT : '';

  // Info: (20240430 - Julian) 選單開關
  const accountingMenuHandler = () => setAccountingMenuOpen(!isAccountingMenuOpen);

  // Info: (20240430 - Julian) 修改 input 的值
  const changeParticularHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    changeVoucherStringHandler(id, event.target.value, VoucherString.PARTICULARS);
  };
  const changeDebitHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    changeVoucherAmountHandler(id, Number(event.target.value), VoucherType.DEBIT);
  };
  const changeCreditHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    changeVoucherAmountHandler(id, Number(event.target.value), VoucherType.CREDIT);
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
      <td className="w-1/4">
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
      <td className="w-1/4">
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
      <td className="w-1/4">
        <input
          id="debitInput"
          name="debitInput"
          type="number"
          value={debit ?? ''}
          onChange={changeDebitHandler}
          disabled={voucherRowType === VoucherType.CREDIT} // Info: (20240430 - Julian) 如果是借方，則不能輸入 credit
          className={`h-46px w-9/10 rounded-xs border border-lightGray3 bg-white p-10px text-navyBlue2 outline-none transition-all duration-300 ease-in-out disabled:bg-lightGray6 disabled:text-lightGray4`}
        />
      </td>
      {/* Info: (20240429 - Julian) Credit */}
      <td className="w-1/4">
        <input
          id="creditInput"
          name="creditInput"
          type="number"
          value={credit ?? ''}
          disabled={voucherRowType === VoucherType.DEBIT} // Info: (20240430 - Julian) 如果是貸方，則不能輸入 debit
          onChange={changeCreditHandler}
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

export default AccountingVoucherRow;
