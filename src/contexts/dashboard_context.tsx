import useStateRef from 'react-usestateref';
import React, { createContext } from 'react';
import { BookmarkItem } from '../interfaces/modals';
import { IDashboardOverview, generateDashboardOverview } from '../interfaces/dashboard_overview';

interface DashboardContextType {
  bookmarkList: Record<string, BookmarkItem>;
  toggleBookmark: (bookmarkName: string[]) => void;
  addBookmarks: (bookmarks: string[]) => void;
  removeBookmark: (bookmarkName: string) => void;
  dashboardOverview: IDashboardOverview;
}

const initialDashboardContext: DashboardContextType = {
  bookmarkList: {},
  toggleBookmark: () => {},
  addBookmarks: () => {},
  removeBookmark: () => {},
  dashboardOverview: {} as IDashboardOverview,
};

export interface IDashboardProvider {
  children: React.ReactNode;
}

export const BookmarkAvailableList: Record<string, BookmarkItem> = {
  Schedule: {
    name: 'Schedule',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="none"
        viewBox="0 0 16 16"
      >
        <g clipPath="url(#clip0_385_88467)">
          <g clipPath="url(#clip1_385_88467)">
            <path
              fill="#002462"
              fillRule="evenodd"
              d="M4 0c.631 0 1.143.512 1.143 1.143v1.143h5.714V1.143a1.143 1.143 0 012.286 0v1.143h1.143C15.233 2.286 16 3.053 16 4v1.143H0V4c0-.947.768-1.714 1.714-1.714h1.143V1.143C2.857.512 3.37 0 4 0z"
              clipRule="evenodd"
            ></path>
            <path
              fill="#002462"
              d="M0 5.143h16v9.143c0 .947-.768 1.714-1.714 1.714H1.714A1.714 1.714 0 010 14.286V5.143z"
            ></path>
            <path
              fill="#FFA502"
              d="M8.29 6.938a.572.572 0 00-.808.245L6.633 8.89l-.001.002-1.889.277H4.74a.572.572 0 00-.316.967l.006.006 1.365 1.307a.288.288 0 00-.007.03l-.315 1.872a.572.572 0 00.844.609l1.664-.881a.051.051 0 01.032 0l1.664.88a.572.572 0 00.844-.604l-.265-1.87a.282.282 0 00-.02-.071l1.326-1.26a.573.573 0 00-.314-.985l-1.885-.287H9.36L8.51 7.17l-.003-.004a.572.572 0 00-.215-.228z"
            ></path>
          </g>
        </g>
        <defs>
          <clipPath id="clip0_385_88467">
            <path fill="#fff" d="M0 0H16V16H0z"></path>
          </clipPath>
          <clipPath id="clip1_385_88467">
            <path fill="#fff" d="M0 0H16V16H0z"></path>
          </clipPath>
        </defs>
      </svg>
    ),

    added: true,
    tempSelectedOnSection: false,
    tempSelectedOnModal: false,
  },
  'Accounting Event': {
    name: 'Accounting Event',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="none"
        viewBox="0 0 16 16"
      >
        <g clipPath="url(#clip0_385_88490)">
          <g fillRule="evenodd" clipPath="url(#clip1_385_88490)" clipRule="evenodd">
            <path
              fill="#FFA502"
              d="M13.143 0H8v8H0v5.143A2.857 2.857 0 002.857 16H8V8h8V2.857A2.857 2.857 0 0013.143 0z"
            ></path>
            <path
              fill="#002462"
              d="M2.857 0A2.857 2.857 0 000 2.857V8h8v8h5.143A2.857 2.857 0 0016 13.143V8H8V0H2.857z"
            ></path>
            <path
              fill="#FFA502"
              d="M4.466 2.4a.714.714 0 00-1.428 0v.714h-.715a.714.714 0 000 1.428h.715v.715a.714.714 0 101.428 0v-.715h.714a.714.714 0 000-1.428h-.714v-.715zm6.563 7.922a.714.714 0 100 1.43h2.286a.714.714 0 100-1.43h-2.286zm-.714 3c0-.394.32-.714.714-.714h2.286a.714.714 0 110 1.429h-2.286a.714.714 0 01-.714-.715z"
            ></path>
            <path
              fill="#002462"
              d="M10.315 3.828c0-.394.32-.714.714-.714h2.286a.714.714 0 010 1.428h-2.286a.714.714 0 01-.714-.714zm-8.28 6.704a.714.714 0 011.01 0l.707.706.706-.706a.714.714 0 011.01 1.01l-.706.706.706.707a.714.714 0 01-1.01 1.01l-.706-.707-.707.707a.715.715 0 01-1.01-1.01l.706-.707-.706-.706a.714.714 0 010-1.01z"
            ></path>
          </g>
        </g>
        <defs>
          <clipPath id="clip0_385_88490">
            <path fill="#fff" d="M0 0H16V16H0z"></path>
          </clipPath>
          <clipPath id="clip1_385_88490">
            <path fill="#fff" d="M0 0H16V16H0z"></path>
          </clipPath>
        </defs>
      </svg>
    ),

    added: true,
    tempSelectedOnSection: false,
    tempSelectedOnModal: false,
  },
  Milestone: {
    name: 'Milestone',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="none"
        viewBox="0 0 16 16"
      >
        <path
          fill="#002462"
          fillRule="evenodd"
          d="M3.302.128a.571.571 0 10-.511 1.022l.256.128v8.914l-.256.128a.571.571 0 10.511 1.022l10.193-5.096a.571.571 0 000-1.022L3.302.128z"
          clipRule="evenodd"
        ></path>
        <path
          fill="#FFA502"
          fillRule="evenodd"
          d="M3.047.05c.473 0 .857.385.857.858v14.184a.857.857 0 11-1.715 0V.908c0-.473.384-.857.858-.857z"
          clipRule="evenodd"
        ></path>
      </svg>
    ),

    added: false,
    tempSelectedOnSection: false,
    tempSelectedOnModal: false,
  },
  'Employees List': {
    name: 'Employees List',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="none"
        viewBox="0 0 16 16"
      >
        <g clipPath="url(#clip0_385_88536)">
          <g fillRule="evenodd" clipPath="url(#clip1_385_88536)" clipRule="evenodd">
            <path fill="#002462" d="M8 0a8 8 0 110 16A8 8 0 018 0z"></path>
            <path
              fill="#FFA502"
              d="M10 15.748c-.639.164-1.31.252-2 .252a7.995 7.995 0 01-6.8-3.785C2.161 10.87 3.503 9.93 5.223 9.93c2.956 0 4.514 2.436 4.737 5.11.02.23.035.47.04.709zm4.942-3.77a8.032 8.032 0 01-3.785 3.375c.033-.143.045-.292.032-.443-.123-1.47-.617-2.966-1.583-4.124a5.838 5.838 0 00-.16-.182 4.278 4.278 0 014.796.638l.7.737zM7.97 6.273a2.566 2.566 0 10-5.132 0 2.566 2.566 0 005.132 0zm3.387-1.38a2.126 2.126 0 110 4.25 2.126 2.126 0 010-4.25z"
            ></path>
          </g>
        </g>
        <defs>
          <clipPath id="clip0_385_88536">
            <path fill="#fff" d="M0 0H16V16H0z"></path>
          </clipPath>
          <clipPath id="clip1_385_88536">
            <path fill="#fff" d="M0 0H16V16H0z"></path>
          </clipPath>
        </defs>
      </svg>
    ),

    added: false,
    tempSelectedOnSection: false,
    tempSelectedOnModal: false,
  },
  'Salary Book': {
    name: 'Salary Book',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="none"
        viewBox="0 0 16 16"
      >
        <g clipPath="url(#clip0_385_96589)">
          <g clipPath="url(#clip1_385_96589)">
            <path
              fill="#002462"
              fillRule="evenodd"
              d="M.657 2.349a.714.714 0 00-.42.919c.325.871.933 1.507 1.516 1.938a.714.714 0 10.85-1.148c-.437-.324-.827-.754-1.027-1.29a.714.714 0 00-.92-.42z"
              clipRule="evenodd"
            ></path>
            <path
              fill="#002462"
              fillRule="evenodd"
              d="M11.773.441C10.892.401 9.21.805 8.4 2.378c-1.949-.066-3.45.216-4.589.762-1.228.588-2.003 1.468-2.454 2.468-1.045 2.314-.316 4.74.076 6.047l.006.017c.058.194.11.36.151.486l.023.072c.02.06.033.105.043.137v1.963c0 .632.512 1.142 1.142 1.142h2.018c.632 0 1.143-.511 1.143-1.143v-.464h2.447v.554c0 .63.511 1.143 1.143 1.143h2c.63 0 1.142-.512 1.142-1.143v-.728c1.318-.517 2.428-1.244 3.054-2.591a.571.571 0 00.053-.24V8.322a.571.571 0 00-.208-.441l-.795-.653c-.017-.759-.115-1.5-.44-2.158-.328-.67-.863-1.206-1.664-1.608V1.459c0-.428-.284-.99-.917-1.018z"
              clipRule="evenodd"
            ></path>
            <path
              fill="#FFA502"
              fillRule="evenodd"
              d="M8.43 5.602c0 .395-.32.715-.715.715h-2.12a.714.714 0 110-1.43h2.12c.394 0 .714.32.714.715z"
              clipRule="evenodd"
            ></path>
            <path fill="#FFA502" d="M12.113 7.033a.875.875 0 11-1.75 0 .875.875 0 011.75 0z"></path>
          </g>
        </g>
        <defs>
          <clipPath id="clip0_385_96589">
            <path fill="#fff" d="M0 0H16V16H0z"></path>
          </clipPath>
          <clipPath id="clip1_385_96589">
            <path fill="#fff" d="M0 0H16V16H0z"></path>
          </clipPath>
        </defs>
      </svg>
    ),

    added: true,
    tempSelectedOnSection: false,
    tempSelectedOnModal: false,
  },
  'Account Title': {
    name: 'Account Title',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="none"
        viewBox="0 0 16 16"
      >
        <g clipPath="url(#clip0_385_88587)">
          <g clipPath="url(#clip1_385_88587)">
            <path
              fill="#FFA502"
              d="M8 .571c.631 0 1.143.512 1.143 1.143V8c0 .631-.512 1.143-1.143 1.143H1.636A1.143 1.143 0 01.493 8V1.714c0-.63.512-1.143 1.143-1.143H8z"
            ></path>
            <path
              fill="#002462"
              fillRule="evenodd"
              d="M15.429 1.143a.571.571 0 00-.572-.572H11.43a.571.571 0 00-.572.572v2.571c0 .316.256.572.572.572h3.428a.571.571 0 00.572-.572V1.143zm-.572 4.286c.316 0 .572.255.572.571v2.571a.571.571 0 01-.572.572H11.43a.571.571 0 01-.572-.572V6c0-.316.256-.571.572-.571h3.428zm-.571 5.428c.63 0 1.143.512 1.143 1.143v2.286c0 .63-.512 1.143-1.143 1.143H1.714a1.143 1.143 0 01-1.143-1.143V12c0-.631.512-1.143 1.143-1.143h12.572z"
              clipRule="evenodd"
            ></path>
          </g>
        </g>
        <defs>
          <clipPath id="clip0_385_88587">
            <path fill="#fff" d="M0 0H16V16H0z"></path>
          </clipPath>
          <clipPath id="clip1_385_88587">
            <path fill="#fff" d="M0 0H16V16H0z"></path>
          </clipPath>
        </defs>
      </svg>
    ),

    added: true,
    tempSelectedOnSection: false,
    tempSelectedOnModal: false,
  },
  'Client List': {
    name: 'Client List',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="none"
        viewBox="0 0 16 16"
      >
        <g clipPath="url(#clip0_385_88609)">
          <g clipPath="url(#clip1_385_88609)">
            <path
              fill="#FFA502"
              fillRule="evenodd"
              d="M4.3.608A2 2 0 015.714.023h4.572a2 2 0 012 2v2.285a.857.857 0 11-1.715 0V2.023a.286.286 0 00-.285-.286H5.714a.286.286 0 00-.285.286v2.285a.857.857 0 01-1.715 0V2.023A2 2 0 014.3.608z"
              clipRule="evenodd"
            ></path>
            <path
              fill="#002462"
              d="M1.714 3.429C.768 3.429 0 4.196 0 5.143v9.143C0 15.232.768 16 1.714 16h12.572c.947 0 1.714-.768 1.714-1.714V5.143c0-.947-.768-1.714-1.714-1.714H1.714z"
            ></path>
          </g>
        </g>
        <defs>
          <clipPath id="clip0_385_88609">
            <path fill="#fff" d="M0 0H16V16H0z"></path>
          </clipPath>
          <clipPath id="clip1_385_88609">
            <path fill="#fff" d="M0 0H16V16H0z"></path>
          </clipPath>
        </defs>
      </svg>
    ),

    added: false,
    tempSelectedOnSection: false,
    tempSelectedOnModal: false,
  },
  Administrator: {
    name: 'Administrator',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="none"
        viewBox="0 0 16 16"
      >
        <g clipPath="url(#clip0_385_88631)">
          <g clipPath="url(#clip1_385_88631)">
            <path
              fill="#FFA502"
              d="M8 9.702a7.989 7.989 0 00-7.607 5.55.571.571 0 00.544.745h14.126a.571.571 0 00.544-.746A7.988 7.988 0 008 9.702z"
            ></path>
            <path
              fill="#002462"
              d="M8 .003a5.406 5.406 0 100 10.811A5.406 5.406 0 008 .003z"
            ></path>
            <path
              fill="#FFA502"
              fillRule="evenodd"
              d="M2.854 3.777a5.41 5.41 0 0110.456.64.571.571 0 01-.557.68h-.037a5.27 5.27 0 01-3.532-1.353 5.27 5.27 0 01-3.532 1.353 5.267 5.267 0 01-2.528-.642.571.571 0 01-.27-.678zm3.243 2.618a.714.714 0 01.96.313c.105.205.436.416.943.416.507 0 .839-.21.943-.416a.714.714 0 011.273.648C9.774 8.226 8.8 8.552 8 8.552c-.799 0-1.774-.327-2.216-1.196a.714.714 0 01.313-.96z"
              clipRule="evenodd"
            ></path>
          </g>
        </g>
        <defs>
          <clipPath id="clip0_385_88631">
            <path fill="#fff" d="M0 0H16V16H0z"></path>
          </clipPath>
          <clipPath id="clip1_385_88631">
            <path fill="#fff" d="M0 0H16V16H0z"></path>
          </clipPath>
        </defs>
      </svg>
    ),

    added: false,
    tempSelectedOnSection: false,
    tempSelectedOnModal: false,
  },
  Journal: {
    name: 'Journal',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="none"
        viewBox="0 0 16 16"
      >
        <g clipPath="url(#clip0_385_88654)">
          <g clipPath="url(#clip1_385_88654)">
            <path
              fill="#002462"
              d="M1.71.205C4.714.56 7.358 1.745 8 2.386c.642-.642 3.286-1.824 6.29-2.18.94-.112 1.71.662 1.71 1.61v9.142c0 .947-.774 1.701-1.705 1.87-2.104.382-3.854 1.391-4.97 2.189-.77.55-1.88.55-2.65-.001-1.117-.797-2.866-1.806-4.97-2.188C.774 12.66 0 11.905 0 10.958V1.815C0 .868.77.093 1.71.205z"
            ></path>
            <path
              fill="#FFA502"
              d="M7.286 15.32V1.889c.42.235 1.008.235 1.428 0v13.43c-.46.147-.968.146-1.428 0z"
            ></path>
          </g>
        </g>
        <defs>
          <clipPath id="clip0_385_88654">
            <path fill="#fff" d="M0 0H16V16H0z"></path>
          </clipPath>
          <clipPath id="clip1_385_88654">
            <path fill="#fff" d="M0 0H16V16H0z"></path>
          </clipPath>
        </defs>
      </svg>
    ),

    added: false,
    tempSelectedOnSection: false,
    tempSelectedOnModal: false,
  },
  'View Voucher': {
    name: 'View Voucher',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="none"
        viewBox="0 0 16 16"
      >
        <g clipPath="url(#clip0_385_88677)">
          <g clipPath="url(#clip1_385_88677)">
            <path
              fill="#FFA502"
              d="M8.03 3.496a.548.548 0 00-.67-.387L.406 4.97a.548.548 0 00-.388.671l2.668 9.951a.548.548 0 00.671.388l6.953-1.862a.548.548 0 00.387-.671L8.03 3.496z"
            ></path>
            <path
              fill="#002462"
              d="M7.97.765a.548.548 0 01.67-.388l6.954 1.862a.548.548 0 01.387.672l-2.668 9.951a.548.548 0 01-.671.387l-6.953-1.862a.548.548 0 01-.387-.671L7.97.765z"
            ></path>
          </g>
        </g>
        <defs>
          <clipPath id="clip0_385_88677">
            <path fill="#fff" d="M0 0H16V16H0z"></path>
          </clipPath>
          <clipPath id="clip1_385_88677">
            <path fill="#fff" d="M0 0H16V16H0z"></path>
          </clipPath>
        </defs>
      </svg>
    ),

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

  // TODO: Implement the data fetching (20240415 - Shirley)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [dashboardOverview, setDashboardOverview, DashboardOverviewRef] =
    useStateRef<IDashboardOverview>(generateDashboardOverview());

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

  const removeBookmark = (bookmarkName: string) => {
    setBookmarkList((prevBookmarkList: Record<string, BookmarkItem>) => ({
      ...prevBookmarkList,
      [bookmarkName]: {
        ...prevBookmarkList[bookmarkName],
        added: false,
      },
    }));
  };

  const addBookmarks = (bookmarks: string[]) => {
    setBookmarkList((prevBookmarkList: Record<string, BookmarkItem>) => {
      const updatedBookmarkList = { ...prevBookmarkList };
      Object.entries(updatedBookmarkList).forEach(([key, value]) => {
        updatedBookmarkList[key] = {
          ...value,
          added: false,
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

  // eslint-disable-next-line react/jsx-no-constructed-context-values
  const value = {
    bookmarkList: bookmarkListRef.current,
    toggleBookmark,
    addBookmarks,
    removeBookmark,
    dashboardOverview: DashboardOverviewRef.current,
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};

export const useDashboard = () => {
  const context = React.useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
