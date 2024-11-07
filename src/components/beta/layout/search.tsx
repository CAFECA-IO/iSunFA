import { FiSearch } from 'react-icons/fi';
import { useTranslation } from 'next-i18next';

const Search = () => {
  const { t } = useTranslation('common');

  return (
    <div className="flex flex-auto items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background">
      <input
        type="text"
        placeholder={t('common:HEADER.SEARCH')}
        className="grow rounded-l-sm bg-transparent px-12px py-10px outline-none"
      />

      <button type="button" className="px-12px py-10px">
        <FiSearch size={20} />
      </button>
    </div>
  );
};

export default Search;
