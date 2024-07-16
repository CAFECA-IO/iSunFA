import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { FaChevronDown } from 'react-icons/fa';
import { RiDeleteBinLine } from 'react-icons/ri';
import {
  useAccountingCtx,
  IAccountingVoucher,
  VoucherRowType,
  VoucherString,
  accountTitleMap,
} from '@/contexts/accounting_context';
import { IAccount } from '@/interfaces/accounting_account';
import useOuterClick from '@/lib/hooks/use_outer_click';

interface IAccountingVoucherRowMobile {
  type: 'Debit' | 'Credit';
  accountingVoucher: IAccountingVoucher;
}

const AccountingVoucherRowMobile = ({ type, accountingVoucher }: IAccountingVoucherRowMobile) => {
  const { t } = useTranslation('common');
  const isDebit = type === 'Debit';

  const { id, account, particulars, debit, credit } = accountingVoucher;
  const {
    accountList,
    generateAccountTitle,
    deleteVoucherRowHandler,
    changeVoucherStringHandler,
    changeVoucherAmountHandler,
    changeVoucherAccountHandler,
  } = useAccountingCtx();

  const {
    targetRef: accountingRef,
    componentVisible: isAccountingMenuOpen,
    setComponentVisible: setAccountingMenuOpen,
  } = useOuterClick<HTMLUListElement>(false);

  const debitAmount = debit ?? 0;
  const creditAmount = credit ?? 0;

  const amountTitle = isDebit ? 'JOURNAL.DEBIT' : 'JOURNAL.CREDIT';
  const amountValue = isDebit ? debitAmount : creditAmount;
  const elementId = isDebit ? 'input-debit-mobile' : 'input-credit-mobile';
  const voucherRowType = isDebit ? VoucherRowType.DEBIT : VoucherRowType.CREDIT;

  const [selectAccount, setSelectAccount] = useState<IAccount | null>(account);
  const [tempAmount, setTempAmount] = useState<string>(amountValue.toString());
  const accountTitle = generateAccountTitle(selectAccount);

  const accountingMenuOpenHandler = () => setAccountingMenuOpen(!isAccountingMenuOpen);

  const changeParticularMobileHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    changeVoucherStringHandler(id, event.target.value, VoucherString.PARTICULARS);
  };

  const deleteVoucherRowMobileHandler = () => deleteVoucherRowHandler(id);

  // Info: (20240711 - Julian) 修改輸入的值
  const changeAmountHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;

    // Info: (20240711 - Julian) 移除開頭零和所有小數點以外的非數字字符，並將值暫存到 tempAmount
    const sanitizedValue = value.replace(/^0+/, '').replace(/[^0-9.]/g, '');
    setTempAmount(sanitizedValue);

    // Info: (20240711 - Julian) 回傳 number 類型的值
    const numValue = Number(sanitizedValue) || 0;
    changeVoucherAmountHandler(id, numValue, voucherRowType);
  };

  // Info: (20240711 - Julian) 輸入時，如果值為 0，則清空
  const handleInputFocus = () => {
    if (tempAmount === '0') {
      setTempAmount('');
    }
  };

  // Info: (20240711 - Julian) 離開 input 的處理
  const handleInputBlur = () => {
    // Info: (20240711 - Julian) 如果值為空，則回傳 0
    if (tempAmount === '') {
      setTempAmount('0');
      changeVoucherAmountHandler(id, 0, voucherRowType);
    } else {
      const numericValue = Number(tempAmount) || 0;
      setTempAmount(numericValue.toString());
      changeVoucherAmountHandler(id, numericValue, voucherRowType);
    }
  };

  // Info: (20240712 - Julian) 顯示 Account 選單
  const displayAccountingDropmenu =
    accountList.length > 0 ? (
      accountList.map((acc: IAccount) => {
        const title = generateAccountTitle(acc);

        const displayTitle = accountTitleMap[title] || title; // ToDo: (20240712 - Julian) Translate account title

        // Info: (20240712 - Julian) 點擊選單選項
        const clickHandler = () => {
          setSelectAccount(acc);
          changeVoucherAccountHandler(id, acc);
          setAccountingMenuOpen(false);
        };

        return (
          <li
            key={title}
            id={`accounting-menu-item-${id}`}
            onClick={clickHandler}
            className="w-full cursor-pointer px-3 py-2 text-navyBlue2 hover:text-primaryYellow"
          >
            {displayTitle}
          </li>
        );
      })
    ) : (
      <div>loading...</div>
    );

  const displayAccounting = (
    <div
      id={`accounting-menu-${id}`}
      onClick={accountingMenuOpenHandler}
      className={`group relative flex h-46px w-full cursor-pointer ${isAccountingMenuOpen ? 'border-primaryYellow text-primaryYellow' : 'border-lightGray3 text-navyBlue2'} items-center justify-between rounded-xs border bg-white p-10px hover:border-primaryYellow hover:text-primaryYellow`}
    >
      <p>{t(accountTitle)}</p>
      <FaChevronDown />
      {/* Info: (20240423 - Julian) Dropmenu */}
      <div
        className={`absolute left-0 top-50px w-full overflow-y-auto shadow-dropmenu
        ${isAccountingMenuOpen ? 'h-200px border-lightGray3' : 'h-0 border-transparent'} 
        overflow-hidden rounded-xs border transition-all duration-300 ease-in-out`}
      >
        <ul ref={accountingRef} className="z-10 flex w-full flex-col items-start bg-white p-8px">
          {displayAccountingDropmenu}
        </ul>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-y-16px rounded-sm p-20px">
      {/* Info: (20240508 - Julian) Accounting */}
      <div className="flex flex-col gap-y-8px">
        <p className="text-navyBlue2">{t('JOURNAL.ACCOUNTING')}</p>
        {displayAccounting}
      </div>
      {/* Info: (20240508 - Julian) Particulars */}
      <div className="flex flex-col gap-y-8px">
        <p className="text-navyBlue2">{t('JOURNAL.PARTICULARS')}</p>
        <input
          id={`input-particulars-mobile-${id}`}
          type="text"
          value={particulars ?? ''}
          onChange={changeParticularMobileHandler}
          className={`h-46px rounded-xs border border-lightGray3 bg-white p-10px text-navyBlue2 outline-none`}
        />
      </div>
      {/* Info: (20240508 - Julian) amount */}
      <div className="flex flex-col gap-y-8px">
        <p className="text-navyBlue2">{t(amountTitle)}</p>
        <input
          id={`${elementId}-${id}`}
          type="number"
          value={tempAmount}
          onChange={changeAmountHandler}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onWheel={(e) => e.currentTarget.blur()} // Info: (20240503 - Julian) 防止滾輪滾動
          className={`h-46px w-full rounded-xs border border-lightGray3 bg-white p-10px text-navyBlue2 outline-none transition-all duration-300 ease-in-out disabled:bg-lightGray6 disabled:text-lightGray4`}
        />
      </div>
      {/* Info: (20240510 - Julian) Buttons */}
      <div className="flex items-center justify-center disabled:hidden">
        <button type="button" onClick={deleteVoucherRowMobileHandler}>
          <RiDeleteBinLine size={24} />
        </button>
      </div>
    </div>
  );
};

export default AccountingVoucherRowMobile;
