import React from 'react';
import { FiSearch } from 'react-icons/fi';
import { useTranslation } from 'next-i18next';
import { KEYBOARD_EVENT_CODE } from '@/constants/keyboard_event_code';
import { Button } from '@/components/button/button';

interface SearchInputProps {
  searchQuery: string | undefined;
  onSearchChange: (query: string) => void;
  className?: string;
}

const SearchInput: React.FC<SearchInputProps> = ({
  searchQuery,
  onSearchChange,
  className = '',
}) => {
  const { t } = useTranslation(['search']);
  return (
    <div
      className={`relative flex h-44px min-w-250px flex-1 items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background text-sm font-medium ${className}`}
    >
      <input
        type="text"
        id="search"
        className={`relative flex-1 bg-transparent p-10px text-input-text-input-filled outline-none`}
        placeholder={t('search:COMMON.SEARCH')}
        defaultValue={searchQuery}
        onKeyDown={(e) => {
          if (e.key === KEYBOARD_EVENT_CODE.ENTER && !e.nativeEvent.isComposing) {
            onSearchChange(e.currentTarget.value.toLowerCase()); // Info: (20250331 - Julian) 將搜尋字串轉為小寫
          }
        }}
      />
      <Button
        variant="tertiaryBorderless"
        size="defaultSquare"
        onClick={() => {
          const value = document.getElementById('search') as HTMLInputElement;
          if (value) {
            onSearchChange(value.value.toLowerCase()); // Info: (20250528 - Julian) 將搜尋字串轉為小寫
          }
        }}
      >
        <FiSearch size={20} />
      </Button>
    </div>
  );
};

export default SearchInput;
