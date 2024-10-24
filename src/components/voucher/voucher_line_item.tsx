import React, { useState, useEffect, useRef } from 'react';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { useTranslation } from 'next-i18next';
import { LuTrash2 } from 'react-icons/lu';
import { FiBookOpen } from 'react-icons/fi';
import { AccountType } from '@/constants/account';
import { IAccount, IPaginatedAccount } from '@/interfaces/accounting_account';
import { numberWithCommas } from '@/lib/utils/common';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';

interface IVoucherLineItemProps {
  flagOfClear: boolean;
  flagOfSubmit: boolean;
  accountIsNull: boolean;
  amountNotEqual: boolean;
  amountIsZero: boolean;
  deleteHandler: () => void;
  accountTitleHandler: (account: IAccount | null) => void;
  particularsChangeHandler: (particulars: string) => void;
  debitChangeHandler: (debit: number) => void;
  creditChangeHandler: (credit: number) => void;
}

const VoucherLineItem: React.FC<IVoucherLineItemProps> = ({
  flagOfClear,
  flagOfSubmit,
  accountIsNull,
  amountNotEqual,
  amountIsZero,
  deleteHandler,
  accountTitleHandler,
  particularsChangeHandler,
  debitChangeHandler,
  creditChangeHandler,
}) => {
  const { t } = useTranslation('common');

  const inputStyle = {
    NORMAL:
      'border-input-stroke-input text-input-text-input-filled placeholder:text-input-text-input-placeholder disabled:text-input-text-input-placeholder',
    ERROR:
      'border-input-text-error text-input-text-error placeholder:text-input-text-error disabled:text-input-text-error',
  };

  const queryCondition = {
    limit: 100, // Info: (20241018 - Julian) 限制每次取出 100 筆
    forUser: true,
    sortBy: 'code', // Info: (20241018 - Julian) 依 code 排序
    sortOrder: 'asc',
  };

  const { trigger: getAccountList, data: accountTitleList } = APIHandler<IPaginatedAccount>(
    APIName.ACCOUNT_LIST,
    {
      params: {
        companyId: 1,
      },
      query: queryCondition,
    },
    false,
    true
  );

  // Info: (20241007 - Julian) Account state
  const [accountTitle, setAccountTitle] = useState<string>(
    t('journal:ADD_NEW_VOUCHER.SELECT_ACCOUNTING')
  );
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [accountList, setAccountList] = useState<IAccount[]>([]);

  // Info: (20241007 - Julian) input state
  const [particulars, setParticulars] = useState<string>('');
  const [debitInput, setDebitInput] = useState<string>('');
  const [creditInput, setCreditInput] = useState<string>('');

  // Info: (20241007 - Julian) input style
  const [accountStyle, setAccountStyle] = useState<string>(inputStyle.NORMAL);
  const [amountStyle, setAmountStyle] = useState<string>(inputStyle.NORMAL);

  const accountInputRef = useRef<HTMLInputElement>(null);

  // Info: (20241001 - Julian) Accounting 下拉選單
  const {
    targetRef: accountingRef,
    componentVisible: isAccountingMenuOpen,
    setComponentVisible: setAccountingMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  // Info: (20241001 - Julian) Account 編輯狀態
  const {
    targetRef: accountRef,
    componentVisible: isAccountEditing,
    setComponentVisible: setIsAccountEditing,
  } = useOuterClick<HTMLDivElement>(false);

  useEffect(() => {
    getAccountList({
      query: {
        ...queryCondition,
        searchKey: searchKeyword, // Info: (20241018 - Julian) 搜尋關鍵字
      },
    });
  }, [searchKeyword]);

  useEffect(() => {
    if (accountTitleList) {
      setAccountList(accountTitleList.data);
    }
  }, [accountTitleList]);

  useEffect(() => {
    // Info: (20241004 - Julian) 查詢會計科目關鍵字時聚焦
    if (isAccountEditing && accountInputRef.current) {
      accountInputRef.current.focus();
    }

    // Info: (20241001 - Julian) 查詢模式關閉後清除搜尋關鍵字
    if (!isAccountEditing) {
      setSearchKeyword('');
    }
  }, [isAccountEditing]);

  useEffect(() => {
    // Info: (20241004 - Julian) Reset All State
    setAccountTitle(t('journal:ADD_NEW_VOUCHER.SELECT_ACCOUNTING'));
    setParticulars('');
    setDebitInput('');
    setCreditInput('');
  }, [flagOfClear]);

  useEffect(() => {
    // Info: (20241007 - Julian) 檢查是否填入會計科目
    setAccountStyle(
      accountIsNull &&
        (accountTitle === t('journal:ADD_NEW_VOUCHER.SELECT_ACCOUNTING') || accountTitle === '')
        ? inputStyle.ERROR
        : inputStyle.NORMAL
    );
    setAmountStyle(
      // Info: (20241007 - Julian) 檢查借貸金額是否為零
      (amountIsZero && (debitInput === '' || creditInput === '')) ||
        // Info: (20241007 - Julian) 檢查借貸金額是否相等
        amountNotEqual
        ? inputStyle.ERROR
        : inputStyle.NORMAL
    );
  }, [flagOfSubmit]);

  useEffect(() => {
    // Info: (20241007 - Julian) 修改會計科目時，樣式改回 NORMAL
    setAccountStyle(inputStyle.NORMAL);
  }, [accountTitle]);

  useEffect(() => {
    // Info: (20241007 - Julian) 修改借貸金額時，樣式改回 NORMAL
    setAmountStyle(inputStyle.NORMAL);
  }, [debitInput, creditInput]);

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
    // Info: (20241001 - Julian) 限制只能輸入數字，並去掉開頭 0
    const debitValue = e.target.value.replace(/\D/g, '').replace(/^0+/, '');
    // Info: (20241001 - Julian) 加入千分位逗號
    setDebitInput(numberWithCommas(debitValue));
    // Info: (20241001 - Julian) 設定 Debit
    debitChangeHandler(Number(debitValue));
  };

  const creditInputChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Info: (20241001 - Julian) 限制只能輸入數字，並去掉開頭 0
    const creditValue = e.target.value.replace(/\D/g, '').replace(/^0+/, '');
    // Info: (20241001 - Julian) 加入千分位逗號
    setCreditInput(numberWithCommas(creditValue));
    // Info: (20241001 - Julian) 設定 Credit
    creditChangeHandler(Number(creditValue));
  };

  const accountEditingHandler = () => {
    setIsAccountEditing(true);
    setAccountingMenuOpen(true);
  };

  // Info: (20241004 - Julian) Remove AccountType.OTHER_COMPREHENSIVE_INCOME, AccountType.CASH_FLOW, AccountType.OTHER
  const accountTypeList = Object.values(AccountType).filter(
    (value) =>
      value !== AccountType.OTHER_COMPREHENSIVE_INCOME &&
      value !== AccountType.CASH_FLOW &&
      value !== AccountType.OTHER
  );

  const accountTitleMenu = accountTypeList.map((value) => {
    // Info: (20241004 - Julian) 子項目
    const childAccountList = accountList.filter((account) => account.type === value);
    const childAccountMenu = childAccountList.map((account) => {
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
    });

    return (
      // Info: (20241004 - Julian) 顯示有子項目的 AccountType
      childAccountList.length > 0 ? (
        <div className="flex flex-col">
          <p className="px-12px py-8px text-xs font-semibold uppercase text-dropdown-text-head">
            {t(`journal:ACCOUNT_TYPE.${value.toUpperCase()}`)}
          </p>
          <div className="flex flex-col py-4px">{childAccountMenu}</div>
        </div>
      ) : null
    );
  });

  // Info: (20241004 - Julian) 沒有子項目時顯示 no accounting found
  const isShowAccountingMenu =
    // Info: (20241004 - Julian) 找出有子項目的 AccountType
    accountTitleMenu.filter((value) => value !== null).length > 0 ? (
      accountTitleMenu
    ) : (
      <p className="px-12px py-8px text-sm text-input-text-input-placeholder">
        {t('journal:ADD_NEW_VOUCHER.NO_ACCOUNTING_FOUND')}
      </p>
    );

  const displayedAccountingMenu = isAccountingMenuOpen ? (
    <div
      ref={accountingRef}
      className="absolute top-50px z-30 w-full rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px shadow-dropmenu"
    >
      <div className="flex max-h-150px flex-col overflow-y-auto">{isShowAccountingMenu}</div>
    </div>
  ) : null;

  const isEditAccounting = isAccountEditing ? (
    <input
      ref={accountInputRef}
      value={searchKeyword}
      onChange={accountSearchHandler}
      placeholder={accountTitle}
      className="w-full truncate bg-transparent text-input-text-input-filled outline-none"
    />
  ) : (
    <p className={`truncate ${accountStyle}`}>{accountTitle}</p>
  );

  return (
    <>
      {/* Info: (20240927 - Julian) Accounting */}
      <div className="relative col-span-3">
        <div
          ref={accountRef}
          onClick={accountEditingHandler}
          className={`flex w-full items-center justify-between gap-8px rounded-sm border bg-input-surface-input-background px-12px py-10px outline-none hover:cursor-pointer hover:border-input-stroke-selected ${isAccountingMenuOpen ? 'border-input-stroke-selected' : accountStyle}`}
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
        className={`${amountStyle} col-span-3 rounded-sm border bg-input-surface-input-background px-12px py-10px text-right outline-none disabled:bg-input-surface-input-disable`}
      />
      {/* Info: (20240927 - Julian) Credit */}
      <input
        value={creditInput}
        onChange={creditInputChangeHandler}
        placeholder="0"
        disabled={isCreditDisabled}
        className={`${amountStyle} col-span-3 rounded-sm border bg-input-surface-input-background px-12px py-10px text-right outline-none disabled:bg-input-surface-input-disable`}
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

export default VoucherLineItem;
