import React from 'react';
import { FiSearch } from 'react-icons/fi';
import { useTranslation } from 'next-i18next';

interface SearchInputProps {
  searchQuery: string | undefined;
  onSearchChange: (query: string) => void;
}

const SearchInput: React.FC<SearchInputProps> = ({ searchQuery, onSearchChange }) => {
  const { t } = useTranslation(['common']);
  return (
    <div className="mt-28px flex min-w-200px flex-1 flex-col">
      <div className="relative flex-1 text-sm font-medium">
        <input
          type="text"
          id="search"
          className={`relative flex h-44px w-full items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background p-10px outline-none`}
          placeholder={t('common:COMMON.SEARCH')}
          defaultValue={searchQuery}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              onSearchChange(e.currentTarget.value);
            }
          }}
        />
        <FiSearch
          size={20}
          className="absolute right-3 top-3 cursor-pointer"
          onClick={() => {
            const query = (document.getElementById('search') as HTMLInputElement)?.value;
            onSearchChange(query);
          }}
        />
      </div>
    </div>
  );
};

export default SearchInput;
