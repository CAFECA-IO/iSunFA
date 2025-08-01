import React, { useState, useEffect, useRef } from 'react';
import { FaPlus, FaArrowRight } from 'react-icons/fa6';
import { FiTrash2 } from 'react-icons/fi';
import { RxCross2 } from 'react-icons/rx';
import { useTranslation } from 'next-i18next';
import { Button } from '@/components/button/button';
import { APIName } from '@/constants/api_connection';
import { IAccount } from '@/interfaces/accounting_account';
import APIHandler from '@/lib/utils/api_handler';
import { useUserCtx } from '@/contexts/user_context';
import { FREE_ACCOUNT_BOOK_ID } from '@/constants/config';
import { useModalContext } from '@/contexts/modal_context';
import { ToastType } from '@/interfaces/toastify';
import NumericInput from '@/components/numeric_input/numeric_input';
import { numberWithCommas } from '@/lib/utils/common';
import { default30DayPeriodInSec } from '@/constants/display';
import { IDatePeriod } from '@/interfaces/date_period';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import AccountTitleSelector from '@/components/ledger/account_title_selector';
import { EVENT_TYPE } from '@/constants/account';
import { ToastId } from '@/constants/toast_id';

interface IManualAccountOpeningModalProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

interface IManualAccountOpeningItemProps {
  data: IManualAccountOpeningItem;
  cellStyle: string;
  setAmount: (amount: number, isDebit: boolean) => void;
  setAccountTitle: (account: IAccount) => void;
  deleteHandler: () => void;
}

// Info: (20241112 - Julian) ========= May move to interfaces =========
interface IManualAccountOpeningItem {
  id: number;
  subcategory: IAccount | null;
  beginningAmount: number;
  isDebit: boolean | null;
}

const defaultManualAccountOpeningItem: IManualAccountOpeningItem = {
  id: 0,
  subcategory: null,
  beginningAmount: 0,
  isDebit: null,
};

const tableCellStyle =
  'table-cell px-16px py-8px align-middle text-center border-stroke-neutral-quaternary';

const ManualAccountOpeningItem: React.FC<IManualAccountOpeningItemProps> = ({
  data,
  cellStyle,
  setAccountTitle,
  setAmount,
  deleteHandler,
}) => {
  const { id, subcategory, isDebit, beginningAmount } = data;

  // Info: (20250313 - Julian) 如果 isDebit 為 true，則將 beginningAmount 設為初始借值，否則為 0
  const initialDebit = isDebit !== null ? 0 : isDebit ? beginningAmount : 0;
  // Info: (20250313 - Julian) 如果 isDebit 為 false，則將 beginningAmount 設為初始貸值，否則為 0
  const initialCredit = isDebit !== null ? 0 : isDebit ? 0 : beginningAmount;

  // Info: (20241112 - Julian) 設定 debit 和 credit 的金額
  const [debit, setDebit] = useState<number>(initialDebit);
  const [credit, setCredit] = useState<number>(initialCredit);

  const debitDisabled = credit !== 0;
  const creditDisabled = debit !== 0;

  const changeDebitAmountHandler = (amount: number) => {
    setDebit(amount);
    setAmount(amount, true);
  };

  const changeCreditAmountHandler = (amount: number) => {
    setCredit(amount);
    setAmount(amount, false);
  };

  const accountSelectedHandler = (account: IAccount) => setAccountTitle(account);

  return (
    <div className="table-row bg-surface-neutral-surface-lv2 text-sm">
      {/* Info: (20241112 - Julian) Subcategory Type */}
      <AccountTitleSelector
        id={id}
        defaultAccount={subcategory}
        accountSelectedHandler={accountSelectedHandler}
        className={`${cellStyle} max-w-200px border-r`}
      />
      {/* Info: (20241112 - Julian) Beginning Debit */}
      <div className={`${cellStyle} border-r`}>
        <NumericInput
          id="manual-account-debit-input"
          type="string"
          value={debit}
          setValue={setDebit}
          isDecimal
          hasComma
          triggerWhenChanged={changeDebitAmountHandler}
          className="w-150px rounded-sm border border-input-stroke-input px-12px py-10px text-right text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder disabled:border-input-stroke-disable disabled:bg-input-surface-input-disable disabled:text-input-text-disable"
          placeholder="0"
          disabled={debitDisabled}
        />
      </div>
      {/* Info: (20241112 - Julian) Beginning Credit */}
      <div className={`${cellStyle} border-r`}>
        <NumericInput
          id="manual-account-credit-input"
          type="string"
          value={credit}
          setValue={setCredit}
          isDecimal
          hasComma
          triggerWhenChanged={changeCreditAmountHandler}
          className="w-150px rounded-sm border border-input-stroke-input px-12px py-10px text-right text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder disabled:border-input-stroke-disable disabled:bg-input-surface-input-disable disabled:text-input-text-disable"
          placeholder="0"
          disabled={creditDisabled}
        />
      </div>
      {/* Info: (20241112 - Julian) Action */}
      <div className={`${cellStyle}`}>
        <button
          type="button"
          className="p-12px text-stroke-neutral-secondary hover:text-icon-surface-accent"
          onClick={deleteHandler}
        >
          <FiTrash2 size={22} />
        </button>
      </div>
    </div>
  );
};

const ManualAccountOpeningModal: React.FC<IManualAccountOpeningModalProps> = ({
  isModalVisible,
  modalVisibilityHandler,
}) => {
  const { t } = useTranslation('common');

  const { connectedAccountBook } = useUserCtx();
  const { toastHandler } = useModalContext();

  const initialManualAccountOpeningList = [
    defaultManualAccountOpeningItem,
    {
      ...defaultManualAccountOpeningItem,
      id: 1,
    },
  ];

  // Info: (20241114 - Julian) 用來判斷是否展開 subcategory menu，以及展開的項目 index
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  // Info: (20241114 - Julian) 開帳日期
  const [openingDate, setOpeningDate] = useState<IDatePeriod>(default30DayPeriodInSec);
  // Info: (20241114 - Julian) 用來儲存新增的會計科目列表
  const [manualAccountOpeningList, setManualAccountOpeningList] = useState<
    IManualAccountOpeningItem[]
  >(initialManualAccountOpeningList);
  // Info: (20250102 - Julian) 計算總金額
  const [totalDebit, setTotalDebit] = useState<number>(0);
  const [totalCredit, setTotalCredit] = useState<number>(0);

  const accountBookId = connectedAccountBook?.id ?? FREE_ACCOUNT_BOOK_ID;

  const totalStyle =
    totalDebit === totalCredit ? 'text-text-state-success' : 'text-text-state-error';

  // Info: (20241115 - Julian) 新增傳票的 API
  const {
    trigger: createNewVoucher,
    isLoading: isCreatingVoucher,
    success: createVoucherSuccess,
    error: createVoucherError,
  } = APIHandler(APIName.VOUCHER_POST_V2);

  // Info: (20241114 - Julian) 如果有 focusIndex，則代表有展開的 subcategory menu
  const isExpanded = focusIndex !== null;

  const dropmenuRef = useRef<HTMLDivElement>(null);

  const addListClickHandler = () => {
    const lastItem = manualAccountOpeningList[manualAccountOpeningList.length - 1];
    const newId = lastItem ? lastItem.id + 1 : 0;
    const newItem = { ...defaultManualAccountOpeningItem, id: newId };

    setManualAccountOpeningList([...manualAccountOpeningList, newItem]);
  };

  const submitHandler = async () => {
    // Info: (20250102 - Julian) 將 manualAccountOpeningList 轉換成 lineItems
    const lineItems: {
      accountId: string | number;
      description: string;
      debit: boolean;
      amount: number;
    }[] = manualAccountOpeningList.map((item) => {
      return {
        accountId: item.subcategory?.id ?? '',
        description: '',
        debit: item.isDebit ?? false,
        amount: item.beginningAmount,
      };
    });

    const body = {
      actions: [],
      certificateIds: [],
      voucherDate: openingDate.startTimeStamp,
      type: EVENT_TYPE.OPENING,
      note: '',
      lineItems,
      assetIds: [],
      reverseVouchers: [],
    };
    // Info: (20250102 - Julian) POST API
    createNewVoucher({ params: { accountBookId }, body });
  };

  const submitDisabled =
    // Info: (20250102 - Julian) 未選擇開帳日期
    openingDate.startTimeStamp === 0 ||
    // Info: (20250102 - Julian) 有任何一筆資料沒有選擇會計科目
    manualAccountOpeningList.some((item) => item.subcategory === null) ||
    // Info: (20250102 - Julian) 有任何一筆資料沒有輸入金額
    manualAccountOpeningList.some((item) => item.beginningAmount === 0) ||
    // Info: (20250102 - Julian) 資料筆數小於 2
    manualAccountOpeningList.length < 2;

  useEffect(() => {
    if (!isCreatingVoucher) {
      if (createVoucherSuccess) {
        // Info: (20241115 - Julian) 如果開帳成功，則提示成功訊息
        toastHandler({
          id: ToastId.MANUAL_ACCOUNT_OPENING_SUCCESS,
          type: ToastType.SUCCESS,
          content: t('settings:MANUAL_ACCOUNT_OPENING_MODAL.TOAST_OPENING_SUCCESS'),
          closeable: true,
        });
        modalVisibilityHandler();
      } else if (createVoucherError) {
        // Info: (20241115 - Julian) 如果開帳失敗，則提示錯誤訊息
        toastHandler({
          id: ToastId.MANUAL_ACCOUNT_OPENING_ERROR,
          type: ToastType.ERROR,
          content: t('settings:MANUAL_ACCOUNT_OPENING_MODAL.TOAST_OPENING_FAIL'),
          closeable: true,
        });
      }
    }
  }, [createVoucherSuccess, createVoucherError, isCreatingVoucher]);

  useEffect(() => {
    // Info: (20241114 - Julian) 如果 modal 關閉，則重置資料
    if (!isModalVisible) {
      setManualAccountOpeningList(initialManualAccountOpeningList);
      setTotalCredit(0);
      setTotalDebit(0);
      setFocusIndex(null);
      setOpeningDate(default30DayPeriodInSec);
    }
  }, [isModalVisible]);

  useEffect(() => {
    // Info: (20250102 - Julian) 選單重新展開時，將滾動條拉到最上方
    if (!isExpanded) {
      dropmenuRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isExpanded]);

  useEffect(() => {
    const totalDebitAmount = manualAccountOpeningList.reduce((total, item) => {
      return item.isDebit ? total + item.beginningAmount : total;
    }, 0);
    const totalCreditAmount = manualAccountOpeningList.reduce((total, item) => {
      return item.isDebit ? total : total + item.beginningAmount;
    }, 0);

    setTotalDebit(totalDebitAmount);
    setTotalCredit(totalCreditAmount);
  }, [manualAccountOpeningList]);

  const tableBody =
    manualAccountOpeningList.length > 0 ? (
      manualAccountOpeningList.map((item) => {
        const duplicateItem = { ...item };

        // Info: (20250102 - Julian) 最後一行不顯示底邊
        const cellStyle =
          tableCellStyle + (item.id === manualAccountOpeningList.length - 1 ? '' : ' border-b');

        // Info: (20250102 - Julian) 數值變更
        const amountChangeHandler = (amount: number, isDebit: boolean) => {
          setManualAccountOpeningList(
            manualAccountOpeningList.map((list) => {
              return list.id === duplicateItem.id
                ? { ...list, beginningAmount: amount, isDebit }
                : list;
            })
          );
        };

        const accountTitleChangeHandler = (account: IAccount) => {
          setManualAccountOpeningList(
            manualAccountOpeningList.map((list) => {
              return list.id === duplicateItem.id ? { ...list, subcategory: account } : list;
            })
          );
        };

        // Info: (20250102 - Julian) 刪除列
        const deleteHandler = () => {
          setManualAccountOpeningList(
            manualAccountOpeningList.filter((list) => list.id !== duplicateItem.id)
          );
        };

        return (
          <ManualAccountOpeningItem
            key={item.id}
            data={item}
            setAccountTitle={accountTitleChangeHandler}
            setAmount={amountChangeHandler}
            cellStyle={cellStyle}
            deleteHandler={deleteHandler}
          />
        );
      })
    ) : (
      <div className="px-16px py-8px text-center text-text-neutral-primary">
        <p>{t('settings:MANUAL_ACCOUNT_OPENING_MODAL.ADD_NEW_ROW')}</p>
      </div>
    );

  const displayTable = (
    <div className="table w-full overflow-hidden rounded-md border border-stroke-neutral-quaternary">
      <div className="table-row-group">
        {/* Info: (20241112 - Julian) table header */}
        <div className="table-row bg-surface-brand-secondary-5 text-xs font-medium text-text-brand-secondary-lv2">
          <div className={`${tableCellStyle} border-b border-r`}>
            {t('settings:MANUAL_ACCOUNT_OPENING_MODAL.SUBCATEGORY_TYPE')}
          </div>
          <div className={`${tableCellStyle} border-b border-r`}>
            {t('settings:MANUAL_ACCOUNT_OPENING_MODAL.BEGINNING_DEBIT')}
          </div>
          <div className={`${tableCellStyle} border-b border-r`}>
            {t('settings:MANUAL_ACCOUNT_OPENING_MODAL.BEGINNING_CREDIT')}
          </div>
          <div className={`${tableCellStyle} border-b`}>
            {t('settings:MANUAL_ACCOUNT_OPENING_MODAL.ACTION')}
          </div>
        </div>
        {/* Info: (20241112 - Julian) table body */}
        {tableBody}
      </div>
    </div>
  );

  const isDisplayModal = isModalVisible ? (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="relative mx-auto flex w-90vw flex-col items-stretch gap-y-24px rounded-lg bg-card-surface-primary p-40px shadow-lg shadow-black/80 lg:w-800px">
        {/* Info: (20241112 - Julian) Title */}
        <h1 className="text-center text-xl font-bold text-text-neutral-primary">
          {t('settings:MANUAL_ACCOUNT_OPENING_MODAL.MODAL_TITLE')}
        </h1>

        {/* Info: (20241112 - Julian) Close button */}
        <button
          type="button"
          className="absolute right-40px text-icon-surface-single-color-primary"
          onClick={modalVisibilityHandler}
        >
          <RxCross2 size={20} />
        </button>

        {/* Info: (20241112 - Julian) body */}
        <div className="flex flex-col items-center gap-24px">
          {/* Info: (20250102 - Julian) Opening Date */}
          <div className="flex w-full flex-col gap-8px">
            <p className="text-sm font-semibold text-input-text-primary">
              {t('settings:MANUAL_ACCOUNT_OPENING_MODAL.OPENING_DATE')}
            </p>
            <DatePicker
              type={DatePickerType.TEXT_DATE}
              period={openingDate}
              setFilteredPeriod={setOpeningDate}
            />
          </div>

          {/* Info: (20241112 - Julian) table */}
          <div className="flex w-full flex-col">
            <div className="hide-scrollbar max-h-300px overflow-y-auto rounded-md">
              {displayTable}
            </div>
          </div>

          {/* Info: (20250102 - Julian) Calculate total amount */}
          <div className="grid w-full grid-cols-4 items-center">
            <p className="text-sm font-medium text-text-neutral-secondary">
              {t('settings:MANUAL_ACCOUNT_OPENING_MODAL.BEGINNING_DEBIT')}
            </p>
            <p className={totalDebit === 0 ? 'text-text-neutral-primary' : totalStyle}>
              {totalDebit === 0 ? '-' : numberWithCommas(totalDebit)}
            </p>
            <p className="text-sm font-medium text-text-neutral-secondary">
              {t('settings:MANUAL_ACCOUNT_OPENING_MODAL.BEGINNING_CREDIT')}
            </p>
            <p className={totalCredit === 0 ? 'text-text-neutral-primary' : totalStyle}>
              {totalCredit === 0 ? '-' : numberWithCommas(totalCredit)}
            </p>
          </div>

          {/* Info: (20250102 - Julian) Divider */}
          <hr className="w-full border-stroke-neutral-quaternary" />

          {/* Info: (20250102 - Julian) Add new row button */}
          <Button
            type="button"
            variant="tertiary"
            onClick={addListClickHandler}
            size="defaultSquare"
          >
            <FaPlus />
          </Button>
        </div>

        {/* Info: (20241112 - Julian) buttons */}
        <div className="ml-auto flex items-center gap-12px">
          <Button type="button" variant="secondaryBorderless" onClick={modalVisibilityHandler}>
            {t('settings:MANUAL_ACCOUNT_OPENING_MODAL.CANCEL_BTN')}
          </Button>
          <Button
            type="button"
            variant="tertiary"
            onClick={submitHandler}
            disabled={submitDisabled}
          >
            {t('settings:MANUAL_ACCOUNT_OPENING_MODAL.SUBMIT_BTN')} <FaArrowRight />
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default ManualAccountOpeningModal;
