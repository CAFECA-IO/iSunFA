import { FiSearch } from 'react-icons/fi';
import ModeSwitch from '@/components/beta/layout/mode_switch';

const Header = () => {
  return (
    <header className="flex items-center">
      <div className="flex grow items-center rounded-sm border-2 border-lime-400 bg-input-surface-input-background">
        <input
          type="text"
          placeholder="Search"
          className="grow rounded-l-sm border border-rose-600 bg-transparent px-12px py-10px"
        />

        <button type="button" className="px-12px py-10px">
          <FiSearch size={20} />
        </button>
      </div>

      <section className="flex items-center">
        <ModeSwitch />

        {/* Avatar */}
        <div className="h-40px w-40px rounded-full bg-sky-400"></div>
      </section>
    </header>
  );
};

export default Header;
