import React from 'react';
import { FaListUl } from 'react-icons/fa6';
import { LuLayoutGrid } from 'react-icons/lu';

interface ViewToggleProps {
  viewType: 'grid' | 'list';
  onViewTypeChange: (viewType: 'grid' | 'list') => void;
}

const ViewToggle: React.FC<ViewToggleProps> = ({ viewType, onViewTypeChange }) => {
  return (
    <div className="flex items-center space-x-2">
      <button
        type="button"
        className={`mt-28px rounded border border-tabs-stroke-default p-2.5 hover:bg-tabs-surface-active hover:text-stroke-neutral-solid-light ${viewType === 'grid' ? 'bg-tabs-surface-active text-stroke-neutral-solid-light' : 'bg-transparent text-tabs-stroke-secondary'}`}
        onClick={() => onViewTypeChange('grid')}
      >
        <LuLayoutGrid className="h-5 w-5" />
      </button>
      <button
        type="button"
        className={`mt-28px rounded border border-tabs-stroke-default p-2.5 hover:bg-tabs-surface-active hover:text-stroke-neutral-solid-light ${viewType === 'list' ? 'bg-tabs-surface-active text-stroke-neutral-solid-light' : 'bg-transparent text-tabs-stroke-secondary'}`}
        onClick={() => onViewTypeChange('list')}
      >
        <FaListUl className="h-5 w-5" />
      </button>
    </div>
  );
};

export default ViewToggle;
