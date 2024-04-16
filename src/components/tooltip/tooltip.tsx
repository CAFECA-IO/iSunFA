/* eslint-disable */
// import React from 'react';

// const Tooltip = () => {
//   const tooltipContent = (
//     <div className="flex max-w-[324px] flex-col justify-center text-xs leading-5 tracking-normal text-slate-700 shadow-xl">
//       <div className="flex w-full flex-col justify-center rounded-lg bg-white px-6 py-3">
//         <div className="max-w-[300px] justify-center">
//           A message which appears when a cursor is positioned over an icon, image, hyperlink, or
//           other element in a graphical user interface.
//         </div>
//       </div>
//     </div>
//   );
//   return <div>{tooltipContent}</div>;
// };

// export default Tooltip;

import React, { useState } from 'react';

interface TooltipProps {
  children: React.ReactNode;
}

const Tooltip = ({ children }: TooltipProps) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const mouseEnterHandler = () => setShowTooltip(true);
  const mouseLeaveHandler = () => setShowTooltip(false);

  // const tooltipContent = (
  //   <div className="relative">
  //     <div className="flex max-w-[370px] flex-col justify-center text-xs leading-5 tracking-normal text-slate-700 shadow-xl">
  //       <div className="flex w-full flex-col justify-center rounded-lg bg-white px-6 py-3">
  //         <div className="max-w-[370px] justify-center">{children}</div>
  //       </div>
  //     </div>

  //     {/* Info: triangle arrow svg (20240416 - Shirley) */}
  //     <div className="absolute right-0 top-0">
  //       <svg
  //         xmlns="http://www.w3.org/2000/svg"
  //         width="15"
  //         height="15"
  //         fill="none"
  //         viewBox="0 0 8 16"
  //       >
  //         <path fill="#000" d="M0 0V16L6.586 9.414a2 2 0 000-2.828L0 0z"></path>
  //       </svg>
  //     </div>
  //   </div>
  // );

  return (
    <div
      className={`relative whitespace-normal font-normal`}
      onMouseEnter={mouseEnterHandler}
      onMouseLeave={mouseLeaveHandler}
    >
      <div className="text-lightGray1 opacity-70">{hintIcon}</div>

      {/* Info: tooltip content (20240416 - Shirley) */}
      {showTooltip ? (
        <div
          role="tooltip"
          className={`absolute -left-[15rem] top-0 z-20 w-fit max-w-[200px] rounded-lg bg-white p-4 text-sm shadow-xl`}
        >
          {/* Info: triangle arrow svg (20240416 - Shirley) */}
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

      {/* Info: 出現在下面的 tooltip content (20240416 - Shirley) */}
      {/* {showTooltip ? (
        <div
          role="tooltip"
          className={`absolute -right-2 top-8 z-20 w-fit rounded-lg bg-white p-4 text-sm shadow-xl`}
        >
          <div className="absolute -top-3 right-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              fill="none"
              viewBox="0 0 16 8"
            >
              <path fill="#fff" d="M16 8H0L6.586 1.414a2 2 0 012.828 0L16 8z"></path>
            </svg>
          </div>

          {children}
        </div>
      ) : null} */}
    </div>
  );
};

export default Tooltip;

const hintIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
    <g clipPath="url(#clip0_166_43276)">
      <path
        fill="#002462"
        fillRule="evenodd"
        d="M12.003 3.001a9 9 0 100 18 9 9 0 000-18zm-11 9c0-6.075 4.925-11 11-11s11 4.925 11 11-4.925 11-11 11-11-4.925-11-11zm10-4a1 1 0 011-1h.01a1 1 0 110 2h-.01a1 1 0 01-1-1zm1 3a1 1 0 011 1v4a1 1 0 11-2 0v-4a1 1 0 011-1z"
        clipRule="evenodd"
      ></path>
    </g>
    <defs>
      <clipPath id="clip0_166_43276">
        <path fill="#fff" d="M0 0H24V24H0z"></path>
      </clipPath>
    </defs>
  </svg>
);

// <div className="relative" onMouseEnter={mouseEnterHandler} onMouseLeave={mouseLeaveHandler}>
//   {/* {children} */}
//   {hintIcon}
//   {showTooltip && <div className="">{tooltipContent}</div>}
// </div>
