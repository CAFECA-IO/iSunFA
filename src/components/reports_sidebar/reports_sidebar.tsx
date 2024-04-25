import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ISUNFA_ROUTE } from '../../constants/url';

const ReportsSidebar = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const sidebarEnterHandler = () => setIsExpanded(true);
  const sidebarLeaveHandler = () => setIsExpanded(false);

  return (
    <div
      onMouseEnter={sidebarEnterHandler}
      onMouseLeave={sidebarLeaveHandler}
      className={`fixed z-10 hidden h-screen flex-col items-center md:flex ${isExpanded ? 'w-240px' : 'w-70px'} bg-white px-12px pb-40px pt-120px transition-all duration-300 ease-in-out`}
    >
      {/* Info: Main icon (20240423 - Shirley) */}
      <div className="flex flex-col items-center pt-20px">
        <Image
          src={'/icons/report.svg'}
          width={30}
          height={30}
          alt="report_icon"
          className={`${isExpanded ? 'scale-150' : 'scale-100'} transition-all duration-300 ease-in-out`}
        />
        <p
          className={`${isExpanded ? 'visible opacity-100' : 'invisible opacity-0'} mt-20px text-sm font-semibold text-secondaryBlue transition-all duration-300 ease-in-out`}
        >
          Report
        </p>
      </div>

      <div className="my-16px flex w-full flex-col items-center text-lg">
        <Link
          href={ISUNFA_ROUTE.USERS_FINANCIAL_REPORTS}
          className={`flex w-full items-center gap-8px ${isExpanded ? 'bg-tertiaryBlue py-14px pl-28px text-white hover:opacity-75' : 'py-8px pl-8px text-secondaryBlue'} rounded-xs transition-all duration-300 ease-in-out`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
          >
            <g clipPath="url(#clip0_904_65797)">
              <path
                className="fill-current"
                fill="none"
                fillRule="evenodd"
                d="M14.22 2.025a1 1 0 01.76 1.193l-4 18a1 1 0 11-1.953-.434l4-18a1 1 0 011.193-.76zM7.71 6.294a1 1 0 010 1.414l-4.293 4.293 4.293 4.293a1 1 0 11-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414l4.293-4.293-4.293-4.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              ></path>
            </g>
            <defs>
              <clipPath id="clip0_904_65797">
                <path fill="#fff" d="M0 0H24V24H0z"></path>
              </clipPath>
            </defs>
          </svg>
          <p
            className={`${isExpanded ? 'w-8/10' : 'w-0'} overflow-hidden whitespace-nowrap text-white transition-all duration-300 ease-in-out`}
          >
            Get Embed Code
          </p>
        </Link>

        {/* Info: (20240416 - Julian) Divider */}
        {/* <hr
          className={`${isExpanded ? 'w-full' : 'w-56px'} my-20px border border-lightGray6 transition-all duration-300 ease-in-out`}
        /> */}

        {/* Info: Divider (20240423 - Shirley) */}
        <div
          className={`${isExpanded ? 'h-10px' : 'h-20px'} w-full border-b border-lightGray6 transition-all duration-300 ease-in-out`}
        ></div>

        {/* Info: Menu (20240423 - Shirley) */}
        <div className="flex w-full flex-col items-start justify-center py-16px">
          <button
            type="button"
            className="flex w-full items-center gap-8px py-8px pl-10px text-tabs-text-active"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              fill="none"
              viewBox="0 0 20 20"
            >
              <g clipPath="url(#clip0_904_38640)">
                <path
                  className="stroke-current"
                  stroke="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M11.667 7.5H9.583a1.25 1.25 0 100 2.5h.834a1.25 1.25 0 110 2.5H8.333M10 6.667V7.5m0 5v.833M15 10h.008M5 10h.008M1.667 6.833v6.334c0 .933 0 1.4.181 1.756.16.314.415.569.729.729.356.181.823.181 1.756.181h11.334c.933 0 1.4 0 1.756-.181.314-.16.569-.415.729-.729.181-.356.181-.823.181-1.756V6.833c0-.933 0-1.4-.181-1.756a1.667 1.667 0 00-.729-.729c-.356-.181-.823-.181-1.756-.181H4.333c-.933 0-1.4 0-1.756.181-.314.16-.569.415-.729.729-.181.356-.181.823-.181 1.756zM15.417 10a.417.417 0 11-.833 0 .417.417 0 01.833 0zm-10 0a.417.417 0 11-.834 0 .417.417 0 01.834 0z"
                ></path>
              </g>
              <defs>
                <clipPath id="clip0_904_38640">
                  <path fill="#fff" d="M0 0H20V20H0z"></path>
                </clipPath>
              </defs>
            </svg>

            <p
              className={`${isExpanded ? 'w-8/10' : 'w-0'} overflow-hidden whitespace-nowrap text-left transition-all duration-300 ease-in-out`}
            >
              Financial Report
            </p>
          </button>

          <button
            type="button"
            className="flex w-full items-center gap-8px py-8px pl-10px text-tabs-text-default hover:text-tabs-text-active"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              fill="none"
              viewBox="0 0 20 20"
            >
              <path
                className="stroke-current"
                stroke="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M11.667 1.891v3.442c0 .467 0 .7.09.879.08.156.208.284.365.364.178.09.411.09.878.09h3.442M6.667 12.5V15m6.666-4.167V15M10 8.75V15m6.667-6.677v6.01c0 1.4 0 2.1-.273 2.635a2.5 2.5 0 01-1.092 1.093c-.535.272-1.235.272-2.635.272H7.333c-1.4 0-2.1 0-2.635-.272a2.5 2.5 0 01-1.092-1.093c-.273-.535-.273-1.235-.273-2.635V5.667c0-1.4 0-2.1.273-2.635a2.5 2.5 0 011.092-1.093c.535-.272 1.235-.272 2.635-.272h2.677c.611 0 .917 0 1.205.069a2.5 2.5 0 01.722.299c.253.155.469.37.901.803l2.657 2.657c.432.432.649.649.803.9.137.225.238.468.3.724.069.287.069.593.069 1.204z"
              ></path>
            </svg>

            <p
              className={`${isExpanded ? 'w-8/10' : 'w-0'} overflow-hidden whitespace-nowrap text-left transition-all duration-300 ease-in-out`}
            >
              Analysis Report
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportsSidebar;
