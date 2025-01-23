import React from 'react';
import { BsChevronDown, BsChevronUp } from 'react-icons/bs';
import { useTranslation } from 'next-i18next';

// Info: (20241001 - Anna) 定義 CollapseButton 的 props 類型
interface CollapseButtonProps {
  onClick: () => void;
  isCollapsed: boolean;
  buttonType?: 'default' | 'orange';
  className?: string;
}

const CollapseButton: React.FC<CollapseButtonProps> = ({
  onClick,
  isCollapsed,
  buttonType = 'default',
  className = '',
}) => {
  const { t } = useTranslation(['reports']);
  // Info: (20241003 - Anna) 根據 buttonType 決定樣式
  const buttonStyles =
    buttonType === 'orange'
      ? 'bg-orange-200 text-orange-900 px-2 py-1 rounded'
      : 'bg-transparent rounded px-2';
  return (
    <div className={`${className || ''}inline-flex print:hidden`}>
      <button
        className={`${buttonStyles}`}
        onClick={onClick}
        type="button"
        aria-expanded={!isCollapsed}
      >
        {/* Info: (20241001 - Anna) 根據狀態顯示對應箭頭 */}
        {buttonType !== 'orange' &&
          (isCollapsed ? (
            <BsChevronUp style={{ color: 'var(--neutral-500)' }} />
          ) : (
            <BsChevronDown style={{ color: 'var(--neutral-500)' }} />
          ))}
        {/* Info: (20241003 - Anna) buttonType 為 orange 時，根據 isCollapsed 狀態顯示「展開」或「收合」 */}
        {buttonType === 'orange' && (
          <div className="whitespace-nowrap">
            {isCollapsed ? (
              <span className="flex items-center gap-1">
                {t('reports:REPORTS.EXPAND')}
                <BsChevronDown style={{ color: 'var(--orange-900)' }} />
              </span>
            ) : (
              <span className="flex items-center gap-1">
                {t('reports:REPORTS.COLLAPSE')}
                <BsChevronUp style={{ color: 'var(--orange-900)' }} />
              </span>
            )}
          </div>
        )}
      </button>
    </div>
  );
};

export default CollapseButton;
