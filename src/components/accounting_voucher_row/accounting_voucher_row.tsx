import { useState } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import { RiDeleteBinLine } from 'react-icons/ri';
import useOuterClick from '@/lib/hooks/use_outer_click';
import {
  useAccountingCtx,
  IAccountingVoucher,
  VoucherRowType,
  VoucherString,
} from '@/contexts/accounting_context';
import { IAccount } from '@/interfaces/accounting_account';
import { useTranslation } from 'next-i18next';

// Info: (2024709 - Anna) 定義傳票類型到翻譯鍵值的映射
interface AccountTitleMap {
  [key: string]: string;
}

const accountTitleMap: AccountTitleMap = {
  Income: 'PROJECT.INCOME',
  Payment: 'JOURNAL.PAYMENT',
  Transfer: 'JOURNAL.TRANSFER',
};

interface IAccountingVoucherRow {
  accountingVoucher: IAccountingVoucher;
}

// interface IAccountingVoucherRowMobile {
//   type: 'Debit' | 'Credit';
//   accountingVoucher: IAccountingVoucher;
// }

const AccountingVoucherRow = ({ accountingVoucher }: IAccountingVoucherRow) => {
  const { t } = useTranslation('common');
  const { id, particulars, debit, credit } = accountingVoucher;
  const {
    // accountList,
    generateAccountTitle,
    deleteVoucherRowHandler,
    // changeVoucherAccountHandler,
    changeVoucherStringHandler,
    changeVoucherAmountHandler,
  } = useAccountingCtx();

  // ToDo: (20240711 - Julian) Fix accountList error
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectAccount, setSelectAccount] = useState<IAccount | null>(null);
  const [tempDebit, setTempDebit] = useState<string>(debit ? debit.toString() : '0');
  const [tempCredit, setTempCredit] = useState<string>(credit ? credit.toString() : '0');

  const {
    targetRef: accountingRef,
    componentVisible: isAccountingMenuOpen,
    setComponentVisible: setAccountingMenuOpen,
  } = useOuterClick<HTMLUListElement>(false);

  const accountTitle = accountTitleMap[generateAccountTitle(selectAccount)];

  // Info: (20240430 - Julian) 判斷是借方還是貸方
  const voucherRowType = debit ? VoucherRowType.DEBIT : credit ? VoucherRowType.CREDIT : '';

  // Info: (20240430 - Julian) 選單開關
  const accountingMenuHandler = () => setAccountingMenuOpen(!isAccountingMenuOpen);

  // Info: (20240430 - Julian) 修改 input 的值
  const changeParticularHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    changeVoucherStringHandler(id, event.target.value, VoucherString.PARTICULARS);
  };

  // Info: (20240711 - Julian) 修改借方的值
  const changeDebitHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value: debitValue } = event.target;

    // Info: (20240711 - Julian) 移除開頭零和所有小數點以外的非數字字符，並將值暫存到 tempDebit
    const sanitizedDebit = debitValue.replace(/^0+/, '').replace(/[^0-9.]/g, '');
    setTempDebit(sanitizedDebit);

    // Info: (20240711 - Julian) 回傳 number 類型的值
    const numDebit = Number(sanitizedDebit) || 0;
    changeVoucherAmountHandler(id, numDebit, VoucherRowType.DEBIT);
  };

  // Info: (20240711 - Julian) 輸入 debit 時，如果值為 0，則清空
  const handleDebitFocus = () => {
    if (tempDebit === '0') {
      setTempDebit('');
    }
  };

  // Info: (20240711 - Julian) 離開 debit input 的處理
  const handleDebitBlur = () => {
    // Info: (20240711 - Julian) 如果值為空，則回傳 0
    if (tempDebit === '') {
      setTempDebit('0');
      changeVoucherAmountHandler(id, 0, VoucherRowType.DEBIT);
    } else {
      const numericDebit = parseFloat(tempDebit);
      setTempDebit(numericDebit.toString());
      changeVoucherAmountHandler(id, numericDebit, VoucherRowType.DEBIT);
    }
  };

  // Info: (20240711 - Julian) 修改貸方的值
  const changeCreditHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value: creditValue } = event.target;

    // Info: (20240711 - Julian) 移除開頭零和所有小數點以外的非數字字符，並將值暫存到 tempDebit
    const sanitizedCredit = creditValue.replace(/^0+/, '').replace(/[^0-9.]/g, '');
    setTempCredit(sanitizedCredit);

    // Info: (20240711 - Julian) 回傳 number 類型的值
    const numCredit = Number(sanitizedCredit) || 0;
    changeVoucherAmountHandler(id, numCredit, VoucherRowType.CREDIT);
  };

  // Info: (20240711 - Julian) 輸入 credit 時，如果值為 0，則清空
  const handleCreditFocus = () => {
    if (tempCredit === '0') {
      setTempCredit('');
    }
  };

  // Info: (20240711 - Julian) 離開 credit input 的處理
  const handleCreditBlur = () => {
    // Info: (20240711 - Julian) 如果值為空，則回傳 0
    if (tempCredit === '') {
      setTempCredit('0');
      changeVoucherAmountHandler(id, 0, VoucherRowType.CREDIT);
    } else {
      const numericCredit = parseFloat(tempCredit);
      setTempCredit(numericCredit.toString());
      changeVoucherAmountHandler(id, numericCredit, VoucherRowType.CREDIT);
    }
  };

  // Info: (20240711 - Julian) 刪除該列
  const deleteClickHandler = () => deleteVoucherRowHandler(id);

  // ToDo: (20240711 - Julian) Fix accountList error
  // Info: (20240430 - Julian) 顯示 Account 選單
  const displayAccountingDropmenu = (
    /* accountList ? (
    accountList.map((account: IAccount) => {
      const title = generateAccountTitle(account);

      const accountTitle = accountTitleMap[title] || title;

      // Info: (20240430 - Julian) 點擊選單選項
      const clickHandler = () => {
        setSelectAccount(account);
        changeVoucherAccountHandler(id, account);
        setAccountingMenuOpen(false);
      };

      return (
        <li
          key={title}
          onClick={clickHandler}
          className="w-full cursor-pointer px-3 py-2 text-navyBlue2 hover:text-primaryYellow"
        >
          {t(accountTitle)}
        </li>
      );
    })
  ) :  */ <div>loading...</div>
  );

  const displayAccounting = (
    <div
      id="accountingMenu"
      onClick={accountingMenuHandler}
      className={`group relative flex h-46px w-271px cursor-pointer ${isAccountingMenuOpen ? 'border-primaryYellow text-primaryYellow' : 'border-lightGray3 text-navyBlue2'} items-center justify-between rounded-xs border bg-white p-10px hover:border-primaryYellow hover:text-primaryYellow`}
    >
      <p>{t(accountTitle)}</p>
      <FaChevronDown />
      {/* Info: (20240423 - Julian) Dropmenu */}
      <div
        className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isAccountingMenuOpen ? 'grid-rows-1 border-lightGray3' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-xs border transition-all duration-300 ease-in-out`}
      >
        <ul ref={accountingRef} className="z-10 flex w-full flex-col items-start bg-white p-8px">
          {displayAccountingDropmenu}
        </ul>
      </div>
    </div>
  );

  const displayParticulars = (
    <input
      id="particularsInput"
      name="particularsInput"
      type="text"
      value={particulars ?? ''}
      onChange={changeParticularHandler}
      className={`h-46px w-9/10 rounded-xs border border-lightGray3 bg-white p-10px text-navyBlue2 outline-none`}
    />
  );

  const displayDebit = (
    <input
      id="input-debit"
      name="input-debit"
      type="number"
      value={tempDebit}
      onChange={changeDebitHandler}
      onFocus={handleDebitFocus}
      onBlur={handleDebitBlur}
      disabled={voucherRowType === VoucherRowType.CREDIT} // Info: (20240430 - Julian) 如果是借方，則不能輸入 credit
      onWheel={(e) => e.currentTarget.blur()} // Info: (20240503 - Julian) 防止滾輪滾動
      className={`h-46px w-9/10 rounded-xs border border-lightGray3 bg-white p-10px text-navyBlue2 outline-none transition-all duration-300 ease-in-out disabled:bg-lightGray6 disabled:text-lightGray4`}
    />
  );

  const displayCredit = (
    <input
      id="input-credit"
      name="input-credit"
      type="number"
      value={tempCredit}
      onChange={changeCreditHandler}
      onFocus={handleCreditFocus}
      onBlur={handleCreditBlur}
      disabled={voucherRowType === VoucherRowType.DEBIT} // Info: (20240430 - Julian) 如果是貸方，則不能輸入 debit
      onWheel={(e) => e.currentTarget.blur()} // Info: (20240503 - Julian) 防止滾輪滾動
      className={`h-46px w-9/10 rounded-xs border border-lightGray3 bg-white p-10px text-navyBlue2 outline-none transition-all duration-300 ease-in-out disabled:bg-lightGray6 disabled:text-lightGray4`}
    />
  );

  return (
    <tr>
      {/* Info: (20240429 - Julian) Accounting */}
      <td className="w-1/4 min-w-200px">{displayAccounting}</td>
      {/* Info: (20240429 - Julian) Particulars */}
      <td className="w-1/4 min-w-200px">{displayParticulars}</td>
      {/* Info: (20240429 - Julian) Debit */}
      <td className="w-1/4 min-w-200px">{displayDebit}</td>
      {/* Info: (20240429 - Julian) Credit */}
      <td className="w-1/4 min-w-200px">{displayCredit}</td>
      {/* Info: (20240429 - Julian) Delete Button */}
      <td className="w-50px">
        <button type="button" className="p-12px disabled:hidden" onClick={deleteClickHandler}>
          <RiDeleteBinLine size={24} />
        </button>
      </td>
    </tr>
  );
};

// ToDo: (20240711 - Julian) Fix accountList error
// export const AccountingVoucherRowMobile = ({
//   type,
//   accountingVoucher,
// }: IAccountingVoucherRowMobile) => {
//   const { t } = useTranslation('common');
//   const isDebit = type === 'Debit';

//   const { id, account, particulars, debit, credit } = accountingVoucher;
//   const {
//     accountList,
//     generateAccountTitle,
//     deleteVoucherRowHandler,
//     changeVoucherStringHandler,
//     changeVoucherAmountHandler,
//   } = useAccountingCtx();

//   const selectAccountTitleHandler = (event: React.ChangeEvent<HTMLSelectElement>) => {
//     changeVoucherStringHandler(id, event.target.value, VoucherString.ACCOUNT_TITLE);
//   };

//   const changeParticularMobileHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
//     changeVoucherStringHandler(id, event.target.value, VoucherString.PARTICULARS);
//   };

//   const deleteVoucherRowMobileHandler = () => deleteVoucherRowHandler(id);

//   const changeAmountHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
//     changeVoucherAmountHandler(
//       id,
//       Number(event.target.value),
//       isDebit ? VoucherRowType.DEBIT : VoucherRowType.CREDIT
//     );
//   };

//   const debitAmount = debit ?? 0;
//   const creditAmount = credit ?? 0;

//   const amountTitle = isDebit ? 'Debit' : 'Credit';

//   return (
//     <div key={id} className="flex flex-col gap-y-16px rounded-sm p-20px">
//       {/* Info: (20240508 - Julian) Accounting */}
//       <div className="flex flex-col gap-y-8px">
//         <p className="text-navyBlue2">{t('JOURNAL.ACCOUNTING')}</p>
//         <select
//           id="accountTitleSelectMobile"
//           name="accountTitleSelectMobile"
//           value={generateAccountTitle(account)}
//           onChange={selectAccountTitleHandler}
//           className={`relative flex h-46px w-full cursor-pointer items-center justify-between rounded-xs border border-lightGray3 bg-white p-10px text-navyBlue2 outline-none hover:border-primaryYellow hover:text-primaryYellow hover:outline-none`}
//         >
//           {accountList.map((acc: IAccount) => {
//             const title = generateAccountTitle(acc);
//             return (
//               <option key={title} value={title}>
//                 {/* {title} */}
//                 {t(accountTitleMap[title] || title)}
//               </option>
//             );
//           })}
//         </select>
//       </div>
//       {/* Info: (20240508 - Julian) Particulars */}
//       <div className="flex flex-col gap-y-8px">
//         <p className="text-navyBlue2">{t('JOURNAL.PARTICULARS')}</p>
//         <input
//           id="particularsInputMobile"
//           name="particularsInputMobile"
//           type="text"
//           value={particulars ?? ''}
//           onChange={changeParticularMobileHandler}
//           className={`h-46px rounded-xs border border-lightGray3 bg-white p-10px text-navyBlue2 outline-none`}
//         />
//       </div>
//       {/* Info: (20240508 - Julian) amount */}
//       <div className="flex flex-col gap-y-8px">
//         <p className="text-navyBlue2">{amountTitle}</p>
//         <input
//           id={isDebit ? 'debitInputMobile' : 'creditInputMobile'}
//           name={isDebit ? 'debitInputMobile' : 'creditInputMobile'}
//           type="number"
//           value={isDebit ? debitAmount : creditAmount}
//           onChange={changeAmountHandler}
//           onWheel={(e) => e.currentTarget.blur()} // Info: (20240503 - Julian) 防止滾輪滾動
//           className={`h-46px rounded-xs border border-lightGray3 bg-white p-10px text-navyBlue2 outline-none transition-all duration-300 ease-in-out disabled:bg-lightGray6 disabled:text-lightGray4`}
//         />
//       </div>
//       {/* Info: (20240510 - Julian) Buttons */}
//       <div className="flex items-center justify-center disabled:hidden">
//         <button type="button" onClick={deleteVoucherRowMobileHandler}>
//           <RiDeleteBinLine size={24} />
//         </button>
//       </div>
//     </div>
//   );
// };

export default AccountingVoucherRow;
