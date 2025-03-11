import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { AccountTypeBeta } from '@/constants/account';
import { FaChevronRight, FaRegStar } from 'react-icons/fa';
import { FiSearch } from 'react-icons/fi';
import { RxCross2 } from 'react-icons/rx';
import { IAccount, IPaginatedAccount } from '@/interfaces/accounting_account';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { useUserCtx } from '@/contexts/user_context';
import { Button } from '@/components/button/button';
import { useHotkeys } from 'react-hotkeys-hook';

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

  const leftPart = (
    <div className="flex h-480px w-330px flex-col gap-lv-4 overflow-y-auto px-lv-3 py-lv-5">
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

  const rightPart = (
    <div className="flex h-480px w-400px flex-col gap-lv-4 overflow-y-auto px-lv-3 py-lv-5">
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

          return (
            <button
              key={account.id}
              type="button"
              ref={ref}
              className="px-12px py-8px text-left text-tabs-text-default outline-tabs-text-active hover:text-tabs-text-hover focus:outline-dashed"
              onClick={clickHandler}
            >
              {account.code} - {account.name}
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

export default AccountSelectorModal;
