import React, { useState, useEffect, useRef } from 'react';
import { FaChevronDown, FaPlus } from 'react-icons/fa6';
import { BiSave } from 'react-icons/bi';
import { LuTrash2 } from 'react-icons/lu';
import { FiBookOpen, FiSearch } from 'react-icons/fi';
import { useTranslation } from 'next-i18next';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { Button } from '@/components/button/button';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import Toggle from '@/components/toggle/toggle';
import { IDatePeriod } from '@/interfaces/date_period';
import { default30DayPeriodInSec } from '@/constants/display';
import { VoucherType, AccountType } from '@/constants/account';
import { useUserCtx } from '@/contexts/user_context';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { IAccount } from '@/interfaces/accounting_account';
import { numberWithCommas } from '@/lib/utils/common';
import { useModalContext } from '@/contexts/modal_context';
import { MessageType } from '@/interfaces/message_modal';

interface ILineItem {
  id: number;
  account: IAccount | null;
  particulars: string;
  debit: number;
  credit: number;
}

interface ICounterparty {
  id: number;
  code: string;
  name: string;
}

const VoucherLineItem = ({
  deleteHandler,
  accountTitleHandler,
  particularsChangeHandler,
  debitChangeHandler,
  creditChangeHandler,
  flagOfClear,
}: {
  deleteHandler: () => void;
  accountTitleHandler: (account: IAccount | null) => void;
  particularsChangeHandler: (particulars: string) => void;
  debitChangeHandler: (debit: number) => void;
  creditChangeHandler: (credit: number) => void;
  flagOfClear: boolean;
}) => {
  const { t } = useTranslation('common');
  const { accountList } = useAccountingCtx();

  const [accountTitle, setAccountTitle] = useState<string>(
    t('journal:ADD_NEW_VOUCHER.SELECT_ACCOUNTING')
  );
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
    const childAccountList = filteredAccountList.filter((account) => account.type === value);
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

const NewVoucherForm = () => {
  const { t } = useTranslation('common');

  const { selectedCompany } = useUserCtx();
  const { getAccountListHandler } = useAccountingCtx();
  const { messageModalDataHandler, messageModalVisibilityHandler } = useModalContext();

  // Info: (20241001 - Julian) 初始傳票列
  const initialVoucherLine = {
    id: 0,
    account: null,
    particulars: '',
    debit: 0,
    credit: 0,
  };

  // ToDo: (20241004 - Julian) dummy data
  const dummyCounterparty: ICounterparty[] = [
    {
      id: 1,
      code: '59382730',
      name: 'Padberg LLC',
    },
    {
      id: 2,
      code: '59382731',
      name: 'Hermiston - West',
    },
    {
      id: 3,
      code: '59382732',
      name: 'Feil, Ortiz and Lebsack',
    },
    {
      id: 4,
      code: '59382733',
      name: 'Romaguera Inc',
    },
    {
      id: 5,
      code: '59382734',
      name: 'Stamm - Baumbach',
    },
  ];

  const [date, setDate] = useState<IDatePeriod>(default30DayPeriodInSec);
  const [type, setType] = useState<string>(VoucherType.EXPENSE);
  const [note, setNote] = useState<string>('');

  const [counterKeyword, setCounterKeyword] = useState<string>('');
  const [counterparty, setCounterparty] = useState<string>(
    t('journal:ADD_NEW_VOUCHER.COUNTERPARTY')
  );
  const [filteredCounterparty, setFilteredCounterparty] =
    useState<ICounterparty[]>(dummyCounterparty);

  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [lineItems, setLineItems] = useState<ILineItem[]>([initialVoucherLine]);

  // Info: (20241004 - Julian) voucher line state
  const [totalCredit, setTotalCredit] = useState<number>(0);
  const [totalDebit, setTotalDebit] = useState<number>(0);
  const [haveZeroLine, setHaveZeroLine] = useState<boolean>(false);
  const [isAccountingNull, setIsAccountingNull] = useState<boolean>(false);

  // Info: (20241004 - Julian) 清除所有資料
  const [flagOfClear, setFlagOfClear] = useState<boolean>(false);

  const {
    targetRef: typeRef,
    componentVisible: typeVisible,
    setComponentVisible: setTypeVisible,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: counterMenuRef,
    componentVisible: isCounterMenuOpen,
    setComponentVisible: setCounterMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: counterpartyRef,
    componentVisible: isSearchCounterparty,
    setComponentVisible: setIsSearchCounterparty,
  } = useOuterClick<HTMLDivElement>(false);

  const counterpartyInputRef = useRef<HTMLInputElement>(null);

  // Info: (20241004 - Julian) 取得會計科目列表
  useEffect(() => {
    if (selectedCompany) {
      getAccountListHandler(selectedCompany.id);
    }
  }, [selectedCompany]);

  // Info: (20241004 - Julian) 傳票列條件
  useEffect(() => {
    // Info: (20241004 - Julian) 計算總借貸金額
    const debitTotal = lineItems.reduce((acc, item) => acc + item.debit, 0);
    const creditTotal = lineItems.reduce((acc, item) => acc + item.credit, 0);
    // Info: (20241004 - Julian) 檢查是否有未填的數字的傳票列
    const zeroLine = lineItems.some((item) => item.debit === 0 && item.credit === 0);
    // Info: (20241004 - Julian) 檢查是否有未選擇的會計科目
    const accountingNull = lineItems.some((item) => item.account === null);

    setTotalDebit(debitTotal);
    setTotalCredit(creditTotal);
    setHaveZeroLine(zeroLine);
    setIsAccountingNull(accountingNull);
  }, [lineItems]);

  useEffect(() => {
    // Info: (20241004 - Julian) 查詢交易對象關鍵字時聚焦
    if (isSearchCounterparty && counterpartyInputRef.current) {
      counterpartyInputRef.current.focus();
    }

    // Info: (20241001 - Julian) 查詢模式關閉後清除搜尋關鍵字
    if (!isSearchCounterparty) {
      setCounterKeyword('');
    }
  }, [isSearchCounterparty]);

  // Info: (20241004 - Julian) 搜尋交易對象
  useEffect(() => {
    const filteredList = dummyCounterparty.filter((counter) => {
      // Info: (20241004 - Julian) 編號(數字)搜尋: 字首符合
      if (counterKeyword.match(/^\d+$/)) {
        const codeMatch = counter.code.toLowerCase().startsWith(counterKeyword.toLowerCase());
        return codeMatch;
      } else if (counterKeyword !== '') {
        // Info: (20241004 - Julian) 名稱搜尋: 部分符合
        const nameMatch = counter.name.toLowerCase().includes(counterKeyword.toLowerCase());
        return nameMatch;
      }
      return true;
    });
    setFilteredCounterparty(filteredList);
  }, [counterKeyword]);

  useEffect(() => {}, []);

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

  // Info: (20241004 - Julian) 如果借貸金額相等且不為 0，顯示綠色，否則顯示紅色
  const totalStyle =
    totalCredit === totalDebit && totalCredit !== 0
      ? 'text-text-state-success-invert'
      : 'text-text-state-error-invert';

  // Info: (20241004 - Julian) 送出表單的條件
  const saveBtnDisabled =
    (date.startTimeStamp === 0 && date.endTimeStamp === 0) || // Info: (20241004 - Julian) 日期不可為 0
    type === '' || // Info: (20241004 - Julian) 類型不可為空
    counterparty === '' ||
    counterparty === t('journal:ADD_NEW_VOUCHER.COUNTERPARTY') || // Info: (20241004 - Julian) 交易對象不可為空
    (totalCredit === 0 && totalDebit === 0) || // Info: (20241004 - Julian) 借貸總金額不可為 0
    totalCredit !== totalDebit || // Info: (20241004 - Julian) 借貸金額需相等
    haveZeroLine || // Info: (20241004 - Julian) 沒有未填的數字的傳票列
    isAccountingNull; // Info: (20241004 - Julian) 沒有未選擇的會計科目

  const typeToggleHandler = () => {
    setTypeVisible(!typeVisible);
  };

  const counterSearchToggleHandler = () => {
    setIsSearchCounterparty(!isSearchCounterparty);
    setCounterMenuOpen(!isCounterMenuOpen);
  };

  const noteChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNote(e.target.value);
  };

  const counterKeywordChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCounterKeyword(e.target.value);
  };

  const recurringToggleHandler = () => {
    setIsRecurring(!isRecurring);
  };

  // ToDo: (20240926 - Julian) type 字串轉換
  const translateType = (voucherType: string) => {
    return t(`journal:ADD_NEW_VOUCHER.TYPE_${voucherType.toUpperCase()}`);
  };

  // Info: (20241004 - Julian) 清空表單
  const clearAllHandler = () => {
    setDate(default30DayPeriodInSec);
    setType(VoucherType.EXPENSE);
    setNote('');
    setCounterparty(t('journal:ADD_NEW_VOUCHER.COUNTERPARTY'));
    setIsRecurring(false);
    setLineItems([initialVoucherLine]);
    setFlagOfClear(!flagOfClear);
  };

  // Info: (20241004 - Julian) Message Modal
  const clearClickHandler = () => {
    messageModalDataHandler({
      messageType: MessageType.WARNING,
      title: t('journal:JOURNAL.CLEAR_FORM'),
      content: t('journal:JOURNAL.CLEAR_FORM_CONTENT'),
      submitBtnStr: t('journal:JOURNAL.CLEAR_FORM'),
      submitBtnFunction: clearAllHandler,
      backBtnStr: t('common:COMMON.CANCEL'),
    });
    messageModalVisibilityHandler();
  };

  // ToDo: (20240926 - Julian) Save voucher function
  const saveVoucher = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Info: (20241004 - Julian) for debug
    // eslint-disable-next-line no-console
    console.log(
      'Save voucher\nDate:',
      date,
      '\nType:',
      type,
      '\nNote:',
      note,
      '\nCounterparty:',
      counterparty,
      '\nRecurring:',
      isRecurring,
      '\nLineItems:',
      lineItems
    );
  };

  const typeDropdownMenu = typeVisible ? (
    <div
      ref={typeRef}
      className="absolute left-0 top-50px flex w-full flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px text-dropdown-text-primary shadow-dropmenu"
    >
      {Object.values(VoucherType).map((voucherType) => {
        const typeClickHandler = () => {
          setType(voucherType);
          setTypeVisible(false);
        };

        return (
          <button
            key={voucherType}
            id={`type-${voucherType}`}
            type="button"
            className="px-12px py-8px text-left hover:bg-dropdown-surface-item-hover"
            onClick={typeClickHandler}
          >
            {translateType(voucherType)}
          </button>
        );
      })}
    </div>
  ) : null;

  const displayedCounterparty = isSearchCounterparty ? (
    <input
      ref={counterpartyInputRef}
      value={counterKeyword}
      onChange={counterKeywordChangeHandler}
      placeholder={counterparty}
      className="w-full truncate bg-transparent text-input-text-input-filled outline-none"
    />
  ) : (
    <p className="truncate text-input-text-input-filled">{counterparty}</p>
  );

  const counterMenu =
    filteredCounterparty && filteredCounterparty.length > 0 ? (
      filteredCounterparty.map((counter) => {
        const counterClickHandler = () => {
          setCounterparty(`${counter.code} ${counter.name}`);
          setCounterMenuOpen(false);
        };

        return (
          <button
            key={counter.id}
            type="button"
            onClick={counterClickHandler}
            className="flex w-full gap-8px px-12px py-8px text-left text-sm hover:bg-dropdown-surface-menu-background-secondary"
          >
            <p className="text-dropdown-text-primary">{counter.code}</p>
            <p className="text-dropdown-text-secondary">{counter.name}</p>
          </button>
        );
      })
    ) : (
      <p className="px-12px py-8px text-sm text-input-text-input-placeholder">
        {t('journal:ADD_NEW_VOUCHER.NO_COUNTERPARTY_FOUND')}
      </p>
    );

  const counterpartyDropMenu = isCounterMenuOpen ? (
    <div
      ref={counterMenuRef}
      className="absolute top-85px z-30 w-full rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px shadow-dropmenu"
    >
      {counterMenu}
    </div>
  ) : null;

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
        flagOfClear={flagOfClear}
      />
    );
  });

  const voucherLineBlock = (
    <div className="col-span-2">
      {/* Info: (20240927 - Julian) Table */}
      <div className="grid w-full grid-cols-13 gap-24px rounded-md bg-surface-brand-secondary-moderate px-24px py-12px">
        {/* Info: (20240927 - Julian) Table Header */}
        <div className="col-span-3 font-semibold text-text-neutral-invert">
          {t('journal:VOUCHER.ACCOUNTING')}
        </div>
        <div className="col-span-3 font-semibold text-text-neutral-invert">
          {t('journal:VOUCHER.PARTICULARS')}
        </div>
        <div className="col-span-3 font-semibold text-text-neutral-invert">
          {t('journal:VOUCHER.DEBIT')}
        </div>
        <div className="col-span-3 font-semibold text-text-neutral-invert">
          {t('journal:VOUCHER.CREDIT')}
        </div>
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

  return (
    <div className="relative flex flex-col items-center gap-40px p-40px">
      {/* ToDo: (20240926 - Julian) AI analyze */}
      <div className="w-full bg-surface-brand-primary-moderate p-40px text-center text-white">
        This is AI analyze
      </div>
      {/* ToDo: (20240926 - Julian) Uploaded certificates */}
      <div className="w-full bg-stroke-neutral-quaternary p-40px text-center text-white">
        Uploaded certificates
      </div>

      {/* Info: (20240926 - Julian) form */}
      <form onSubmit={saveVoucher} className="grid w-full grid-cols-2 gap-24px">
        {/* Info: (20240926 - Julian) Date */}
        <div className="flex flex-col gap-8px">
          <p className="font-bold text-input-text-primary">
            {t('journal:ADD_NEW_VOUCHER.VOUCHER_DATE')}
            <span className="text-text-state-error">*</span>
          </p>
          <DatePicker type={DatePickerType.TEXT_DATE} period={date} setFilteredPeriod={setDate} />
        </div>
        {/* Info: (20240926 - Julian) Type */}
        <div className="flex flex-col gap-8px">
          <p className="font-bold text-input-text-primary">
            {t('journal:ADD_NEW_VOUCHER.VOUCHER_TYPE')}
            <span className="text-text-state-error">*</span>
          </p>
          <div
            onClick={typeToggleHandler}
            className="relative flex items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px hover:cursor-pointer hover:border-input-stroke-input-hover"
          >
            <p className="text-base text-input-text-input-filled">{translateType(type)}</p>
            <FaChevronDown size={20} />
            {/* Info: (20240926 - Julian) Type dropdown */}
            {typeDropdownMenu}
          </div>
        </div>
        {/* Info: (20240926 - Julian) Note */}
        <div className="col-span-2 flex flex-col gap-8px">
          <p className="font-bold text-input-text-primary">{t('journal:ADD_NEW_VOUCHER.NOTE')}</p>
          <input
            id="note-input"
            type="text"
            value={note}
            onChange={noteChangeHandler}
            placeholder={t('journal:ADD_NEW_VOUCHER.NOTE')}
            className="rounded-sm border border-input-stroke-input px-12px py-10px outline-none placeholder:text-input-text-input-placeholder"
          />
        </div>
        {/* Info: (20240926 - Julian) Counterparty */}
        <div className="relative col-span-2 flex flex-col gap-8px">
          <p className="font-bold text-input-text-primary">
            {t('journal:ADD_NEW_VOUCHER.COUNTERPARTY')}
            <span className="text-text-state-error">*</span>
          </p>
          <div
            ref={counterpartyRef}
            onClick={counterSearchToggleHandler}
            className={`flex w-full items-center justify-between rounded-sm border bg-input-surface-input-background px-12px py-10px text-input-text-input-filled outline-none hover:cursor-pointer hover:border-input-stroke-selected ${isSearchCounterparty ? 'border-input-stroke-selected' : 'border-input-stroke-input'}`}
          >
            {displayedCounterparty}
            <div className="h-20px w-20px">
              <FiSearch size={20} />
            </div>
          </div>
          {/* Info: (20241004 - Julian) Counterparty drop menu */}
          {counterpartyDropMenu}
        </div>
        {/* Info: (20240926 - Julian) switch */}
        <div className="col-span-2 flex items-center gap-16px text-switch-text-primary">
          <Toggle id="recurring-toggle" getToggledState={recurringToggleHandler} />
          <p>{t('journal:ADD_NEW_VOUCHER.RECURRING_ENTRY')}</p>
        </div>
        {/* Info: (20240926 - Julian) voucher line block */}
        {voucherLineBlock}
        {/* Info: (20240926 - Julian) buttons */}
        <div className="col-span-2 ml-auto flex items-center gap-12px">
          <Button type="button" variant="secondaryOutline" onClick={clearClickHandler}>
            {t('journal:JOURNAL.CLEAR_ALL')}
          </Button>
          <Button type="submit" disabled={saveBtnDisabled}>
            <p>{t('common:COMMON.SAVE')}</p>
            <BiSave size={20} />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewVoucherForm;
