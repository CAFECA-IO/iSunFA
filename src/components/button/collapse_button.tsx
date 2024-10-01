import React from 'react';
import { BsChevronDown, BsChevronUp } from 'react-icons/bs';

// Info: (20241001 - Anna) 定義 CollapseButton 的 props 類型
interface CollapseButtonProps {
  onClick: () => void;
  isCollapsed: boolean;
}

const CollapseButton: React.FC<CollapseButtonProps> = ({ onClick, isCollapsed }) => {
  return (
    <p className="inline-flex">
      <button className="rounded px-2" onClick={onClick} type="button" aria-expanded={!isCollapsed}>
        {/* Info: (20241001 - Anna) 根據狀態顯示對應箭頭 */}
        {isCollapsed ? (
          <BsChevronUp style={{ color: 'var(--neutral-500)' }} />
        ) : (
          <BsChevronDown style={{ color: 'var(--neutral-500)' }} />
        )}
      </button>
    </p>
  );
};

export default CollapseButton;
