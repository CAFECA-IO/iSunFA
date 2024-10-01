import React, { useState, useEffect, useRef } from 'react';
import { FaPlus } from 'react-icons/fa6';
import { FiBookOpen } from 'react-icons/fi';
import { LuTrash2 } from 'react-icons/lu';
import { Button } from '@/components/button/button';
import { numberWithCommas } from '@/lib/utils/common';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { IAccount } from '@/interfaces/accounting_account';
import useOuterClick from '@/lib/hooks/use_outer_click';

interface ILineItem {
  id: number;
  account: IAccount | null;
  particulars: string;
  debit: number;
  credit: number;
}

const VoucherLineItem = ({
  deleteHandler,
  accountTitleHandler,
  particularsChangeHandler,
  debitChangeHandler,
  creditChangeHandler,
}: {
  deleteHandler: () => void;
  accountTitleHandler: (account: IAccount | null) => void;
  particularsChangeHandler: (particulars: string) => void;
  debitChangeHandler: (debit: number) => void;
  creditChangeHandler: (credit: number) => void;
}) => {
  const { accountList } = useAccountingCtx();

  const [accountTitle, setAccountTitle] = useState<string>('Accounting');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [filteredAccountList, setFilteredAccountList] = useState<IAccount[]>(accountList);

  const [particulars, setParticulars] = useState<string>('');
  const [debitInput, setDebitInput] = useState<string>('');
  const [creditInput, setCreditInput] = useState<string>('');

  const accountInputRef = useRef<HTMLInputElement>(null);

  const {
    targetRef: accountingRef,
    componentVisible: isAccountingMenuOpen,
    setComponentVisible: setAccountingMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: accountRef,
    componentVisible: isAccountEditing,
    setComponentVisible: setIsAccountEditing,
  } = useOuterClick<HTMLDivElement>(false);

  // Info: (20241001 - Julian) 搜尋 Account
  useEffect(() => {
    const filteredList = accountList.filter((account) => {
      // Info: (20241001 - Julian) 編號(數字)搜尋: 字首符合
      if (searchKeyword.match(/^\d+$/)) {
        const codeMatch = account.code.toLowerCase().startsWith(searchKeyword.toLowerCase());
        return codeMatch;
      } else if (searchKeyword !== '') {
        // Info: (20241001 - Julian) 名稱搜尋: 部分符合
        const nameMatch = account.name.toLowerCase().includes(searchKeyword.toLowerCase());
        return nameMatch;
      }
      return true;
    });
    setFilteredAccountList(filteredList);
  }, [searchKeyword, accountList]);

  const isDebitDisabled = creditInput !== '';
  const isCreditDisabled = debitInput !== '';

  const accountSearchHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(e.target.value);
    setAccountingMenuOpen(true);
  };

  const particularsInputChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParticulars(e.target.value);
    particularsChangeHandler(e.target.value);
  };

  const debitInputChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Info: (20241001 - Julian) 限制只能輸入數字
    const debitValue = e.target.value.replace(/\D/g, '');
    // Info: (20241001 - Julian) 加入千分位逗號
    setDebitInput(numberWithCommas(debitValue));
    // Info: (20241001 - Julian) 設定 Debit
    debitChangeHandler(Number(debitValue));
  };

  const creditInputChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Info: (20241001 - Julian) 限制只能輸入數字
    const creditValue = e.target.value.replace(/\D/g, '');
    // Info: (20241001 - Julian) 加入千分位逗號
    setCreditInput(numberWithCommas(creditValue));
    // Info: (20241001 - Julian) 設定 Credit
    creditChangeHandler(Number(creditValue));
  };

  const accountEditingHandler = () => {
    setIsAccountEditing(true);
    setAccountingMenuOpen(true);
    // Info: (20241001 - Julian) Focus on input
    if (accountInputRef.current) {
      accountInputRef.current.focus();
    }
  };

  const accountingMenu =
    filteredAccountList.length > 0 ? (
      filteredAccountList.map((account) => {
        const accountClickHandler = () => {
          setAccountTitle(`${account.code} ${account.name}`);
          // Info: (20241001 - Julian) 關閉 Accounting Menu 和編輯狀態
          setAccountingMenuOpen(false);
          setIsAccountEditing(false);
          // Info: (20241001 - Julian) 重置搜尋關鍵字
          setSearchKeyword('');
          // Info: (20241001 - Julian) 設定 Account title
          accountTitleHandler(account);
        };

        return (
          <button
            key={account.id}
            type="button"
            onClick={accountClickHandler}
            className="flex w-full gap-8px px-12px py-8px text-left text-sm hover:bg-dropdown-surface-menu-background-secondary"
          >
            <p className="text-dropdown-text-primary">{account.code}</p>
            <p className="text-dropdown-text-secondary">{account.name}</p>
          </button>
        );
      })
    ) : (
      <p className="px-12px py-8px text-sm text-input-text-input-placeholder">Loading...</p>
    );

  const displayedAccountingMenu = isAccountingMenuOpen ? (
    <div
      ref={accountingRef}
      className="absolute top-50px z-30 flex w-full flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px shadow-dropmenu"
    >
      <p className="px-12px py-8px text-xs font-semibold uppercase text-dropdown-text-head">
        assets
      </p>
      <div className="flex max-h-100px flex-col overflow-y-auto py-4px">{accountingMenu}</div>
    </div>
  ) : null;

  const isEditAccounting = isAccountEditing ? (
    <input
      ref={accountInputRef}
      value={searchKeyword}
      onChange={accountSearchHandler}
      placeholder="Accounting"
      className="w-full truncate bg-transparent text-input-text-input-filled outline-none"
    />
  ) : (
    <p className="truncate text-input-text-input-filled">{accountTitle}</p>
  );

  return (
    <>
      {/* Info: (20240927 - Julian) Accounting */}
      <div className="relative col-span-3">
        <div
          ref={accountRef}
          onClick={accountEditingHandler}
          className={`flex w-full items-center justify-between rounded-sm border bg-input-surface-input-background px-12px py-10px text-input-text-input-filled outline-none hover:cursor-pointer hover:border-input-stroke-selected ${isAccountingMenuOpen ? 'border-input-stroke-selected' : 'border-input-stroke-input'}`}
        >
          {isEditAccounting}
          <div className="h-20px w-20px">
            <FiBookOpen size={20} />
          </div>
        </div>
        {/* Info: (20241001 - Julian) Accounting Menu */}
        {displayedAccountingMenu}
      </div>
      {/* Info: (20240927 - Julian) Particulars */}
      <input
        value={particulars}
        onChange={particularsInputChangeHandler}
        className="col-span-3 rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-input-text-input-filled outline-none"
      />
      {/* Info: (20240927 - Julian) Debit */}
      <input
        value={debitInput}
        onChange={debitInputChangeHandler}
        placeholder="0"
        disabled={isDebitDisabled}
        className="col-span-3 rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-right text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder disabled:text-input-text-input-placeholder"
      />
      {/* Info: (20240927 - Julian) Credit */}
      <input
        value={creditInput}
        onChange={creditInputChangeHandler}
        placeholder="0"
        disabled={isCreditDisabled}
        className="col-span-3 rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-right text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder disabled:text-input-text-input-placeholder"
      />
      {/* Info: (20240927 - Julian) Delete button */}
      <div className="text-center text-stroke-neutral-invert hover:text-button-text-primary-hover">
        <button type="button" className="p-12px" onClick={deleteHandler}>
          <LuTrash2 size={22} />
        </button>
      </div>
    </>
  );
};

const VoucherLineBlock = () => {
  const [lineItems, setLineItems] = useState<ILineItem[]>([
    // Info: (20241001 - Julian) 初始傳票列
    {
      id: 0,
      account: null,
      particulars: '',
      debit: 0,
      credit: 0,
    },
  ]);

  // ToDo: (20240927 - Julian) Implement total calculation
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [totalCredit, setTotalCredit] = useState<number>(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [totalDebit, setTotalDebit] = useState<number>(0);

  const totalStyle =
    totalCredit === totalDebit ? 'text-text-state-success-invert' : 'text-text-state-error-invert';

  const AddNewVoucherLine = () => {
    // Info: (20241001 - Julian) 取得最後一筆的 ID + 1，如果沒有資料就設定為 0
    const newVoucherId = lineItems.length > 0 ? lineItems[lineItems.length - 1].id + 1 : 0;
    setLineItems([
      ...lineItems,
      {
        id: newVoucherId,
        account: null,
        particulars: '',
        debit: 0,
        credit: 0,
      },
    ]);
  };

  useEffect(() => {
    const debitTotal = lineItems.reduce((acc, item) => acc + item.debit, 0);
    const creditTotal = lineItems.reduce((acc, item) => acc + item.credit, 0);

    setTotalDebit(debitTotal);
    setTotalCredit(creditTotal);
  }, [lineItems]);

  const voucherLines = lineItems.map((lineItem) => {
    // Info: (20241001 - Julian) 複製傳票列
    const duplicateLineItem = { ...lineItem };

    // Info: (20241001 - Julian) 刪除傳票列
    const deleteVoucherLine = () => {
      setLineItems(lineItems.filter((item) => item.id !== lineItem.id));
    };

    // Info: (20241001 - Julian) 設定 Account title
    const accountTitleHandler = (account: IAccount | null) => {
      duplicateLineItem.account = account;
      setLineItems(
        lineItems.map((item) => (item.id === duplicateLineItem.id ? duplicateLineItem : item))
      );
    };

    // Info: (20241001 - Julian) 設定 Particulars
    const particularsChangeHandler = (particulars: string) => {
      duplicateLineItem.particulars = particulars;
      setLineItems(
        lineItems.map((item) => (item.id === duplicateLineItem.id ? duplicateLineItem : item))
      );
    };

    // Info: (20241001 - Julian) 設定 Debit
    const debitChangeHandler = (debit: number) => {
      duplicateLineItem.debit = debit;
      setLineItems(
        lineItems.map((item) => (item.id === duplicateLineItem.id ? duplicateLineItem : item))
      );
    };

    // Info: (20241001 - Julian) 設定 Credit
    const creditChangeHandler = (credit: number) => {
      duplicateLineItem.credit = credit;
      setLineItems(
        lineItems.map((item) => (item.id === duplicateLineItem.id ? duplicateLineItem : item))
      );
    };
    return (
      <VoucherLineItem
        key={lineItem.id}
        deleteHandler={deleteVoucherLine}
        accountTitleHandler={accountTitleHandler}
        particularsChangeHandler={particularsChangeHandler}
        debitChangeHandler={debitChangeHandler}
        creditChangeHandler={creditChangeHandler}
      />
    );
  });

  return (
    <div className="col-span-2">
      {/* Info: (20240927 - Julian) Table */}
      <div className="grid w-full grid-cols-13 gap-24px rounded-md bg-surface-brand-secondary-moderate px-24px py-12px">
        {/* Info: (20240927 - Julian) Table Header */}
        <div className="col-span-3 font-semibold text-text-neutral-invert">Accounting</div>
        <div className="col-span-3 font-semibold text-text-neutral-invert">Particulars</div>
        <div className="col-span-3 font-semibold text-text-neutral-invert">Debit</div>
        <div className="col-span-3 font-semibold text-text-neutral-invert">Credit</div>
        <div className=""></div>

        {/* Info: (20240927 - Julian) Table Body */}
        {voucherLines}

        {/* Info: (20240927 - Julian) Total calculation */}
        {/* Info: (20240927 - Julian) Total Debit */}
        <div className="col-start-7 col-end-10 text-right">
          <p className={totalStyle}>{numberWithCommas(totalDebit)}</p>
        </div>
        {/* Info: (20240927 - Julian) Total Debit */}
        <div className="col-start-11 col-end-13 text-right">
          <p className={totalStyle}>{numberWithCommas(totalCredit)}</p>
        </div>

        {/* Info: (20240927 - Julian) Add button */}
        <div className="col-start-1 col-end-14 text-center">
          <Button type="button" className="h-44px w-44px p-0" onClick={AddNewVoucherLine}>
            <FaPlus size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VoucherLineBlock;
