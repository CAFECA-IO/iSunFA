import React from 'react';
import { FaListUl } from 'react-icons/fa6';
import { LuLayoutGrid } from 'react-icons/lu';
import { DISPLAY_LIST_VIEW_TYPE } from '@/constants/display';

interface ViewToggleProps {
  viewType: DISPLAY_LIST_VIEW_TYPE;
  onViewTypeChange: (viewType: DISPLAY_LIST_VIEW_TYPE) => void;
}

const ViewToggle: React.FC<ViewToggleProps> = ({ viewType, onViewTypeChange }) => {
  return (
    <div className="flex items-center space-x-2">
      <button
        type="button"
        className={`rounded border border-tabs-stroke-default p-2.5 hover:bg-tabs-surface-active hover:text-stroke-neutral-solid-light ${viewType === DISPLAY_LIST_VIEW_TYPE.GRID ? 'bg-tabs-surface-active text-stroke-neutral-solid-light' : 'bg-transparent text-tabs-stroke-secondary'}`}
        onClick={() => onViewTypeChange(DISPLAY_LIST_VIEW_TYPE.GRID)}
      >
        <LuLayoutGrid className="h-5 w-5" />
      </button>
      <button
        type="button"
        className={`rounded border border-tabs-stroke-default p-2.5 hover:bg-tabs-surface-active hover:text-stroke-neutral-solid-light ${viewType === DISPLAY_LIST_VIEW_TYPE.LIST ? 'bg-tabs-surface-active text-stroke-neutral-solid-light' : 'bg-transparent text-tabs-stroke-secondary'}`}
        onClick={() => onViewTypeChange(DISPLAY_LIST_VIEW_TYPE.LIST)}
      >
        <FaListUl className="h-5 w-5" />
      </button>
    </div>
  );
};

export default ViewToggle;
