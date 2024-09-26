import { VIEW_TYPES } from '@/interfaces/certificate';
import React from 'react';
import { FaListUl } from 'react-icons/fa6';
import { LuLayoutGrid } from 'react-icons/lu';

interface ViewToggleProps {
  viewType: VIEW_TYPES;
  onViewTypeChange: (viewType: VIEW_TYPES) => void;
}

const ViewToggle: React.FC<ViewToggleProps> = ({ viewType, onViewTypeChange }) => {
  return (
    <div className="flex items-center space-x-2">
      <button
        type="button"
        className={`mt-28px rounded border border-tabs-stroke-default p-2.5 hover:bg-tabs-surface-active hover:text-stroke-neutral-solid-light ${viewType === VIEW_TYPES.GRID ? 'bg-tabs-surface-active text-stroke-neutral-solid-light' : 'bg-transparent text-tabs-stroke-secondary'}`}
        onClick={() => onViewTypeChange(VIEW_TYPES.GRID)}
      >
        <LuLayoutGrid className="h-5 w-5" />
      </button>
      <button
        type="button"
        className={`mt-28px rounded border border-tabs-stroke-default p-2.5 hover:bg-tabs-surface-active hover:text-stroke-neutral-solid-light ${viewType === VIEW_TYPES.LIST ? 'bg-tabs-surface-active text-stroke-neutral-solid-light' : 'bg-transparent text-tabs-stroke-secondary'}`}
        onClick={() => onViewTypeChange(VIEW_TYPES.LIST)}
      >
        <FaListUl className="h-5 w-5" />
      </button>
    </div>
  );
};

export default ViewToggle;
