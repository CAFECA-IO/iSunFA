import useStateRef from 'react-usestateref';
import React, { createContext } from 'react';
import { BookmarkItem } from '@/interfaces/modals';
import { ISUNFA_ROUTE } from '@/constants/url';

interface DashboardContextType {
  bookmarkList: Record<string, BookmarkItem>;
  toggleBookmark: (bookmarkName: string[]) => void;
  addBookmarks: (bookmarks: string[]) => void;
  removeBookmark: (bookmarkName: string) => void;
  addSelectedBookmarks: (bookmarks: string[]) => void;
}

const initialDashboardContext: DashboardContextType = {
  bookmarkList: {},
  toggleBookmark: () => {},
  addBookmarks: () => {},
  removeBookmark: () => {},
  addSelectedBookmarks: () => {},
};

export interface IDashboardProvider {
  children: React.ReactNode;
}

export const BookmarkAvailableList: Record<string, BookmarkItem> = {
  // Info: (20240808 - Anna) Alpha版拿掉"新增合約"，改為"新增KYC"
  // addNewContract: {
  //   id: 'addNewContract',
  //   name: 'Add New Contract',
  //   iconOnModal: (
  //     <svg
  //       xmlns="http://www.w3.org/2000/svg"
  //       width="22"
  //       height="22"
  //       fill="none"
  //       viewBox="0 0 22 22"
  //     >
  //       <g>
  //         <path
  //           stroke="#314362"
  //           strokeLinecap="round"
  //           strokeLinejoin="round"
  //           strokeWidth="1.5"
  //           d="M12.833 2.08v3.787c0 .513 0 .77.1.966a.917.917 0 00.4.4c.197.1.454.1.967.1h3.786M11 16.5V11m-2.75 2.75h5.5m-.917-11.917H8.067c-1.54 0-2.31 0-2.899.3a2.75 2.75 0 00-1.202 1.202c-.3.588-.3 1.358-.3 2.898v9.534c0 1.54 0 2.31.3 2.898a2.75 2.75 0 001.202 1.202c.588.3 1.359.3 2.899.3h5.866c1.54 0 2.31 0 2.899-.3a2.75 2.75 0 001.202-1.202c.3-.588.3-1.358.3-2.898V7.333l-5.5-5.5z"
  //         ></path>
  //       </g>
  //     </svg>
  //   ),
  //   iconOnSection: (
  //     <svg
  //       xmlns="http://www.w3.org/2000/svg"
  //       width="22"
  //       height="22"
  //       fill="none"
  //       viewBox="0 0 22 22"
  //     >
  //       <g>
  //         <path
  //           stroke="#fff"
  //           strokeLinecap="round"
  //           strokeLinejoin="round"
  //           strokeWidth="1.5"
  //           d="M12.833 2.08v3.787c0 .513 0 .77.1.966a.917.917 0 00.4.4c.197.1.454.1.967.1h3.786M11 16.5V11m-2.75 2.75h5.5m-.917-11.917H8.067c-1.54 0-2.31 0-2.899.3a2.75 2.75 0 00-1.202 1.202c-.3.588-.3 1.358-.3 2.898v9.534c0 1.54 0 2.31.3 2.898a2.75 2.75 0 001.202 1.202c.588.3 1.359.3 2.899.3h5.866c1.54 0 2.31 0 2.899-.3a2.75 2.75 0 001.202-1.202c.3-.588.3-1.358.3-2.898V7.333l-5.5-5.5z"
  //         ></path>
  //       </g>
  //     </svg>
  //   ),

  //   link: ISUNFA_ROUTE.PROJECT_LIST,
  //   added: true,
  //   tempSelectedOnSection: false,
  //   tempSelectedOnModal: false,
  // },
  addNewKYC: {
    id: 'addNewKYC',
    name: 'Add New KYC',
    iconOnModal: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        fill="none"
        viewBox="0 0 22 22"
      >
        <g>
          <path
            stroke="#314362"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M12.833 2.08v3.787c0 .513 0 .77.1.966a.917.917 0 00.4.4c.197.1.454.1.967.1h3.786M11 16.5V11m-2.75 2.75h5.5m-.917-11.917H8.067c-1.54 0-2.31 0-2.899.3a2.75 2.75 0 00-1.202 1.202c-.3.588-.3 1.358-.3 2.898v9.534c0 1.54 0 2.31.3 2.898a2.75 2.75 0 001.202 1.202c.588.3 1.359.3 2.899.3h5.866c1.54 0 2.31 0 2.899-.3a2.75 2.75 0 001.202-1.202c.3-.588.3-1.358.3-2.898V7.333l-5.5-5.5z"
          ></path>
        </g>
      </svg>
    ),
    iconOnSection: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        fill="none"
        viewBox="0 0 22 22"
      >
        <g>
          <path
            stroke="#fff"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M12.833 2.08v3.787c0 .513 0 .77.1.966a.917.917 0 00.4.4c.197.1.454.1.967.1h3.786M11 16.5V11m-2.75 2.75h5.5m-.917-11.917H8.067c-1.54 0-2.31 0-2.899.3a2.75 2.75 0 00-1.202 1.202c-.3.588-.3 1.358-.3 2.898v9.534c0 1.54 0 2.31.3 2.898a2.75 2.75 0 001.202 1.202c.588.3 1.359.3 2.899.3h5.866c1.54 0 2.31 0 2.899-.3a2.75 2.75 0 001.202-1.202c.3-.588.3-1.358.3-2.898V7.333l-5.5-5.5z"
          ></path>
        </g>
      </svg>
    ),

    link: ISUNFA_ROUTE.KYC,
    added: true,
    tempSelectedOnSection: false,
    tempSelectedOnModal: false,
  },
  addNewEmployees: {
    id: 'addNewEmployees',
    name: 'Add New Employees',
    iconOnModal: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="none"
        viewBox="0 0 20 20"
      >
        <path
          stroke="#314362"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M15.833 17.5v-5m-2.5 2.5h5M10 12.5H6.667c-1.553 0-2.33 0-2.943.254a3.334 3.334 0 00-1.804 1.804c-.253.612-.253 1.389-.253 2.942m11.25-14.758a3.334 3.334 0 010 6.182m-1.667-3.09a3.333 3.333 0 11-6.667 0 3.333 3.333 0 016.667 0z"
        ></path>
      </svg>
    ),
    iconOnSection: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="none"
        viewBox="0 0 20 20"
      >
        <path
          stroke="#fff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M15.833 17.5v-5m-2.5 2.5h5M10 12.5H6.667c-1.553 0-2.33 0-2.943.254a3.334 3.334 0 00-1.804 1.804c-.253.612-.253 1.389-.253 2.942m11.25-14.758a3.334 3.334 0 010 6.182m-1.667-3.09a3.333 3.333 0 11-6.667 0 3.333 3.333 0 016.667 0z"
        ></path>
      </svg>
    ),

    link: '', // TODO: link (20240424 - Shirley)
    added: false,
    tempSelectedOnSection: false,
    tempSelectedOnModal: false,
  },
  addNewPayroll: {
    id: 'addNewPayroll',
    name: 'Add New Payroll',
    iconOnModal: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="none"
        viewBox="0 0 20 20"
      >
        <path
          stroke="#314362"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M10 14.167a4.167 4.167 0 108.333 0 4.167 4.167 0 00-8.333 0zm0 0c0-.938.31-1.804.833-2.5v-7.5m-.833 10c0 .688.167 1.336.462 1.908-.702.593-2.324 1.008-4.212 1.008-2.531 0-4.583-.746-4.583-1.666V4.167m9.166 0c0 .92-2.052 1.666-4.583 1.666s-4.583-.746-4.583-1.666m9.166 0c0-.92-2.052-1.667-4.583-1.667s-4.583.746-4.583 1.667m0 7.5c0 .92 2.052 1.666 4.583 1.666 1.824 0 3.4-.387 4.137-.948m.446-4.468c0 .92-2.052 1.666-4.583 1.666s-4.583-.746-4.583-1.666"
        ></path>
      </svg>
    ),
    iconOnSection: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="none"
        viewBox="0 0 20 20"
      >
        <path
          stroke="#fff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M10 14.167a4.167 4.167 0 108.333 0 4.167 4.167 0 00-8.333 0zm0 0c0-.938.31-1.804.833-2.5v-7.5m-.833 10c0 .688.167 1.336.462 1.908-.702.593-2.324 1.008-4.212 1.008-2.531 0-4.583-.746-4.583-1.666V4.167m9.166 0c0 .92-2.052 1.666-4.583 1.666s-4.583-.746-4.583-1.666m9.166 0c0-.92-2.052-1.667-4.583-1.667s-4.583.746-4.583 1.667m0 7.5c0 .92 2.052 1.666 4.583 1.666 1.824 0 3.4-.387 4.137-.948m.446-4.468c0 .92-2.052 1.666-4.583 1.666s-4.583-.746-4.583-1.666"
        ></path>
      </svg>
    ),

    link: '', // TODO: link (20240424 - Shirley)
    added: false,
    tempSelectedOnSection: false,
    tempSelectedOnModal: false,
  },
  addNewJournal: {
    id: 'addNewJournal',
    name: 'Add New Journal',
    iconOnModal: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="none"
        viewBox="0 0 20 20"
      >
        <path
          stroke="#314362"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M6.667 6.667v-.834m0 4.584v-.834m0 4.584v-.834m-1 3.334h8.666c1.4 0 2.1 0 2.635-.273a2.5 2.5 0 001.093-1.092c.272-.535.272-1.235.272-2.635V7.333c0-1.4 0-2.1-.272-2.635a2.5 2.5 0 00-1.093-1.092c-.535-.273-1.235-.273-2.635-.273H5.667c-1.4 0-2.1 0-2.635.273a2.5 2.5 0 00-1.093 1.092c-.272.535-.272 1.235-.272 2.635v5.334c0 1.4 0 2.1.272 2.635a2.5 2.5 0 001.093 1.092c.534.273 1.235.273 2.635.273z"
        ></path>
      </svg>
    ),
    iconOnSection: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="none"
        viewBox="0 0 20 20"
      >
        <path
          stroke="#fff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M6.667 6.667v-.834m0 4.584v-.834m0 4.584v-.834m-1 3.334h8.666c1.4 0 2.1 0 2.635-.273a2.5 2.5 0 001.093-1.092c.272-.535.272-1.235.272-2.635V7.333c0-1.4 0-2.1-.272-2.635a2.5 2.5 0 00-1.093-1.092c-.535-.273-1.235-.273-2.635-.273H5.667c-1.4 0-2.1 0-2.635.273a2.5 2.5 0 00-1.093 1.092c-.272.535-.272 1.235-.272 2.635v5.334c0 1.4 0 2.1.272 2.635a2.5 2.5 0 001.093 1.092c.534.273 1.235.273 2.635.273z"
        ></path>
      </svg>
    ),

    link: ISUNFA_ROUTE.ACCOUNTING,
    added: true,
    tempSelectedOnSection: false,
    tempSelectedOnModal: false,
  },
  cameraScanner: {
    id: 'cameraScanner',
    name: 'Camera Scanner',
    iconOnModal: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="none"
        viewBox="0 0 20 20"
      >
        <path
          stroke="#314362"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M18.333 9.583v2.584c0 1.867 0 2.8-.363 3.513a3.334 3.334 0 01-1.457 1.457c-.713.363-1.646.363-3.513.363H7c-1.867 0-2.8 0-3.513-.363A3.333 3.333 0 012.03 15.68c-.363-.713-.363-1.646-.363-3.513V7.833c0-1.866 0-2.8.363-3.513.32-.627.83-1.137 1.457-1.457C4.2 2.5 5.133 2.5 7 2.5h3.417m5.416 4.167v-5m-2.5 2.5h5m-5 5.833a3.333 3.333 0 11-6.666 0 3.333 3.333 0 016.666 0z"
        ></path>
      </svg>
    ),
    iconOnSection: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="none"
        viewBox="0 0 20 20"
      >
        <path
          stroke="#fff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M18.333 9.583v2.584c0 1.867 0 2.8-.363 3.513a3.334 3.334 0 01-1.457 1.457c-.713.363-1.646.363-3.513.363H7c-1.867 0-2.8 0-3.513-.363A3.333 3.333 0 012.03 15.68c-.363-.713-.363-1.646-.363-3.513V7.833c0-1.866 0-2.8.363-3.513.32-.627.83-1.137 1.457-1.457C4.2 2.5 5.133 2.5 7 2.5h3.417m5.416 4.167v-5m-2.5 2.5h5m-5 5.833a3.333 3.333 0 11-6.666 0 3.333 3.333 0 016.666 0z"
        ></path>
      </svg>
    ),

    link: '', // TODO: link (20240807 - Shirley)
    // link: ISUNFA_ROUTE.ACCOUNTING,
    added: false,
    tempSelectedOnSection: false,
    tempSelectedOnModal: false,
  },
  balanceSheet: {
    id: 'balanceSheet',
    name: 'Balance Sheet',
    iconOnModal: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        fill="none"
        viewBox="0 0 18 18"
      >
        <path
          stroke="#314362"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M6.5 4.833H2.833c-.466 0-.7 0-.878.091a.833.833 0 00-.364.364c-.091.179-.091.412-.091.879v9c0 .466 0 .7.09.878.08.157.208.284.365.364.178.091.412.091.878.091H6.5m0 0h5m-5 0V2.833c0-.466 0-.7.09-.878a.833.833 0 01.365-.364c.178-.091.412-.091.878-.091h2.334c.466 0 .7 0 .878.09.157.08.284.208.364.365.091.178.091.412.091.878V16.5m0-8.333h3.667c.466 0 .7 0 .878.09.157.08.284.208.364.365.091.178.091.411.091.878v5.667c0 .466 0 .7-.09.878a.833.833 0 01-.365.364c-.178.091-.412.091-.878.091H11.5"
        ></path>
      </svg>
    ),

    iconOnSection: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        fill="none"
        viewBox="0 0 18 18"
      >
        <path
          stroke="#fff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M6.5 4.833H2.833c-.466 0-.7 0-.878.091a.833.833 0 00-.364.364c-.091.179-.091.412-.091.879v9c0 .466 0 .7.09.878.08.157.208.284.365.364.178.091.412.091.878.091H6.5m0 0h5m-5 0V2.833c0-.466 0-.7.09-.878a.833.833 0 01.365-.364c.178-.091.412-.091.878-.091h2.334c.466 0 .7 0 .878.09.157.08.284.208.364.365.091.178.091.412.091.878V16.5m0-8.333h3.667c.466 0 .7 0 .878.09.157.08.284.208.364.365.091.178.091.411.091.878v5.667c0 .466 0 .7-.09.878a.833.833 0 01-.365.364c-.178.091-.412.091-.878.091H11.5"
        ></path>
      </svg>
    ),

    link: ISUNFA_ROUTE.USERS_FINANCIAL_REPORTS_BALANCE_SHEET,
    added: true,
    tempSelectedOnSection: false,
    tempSelectedOnModal: false,
  },
  incomeStatement: {
    id: 'incomeStatement',
    name: 'Income Statement',
    iconOnModal: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="none"
        viewBox="0 0 20 20"
      >
        <path
          stroke="#314362"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M14.167 7.5l-4.529 4.529c-.165.165-.247.247-.343.278a.417.417 0 01-.257 0c-.095-.03-.178-.113-.343-.278L7.138 10.47c-.165-.165-.247-.247-.343-.278a.417.417 0 00-.257 0c-.095.03-.178.113-.343.278L2.5 14.167M14.167 7.5h-3.334m3.334 0v3.333M6.5 17.5h7c1.4 0 2.1 0 2.635-.273a2.5 2.5 0 001.092-1.092c.273-.535.273-1.235.273-2.635v-7c0-1.4 0-2.1-.273-2.635a2.5 2.5 0 00-1.092-1.093C15.6 2.5 14.9 2.5 13.5 2.5h-7c-1.4 0-2.1 0-2.635.272a2.5 2.5 0 00-1.093 1.093C2.5 4.4 2.5 5.1 2.5 6.5v7c0 1.4 0 2.1.272 2.635a2.5 2.5 0 001.093 1.092C4.4 17.5 5.1 17.5 6.5 17.5z"
        ></path>
      </svg>
    ),
    iconOnSection: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="none"
        viewBox="0 0 20 20"
      >
        <path
          stroke="#fff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M14.167 7.5l-4.529 4.529c-.165.165-.247.247-.343.278a.417.417 0 01-.257 0c-.095-.03-.178-.113-.343-.278L7.138 10.47c-.165-.165-.247-.247-.343-.278a.417.417 0 00-.257 0c-.095.03-.178.113-.343.278L2.5 14.167M14.167 7.5h-3.334m3.334 0v3.333M6.5 17.5h7c1.4 0 2.1 0 2.635-.273a2.5 2.5 0 001.092-1.092c.273-.535.273-1.235.273-2.635v-7c0-1.4 0-2.1-.273-2.635a2.5 2.5 0 00-1.092-1.093C15.6 2.5 14.9 2.5 13.5 2.5h-7c-1.4 0-2.1 0-2.635.272a2.5 2.5 0 00-1.093 1.093C2.5 4.4 2.5 5.1 2.5 6.5v7c0 1.4 0 2.1.272 2.635a2.5 2.5 0 001.093 1.092C4.4 17.5 5.1 17.5 6.5 17.5z"
        ></path>
      </svg>
    ),

    link: ISUNFA_ROUTE.USERS_FINANCIAL_REPORTS_INCOME_STATEMENT,
    added: true,
    tempSelectedOnSection: false,
    tempSelectedOnModal: false,
  },
  cashFlowStatement: {
    id: 'cashFlowStatement',
    name: 'Cash Flow Statement',
    iconOnModal: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="none"
        viewBox="0 0 20 20"
      >
        <g clipPath="url(#clip0_3640_72069)">
          <g clipPath="url(#clip1_3640_72069)">
            <path
              stroke="#314362"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M11.275 6.96a2.917 2.917 0 11.784-3.92M5 16.74h2.175c.284 0 .566.033.84.1l2.3.56a3.562 3.562 0 001.521.035l2.541-.495a3.504 3.504 0 001.773-.923l1.798-1.749a1.253 1.253 0 000-1.807 1.342 1.342 0 00-1.717-.12l-2.096 1.53c-.3.22-.665.337-1.04.337H11.07h1.288c.726 0 1.314-.572 1.314-1.278v-.256c0-.586-.41-1.097-.995-1.24l-1.988-.482a4.187 4.187 0 00-.987-.119c-.804 0-2.26.666-2.26.666L5 12.521m11.667-7.104a2.917 2.917 0 11-5.834 0 2.917 2.917 0 015.834 0zm-15 6.75V17c0 .467 0 .7.09.878.08.157.208.285.365.364.178.091.411.091.878.091h.667c.466 0 .7 0 .878-.09a.833.833 0 00.364-.365C5 17.7 5 17.467 5 17v-4.833c0-.467 0-.7-.09-.879a.833.833 0 00-.365-.364c-.178-.09-.412-.09-.878-.09H3c-.467 0-.7 0-.878.09a.833.833 0 00-.365.364c-.09.179-.09.412-.09.879z"
            ></path>
          </g>
        </g>
        <defs>
          <clipPath id="clip0_3640_72069">
            <path fill="#fff" d="M0 0H20V20H0z"></path>
          </clipPath>
          <clipPath id="clip1_3640_72069">
            <path fill="#fff" d="M0 0H20V20H0z"></path>
          </clipPath>
        </defs>
      </svg>
    ),
    iconOnSection: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="none"
        viewBox="0 0 20 20"
      >
        <g clipPath="url(#clip0_3640_72069)">
          <g clipPath="url(#clip1_3640_72069)">
            <path
              stroke="#fff"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M11.275 6.96a2.917 2.917 0 11.784-3.92M5 16.74h2.175c.284 0 .566.033.84.1l2.3.56a3.562 3.562 0 001.521.035l2.541-.495a3.504 3.504 0 001.773-.923l1.798-1.749a1.253 1.253 0 000-1.807 1.342 1.342 0 00-1.717-.12l-2.096 1.53c-.3.22-.665.337-1.04.337H11.07h1.288c.726 0 1.314-.572 1.314-1.278v-.256c0-.586-.41-1.097-.995-1.24l-1.988-.482a4.187 4.187 0 00-.987-.119c-.804 0-2.26.666-2.26.666L5 12.521m11.667-7.104a2.917 2.917 0 11-5.834 0 2.917 2.917 0 015.834 0zm-15 6.75V17c0 .467 0 .7.09.878.08.157.208.285.365.364.178.091.411.091.878.091h.667c.466 0 .7 0 .878-.09a.833.833 0 00.364-.365C5 17.7 5 17.467 5 17v-4.833c0-.467 0-.7-.09-.879a.833.833 0 00-.365-.364c-.178-.09-.412-.09-.878-.09H3c-.467 0-.7 0-.878.09a.833.833 0 00-.365.364c-.09.179-.09.412-.09.879z"
            ></path>
          </g>
        </g>
        <defs>
          <clipPath id="clip0_3640_72069">
            <path fill="#fff" d="M0 0H20V20H0z"></path>
          </clipPath>
          <clipPath id="clip1_3640_72069">
            <path fill="#fff" d="M0 0H20V20H0z"></path>
          </clipPath>
        </defs>
      </svg>
    ),

    link: ISUNFA_ROUTE.USERS_FINANCIAL_REPORTS_CASH_FLOW,
    added: true,
    tempSelectedOnSection: false,
    tempSelectedOnModal: false,
  },
  financialPerformance: {
    id: 'financialPerformance',
    name: 'Financial Performance',
    iconOnModal: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="none"
        viewBox="0 0 20 20"
      >
        <g clipPath="url(#clip0_3640_72123)">
          <path
            stroke="#314362"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M13.281 13.281A5.835 5.835 0 106.72 6.72m-.469 4.114L7.5 10v4.583m-1.25 0h2.5m4.583-2.083a5.833 5.833 0 11-11.666 0 5.833 5.833 0 0111.666 0z"
          ></path>
        </g>
        <defs>
          <clipPath id="clip0_3640_72123">
            <path fill="#fff" d="M0 0H20V20H0z"></path>
          </clipPath>
        </defs>
      </svg>
    ),
    iconOnSection: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="none"
        viewBox="0 0 20 20"
      >
        <g clipPath="url(#clip0_3640_72123)">
          <path
            stroke="#fff"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M13.281 13.281A5.835 5.835 0 106.72 6.72m-.469 4.114L7.5 10v4.583m-1.25 0h2.5m4.583-2.083a5.833 5.833 0 11-11.666 0 5.833 5.833 0 0111.666 0z"
          ></path>
        </g>
        <defs>
          <clipPath id="clip0_3640_72123">
            <path fill="#fff" d="M0 0H20V20H0z"></path>
          </clipPath>
        </defs>
      </svg>
    ),

    link: '', // TODO: link (20240807 - Shirley)
    // link: ISUNFA_ROUTE.USERS_ANALYSES_REPORTS,
    added: false,
    tempSelectedOnSection: false,
    tempSelectedOnModal: false,
  },
  costAnalysis: {
    id: 'costAnalysis',
    name: 'Cost Analysis',
    iconOnModal: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="none"
        viewBox="0 0 20 20"
      >
        <g clipPath="url(#clip0_3640_72176)">
          <path
            stroke="#314362"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M10 1.667c.493 0 .976.043 1.446.125M10 1.667a8.333 8.333 0 100 16.666m0-16.666v16.666m4.782-15.159a8.38 8.38 0 012.046 2.047m1.38 3.334a8.384 8.384 0 010 2.89m-1.384 3.339a8.38 8.38 0 01-2.043 2.042m-3.337 1.383a8.39 8.39 0 01-1.444.124"
          ></path>
        </g>
        <defs>
          <clipPath id="clip0_3640_72176">
            <path fill="#fff" d="M0 0H20V20H0z"></path>
          </clipPath>
        </defs>
      </svg>
    ),
    iconOnSection: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="none"
        viewBox="0 0 20 20"
      >
        <g clipPath="url(#clip0_3640_72176)">
          <path
            stroke="#fff"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M10 1.667c.493 0 .976.043 1.446.125M10 1.667a8.333 8.333 0 100 16.666m0-16.666v16.666m4.782-15.159a8.38 8.38 0 012.046 2.047m1.38 3.334a8.384 8.384 0 010 2.89m-1.384 3.339a8.38 8.38 0 01-2.043 2.042m-3.337 1.383a8.39 8.39 0 01-1.444.124"
          ></path>
        </g>
        <defs>
          <clipPath id="clip0_3640_72176">
            <path fill="#fff" d="M0 0H20V20H0z"></path>
          </clipPath>
        </defs>
      </svg>
    ),

    link: '', // TODO: link (20240807 - Shirley)
    // link: ISUNFA_ROUTE.USERS_ANALYSES_REPORTS,
    added: false,
    tempSelectedOnSection: false,
    tempSelectedOnModal: false,
  },
  hrUtilization: {
    id: 'hrUtilization',
    name: 'HR Utilization',
    iconOnModal: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="none"
        viewBox="0 0 20 20"
      >
        <g clipPath="url(#clip0_3640_72235)">
          <path
            stroke="#314362"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M15.833 6.667l2.5-2.5m0 0l-2.5-2.5m2.5 2.5h-5m5 5.833v4.333c0 1.4 0 2.1-.272 2.635a2.5 2.5 0 01-1.093 1.093c-.535.272-1.235.272-2.635.272H5.667c-1.4 0-2.1 0-2.635-.272a2.5 2.5 0 01-1.093-1.093c-.272-.534-.272-1.235-.272-2.635V5.667c0-1.4 0-2.1.272-2.635a2.5 2.5 0 011.093-1.093c.534-.272 1.235-.272 2.635-.272H10M1.788 16.605A3.335 3.335 0 015 14.167h5.833c.775 0 1.162 0 1.484.064a3.333 3.333 0 012.619 2.619c.064.322.064.709.064 1.483M11.667 7.917a3.333 3.333 0 11-6.667 0 3.333 3.333 0 016.667 0z"
          ></path>
        </g>
        <defs>
          <clipPath id="clip0_3640_72235">
            <path fill="#fff" d="M0 0H20V20H0z"></path>
          </clipPath>
        </defs>
      </svg>
    ),
    iconOnSection: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="none"
        viewBox="0 0 20 20"
      >
        <g clipPath="url(#clip0_3640_72235)">
          <path
            stroke="#fff"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M15.833 6.667l2.5-2.5m0 0l-2.5-2.5m2.5 2.5h-5m5 5.833v4.333c0 1.4 0 2.1-.272 2.635a2.5 2.5 0 01-1.093 1.093c-.535.272-1.235.272-2.635.272H5.667c-1.4 0-2.1 0-2.635-.272a2.5 2.5 0 01-1.093-1.093c-.272-.534-.272-1.235-.272-2.635V5.667c0-1.4 0-2.1.272-2.635a2.5 2.5 0 011.093-1.093c.534-.272 1.235-.272 2.635-.272H10M1.788 16.605A3.335 3.335 0 015 14.167h5.833c.775 0 1.162 0 1.484.064a3.333 3.333 0 012.619 2.619c.064.322.064.709.064 1.483M11.667 7.917a3.333 3.333 0 11-6.667 0 3.333 3.333 0 016.667 0z"
          ></path>
        </g>
        <defs>
          <clipPath id="clip0_3640_72235">
            <path fill="#fff" d="M0 0H20V20H0z"></path>
          </clipPath>
        </defs>
      </svg>
    ),

    link: '', // TODO: link (20240807 - Shirley)
    // link: ISUNFA_ROUTE.USERS_ANALYSES_REPORTS,
    added: false,
    tempSelectedOnSection: false,
    tempSelectedOnModal: false,
  },
  forecastReport: {
    id: 'forecastReport',
    name: 'Forecast Report',
    iconOnModal: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="none"
        viewBox="0 0 20 20"
      >
        <g clipPath="url(#clip0_3640_72287)">
          <path
            stroke="#314362"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M11.667 9.167h-5M8.333 12.5H6.667m6.666-6.667H6.667m10 2.917V5.667c0-1.4 0-2.1-.273-2.635a2.5 2.5 0 00-1.092-1.093c-.535-.272-1.235-.272-2.635-.272H7.333c-1.4 0-2.1 0-2.635.272a2.5 2.5 0 00-1.092 1.093c-.273.534-.273 1.235-.273 2.635v8.666c0 1.4 0 2.1.273 2.635a2.5 2.5 0 001.092 1.093c.535.272 1.235.272 2.635.272h2.25m8.75 0l-1.25-1.25M17.917 15a2.917 2.917 0 11-5.834 0 2.917 2.917 0 015.834 0z"
          ></path>
        </g>
        <defs>
          <clipPath id="clip0_3640_72287">
            <path fill="#fff" d="M0 0H20V20H0z"></path>
          </clipPath>
        </defs>
      </svg>
    ),
    iconOnSection: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="none"
        viewBox="0 0 20 20"
      >
        <g clipPath="url(#clip0_3640_72287)">
          <path
            stroke="#fff"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M11.667 9.167h-5M8.333 12.5H6.667m6.666-6.667H6.667m10 2.917V5.667c0-1.4 0-2.1-.273-2.635a2.5 2.5 0 00-1.092-1.093c-.535-.272-1.235-.272-2.635-.272H7.333c-1.4 0-2.1 0-2.635.272a2.5 2.5 0 00-1.092 1.093c-.273.534-.273 1.235-.273 2.635v8.666c0 1.4 0 2.1.273 2.635a2.5 2.5 0 001.092 1.093c.535.272 1.235.272 2.635.272h2.25m8.75 0l-1.25-1.25M17.917 15a2.917 2.917 0 11-5.834 0 2.917 2.917 0 015.834 0z"
          ></path>
        </g>
        <defs>
          <clipPath id="clip0_3640_72287">
            <path fill="#fff" d="M0 0H20V20H0z"></path>
          </clipPath>
        </defs>
      </svg>
    ),

    link: '', // TODO: link (20240807 - Shirley)
    // link: ISUNFA_ROUTE.USERS_ANALYSES_REPORTS,
    added: false,
    tempSelectedOnSection: false,
    tempSelectedOnModal: false,
  },
};

export const DashboardContext = createContext<DashboardContextType>(initialDashboardContext);

export const DashboardProvider = ({ children }: IDashboardProvider) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [bookmarkList, setBookmarkList, bookmarkListRef] =
    useStateRef<Record<string, BookmarkItem>>(BookmarkAvailableList);

  // Deprecated: 20240815 - Shirley
  const toggleBookmark = (bookmarkNames: string[]) => {
    setBookmarkList((prevBookmarkList: Record<string, BookmarkItem>) => {
      const updatedBookmarkList = { ...prevBookmarkList };

      bookmarkNames.forEach((bookmarkName: string) => {
        if (updatedBookmarkList[bookmarkName]) {
          updatedBookmarkList[bookmarkName] = {
            ...updatedBookmarkList[bookmarkName],
            added: !updatedBookmarkList[bookmarkName].added,
          };
        }
      });
      return updatedBookmarkList;
    });
  };

  // Deprecated: 20240815 - Shirley
  const removeBookmark = (bookmarkName: string) => {
    setBookmarkList((prevBookmarkList: Record<string, BookmarkItem>) => ({
      ...prevBookmarkList,
      [bookmarkName]: {
        ...prevBookmarkList[bookmarkName],
        added: true,
      },
    }));
  };

  // Deprecated: 20240815 - Shirley
  const addBookmarks = (bookmarks: string[]) => {
    setBookmarkList((prevBookmarkList: Record<string, BookmarkItem>) => {
      const updatedBookmarkList = { ...prevBookmarkList };
      Object.entries(updatedBookmarkList).forEach(([key, value]) => {
        updatedBookmarkList[key] = {
          ...value,
          added: true,
        };
      });
      bookmarks.forEach((bookmarkName: string) => {
        if (updatedBookmarkList[bookmarkName]) {
          updatedBookmarkList[bookmarkName] = {
            ...updatedBookmarkList[bookmarkName],
            added: true,
          };
        }
      });
      return updatedBookmarkList;
    });
  };

  const addSelectedBookmarks = (bookmarks: string[]) => {
    setBookmarkList((prevBookmarkList: Record<string, BookmarkItem>) => {
      const updatedBookmarkList = { ...prevBookmarkList };

      // Info: 將所有書籤的 added 屬性設為 false (20240603 - Shirley)
      Object.values(updatedBookmarkList).forEach((bookmark: BookmarkItem) => {
        updatedBookmarkList[bookmark.id] = { ...bookmark, added: false };
      });

      // Info: 將參數中的書籤的 added 屬性設為 true (20240603 - Shirley)
      bookmarks.forEach((bookmarkName: string) => {
        if (updatedBookmarkList[bookmarkName]) {
          updatedBookmarkList[bookmarkName].added = true;
        }
      });

      return updatedBookmarkList;
    });
  };

  // eslint-disable-next-line react/jsx-no-constructed-context-values
  const value = {
    bookmarkList: bookmarkListRef.current,
    toggleBookmark,
    addBookmarks,
    removeBookmark,
    addSelectedBookmarks,
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};

export const useDashboardCtx = () => {
  const context = React.useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
