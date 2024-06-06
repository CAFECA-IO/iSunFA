import React, { useState } from 'react';
import Image from 'next/image';
import { FaListUl } from 'react-icons/fa6';
import { FiGrid, FiSearch } from 'react-icons/fi';
import { Button } from '../button/button';

enum Layout {
  LIST = 'list',
  GRID = 'grid',
}

const ProjectList = () => {
  // ToDo: (2024606 - Julian) search filter
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [search, setSearch] = useState<string>('');
  const [currentLayout, setCurrentLayout] = useState<Layout>(Layout.LIST);

  const listBtnStyle = currentLayout === Layout.LIST ? 'tertiary' : 'secondaryOutline';
  const gridBtnStyle = currentLayout === Layout.GRID ? 'tertiary' : 'secondaryOutline';

  const listLayoutHandler = () => setCurrentLayout(Layout.LIST);
  const gridLayoutHandler = () => setCurrentLayout(Layout.GRID);
  const searchHandler = (e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value);

  return (
    <div className="flex flex-1 flex-col items-center">
      {/* Info: (2024606 - Julian) Filter */}
      <div className="flex w-full items-center gap-x-24px">
        {/* Info: (2024606 - Julian) Search bar */}
        <div className="flex h-44px flex-1 items-center rounded-xs border border-input-stroke-input bg-input-surface-input-background px-16px text-icon-surface-single-color-primary">
          <input
            id="project-search-bar"
            type="text"
            onChange={searchHandler}
            className="flex-1 outline-none placeholder:text-input-text-input-placeholder"
            placeholder="Search Project"
          />
          <FiSearch size={20} />
        </div>
        {/* Info: (2024606 - Julian) Layout Toggle */}
        <div className="flex gap-x-8px">
          {/* Info: (2024606 - Julian) List button */}
          <Button type="button" variant={listBtnStyle} className="p-3" onClick={listLayoutHandler}>
            <FaListUl size={20} />
          </Button>
          {/* Info: (2024606 - Julian) Grid button */}
          <Button type="button" variant={gridBtnStyle} className="p-3" onClick={gridLayoutHandler}>
            <FiGrid size={20} />
          </Button>
        </div>
      </div>

      {/* Info: (2024606 - Julian) List */}
      <div className="flex h-full w-full flex-1 flex-col items-center justify-center text-xl font-semibold text-text-neutral-tertiary">
        <Image src={'/icons/empty.svg'} width={48} height={70} alt="empty_icon" />
        <p>Empty</p>
      </div>
    </div>
  );
};

export default ProjectList;
