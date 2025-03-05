import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { inputStyle } from '@/constants/display';
import { AccountTypeBeta } from '@/constants/account';
import { FiBookOpen } from 'react-icons/fi';
import { IAccount, IPaginatedAccount } from '@/interfaces/accounting_account';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { useUserCtx } from '@/contexts/user_context';
import { useHotkeys } from 'react-hotkeys-hook';

interface IAccountTitleDropmenuProps {
  id: number;
  defaultAccount: IAccount | null;
  accountSelectedHandler: (account: IAccount) => void;

  // Info: (20241125 - Julian) 檢查
  flagOfSubmit: boolean;
  accountIsNull: boolean;
}

const AccountTitleDropmenu: React.FC<IAccountTitleDropmenuProps> = ({
  id,
  defaultAccount,
  accountSelectedHandler,
  flagOfSubmit,
  accountIsNull,
}) => {
  const { t } = useTranslation('common');

  const { selectedAccountBook } = useUserCtx();

  // Info: (20241121 - Julian) 會計科目 input ref
  const accountInputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

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

  const queryCondition = {
    limit: 9999, // Info: (20241212 - Julian) 全部取出
    forUser: true,
    sortBy: 'code', // Info: (20241018 - Julian) 依 code 排序
    sortOrder: 'asc',
    isDeleted: false, // Info: (20250102 - Julian) 只取未刪除的
  };

  const { trigger: getAccountList, data: accountTitleList } = APIHandler<IPaginatedAccount>(
    APIName.ACCOUNT_LIST,
    { params: { companyId: selectedAccountBook?.id }, query: queryCondition },
    false,
    true
  );

  const accountString = defaultAccount
    ? `${defaultAccount?.code} ${defaultAccount?.name}`
    : t('journal:ADD_NEW_VOUCHER.SELECT_ACCOUNTING');

  // Info: (20241125 - Julian) input state
  const [accountStyle, setAccountStyle] = useState<string>(inputStyle.NORMAL);
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Info: (20241125 - Julian) list state
  const [accountList, setAccountList] = useState<IAccount[]>([]);
  const [activeOptionIndex, setActiveOptionIndex] = useState(0);

  useEffect(() => {
    // Info: (20241007 - Julian) 檢查是否填入會計科目
    setAccountStyle(accountIsNull ? inputStyle.ERROR : inputStyle.NORMAL);
  }, [flagOfSubmit]);

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
    // Info: (20241007 - Julian) 修改會計科目時，樣式改回 NORMAL
    setAccountStyle(inputStyle.NORMAL);
  }, [defaultAccount]);

  // Info: (20241121 - Julian) 編輯會計科目：開啟 Accounting Menu
  const accountEditingHandler = () => {
    setIsAccountEditing(true);
    setAccountingMenuOpen(true);
  };

  // Info: (20241125 - Julian) 會計科目搜尋
  const accountSearchHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(e.target.value);
    setAccountingMenuOpen(true);
  };

  // Info: (20241004 - Julian) Remove AccountType.OTHER_COMPREHENSIVE_INCOME, AccountType.CASH_FLOW, AccountType.OTHER
  const accountTypeList = Object.values(AccountTypeBeta);

  const accountTitleMenu = accountTypeList.map((value) => {
    // Info: (20241004 - Julian) 子項目
    const childAccountList = accountList.filter((account) => account.type === value);
    const childAccountMenu = childAccountList.map((account) => {
      // Info: (20241125 - Julian) 選項 ref
      const optionRef = (el: HTMLButtonElement) => {
        optionRefs.current[account.id] = el;
      };

      const accountClickHandler = () => {
        // Info: (20241001 - Julian) 關閉 Accounting Menu 和編輯狀態
        setAccountingMenuOpen(false);
        setIsAccountEditing(false);
        // Info: (20241001 - Julian) 重置搜尋關鍵字
        setSearchKeyword('');
        // Info: (20241001 - Julian) 設定 Account title
        accountSelectedHandler(account);
      };

      return (
        <button
          key={account.id}
          type="button"
          ref={optionRef}
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

  // Info: (20241125 - Julian) Number 鍵事件
  const handleNumber = (event: KeyboardEvent) => {
    event.preventDefault();
    if (
      // Info: (20241125 - Julian) 限制只有在 focus 會計科目時才能觸發
      document.activeElement === accountRef.current ||
      document.activeElement === accountInputRef.current
    ) {
      if (!isAccountEditing) {
        setIsAccountEditing(true);
        setAccountingMenuOpen(true);
      }
    }
  };

  // Info: (20241125 - Julian) 處理 Tab 和方向鍵的切換邏輯
  const handleNavigation = (event: KeyboardEvent) => {
    if (isAccountEditing) {
      event.preventDefault();

      if (event.key === 'ArrowDown' || event.key === 'Tab') {
        // Info: (20241125 - Julian) 選擇下一個選項
        setActiveOptionIndex((prev) => {
          const nextIndex = Math.min(prev + 1, accountList.length - 1);
          const targetId = accountList[nextIndex]?.id;

          // Info: (20241125 - Julian) 聚焦目標選項
          if (targetId && optionRefs.current[targetId]) {
            optionRefs.current[targetId]?.focus();

            // Info: (20241125 - Julian) 確保選項在可視範圍內
            optionRefs.current[targetId]?.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest',
            });
          }
          return nextIndex;
        });
      } else if (event.key === 'ArrowUp') {
        // Info: (20241125 - Julian) 選擇上一個選項
        setActiveOptionIndex((prev) => prev - 1);
        const targetId = accountList[activeOptionIndex - 1]?.id;
        optionRefs.current[targetId]?.focus();
      }
    }
  };

  useHotkeys(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], handleNumber);
  useHotkeys(['tab', 'ArrowUp', 'ArrowDown'], handleNavigation);

  const displayedAccountingMenu = isAccountingMenuOpen ? (
    <div
      ref={accountingRef}
      className="absolute top-72px z-30 w-full rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px shadow-dropmenu"
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
      placeholder={accountString}
      className="w-full truncate bg-transparent text-input-text-input-filled outline-none"
    />
  ) : (
    <p className={`truncate ${accountStyle}`}>{accountString}</p>
  );

  return (
    <div className="relative col-span-3">
      <button
        id={`account-title-${id}`}
        ref={accountRef}
        type="button"
        onClick={accountEditingHandler}
        className={`mt-lv-5 flex w-full items-center justify-between gap-8px rounded-sm border bg-input-surface-input-background px-12px py-10px hover:cursor-pointer hover:border-input-stroke-selected ${isAccountingMenuOpen ? 'border-input-stroke-selected' : accountStyle}`}
      >
        {isEditAccounting}
        <div className="h-20px w-20px">
          <FiBookOpen size={20} />
        </div>
      </button>
      {/* Info: (20241001 - Julian) Accounting Menu */}
      {displayedAccountingMenu}
    </div>
  );
};

export default AccountTitleDropmenu;
