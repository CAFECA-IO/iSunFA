import React, { useState } from 'react';
import { LuInfo } from 'react-icons/lu';

interface TooltipProps {
  children: React.ReactNode;
}

const Tooltip = ({ children }: TooltipProps) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const mouseEnterHandler = () => setShowTooltip(true);
  const mouseLeaveHandler = () => setShowTooltip(false);

  return (
    <div
      className={`relative whitespace-normal font-normal`}
      onMouseEnter={mouseEnterHandler}
      onMouseLeave={mouseLeaveHandler}
    >
      <div className="text-icon-surface-primary opacity-70">
        <LuInfo size={24} />
      </div>

      {/* Info: (20240416 - Shirley) tooltip content */}
      {showTooltip ? (
        <div
          role="tooltip"
          className={`absolute -top-3 right-8 z-20 flex w-64 items-center rounded-lg bg-tooltips-surface-primary px-24px py-12px text-sm shadow-tooltip`}
        >
          {/* Info: (20240416 - Shirley) triangle arrow svg */}
          <div className="absolute -right-6">
            <div
              style={{ borderWidth: '16px' }}
              className="h-0 w-0 border-transparent border-l-white"
            ></div>
          </div>

          {children}
        </div>
      ) : null}
    </div>
  );
};

export default Tooltip;
