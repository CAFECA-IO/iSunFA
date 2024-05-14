import { timestampToString } from '../lib/utils/common';

export enum AppliedRequestStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

export interface IPendingReportItem {
  id: string;
  name: string;
  createdTimestamp: number;
  period: {
    startTimestamp: number;
    endTimestamp: number;
  };
  remainingSeconds: number;
}

export const generateRandomPendingReportItem = (daysAgo: number): IPendingReportItem => {
  const now = new Date();
  const startTimestampMs = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - daysAgo
  ).getTime();
  const endTimestampMs = startTimestampMs + 1000 * 60 * 60 * 24 * 30;
  const createdTimestampMs =
    startTimestampMs - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 30);

  const remainingSec = 3800;

  const startTimestamp = Math.floor(startTimestampMs / 1000);
  const endTimestamp = Math.floor(endTimestampMs / 1000);

  const createdTimestamp = Math.floor(createdTimestampMs / 1000);
  const createdDate = timestampToString(createdTimestamp);

  return {
    id: Math.random().toString(36).substring(7),
    name: `Balance Sheet-${createdDate.year}${createdDate.month}${createdDate.day}-1`,
    createdTimestamp,
    period: {
      startTimestamp,
      endTimestamp,
    },
    remainingSeconds: remainingSec,
  };
};

export const generateRandomPendingReportItems = (count: number): IPendingReportItem[] => {
  return Array.from({ length: count }, (_, index) => generateRandomPendingReportItem(index));
};

export const DUMMY_PENDING_REPORT_ITEMS = generateRandomPendingReportItems(10);

export const FIXED_DUMMY_PENDING_REPORT_ITEMS: IPendingReportItem[] = [
  {
    id: '7034v4',
    name: 'Balance Sheet-20240420-1',
    createdTimestamp: 1713611226,
    period: { startTimestamp: 1683043200, endTimestamp: 1704067200 }, // 2023-05-02 to 2024-01-01
    remainingSeconds: 3800,
  },
  {
    id: 'sclika',
    name: 'Cash Flow Statement-20240505-1',
    createdTimestamp: 1714897574,
    period: { startTimestamp: 1695609600, endTimestamp: 1698106883 }, // 2023-09-25 to 2023-10-24
    remainingSeconds: 3800,
  },
  {
    id: 'qxh66j',
    name: 'Comprehensive Income Statement-20240412-1',
    createdTimestamp: 1712863312,
    period: { startTimestamp: 1685721600, endTimestamp: 1704076800 }, // 2023-06-03 to 2024-01-01
    remainingSeconds: 3800,
  },
  {
    id: '4ruh5k',
    name: 'Balance Sheet-20240423-1',
    createdTimestamp: 1713846643,
    period: { startTimestamp: 1693113600, endTimestamp: 1704096000 }, // 2023-08-27 to 2024-01-01
    remainingSeconds: 3800,
  },
  {
    id: 'wyt0mi',
    name: 'Balance Sheet-20240501-1',
    createdTimestamp: 1714508675,
    period: { startTimestamp: 1698374400, endTimestamp: 1714022400 }, // 2023-11-01 to 2024-01-01
    remainingSeconds: 3800,
  },
  {
    id: 'qmj0ql',
    name: 'Balance Sheet-20240425-1',
    createdTimestamp: 1714030458,
    period: { startTimestamp: 1700179200, endTimestamp: 1715932800 }, // 2023-11-16 to 2024-04-01
    remainingSeconds: 3800,
  },
  {
    id: '9xun2',
    name: 'Balance Sheet-20240420-1',
    createdTimestamp: 1713575632,
    period: { startTimestamp: 1684800000, endTimestamp: 1700092800 }, // 2023-05-23 to 2023-11-15
    remainingSeconds: 3800,
  },
  {
    id: 'qrplhf',
    name: 'Balance Sheet-20240414-1',
    createdTimestamp: 1713039468,
    period: { startTimestamp: 1694736000, endTimestamp: 1713955200 }, // 2023-09-15 to 2024-02-01
    remainingSeconds: 3800,
  },
  {
    id: 'au3m35',
    name: 'Balance Sheet-20240428-1',
    createdTimestamp: 1714246089,
    period: { startTimestamp: 1692662400, endTimestamp: 1705459200 }, // 2023-08-21 to 2024-02-01
    remainingSeconds: 3800,
  },
  {
    id: 'dicd1',
    name: 'Balance Sheet-20240421-1',
    createdTimestamp: 1713679397,
    period: { startTimestamp: 1686009600, endTimestamp: 1707859200 }, // 2023-06-06 to 2024-03-15
    remainingSeconds: 3800,
  },
];

export interface IGeneratedReportItem {
  id: string;
  name: string;
  createdTimestamp: number;
  period: {
    startTimestamp: number;
    endTimestamp: number;
  };
  blockchainExplorerLink: string;
  project: {
    id: string;
    name: string;
    abbreviation: string;
  };
  downloadLink: string;
  // shareLink: string;
}
