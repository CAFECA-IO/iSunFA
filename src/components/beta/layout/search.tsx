import { ChangeEvent, useState } from 'react';
import Link from 'next/link';
import { FiSearch, FiX } from 'react-icons/fi';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useUserCtx } from '@/contexts/user_context';
import { useModalContext } from '@/contexts/modal_context';
import { ToastId } from '@/constants/toast_id';
import { ToastType, ToastPosition } from '@/interfaces/toastify';
import { SEARCH_KEYWORDS } from '@/constants/search';
import { ISearchKeyword } from '@/interfaces/search';
import { cn } from '@/lib/utils/common';
import { useDashboardCtx } from '@/contexts/dashboard_context';

interface SearchProps {
  toggleOverlay: () => void;
}

const Search = ({ toggleOverlay }: SearchProps) => {
  const { t } = useTranslation('dashboard');
  const { isSideMenuOpen } = useDashboardCtx();
  const [inputValue, setInputValue] = useState<string>('');

  const [searchResults, setSearchResults] = useState<ISearchKeyword[]>([]);
  const router = useRouter();
  const { connectedAccountBook } = useUserCtx();
  const notConnectAccountBook = !connectedAccountBook;
  const { toastHandler } = useModalContext();

  const hasSearchResults = searchResults.length > 0;

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    const value = e.target.value.toLowerCase().trim();
    if (!value) {
      setSearchResults([]);
      return;
    }

    const results = SEARCH_KEYWORDS.filter((item) => item.label.includes(value));
    setSearchResults(results);
  };

  const clearSearch = () => {
    setInputValue('');
    setSearchResults([]);
  };

  const showAccountBookNeededToast = () => {
    toastHandler({
      id: ToastId.ACCOUNT_BOOK_NEEDED,
      type: ToastType.INFO,
      content: (
        <div className="flex items-center gap-32px">
          <p className="text-sm text-text-neutral-primary">
            {t('layout:TOAST.PLEASE_SELECT_AN_ACCOUNT_BOOK_BEFORE_PROCEEDING_WITH_THE_OPERATION')}
          </p>
          <Link
            href={ISUNFA_ROUTE.ACCOUNT_BOOKS_PAGE}
            className="text-base font-semibold text-link-text-primary"
          >
            {t('layout:TOAST.ACCOUNT_BOOKS_LINK')}
          </Link>
        </div>
      ),
      closeable: true,
      position: ToastPosition.TOP_CENTER,
      onOpen: () => {
        // Info: (20241226 - Liz) 開啟 Toast 時順便開啟 Overlay
        toggleOverlay();
      },
      onClose: () => {
        // Info: (20241226 - Liz) 關閉 Toast 時順便關閉 Overlay
        toggleOverlay();
      },
    });
  };

  const onClickSearchResult = (item: ISearchKeyword) => {
    if (item.needToVerifyCompany && notConnectAccountBook) {
      showAccountBookNeededToast();
      return;
    }
    router.push(item.path);
  };

  return (
    <div className="relative flex min-w-0 flex-auto items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background">
      <input
        type="text"
        placeholder={t('dashboard:HEADER.SEARCH')}
        className="min-w-0 grow rounded-l-sm bg-transparent px-12px py-10px text-input-text-input-filled outline-none"
        onChange={handleSearch}
        value={inputValue}
      />

      {hasSearchResults ? (
        <button
          type="button"
          className="px-12px py-10px text-icon-surface-single-color-primary"
          onClick={clearSearch}
        >
          <FiX size={20} />
        </button>
      ) : (
        <button type="button" className="px-12px py-10px text-icon-surface-single-color-primary">
          <FiSearch size={20} />
        </button>
      )}

      {/* Info: (20241226 - Liz) 搜尋結果下拉式選單 */}
      {hasSearchResults && (
        <div
          className={cn(
            'absolute inset-x-0 top-full z-10 mt-10px flex max-h-300px flex-col overflow-y-auto rounded-sm bg-input-surface-input-background p-12px shadow-Dropshadow_M',
            {
              'min-w-300px': isSideMenuOpen,
            }
          )}
        >
          {searchResults.map((item) => (
            <button
              key={item.label}
              type="button"
              className="rounded-xs bg-input-surface-input-background p-8px text-left text-dropdown-text-primary hover:bg-dropdown-surface-item-hover hover:text-text-neutral-link"
              onClick={() => onClickSearchResult(item)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Search;
