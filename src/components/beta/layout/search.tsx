import { FiSearch } from 'react-icons/fi';

const Search = () => {
  return (
    <div className="flex grow items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background">
      <input
        type="text"
        placeholder="Search"
        className="grow rounded-l-sm bg-transparent px-12px py-10px outline-none"
      />

      <button type="button" className="px-12px py-10px">
        <FiSearch size={20} />
      </button>
    </div>
  );
};

export default Search;
