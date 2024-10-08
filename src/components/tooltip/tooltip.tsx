import React, { useState } from 'react';

interface TooltipProps {
  children: React.ReactNode;
}

const hintIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
    <path
      fill="#002462"
      fillRule="evenodd"
      d="M12.003 3.001a9 9 0 100 18 9 9 0 000-18zm-11 9c0-6.075 4.925-11 11-11s11 4.925 11 11-4.925 11-11 11-11-4.925-11-11zm10-4a1 1 0 011-1h.01a1 1 0 110 2h-.01a1 1 0 01-1-1zm1 3a1 1 0 011 1v4a1 1 0 11-2 0v-4a1 1 0 011-1z"
      clipRule="evenodd"
    ></path>
  </svg>
);

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
      <div className="text-icon-surface-primary opacity-70">{hintIcon}</div>

      {/* Info: (20240416 - Shirley) tooltip content */}
      {showTooltip ? (
        <div
          role="tooltip"
          className={`absolute -top-3 right-8 z-20 w-64 rounded-lg bg-tooltips-surface-primary px-24px py-12px text-sm shadow-tooltip`}
        >
          {/* Info: (20240416 - Shirley) triangle arrow svg */}
          <div className="absolute -right-3 top-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              fill="none"
              viewBox="0 0 8 16"
            >
              <path fill="#fff" d="M0 0V16L6.586 9.414a2 2 0 000-2.828L0 0z"></path>
            </svg>
          </div>

          {children}
        </div>
      ) : null}
    </div>
  );
};

export default Tooltip;
