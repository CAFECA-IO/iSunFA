import React, { useState, useEffect, useRef } from 'react';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { useTranslation } from 'next-i18next';
import { LuTrash2 } from 'react-icons/lu';
import { FiBookOpen } from 'react-icons/fi';
import { AccountType } from '@/constants/account';
import { IAccount, IPaginatedAccount } from '@/interfaces/accounting_account';
// import { numberWithCommas } from '@/lib/utils/common';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { ILineItemUI, IReverseItemUI } from '@/interfaces/line_item';
import { useUserCtx } from '@/contexts/user_context';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { useGlobalCtx } from '@/contexts/global_context';
import { FREE_COMPANY_ID } from '@/constants/config';
import { FaPlus } from 'react-icons/fa6';
import ReverseLineItem from '@/components/voucher/reverse_line_item';

interface IVoucherLineItemProps {
  id: number;
  data: ILineItemUI; // Info: (20241121 - Julian) 單筆 LineItem 資料
  setLineItems: React.Dispatch<React.SetStateAction<ILineItemUI[]>>; // Info: (20241121 - Julian) 更新 LineItem
  flagOfClear: boolean;
  flagOfSubmit: boolean;
  accountIsNull: boolean;
  amountNotEqual: boolean;
  amountIsZero: boolean;
}

const VoucherLineItem: React.FC<IVoucherLineItemProps> = ({
  id,
  data,
  setLineItems,
  flagOfClear,
  flagOfSubmit,
  accountIsNull,
  amountNotEqual,
  amountIsZero,
}) => {
  const { t } = useTranslation('common');
  const { selectedCompany } = useUserCtx();
  const { reverseList: commonReverseList, addReverseListHandler } = useAccountingCtx();
  const { selectReverseItemsModalVisibilityHandler, selectReverseDataHandler } = useGlobalCtx();

  const companyId = selectedCompany?.id ?? FREE_COMPANY_ID;

  const {
    id: lineItemId,
    account: lineItemAccount,
    description: lineItemDescription,
    debit: lineItemDebit,
    amount: lineItemAmount,
    reverseList: lineItemReverseList,
  } = data;

  // Info: (20241121 - Julian) 判斷借貸金額
  const lineItemDebitAmount = lineItemDebit === true ? lineItemAmount : 0;
  const lineItemCreditAmount = lineItemDebit === false ? lineItemAmount : 0;

  // Info: (20241121 - Julian) 判斷是否顯示反轉分錄
  const isShowReverse =
    (lineItemAccount?.code === '2171' && lineItemDebitAmount > 0) || // Info: (20241001 - Julian) 應付帳款
    (lineItemAccount?.code === '1172' && lineItemCreditAmount > 0); // Info: (20241001 - Julian) 應收帳款

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
    { params: { companyId }, query: queryCondition },
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

  // Info: (20241121 - Julian) ReverseList state
  const [reverseListUI, setReverseListUI] = useState<IReverseItemUI[]>([]);

  // Info: (20241121 - Julian) 會計科目 input ref
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
  } = useOuterClick<HTMLButtonElement>(false);

  // Info: (20241118 - Julian) 設定預設值
  useEffect(() => {
    const defaultAccountTitle = lineItemAccount
      ? `${lineItemAccount.code} ${lineItemAccount.name}`
      : t('journal:ADD_NEW_VOUCHER.SELECT_ACCOUNTING');

    const defaultDebit = lineItemDebitAmount.toString();
    const defaultCredit = lineItemCreditAmount.toString();

    setAccountTitle(defaultAccountTitle);
    setParticulars(lineItemDescription);
    setDebitInput(defaultDebit);
    setCreditInput(defaultCredit);
  }, [data]);

  // Info: (20241121 - Julian) 把預設的反轉分錄列表丟進 reverseList 裡，讓使用者可以編輯
  useEffect(() => {
    if (lineItemReverseList.length > 0) {
      const defaultReverseList: IReverseItemUI[] = data.reverseList.map((reverseItem) => {
        const reverseItemUI: IReverseItemUI = {
          ...reverseItem,
          lineItemIndex: data.id,
          isSelected: false,
          reverseAmount: reverseItem.amount,
        };
        return reverseItemUI;
      });

      setReverseListUI(defaultReverseList);

      defaultReverseList.forEach((item) => {
        addReverseListHandler(item.lineItemIndex, [item]);
      });
    }
  }, []);

  // Info: (20241121 - Julian) 共用的反轉分錄列表變動時，更新 UI
  useEffect(() => {
    const newReverseList: IReverseItemUI[] = commonReverseList[data.id] || [];
    setReverseListUI(newReverseList);
    // Info: (20241121 - Julian) 更新反轉分錄列表
    setLineItems((prev) => {
      const duplicateList = [...prev];
      const index = duplicateList.findIndex((item) => item.id === data.id);
      if (index !== -1) {
        duplicateList[index] = { ...duplicateList[index], reverseList: newReverseList };
      }
      return duplicateList;
    });
  }, [commonReverseList]);

  // Info: (20241121 - Julian) 搜尋關鍵字時取得會計科目列表
  useEffect(() => {
    getAccountList({
      query: {
        ...queryCondition,
        searchKey: searchKeyword,
      },
    });
  }, [searchKeyword]);

  // Info: (20241004 - Julian) 取得會計科目列表
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

  // Info: (20241118 - Julian) 若借方金額不為 0，則禁用貸方金額輸入；反之亦然
  const isDebitDisabled = creditInput !== '0' && creditInput !== '';
  const isCreditDisabled = debitInput !== '0' && debitInput !== '';

  const accountSearchHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(e.target.value);
    setAccountingMenuOpen(true);
  };

  const particularsInputChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParticulars(e.target.value);
    // Info: (20241121 - Julian) 設定 Particulars
    setLineItems((prev) => {
      const duplicateList = [...prev];
      const index = duplicateList.findIndex((item) => item.id === data.id);
      if (index !== -1) {
        duplicateList[index] = { ...duplicateList[index], description: e.target.value };
      }
      return duplicateList;
    });
  };

  const debitInputChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Info: (20241001 - Julian) 限制只能輸入數字，並去掉開頭 0
    const debitNum = parseInt(e.target.value, 10);
    const debitValue = Number.isNaN(debitNum) ? 0 : debitNum;

    // Info: (20241105 - Julian) 加入千分位逗號會造成輸入錯誤，暫時移除
    // setDebitInput(numberWithCommas(debitValue));
    setDebitInput(debitValue.toString());
    // Info: (20241001 - Julian) 設定 Debit
    setLineItems((prev) => {
      const duplicateList = [...prev];
      const index = duplicateList.findIndex((item) => item.id === data.id);
      if (index !== -1) {
        duplicateList[index] = { ...duplicateList[index], amount: debitValue, debit: true };
      }
      return duplicateList;
    });
  };

  const creditInputChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Info: (20241001 - Julian) 限制只能輸入數字，並去掉開頭 0
    const creditNum = parseInt(e.target.value, 10);
    const creditValue = Number.isNaN(creditNum) ? 0 : creditNum;

    // Info: (20241105 - Julian) 加入千分位逗號會造成輸入錯誤，暫時移除
    // setCreditInput(numberWithCommas(creditValue));
    setCreditInput(creditValue.toString());
    // Info: (20241001 - Julian) 設定 Credit
    setLineItems((prev) => {
      const duplicateList = [...prev];
      const index = duplicateList.findIndex((item) => item.id === data.id);
      if (index !== -1) {
        duplicateList[index] = { ...duplicateList[index], amount: creditValue, debit: false };
      }
      return duplicateList;
    });
  };

  // Info: (20241121 - Julian) 編輯會計科目：開啟 Accounting Menu
  const accountEditingHandler = () => {
    setIsAccountEditing(true);
    setAccountingMenuOpen(true);
  };

  // Info: (20241120 - Julian) 新增反轉分錄
  const addReverseHandler = () => {
    const modalData = {
      account: lineItemAccount, // Info: (20241105 - Julian) 會計科目編號
      lineItemIndex: lineItemId, // Info: (20241105 - Julian) LineItem ID
    };

    selectReverseDataHandler(modalData);
    selectReverseItemsModalVisibilityHandler();
  };

  const deleteLineHandler = () => {
    setLineItems((prev) => prev.filter((item) => item.id !== data.id));
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
        setLineItems((prev) => {
          const duplicateList = [...prev];
          const index = duplicateList.findIndex((item) => item.id === data.id);
          if (index !== -1) {
            duplicateList[index] = { ...duplicateList[index], account };
          }
          return duplicateList;
        });
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
        <div key={value} className="flex flex-col">
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
      id={`account-title-search-${id}`}
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
      {/* Info: (20241121 - Julian) Line Item */}
      <>
        {/* Info: (20240927 - Julian) Accounting */}
        <div className="relative col-span-3">
          <button
            id={`account-title-${id}`}
            ref={accountRef}
            type="button"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setIsAccountEditing(true);
                setAccountingMenuOpen(true);
              }
            }}
            onClick={accountEditingHandler}
            className={`flex w-full items-center justify-between gap-8px rounded-sm border bg-input-surface-input-background px-12px py-10px hover:cursor-pointer hover:border-input-stroke-selected ${isAccountingMenuOpen ? 'border-input-stroke-selected' : accountStyle}`}
          >
            {isEditAccounting}
            <div className="h-20px w-20px">
              <FiBookOpen size={20} />
            </div>
          </button>
          {/* Info: (20241001 - Julian) Accounting Menu */}
          {displayedAccountingMenu}
        </div>
        {/* Info: (20240927 - Julian) Particulars */}
        <input
          id={`particulars-input-${id}`}
          type="string"
          value={particulars}
          onChange={particularsInputChangeHandler}
          className="col-span-3 rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-input-text-input-filled"
        />
        {/* Info: (20240927 - Julian) Debit */}
        <input
          id={`debit-input-${id}`}
          type="string"
          value={debitInput}
          onChange={debitInputChangeHandler}
          placeholder="0"
          disabled={isDebitDisabled}
          className={`${amountStyle} col-span-3 rounded-sm border bg-input-surface-input-background px-12px py-10px text-right disabled:bg-input-surface-input-disable`}
        />
        {/* Info: (20240927 - Julian) Credit */}
        <input
          id={`credit-input-${id}`}
          type="string"
          value={creditInput}
          onChange={creditInputChangeHandler}
          placeholder="0"
          disabled={isCreditDisabled}
          className={`${amountStyle} col-span-3 rounded-sm border bg-input-surface-input-background px-12px py-10px text-right disabled:bg-input-surface-input-disable`}
        />
        {/* Info: (20240927 - Julian) Delete button */}
        <div
          id={`delete-line-item-btn-${id}`}
          className="text-center text-stroke-neutral-invert hover:text-button-text-primary-hover"
        >
          <button type="button" className="p-12px" onClick={deleteLineHandler}>
            <LuTrash2 size={22} />
          </button>
        </div>
      </>

      {/* Info: (20241104 - Julian) 反轉分錄列表 */}
      {commonReverseList && reverseListUI.length > 0
        ? reverseListUI.map((item) => {
            const removeReverse = () =>
              addReverseListHandler(
                data.id,
                reverseListUI.filter((reverseItem) => reverseItem.voucherId !== item.voucherId)
              );
            return (
              <ReverseLineItem
                key={`${item.voucherId}-${id}`}
                reverseItem={item}
                addHandler={addReverseHandler}
                removeHandler={removeReverse}
              />
            );
          })
        : null}

      {/* Info: (20241104 - Julian) 如果需要反轉分錄，則顯示新增按鈕 */}
      {isShowReverse ? (
        <div key={`add-reverse-item-${id}`} className="col-start-1 col-end-13">
          <button
            id="add-reverse-item-button"
            type="button"
            className="flex items-center gap-4px text-text-neutral-invert"
            onClick={addReverseHandler}
          >
            <FaPlus />
            <p>{t('journal:VOUCHER_LINE_BLOCK.REVERSE_ITEM')}</p>
          </button>
        </div>
      ) : null}
    </>
  );
};

export default VoucherLineItem;
