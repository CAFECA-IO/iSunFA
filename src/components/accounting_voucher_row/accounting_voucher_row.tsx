import { useState, useEffect } from 'react';
import { PiBookOpen } from 'react-icons/pi';
import { RiDeleteBinLine } from 'react-icons/ri';
import useOuterClick from '@/lib/hooks/use_outer_click';
import {
  useAccountingCtx,
  IAccountingVoucher,
  VoucherRowType,
  VoucherString,
  accountTitleMap,
} from '@/contexts/accounting_context';
import { IAccount } from '@/interfaces/accounting_account';
import { useTranslation } from 'next-i18next';
import { FiSearch } from 'react-icons/fi';

interface IAccountingVoucherRow {
  accountingVoucher: IAccountingVoucher;
}

const AccountingVoucherRow = ({ accountingVoucher }: IAccountingVoucherRow) => {
  const { t } = useTranslation('common');
  const { id, account, particulars, debit, credit } = accountingVoucher;
  const {
    accountList,
    generateAccountTitle,
    deleteVoucherRowHandler,
    changeVoucherAccountHandler,
    changeVoucherStringHandler,
    changeVoucherAmountHandler,
  } = useAccountingCtx();

  const [selectAccount, setSelectAccount] = useState<IAccount | null>(account);
  const [tempDebit, setTempDebit] = useState<string>(debit ? debit.toString() : '0');
  const [tempCredit, setTempCredit] = useState<string>(credit ? credit.toString() : '0');

  const [searchValue, setSearchValue] = useState<string>('');
  const [filteredAccountList, setFilteredAccountList] = useState<IAccount[]>(accountList);

  const {
    targetRef: accountingRef,
    componentVisible: isAccountingMenuOpen,
    setComponentVisible: setAccountingMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const accountTitle = generateAccountTitle(selectAccount);

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

  // Info: (20240806 - Julian) search
  const changeSearchHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(event.target.value);
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

  useEffect(() => {
    setSelectAccount(account);
    setTempDebit(debit ? debit.toString() : '0');
    setTempCredit(credit ? credit.toString() : '0');
  }, [account, debit, credit]);

  useEffect(() => {
    const filteredList = accountList.filter((accountItem) => {
      const searchStr = searchValue.toLowerCase();
      return accountItem.code.includes(searchStr) || accountItem.name.includes(searchStr);
    });
    setFilteredAccountList(filteredList);
  }, [searchValue, accountList]);

  useEffect(() => {
    setFilteredAccountList(accountList);
    setSearchValue('');
  }, [isAccountingMenuOpen]);

  // Info: (20240430 - Julian) 顯示 Account 選單
  const displayAccountingDropmenu =
    filteredAccountList.length > 0 ? (
      filteredAccountList.map((accountItem: IAccount) => {
        const title = generateAccountTitle(accountItem);
        const displayTitle = t(accountTitleMap[title]) || t(title);
        // Info: (20240430 - Julian) 點擊選單選項
        const clickHandler = () => {
          setSelectAccount(accountItem);
          changeVoucherAccountHandler(id, accountItem);
          setAccountingMenuOpen(false);
        };

        return (
          <div
            key={title}
            id={`accounting-menu-item-${id}`}
            onClick={clickHandler}
            className="w-full cursor-pointer px-3 py-2 text-navyBlue2 hover:text-primaryYellow"
          >
            {displayTitle}
          </div>
        );
      })
    ) : (
      <div className="text-navyBlue2">{'co result'}</div>
    );

  const displayAccounting = (
    <div
      id={`accounting-menu-${id}`}
      onClick={accountingMenuHandler}
      className={`group relative flex h-46px w-9/10 cursor-pointer ${isAccountingMenuOpen ? 'border-primaryYellow text-primaryYellow' : 'border-lightGray3 text-navyBlue2'} items-center justify-between rounded-xs border bg-input-surface-input-background p-10px hover:border-primaryYellow hover:text-primaryYellow`}
    >
      <div className="line-clamp-2 w-9/10">{t(accountTitle)}</div>
      <PiBookOpen size={20} />
      {/* Info: (20240423 - Julian) Dropmenu */}
      <div
        className={`absolute left-0 top-50px z-10 flex w-full flex-col items-stretch bg-dropdown-surface-menu-background-primary p-8px ${isAccountingMenuOpen ? 'h-250px border-dropdown-stroke-menu opacity-100 shadow-dropmenu' : 'h-0 border-transparent opacity-0'} overflow-hidden rounded-xs border transition-all duration-300 ease-in-out`}
      >
        {/* Info: (20240806 - Julian) search */}
        <div className="my-8px flex w-full items-center justify-between rounded-sm border px-12px py-8px text-darkBlue2">
          <input
            id="search-accounting"
            type="text"
            placeholder={t('AUDIT_REPORT.SEARCH')}
            value={searchValue}
            onChange={changeSearchHandler}
            className="w-full outline-none placeholder:text-lightGray4"
          />
          <FiSearch size={16} />
        </div>
        <div className="px-12px py-8px uppercase text-dropdown-text-head">
          {t('setting:SETTING.ASSETS')}
        </div>
        <div
          ref={accountingRef}
          className="flex max-h-150px flex-col items-stretch overflow-y-auto py-8px"
        >
          {displayAccountingDropmenu}
        </div>
      </div>
    </div>
  );

  const displayParticulars = (
    <input
      id={`particulars-input-${id}`}
      type="text"
      value={particulars ?? ''}
      onChange={changeParticularHandler}
      className={`h-46px w-9/10 rounded-xs border border-lightGray3 bg-input-surface-input-background p-10px text-navyBlue2 outline-none`}
    />
  );

  const displayDebit = (
    <input
      id={`input-debit-${id}`}
      type="number"
      value={tempDebit}
      onChange={changeDebitHandler}
      onFocus={handleDebitFocus}
      onBlur={handleDebitBlur}
      disabled={voucherRowType === VoucherRowType.CREDIT} // Info: (20240430 - Julian) 如果是借方，則不能輸入 credit
      onWheel={(e) => e.currentTarget.blur()} // Info: (20240503 - Julian) 防止滾輪滾動
      className={`h-46px w-9/10 rounded-xs border border-lightGray3 bg-input-surface-input-background p-10px text-navyBlue2 outline-none transition-all duration-300 ease-in-out disabled:bg-lightGray6 disabled:text-lightGray4`}
    />
  );

  const displayCredit = (
    <input
      id={`input-credit-${id}`}
      type="number"
      value={tempCredit}
      onChange={changeCreditHandler}
      onFocus={handleCreditFocus}
      onBlur={handleCreditBlur}
      disabled={voucherRowType === VoucherRowType.DEBIT} // Info: (20240430 - Julian) 如果是貸方，則不能輸入 debit
      onWheel={(e) => e.currentTarget.blur()} // Info: (20240503 - Julian) 防止滾輪滾動
      className={`h-46px w-9/10 rounded-xs border border-lightGray3 bg-input-surface-input-background p-10px text-navyBlue2 outline-none transition-all duration-300 ease-in-out disabled:bg-lightGray6 disabled:text-lightGray4`}
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

export default AccountingVoucherRow;
