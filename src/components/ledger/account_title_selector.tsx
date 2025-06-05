import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
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
import { TbArrowBackUp } from 'react-icons/tb';

interface IAccountTitleSelectorProps {
  id?: number;
  defaultAccount?: IAccount | null;
  accountSelectedHandler: (account: IAccount) => void;

  // Info: (20250523 - Anna) 若有傳入，就由外層控制 Modal 開關（ex.ledger）
  // Info: (20250523 - Anna) 若未傳入，就用組件內部的狀態控制（ex.voucher）
  toggleModal?: () => void;

  // Info: (20241125 - Julian) 檢查
  flagOfSubmit?: boolean;
  accountIsNull?: boolean;

  // Info: (20250306 - Julian) 樣式
  className?: string;
}

interface IAccountSelectorModalProps {
  toggleModal: () => void;
  accountSelectedHandler: (account: IAccount) => void;
}

const AccountSelectorModal: React.FC<IAccountSelectorModalProps> = ({
  toggleModal,
  accountSelectedHandler,
}) => {
  const { t, i18n } = useTranslation(['common', 'reports']);
  const { connectedAccountBook } = useUserCtx();

  // Info: (20250306 - Julian) 搜尋欄 ref
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Info: (20250306 - Julian) 科目類別 ref
  const categoryRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Info: (20250306 - Julian) 會計科目 ref
  const accountRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Info: (20250306 - Julian) 查詢條件
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

  // Info: (20250521 - Anna) rightPart 顯示狀態
  const [isRightPartVisible, setIsRightPartVisible] = useState(false);

  const { trigger: getAccountList, data: accountTitleList } = APIHandler<IPaginatedAccount>(
    APIName.ACCOUNT_LIST,
    { params: { accountBookId: connectedAccountBook?.id }, query: queryCondition },
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

  useEffect(() => {
    // Info: (20250528 - Anna) 在 tablet 以下搜尋時，切換到右側
    if (window.innerWidth < 745 && searchKeyword !== '') {
      setIsRightPartVisible(true);
    }
  }, [searchKeyword]);

  // Info: (20241004 - Julian) 取得會計科目列表
  useEffect(() => {
    if (accountTitleList) {
      setAccountList(accountTitleList.data);
    }
  }, [accountTitleList]);

  // Info: (20250306 - Julian) 監聽 focus 事件
  useEffect(() => {
    const handleFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    document.addEventListener('focusin', handleFocus);

    return () => {
      document.removeEventListener('focusin', handleFocus);
    };
  }, []);

  // Info: (20250306 - Julian) Number 鍵事件：選擇科目類型
  const handleNumber = (event: KeyboardEvent) => {
    event.preventDefault();

    switch (event.key) {
      case '0':
        categoryRefs.current[0]?.click();
        break;
      case '1':
        categoryRefs.current[1]?.click();
        break;
      case '2':
        categoryRefs.current[2]?.click();
        break;
      case '3':
        categoryRefs.current[3]?.click();
        break;
      case '4':
        categoryRefs.current[4]?.click();
        break;
      case '5':
        categoryRefs.current[5]?.click();
        break;
      case '6':
        categoryRefs.current[6]?.click();
        break;
      case '7':
        categoryRefs.current[7]?.click();
        break;
      case '8':
        categoryRefs.current[8]?.click();
        break;
      case '9':
        categoryRefs.current[9]?.click();
        break;
      default:
        break;
    }
  };

  // Info: (20250306 - Julian) Slash 鍵事件：聚焦搜尋欄
  const handleSlash = (event: KeyboardEvent) => {
    event.preventDefault();

    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Info: (20250306 - Julian) 方向鍵事件：選擇會計科目
  const handleArrow = (event: KeyboardEvent) => {
    event.preventDefault();

    // Info: (20250306 - Julian) 取得目前聚焦的 index
    const index = accountRefs.current.findIndex((el) => el === document.activeElement);

    switch (event.key) {
      case 'ArrowRight':
        // Info: (20250306 - Julian) 右方向鍵 -> 聚焦到第一個會計科目
        accountRefs.current[0]?.focus();
        break;
      case 'ArrowUp':
        // Info: (20250306 - Julian) 上方向鍵 -> 向上移動
        if (index > 0) {
          accountRefs.current[index - 1]?.focus();
        }
        break;
      case 'ArrowDown':
        // Info: (20250306 - Julian) 下方向鍵 -> 向下移動
        if (index < accountRefs.current.length - 1) {
          accountRefs.current[index + 1]?.focus();
        }
        break;
      default:
        break;
    }
  };

  // Info: (20250306 - Julian) 快捷鍵設定
  useHotkeys(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], handleNumber);
  useHotkeys('/', handleSlash);
  useHotkeys(['ArrowUp', 'ArrowDown', 'ArrowRight'], handleArrow, { enableOnFormTags: true });

  const filteredAccountList = accountList.filter((account) => {
    if (selectedCategory === 'my_favorite') {
      return false; // ToDo: (20250305 - Julian) 我的最愛尚未完成
    } else if (selectedCategory !== '') {
      return account.type === selectedCategory;
    } else {
      return true;
    }
  });

  // Info: (20250521 - Anna) 左側科目類別
  const leftPart = (
    <div
      className={`hide-scrollbar h-300px w-270px flex-col gap-lv-4 overflow-y-auto px-lv-3 py-lv-5 tablet:flex tablet:h-480px tablet:w-330px ${isRightPartVisible ? 'hidden' : 'flex'}`}
    >
      {accountTypeList.map((acc, index) => {
        // Info: (20250306 - Julian) 判斷是否被選中
        const isSelected = selectedCategory === acc;

        const ref = (el: HTMLButtonElement) => {
          categoryRefs.current[index] = el;
        };

        const clickHandler = () => {
          // Info: (20250305 - Julian) 切換選擇狀態，再點一次即取消選擇
          if (selectedCategory === acc) setSelectedCategory('');
          else setSelectedCategory(acc);
          setIsRightPartVisible(true);
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
            <div className="flex-1 px-12px py-8px">
              {index} - {t(`journal:ACCOUNT_TYPE.${acc.toUpperCase()}`)}
            </div>
          );
        return (
          <button
            key={acc}
            type="button"
            ref={ref}
            onClick={clickHandler}
            className={`flex items-center border-l-2px border-tabs-stroke-default text-left text-base font-medium ${isSelected ? 'text-tabs-text-active' : 'text-tabs-text-default'} hover:text-tabs-text-active`}
          >
            {text}
            <FaChevronRight size={16} />
          </button>
        );
      })}
    </div>
  );

  // Info: (20250521 - Anna) 右側會計科目
  const rightPart = (
    <div
      className={`h-300px w-270px flex-col gap-lv-4 overflow-y-auto px-lv-3 py-lv-5 tablet:flex tablet:h-480px tablet:w-400px ${isRightPartVisible ? 'flex' : 'hidden'} `}
    >
      {filteredAccountList.length > 0 ? (
        filteredAccountList.map((account, index) => {
          // Info: (20250306 - Julian) 動態存入 ref
          const ref = (el: HTMLButtonElement) => {
            accountRefs.current[index] = el;
          };

          // Info: (20250306 - Julian) 選擇會計科目，並關閉 Modal
          const clickHandler = () => {
            accountSelectedHandler(account);
            toggleModal();
          };

          // Info: (20250521 - Julian) 如果沒有翻譯，則顯示原本的名稱
          const nameKey = `reports:ACCOUNTING_ACCOUNT.${account.name}`;
          const translatedName = i18n.exists(nameKey) ? t(nameKey) : account.name;

          return (
            <button
              key={account.id}
              type="button"
              ref={ref}
              className="px-12px py-8px text-left text-tabs-text-default outline-tabs-text-active hover:text-tabs-text-hover focus:outline-dashed"
              onClick={clickHandler}
            >
              {account.code} - {translatedName}
            </button>
          );
        })
      ) : (
        <p className="text-tabs-text-default">{t('journal:ADD_NEW_VOUCHER.NO_ACCOUNTING_FOUND')}</p>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="relative flex h-500px max-w-9/10 flex-col items-stretch rounded-sm bg-surface-neutral-surface-lv2 shadow-lg tablet:h-720px">
        {/* Info: (20250305 - Julian) Header */}
        <div className="relative flex flex-col items-center gap-4px px-20px py-16px">
          {/* Info: (20250521 - Anna) 返回按鈕 */}
          <button
            type="button"
            onClick={() => setIsRightPartVisible(false)}
            className={`absolute left-20px text-icon-surface-single-color-primary tablet:hidden ${isRightPartVisible ? 'flex' : 'hidden'}`}
          >
            <TbArrowBackUp size={24} />
          </button>

          {/* Info: (20250520 - Anna) 關閉按鈕 */}
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
          <p className="text-xs font-normal text-card-text-secondary">
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
              ref={searchInputRef}
              placeholder={t('common:COMMON.SEARCH')}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="flex-1 bg-transparent text-base text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder"
            />
            <FiSearch size={20} className="text-icon-surface-single-color-primary" />
          </div>
          {/* Info: (20250305 - Julian) Account list */}
          <div className="flex w-full divide-divider-stroke-lv-4 tablet:divide-x">
            {/* Info: (20250305 - Julian) Account Type Title */}
            {leftPart}
            {/* Info: (20250305 - Julian) Sub Account List */}
            {rightPart}
          </div>
        </div>
        {/* Info: (20250305 - Julian) Buttons */}
        <div className="ml-auto hidden items-center px-20px py-16px tablet:flex">
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
  toggleModal,
  flagOfSubmit,
  accountIsNull,
  className = '',
}) => {
  const { t } = useTranslation(['common', 'reports']);

  // Info: (20241121 - Julian) 會計科目 input ref
  const accountRef = useRef<HTMLButtonElement>(null);

  const accountString = defaultAccount
    ? `${defaultAccount?.code} ${defaultAccount?.name}`
    : t('journal:ADD_NEW_VOUCHER.SELECT_ACCOUNTING');

  // Info: (20250305 - Julian) 開啟 Account Selector modal
  const [isAccountSelectorOpen, setIsAccountSelectorMenuOpen] = useState(false);

  // Info: (20241125 - Julian) input state
  const [accountStyle, setAccountStyle] = useState<string>(inputStyle.NORMAL);

  useEffect(() => {
    // Info: (20241007 - Julian) 檢查是否填入會計科目
    setAccountStyle(accountIsNull ? inputStyle.ERROR : inputStyle.NORMAL);
  }, [flagOfSubmit]);

  useEffect(() => {
    // Info: (20241007 - Julian) 修改會計科目時，樣式改回 NORMAL
    setAccountStyle(inputStyle.NORMAL);
  }, [defaultAccount]);

  // Info: (20241121 - Julian) 編輯會計科目：開啟 Accounting Menu
  const accountEditingHandler = () => setIsAccountSelectorMenuOpen(true);

  const toggleAccountSelector = () => {
    setIsAccountSelectorMenuOpen(!isAccountSelectorOpen);
  };
  // Info: (20250523 - Anna) 若父層有傳入 toggleModal，表示由父層控制 modal 開關（ex.ledger）
  // Info: (20250523 - Anna) 不需再渲染 selector 按鈕，直接渲染 <AccountSelectorModal>
  if (toggleModal) {
    return (
      <AccountSelectorModal
        toggleModal={toggleModal}
        accountSelectedHandler={accountSelectedHandler}
      />
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        id={`account-title-${id}`}
        ref={accountRef}
        type="button"
        onClick={accountEditingHandler}
        className={`flex w-full items-center justify-between gap-8px divide-x divide-input-stroke-input rounded-sm border border-input-stroke-input bg-input-surface-input-background hover:cursor-pointer hover:divide-input-stroke-selected hover:border-input-stroke-selected ${isAccountSelectorOpen ? 'divide-input-stroke-selected border-input-stroke-selected text-tabs-text-active' : accountStyle}`}
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
