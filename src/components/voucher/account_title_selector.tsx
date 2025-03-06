import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
// import useOuterClick from '@/lib/hooks/use_outer_click';
import { AccountTypeBeta } from '@/constants/account';
import { FaChevronRight, FaRegStar } from 'react-icons/fa';
import { FiSearch } from 'react-icons/fi';
import { RxCross2 } from 'react-icons/rx';
import { inputStyle } from '@/constants/display';
import { LuBookOpen } from 'react-icons/lu';
import { IAccount, IPaginatedAccount } from '@/interfaces/accounting_account';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { useUserCtx } from '@/contexts/user_context';
import { Button } from '@/components/button/button';
import { useHotkeys } from 'react-hotkeys-hook';

interface IAccountTitleSelectorProps {
  id: number;
  defaultAccount: IAccount | null;
  accountSelectedHandler: (account: IAccount) => void;

  // Info: (20241125 - Julian) 檢查
  flagOfSubmit?: boolean;
  accountIsNull?: boolean;
}

interface IAccountSelectorModalProps {
  toggleModal: () => void;
  accountSelectedHandler: (account: IAccount) => void;
}

const AccountSelectorModal: React.FC<IAccountSelectorModalProps> = ({
  toggleModal,
  accountSelectedHandler,
}) => {
  const { t } = useTranslation('common');
  const { selectedAccountBook } = useUserCtx();

  const queryCondition = {
    limit: 9999, // Info: (20241212 - Julian) 全部取出
    forUser: true,
    sortBy: 'code', // Info: (20241018 - Julian) 依 code 排序
    sortOrder: 'asc',
    isDeleted: false, // Info: (20250102 - Julian) 只取未刪除的
  };

  // Info: (20250305 - Julian) 大分類，並加入「我的最愛」選項
  const accountTypeList = ['my_favorite', ...Object.values(AccountTypeBeta)];

  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [accountList, setAccountList] = useState<IAccount[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const { trigger: getAccountList, data: accountTitleList } = APIHandler<IPaginatedAccount>(
    APIName.ACCOUNT_LIST,
    { params: { companyId: selectedAccountBook?.id }, query: queryCondition },
    false,
    true
  );

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

  const filteredAccountList = accountList.filter((account) => {
    if (selectedCategory === 'my_favorite') {
      return false; // ToDo: (20250305 - Julian) 未完成
    } else if (selectedCategory !== '') {
      return account.type === selectedCategory;
    } else {
      return true;
    }
  });

  const leftPart = (
    <div className="flex h-450px w-330px flex-col gap-lv-4 overflow-y-auto px-lv-3 py-lv-5 pr-lv-5">
      {accountTypeList.map((acc, index) => {
        const isSelected = selectedCategory === acc;
        const clickHandler = () => {
          // Info: (20250305 - Julian) 切換選擇狀態，再點一次即取消選擇
          if (selectedCategory === acc) setSelectedCategory('');
          else setSelectedCategory(acc);
        };

        const text =
          acc === 'my_favorite' ? (
            // Info: (20250305 - Julian) 我的最愛 -> 顯示星星
            <div className="flex flex-1 items-center gap-8px px-12px py-8px">
              <FaRegStar />
              <p>{t(`journal:ACCOUNT_TYPE.${acc.toUpperCase()}`)}</p>
            </div>
          ) : (
            // Info: (20250305 - Julian) 一般會計科目 -> 顯示編號和名稱
            <p className="flex-1 px-12px py-8px">
              {index} - {t(`journal:ACCOUNT_TYPE.${acc.toUpperCase()}`)}
            </p>
          );
        return (
          <div
            key={acc}
            onClick={clickHandler}
            className={`flex items-center border-l-2px border-tabs-stroke-default text-base font-medium ${isSelected ? 'text-tabs-text-active' : 'text-tabs-text-default'} hover:cursor-pointer hover:text-tabs-text-active`}
          >
            {text}
            <FaChevronRight size={16} />
          </div>
        );
      })}
    </div>
  );

  const rightPart = (
    <div className="flex h-450px w-400px flex-col gap-lv-4 overflow-y-auto px-lv-3 py-lv-5 pl-lv-5">
      {filteredAccountList.length > 0 ? (
        filteredAccountList.map((account) => {
          const clickHandler = () => {
            accountSelectedHandler(account);
            toggleModal();
          };
          return (
            <div
              key={account.id}
              className="text-tabs-text-default hover:cursor-pointer hover:text-tabs-text-hover"
              onClick={clickHandler}
            >
              {account.code} - {account.name}
            </div>
          );
        })
      ) : (
        <p className="text-tabs-text-default">{t('journal:ADD_NEW_VOUCHER.NO_ACCOUNTING_FOUND')}</p>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="relative flex h-720px flex-col items-stretch rounded-sm bg-surface-neutral-surface-lv2 shadow-lg">
        {/* Info: (20250305 - Julian) Header */}
        <div className="relative flex flex-col items-center gap-4px px-20px py-16px">
          <button
            type="button"
            onClick={toggleModal}
            className="absolute right-20px text-icon-surface-single-color-primary"
          >
            <RxCross2 size={24} />
          </button>
          <h2 className="text-xl font-bold text-card-text-primary">
            {t('journal:ACCOUNT_SELECTOR_MODAL.MAIN_TITLE')}
          </h2>
          <p className="text-xs font-medium text-card-text-secondary">
            {t('journal:ACCOUNT_SELECTOR_MODAL.SUB_TITLE')}
          </p>
        </div>
        {/* Info: (20250305 - Julian) Body */}
        <div className="flex flex-col gap-lv-5 p-10px">
          {/* Info: (20250305 - Julian) Search bar */}
          <div className="flex w-full items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px">
            <input
              id="account-title-search"
              type="text"
              placeholder={t('common:COMMON.SEARCH')}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="flex-1 bg-transparent text-base text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder"
            />
            <FiSearch size={20} className="text-icon-surface-single-color-primary" />
          </div>
          {/* Info: (20250305 - Julian) Account list */}
          <div className="flex w-full divide-x divide-divider-stroke-lv-4">
            {/* Info: (20250305 - Julian) Account Type Title */}
            {leftPart}
            {/* Info: (20250305 - Julian) Sub Account List */}
            {rightPart}
          </div>
        </div>
        {/* Info: (20250305 - Julian) Buttons */}
        <div className="ml-auto flex items-center px-20px py-16px">
          <Button type="button" size="medium" variant="tertiaryOutlineGrey" onClick={toggleModal}>
            <RxCross2 size={16} />
            <p>{t('common:COMMON.CLOSE')}</p>
          </Button>
        </div>
      </div>
    </div>
  );
};

const AccountTitleSelector: React.FC<IAccountTitleSelectorProps> = ({
  id,
  defaultAccount,
  accountSelectedHandler,
  flagOfSubmit,
  accountIsNull,
}) => {
  const { t } = useTranslation('common');

  // Info: (20241121 - Julian) 會計科目 input ref
  const accountInputRef = useRef<HTMLInputElement>(null);
  // const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Info: (20241001 - Julian) Accounting 下拉選單
  // const {
  //   targetRef: accountingRef,
  //   componentVisible: isAccountingMenuOpen,
  //   setComponentVisible: setAccountingMenuOpen,
  // } = useOuterClick<HTMLDivElement>(false);

  // Info: (20241001 - Julian) Account 編輯狀態
  // const {
  //   targetRef: accountRef,
  //   componentVisible: isAccountEditing,
  //   setComponentVisible: setIsAccountEditing,
  // } = useOuterClick<HTMLButtonElement>(false);

  const accountString = defaultAccount
    ? `${defaultAccount?.code} ${defaultAccount?.name}`
    : t('journal:ADD_NEW_VOUCHER.SELECT_ACCOUNTING');

  // Info: (20250305 - Julian) 開啟 Account Selector modal
  const [isAccountSelectorOpen, setIsAccountSelectorMenuOpen] = useState(false);

  // Info: (20241125 - Julian) input state
  const [accountStyle, setAccountStyle] = useState<string>(inputStyle.NORMAL);
  // const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Info: (20241125 - Julian) list state
  // const [accountList, setAccountList] = useState<IAccount[]>([]);
  // const [activeOptionIndex, setActiveOptionIndex] = useState(0);

  useEffect(() => {
    // Info: (20241007 - Julian) 檢查是否填入會計科目
    setAccountStyle(accountIsNull ? inputStyle.ERROR : inputStyle.NORMAL);
  }, [flagOfSubmit]);

  // useEffect(() => {
  //   // Info: (20241004 - Julian) 查詢會計科目關鍵字時聚焦
  //   if (isAccountEditing && accountInputRef.current) {
  //     accountInputRef.current.focus();
  //   }

  //   // Info: (20241001 - Julian) 查詢模式關閉後清除搜尋關鍵字
  //   if (!isAccountEditing) {
  //     setSearchKeyword('');
  //   }
  // }, [isAccountEditing]);

  useEffect(() => {
    // Info: (20241007 - Julian) 修改會計科目時，樣式改回 NORMAL
    setAccountStyle(inputStyle.NORMAL);
  }, [defaultAccount]);

  // Info: (20241121 - Julian) 編輯會計科目：開啟 Accounting Menu
  const accountEditingHandler = () => {
    // setIsAccountEditing(true);
    setIsAccountSelectorMenuOpen(true);
  };

  // Info: (20241125 - Julian) 會計科目搜尋
  // const accountSearchHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   setSearchKeyword(e.target.value);
  //   setIsAccountSelectorMenuOpen(true);
  // };

  // Info: (20241004 - Julian) Remove AccountType.OTHER_COMPREHENSIVE_INCOME, AccountType.CASH_FLOW, AccountType.OTHER
  // const accountTypeList = Object.values(AccountTypeBeta);

  // const accountTitleMenu = accountTypeList.map((value) => {
  //   // Info: (20241004 - Julian) 子項目
  //   const childAccountList = accountList.filter((account) => account.type === value);
  //   const childAccountMenu = childAccountList.map((account) => {
  //     // Info: (20241125 - Julian) 選項 ref
  //     const optionRef = (el: HTMLButtonElement) => {
  //       optionRefs.current[account.id] = el;
  //     };

  //     const accountClickHandler = () => {
  //       // Info: (20241001 - Julian) 關閉 Accounting Menu 和編輯狀態
  //       setIsAccountSelectorMenuOpen(false);
  //       // setIsAccountEditing(false);
  //       // Info: (20241001 - Julian) 重置搜尋關鍵字
  //       setSearchKeyword('');
  //       // Info: (20241001 - Julian) 設定 Account title
  //       accountSelectedHandler(account);
  //     };

  //     return (
  //       <button
  //         key={account.id}
  //         type="button"
  //         ref={optionRef}
  //         onClick={accountClickHandler}
  //         className="flex w-full gap-8px px-12px py-8px text-left text-sm hover:bg-dropdown-surface-menu-background-secondary"
  //       >
  //         <p className="text-dropdown-text-primary">{account.code}</p>
  //         <p className="text-dropdown-text-secondary">{account.name}</p>
  //       </button>
  //     );
  //   });

  //   return (
  //     // Info: (20241004 - Julian) 顯示有子項目的 AccountType
  //     childAccountList.length > 0 ? (
  //       <div key={value} className="flex flex-col">
  //         <p className="px-12px py-8px text-xs font-semibold uppercase text-dropdown-text-head">
  //           {t(`journal:ACCOUNT_TYPE.${value.toUpperCase()}`)}
  //         </p>
  //         <div className="flex flex-col py-4px">{childAccountMenu}</div>
  //       </div>
  //     ) : null
  //   );
  // });

  // Info: (20241004 - Julian) 沒有子項目時顯示 no accounting found
  // const isShowAccountingMenu =
  //   // Info: (20241004 - Julian) 找出有子項目的 AccountType
  //   accountTitleMenu.filter((value) => value !== null).length > 0 ? (
  //     accountTitleMenu
  //   ) : (
  //     <p className="px-12px py-8px text-sm text-input-text-input-placeholder">
  //       {t('journal:ADD_NEW_VOUCHER.NO_ACCOUNTING_FOUND')}
  //     </p>
  //   );

  // Info: (20241125 - Julian) Number 鍵事件
  const handleNumber = (event: KeyboardEvent) => {
    event.preventDefault();
    if (
      // Info: (20241125 - Julian) 限制只有在 focus 會計科目時才能觸發
      // document.activeElement === accountRef.current ||
      document.activeElement === accountInputRef.current
    ) {
      // if (!isAccountEditing) {
      //   setIsAccountEditing(true);
      //   setIsAccountSelectorMenuOpen(true);
      // }
    }
  };

  // Info: (20241125 - Julian) 處理 Tab 和方向鍵的切換邏輯
  const handleNavigation = (event: KeyboardEvent) => {
    if (isAccountSelectorOpen) {
      event.preventDefault();

      // ToDo: (20250305 - Julian) !!!!!!!快捷鍵須重新設計!!!!!!!

      // if (event.key === 'ArrowDown' || event.key === 'Tab') {
      //   // Info: (20241125 - Julian) 選擇下一個選項
      //   setActiveOptionIndex((prev) => {
      //     const nextIndex = Math.min(prev + 1, accountList.length - 1);
      //     const targetId = accountList[nextIndex]?.id;

      //     // Info: (20241125 - Julian) 聚焦目標選項
      //     if (targetId && optionRefs.current[targetId]) {
      //       optionRefs.current[targetId]?.focus();

      //       // Info: (20241125 - Julian) 確保選項在可視範圍內
      //       optionRefs.current[targetId]?.scrollIntoView({
      //         behavior: 'smooth',
      //         block: 'nearest',
      //       });
      //     }
      //     return nextIndex;
      //   });
      // } else if (event.key === 'ArrowUp') {
      //   // Info: (20241125 - Julian) 選擇上一個選項
      //   setActiveOptionIndex((prev) => prev - 1);
      //   const targetId = accountList[activeOptionIndex - 1]?.id;
      //   optionRefs.current[targetId]?.focus();
      // }
    }
  };

  useHotkeys(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], handleNumber);
  useHotkeys(['tab', 'ArrowUp', 'ArrowDown'], handleNavigation);

  const toggleAccountSelector = () => {
    setIsAccountSelectorMenuOpen(!isAccountSelectorOpen);
  };

  // const displayedAccountingMenu = isAccountingMenuOpen ? (
  //   <div
  //     ref={accountingRef}
  //     className="absolute top-72px z-30 w-full rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px shadow-dropmenu"
  //   >
  //     <div className="flex max-h-150px flex-col overflow-y-auto">{isShowAccountingMenu}</div>
  //   </div>
  // ) : null;

  // const isEditAccounting = isAccountEditing ? (
  //   <input
  //     id={`account-title-search-${id}`}
  //     ref={accountInputRef}
  //     value={searchKeyword}
  //     // onChange={accountSearchHandler}
  //     placeholder={accountString}
  //     className="w-full truncate bg-transparent px-12px py-10px text-input-text-input-filled outline-none"
  //   />
  // ) : (
  //   <p className={`truncate px-12px py-10px ${accountStyle}`}>{accountString}</p>
  // );

  return (
    <div className="relative col-span-3">
      <button
        id={`account-title-${id}`}
        // ref={accountRef}
        type="button"
        onClick={accountEditingHandler}
        className={`mt-lv-5 flex w-full items-center justify-between gap-8px divide-x divide-input-stroke-input rounded-sm border border-input-stroke-input bg-input-surface-input-background hover:cursor-pointer hover:divide-input-stroke-selected hover:border-input-stroke-selected ${isAccountSelectorOpen ? 'divide-input-stroke-selected border-input-stroke-selected text-tabs-text-active' : accountStyle}`}
      >
        <p className={`truncate px-12px py-10px`}>{accountString}</p>
        <div className="flex h-44px items-center justify-center px-12px py-10px">
          <LuBookOpen size={20} />
        </div>
      </button>

      {/* Info: (20250305 - Julian) Account Selector modal */}
      {isAccountSelectorOpen && (
        <AccountSelectorModal
          toggleModal={toggleAccountSelector}
          accountSelectedHandler={accountSelectedHandler}
        />
      )}
    </div>
  );
};

export default AccountTitleSelector;
