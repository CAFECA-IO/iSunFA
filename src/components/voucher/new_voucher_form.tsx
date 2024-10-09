import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { FaChevronDown, FaPlus } from 'react-icons/fa6';
import { BiSave } from 'react-icons/bi';
import { FiPlus, FiSearch } from 'react-icons/fi';
import { useTranslation } from 'next-i18next';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { numberWithCommas } from '@/lib/utils/common';
import VoucherLineItem from '@/components/voucher/voucher_line_item';
import { Button } from '@/components/button/button';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import Toggle from '@/components/toggle/toggle';
import { IDatePeriod } from '@/interfaces/date_period';
import { IAccount } from '@/interfaces/accounting_account';
import { MessageType } from '@/interfaces/message_modal';
import { checkboxStyle, default30DayPeriodInSec } from '@/constants/display';
import { VoucherType } from '@/constants/account';
import { useUserCtx } from '@/contexts/user_context';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { useModalContext } from '@/contexts/modal_context';

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

enum RecurringUnit {
  MONTH = 'month',
  WEEK = 'week',
}

const AccountTitlesOfAPandAR = ['應收帳款', '應付帳款'];

const NewVoucherForm: React.FC = () => {
  const { t } = useTranslation('common');
  const router = useRouter();

  const inputStyle = {
    NORMAL:
      'border-input-stroke-input text-input-text-input-filled placeholder:text-input-text-input-placeholder disabled:text-input-text-input-placeholder',
    ERROR:
      'border-input-text-error text-input-text-error placeholder:text-input-text-error disabled:text-input-text-error',
  };

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

  // Info: (20241004 - Julian) 通用項目
  const [date, setDate] = useState<IDatePeriod>(default30DayPeriodInSec);
  const [type, setType] = useState<string>(VoucherType.EXPENSE);
  const [note, setNote] = useState<string>('');

  // Info: (20241004 - Julian) 週期性分錄相關 state
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [recurringPeriod, setRecurringPeriod] = useState<IDatePeriod>(default30DayPeriodInSec);
  const [recurringUnit, setRecurringUnit] = useState<RecurringUnit>(RecurringUnit.MONTH);
  const [recurringArray, setRecurringArray] = useState<number[]>([]);

  // Info: (20241004 - Julian) 傳票列
  const [lineItems, setLineItems] = useState<ILineItem[]>([initialVoucherLine]);

  // Info: (20241004 - Julian) 傳票列驗證條件
  const [totalCredit, setTotalCredit] = useState<number>(0);
  const [totalDebit, setTotalDebit] = useState<number>(0);
  const [haveZeroLine, setHaveZeroLine] = useState<boolean>(false);
  const [isAccountingNull, setIsAccountingNull] = useState<boolean>(false);

  // Info: (20241004 - Julian) 清空表單 flag
  const [flagOfClear, setFlagOfClear] = useState<boolean>(false);
  //  Info: (20241007 - Julian) 送出表單 flag
  const [flagOfSubmit, setFlagOfSubmit] = useState<boolean>(false);

  // Info: (20241009 - Julian) 追加項目
  const [isCounterpartyRequired, setIsCounterpartyRequired] = useState<boolean>(false);
  // const [isAssetRequired, setIsAssetRequired] = useState<boolean>(false);
  // const [isReverseRequired, setIsReverseRequired] = useState<boolean>(false);

  // Info: (20241004 - Julian) 交易對象相關 state
  const [counterKeyword, setCounterKeyword] = useState<string>('');
  const [counterparty, setCounterparty] = useState<string>(
    t('journal:ADD_NEW_VOUCHER.COUNTERPARTY')
  );
  const [filteredCounterparty, setFilteredCounterparty] =
    useState<ICounterparty[]>(dummyCounterparty);

  // Info: (20241004 - Julian) 是否顯示提示
  const [isShowDateHint, setIsShowDateHint] = useState<boolean>(false);
  const [isShowCounterHint, setIsShowCounterHint] = useState<boolean>(false);
  const [isShowRecurringPeriodHint, setIsShowRecurringPeriodHint] = useState<boolean>(false);
  const [isShowRecurringArrayHint, setIsShowRecurringArrayHint] = useState<boolean>(false);

  // Info: (20241004 - Julian) Type 下拉選單
  const {
    targetRef: typeRef,
    componentVisible: typeVisible,
    setComponentVisible: setTypeVisible,
  } = useOuterClick<HTMLDivElement>(false);

  // Info: (20241004 - Julian) Counterparty 下拉選單
  const {
    targetRef: counterMenuRef,
    componentVisible: isCounterMenuOpen,
    setComponentVisible: setCounterMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  // Info: (20241004 - Julian) Counterparty 搜尋
  const {
    targetRef: counterpartyRef,
    componentVisible: isSearchCounterparty,
    setComponentVisible: setIsSearchCounterparty,
  } = useOuterClick<HTMLDivElement>(false);

  // Info: (20241007 - Julian) Recurring 下拉選單
  const {
    targetRef: recurringRef,
    componentVisible: isRecurringMenuOpen,
    setComponentVisible: setRecurringMenuOpen,
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

    // Info: (20241009 - Julian) 會計科目有應收付帳款時，顯示 Counterparty
    const isAPorAR = lineItems.some((item) =>
      AccountTitlesOfAPandAR.includes(item.account?.name || ''));

    setTotalDebit(debitTotal);
    setTotalCredit(creditTotal);
    setHaveZeroLine(zeroLine);
    setIsAccountingNull(accountingNull);

    setIsCounterpartyRequired(isAPorAR);
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

  // Info: (20241007 - Julian) 如果單位改變，則重設 Recurring Array
  useEffect(() => {
    setRecurringArray([]);
  }, [recurringUnit]);

  // Info: (20241007 - Julian) 日期未選擇時顯示提示
  useEffect(() => {
    if (date.startTimeStamp !== 0 && date.endTimeStamp !== 0) {
      setIsShowDateHint(false);
    }
  }, [date]);

  // Info: (20241004 - Julian) 交易對象未選擇時顯示提示
  useEffect(() => {
    if (counterparty !== '' && counterparty !== t('journal:ADD_NEW_VOUCHER.COUNTERPARTY')) {
      setIsShowCounterHint(false);
    }
  }, [counterparty]);

  // Info: (20241007 - Julian) 週期區間未選擇時顯示提示
  useEffect(() => {
    if (isRecurring && recurringPeriod.startTimeStamp !== 0 && recurringPeriod.endTimeStamp !== 0) {
      setIsShowRecurringPeriodHint(false);
    }
  }, [isRecurring, recurringPeriod]);

  // Info: (20241007 - Julian) 週期未選擇時顯示提示
  useEffect(() => {
    if (isRecurring && recurringArray.length > 0) {
      setIsShowRecurringArrayHint(false);
    }
  }, [recurringArray]);

  // Info: (20241004 - Julian) 如果借貸金額相等且不為 0，顯示綠色，否則顯示紅色
  const totalStyle =
    totalCredit === totalDebit && totalCredit !== 0
      ? 'text-text-state-success-invert'
      : 'text-text-state-error-invert';

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

  const recurringUnitToggleHandler = () => {
    setRecurringMenuOpen(!isRecurringMenuOpen);
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
    setRecurringPeriod(default30DayPeriodInSec);
    setRecurringUnit(RecurringUnit.MONTH);
    setRecurringArray([]);
    setLineItems([initialVoucherLine]);
    setFlagOfClear(!flagOfClear);
  };

  // Info: (20241004 - Julian) 清空表單前的警告提示
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
  const saveVoucher = async () => {
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
      isRecurring
        ? `Period: ${recurringPeriod.startTimeStamp} ~ ${recurringPeriod.endTimeStamp}`
        : '',
      isRecurring
        ? `${recurringArray.map((item) => (recurringUnit === RecurringUnit.WEEK ? `W${item}` : `M${item}`))}
      `
        : '',
      'LineItems:',
      lineItems
    );
  };

  const submitForm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Info: (20241007 - Julian) 若任一條件不符，則中斷 function
    if (date.startTimeStamp === 0 && date.endTimeStamp === 0) {
      // Info: (20241007 - Julian) 日期不可為 0：顯示日期提示，並定位到日期欄位
      setIsShowDateHint(true);
      router.push('#voucher-date');
    } else if (
      // Info: (20241004 - Julian) 如果需填入交易對象，則交易對象不可為空：顯示類型提示，並定位到類型欄位
      isCounterpartyRequired &&
      (counterparty === '' || counterparty === t('journal:ADD_NEW_VOUCHER.COUNTERPARTY'))
    ) {
      setIsShowCounterHint(true);
      router.push('#voucher-counterparty');
    } else if (
      // Info: (20241007 - Julian) 如果開啟週期，但週期區間未選擇，則顯示週期提示，並定位到週期欄位
      isRecurring &&
      (recurringPeriod.startTimeStamp === 0 || recurringPeriod.endTimeStamp === 0)
    ) {
      setIsShowRecurringPeriodHint(true);
      router.push('#voucher-recurring');
    } else if (isRecurring && recurringArray.length === 0) {
      // Info: (20241007 - Julian) 顯示週期提示，並定位到週期欄位
      setIsShowRecurringArrayHint(true);
      router.push('#voucher-recurring');
    } else if (
      (totalCredit === 0 && totalDebit === 0) || // Info: (20241004 - Julian) 借貸總金額不可為 0
      totalCredit !== totalDebit || // Info: (20241004 - Julian) 借貸金額需相等
      haveZeroLine || // Info: (20241004 - Julian) 沒有未填的數字的傳票列
      isAccountingNull // Info: (20241004 - Julian) 沒有未選擇的會計科目
    ) {
      setFlagOfSubmit(!flagOfSubmit);
      router.push('#voucher-line-block');
    } else {
      // Info: (20241007 - Julian) 儲存傳票
      saveVoucher();

      // Info: (20241007 - Julian) 重設提示
      setIsShowDateHint(false);
      setIsShowCounterHint(false);
      setFlagOfSubmit(!flagOfSubmit);
    }
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
    <p className={`truncate ${isShowCounterHint ? inputStyle.ERROR : inputStyle.NORMAL}`}>
      {counterparty}
    </p>
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
        flagOfSubmit={flagOfSubmit}
        accountIsNull={isAccountingNull}
        amountIsZero={haveZeroLine}
        amountNotEqual={totalCredit !== totalDebit}
      />
    );
  });

  const voucherLineBlock = (
    <div id="voucher-line-block" className="col-span-2">
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
        <div className="col-span-3 col-end-13 font-semibold text-text-neutral-invert">
          {t('journal:VOUCHER.CREDIT')}
        </div>

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

  const recurringUnitMenu = (
    <div
      ref={recurringRef}
      className={`absolute left-0 top-12 ${isRecurringMenuOpen ? 'flex' : 'hidden'} w-full flex-col overflow-hidden rounded-sm border border-input-stroke-input bg-input-surface-input-background p-8px`}
    >
      {Object.values(RecurringUnit).map((unit) => {
        const recurringUnitClickHandler = () => {
          setRecurringUnit(unit);
          setRecurringMenuOpen(false);
        };
        return (
          <button
            key={unit}
            type="button"
            className="py-8px hover:bg-dropdown-surface-menu-background-secondary"
            onClick={recurringUnitClickHandler}
          >
            {t(`common:COMMON.${unit.toUpperCase()}`)}
          </button>
        );
      })}
    </div>
  );

  const recurringUnitCheckboxes =
    recurringUnit === RecurringUnit.WEEK
      ? Array.from({ length: 7 }, (_, i) => {
          const week = i + 1;
          const weekChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.checked) {
              setRecurringArray([...recurringArray, week]);
            } else {
              setRecurringArray(recurringArray.filter((item) => item !== week));
            }
          };
          // Info: (20241007 - Julian) 檢查 Array 是否有該值
          const weekChecked = recurringArray.includes(week);

          return (
            <div key={week} className="flex items-center gap-8px">
              <input
                type="checkbox"
                id={`week-${week}`}
                checked={weekChecked}
                className={checkboxStyle}
                onChange={weekChangeHandler}
              />
              <label htmlFor={`week-${week}`}>{week}</label>
            </div>
          );
        })
      : Array.from({ length: 12 }, (_, i) => {
          const month = i + 1;
          const monthChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.checked) {
              setRecurringArray([...recurringArray, month]);
            } else {
              setRecurringArray(recurringArray.filter((item) => item !== month));
            }
          };
          // Info: (20241007 - Julian) 檢查 Array 是否有該值
          const monthChecked = recurringArray.includes(month);

          return (
            <div key={month} className="flex items-center gap-8px">
              <input
                type="checkbox"
                id={`month-${month}`}
                checked={monthChecked}
                className={checkboxStyle}
                onChange={monthChangeHandler}
              />
              <label htmlFor={`month-${month}`}>{month}</label>
            </div>
          );
        });

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
      <form onSubmit={submitForm} className="grid w-full grid-cols-2 gap-24px">
        {/* Info: (20240926 - Julian) Date */}
        <div id="voucher-date" className="flex flex-col gap-8px whitespace-nowrap">
          <p className="font-bold text-input-text-primary">
            {t('journal:ADD_NEW_VOUCHER.VOUCHER_DATE')}
            <span className="text-text-state-error">*</span>
          </p>
          <DatePicker
            type={DatePickerType.TEXT_DATE}
            period={date}
            setFilteredPeriod={setDate}
            btnClassName={isShowDateHint ? inputStyle.ERROR : ''}
          />
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
        {isCounterpartyRequired && (
          <div id="voucher-counterparty" className="relative col-span-2 flex flex-col gap-8px">
            <p className="font-bold text-input-text-primary">
              {t('journal:ADD_NEW_VOUCHER.COUNTERPARTY')}
              <span className="text-text-state-error">*</span>
            </p>
            <div
              ref={counterpartyRef}
              onClick={counterSearchToggleHandler}
              className={`flex w-full items-center justify-between gap-8px rounded-sm border bg-input-surface-input-background px-12px py-10px outline-none hover:cursor-pointer hover:border-input-stroke-selected ${isSearchCounterparty ? 'border-input-stroke-selected' : isShowCounterHint ? inputStyle.ERROR : 'border-input-stroke-input text-input-text-input-filled'}`}
            >
              {displayedCounterparty}
              <div className="h-20px w-20px">
                <FiSearch size={20} />
              </div>
            </div>
            {/* Info: (20241004 - Julian) Counterparty drop menu */}
            {counterpartyDropMenu}
          </div>
        )}
        {/* Info: (20241007 - Julian) Recurring */}
        <div id="voucher-recurring" className="col-span-2 grid grid-cols-6 gap-16px">
          {/* Info: (20241007 - Julian) switch */}
          <div className="col-span-2 flex items-center gap-16px whitespace-nowrap text-switch-text-primary">
            <Toggle
              id="recurring-toggle"
              initialToggleState={isRecurring}
              getToggledState={recurringToggleHandler}
            />
            <p>{t('journal:ADD_NEW_VOUCHER.RECURRING_ENTRY')}</p>
          </div>
          {/* Info: (20241007 - Julian) recurring period */}
          <div className={`${isRecurring ? 'block' : 'hidden'} col-span-4`}>
            <DatePicker
              type={DatePickerType.TEXT_PERIOD}
              period={recurringPeriod}
              setFilteredPeriod={setRecurringPeriod}
              datePickerClassName="w-full"
              btnClassName={isShowRecurringPeriodHint ? inputStyle.ERROR : ''}
            />
          </div>
          {/* Info: (20241007 - Julian) recurring unit */}
          <div
            className={`${isRecurring ? 'flex' : 'hidden'} col-start-3 col-end-7 items-center gap-24px`}
          >
            {/* Info: (20241007 - Julian) recurring unit block */}
            <div className="flex w-160px items-center divide-x divide-input-stroke-input rounded-sm border border-input-stroke-input bg-input-surface-input-background">
              <p className="px-12px py-10px text-input-text-input-placeholder">
                {t('journal:ADD_NEW_VOUCHER.EVERY')}
              </p>
              <div
                onClick={recurringUnitToggleHandler}
                className="relative flex flex-1 items-center justify-between px-12px py-10px text-input-text-input-filled hover:cursor-pointer"
              >
                <p>{recurringUnit}</p>
                <FaChevronDown />
                {/* Info: (20240926 - Julian) recurring unit dropdown */}
                {recurringUnitMenu}
              </div>
            </div>
            {/* Info: (20241007 - Julian) recurring unit checkbox */}
            <div
              className={`flex items-center gap-12px overflow-x-auto ${isShowRecurringArrayHint ? inputStyle.ERROR : inputStyle.NORMAL}`}
            >
              {recurringUnitCheckboxes}
            </div>
          </div>
        </div>
        {/* Info: (20241009 - Julian) Asset */}
        <div className="col-span-2 flex flex-col">
          {/* Info: (20241009 - Julian) Asset Divider */}
          <div className="my-5 flex items-center gap-4">
            <hr className="block flex-1 border-divider-stroke-lv-4 md:hidden" />
            <div className="flex items-center gap-2 text-sm text-divider-text-lv-1">
              <Image src="/icons/asset.svg" width={16} height={16} alt="asset_icon" />
              <p>Asset</p>
            </div>
            <hr className="flex-1 border-divider-stroke-lv-4" />
          </div>
          {/* Info: (20241009 - Julian) Asset block */}
          <div className="flex flex-col gap-12px">
            <div className="flex flex-col items-center text-xs">
              <p className="text-text-neutral-tertiary">Empty</p>
              <p className="text-text-neutral-primary">Please add at least 1 asset!</p>
            </div>
            <Button type="button" variant="secondaryOutline">
              <FiPlus size={20} />
              <p>Add New Asset</p>
            </Button>
          </div>
        </div>
        {/* Info: (20240926 - Julian) voucher line block */}
        {voucherLineBlock}
        {/* Info: (20240926 - Julian) buttons */}
        <div className="col-span-2 ml-auto flex items-center gap-12px">
          <Button type="button" variant="secondaryOutline" onClick={clearClickHandler}>
            {t('journal:JOURNAL.CLEAR_ALL')}
          </Button>
          <Button type="submit">
            <p>{t('common:COMMON.SAVE')}</p>
            <BiSave size={20} />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewVoucherForm;
