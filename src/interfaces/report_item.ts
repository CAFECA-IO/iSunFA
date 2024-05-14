import { timestampToString } from '../lib/utils/common';

export interface IBasicReportItem {
  id: string;
  name: string;
  createdTimestamp: number;
  period: {
    startTimestamp: number;
    endTimestamp: number;
  };
}

export interface IPendingReportItem extends IBasicReportItem {
  remainingSeconds: number;
}

export interface IGeneratedReportItem extends IBasicReportItem {
  blockchainExplorerLink: string;
  project: {
    id: string;
    name: string;
    code: string;
  };
  downloadLink: string;
  // shareLink: string;
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

export const generateRandomGeneratedReportItem = (daysAgo: number): IGeneratedReportItem => {
  const now = new Date();
  const startTimestampMs = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - daysAgo
  ).getTime();
  const endTimestampMs = startTimestampMs + 1000 * 60 * 60 * 24 * 30;
  const createdTimestampMs =
    startTimestampMs - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 30);

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
    blockchainExplorerLink: 'https://explorer.example.com/tx/123',
    project: {
      id: Math.random().toString(36).substring(7),
      name: 'Example Project',
      code: 'EX',
    },
    downloadLink: 'https://example.com/download/report.pdf',
  };
};

export const generateRandomGeneratedReportItems = (count: number): IGeneratedReportItem[] => {
  return Array.from({ length: count }, (_, index) => generateRandomGeneratedReportItem(index));
};

export const DUMMY_GENERATED_REPORT_ITEMS = generateRandomGeneratedReportItems(10);

export const FIXED_DUMMY_GENERATED_REPORT_ITEMS: IGeneratedReportItem[] = [
  {
    id: 'olszjd',
    name: 'Balance Sheet-20240423-1',
    createdTimestamp: 1713815673,
    period: { startTimestamp: 1715616000, endTimestamp: 1718208000 },
    blockchainExplorerLink: 'https://explorer.example.com/tx/123',
    project: { id: 'nufp6', name: 'Example Project', code: 'EX' },
    downloadLink: 'https://example.com/download/report.pdf',
  },
  {
    id: 'y11ggs',
    name: 'Balance Sheet-20240420-1',
    createdTimestamp: 1713543101,
    period: { startTimestamp: 1715529600, endTimestamp: 1718121600 },
    blockchainExplorerLink: 'https://explorer.example.com/tx/123',
    project: { id: 'hnhirr', name: 'Example Project', code: 'EX' },
    downloadLink: 'https://example.com/download/report.pdf',
  },
  {
    id: 'uiz7oa',
    name: 'Balance Sheet-20240427-1',
    createdTimestamp: 1714220640,
    period: { startTimestamp: 1715443200, endTimestamp: 1718035200 },
    blockchainExplorerLink: 'https://explorer.example.com/tx/123',
    project: { id: '25ptrg', name: 'Example Project', code: 'EX' },
    downloadLink: 'https://example.com/download/report.pdf',
  },
  {
    id: '6pa0sq',
    name: 'Balance Sheet-20240422-1',
    createdTimestamp: 1713755682,
    period: { startTimestamp: 1715356800, endTimestamp: 1717948800 },
    blockchainExplorerLink: 'https://explorer.example.com/tx/123',
    project: { id: 'jxo6l', name: 'Example Project', code: 'EX' },
    downloadLink: 'https://example.com/download/report.pdf',
  },
  {
    id: 'c353qc',
    name: 'Balance Sheet-20240429-1',
    createdTimestamp: 1714331987,
    period: { startTimestamp: 1715270400, endTimestamp: 1717862400 },
    blockchainExplorerLink: 'https://explorer.example.com/tx/123',
    project: { id: '3xza6b', name: 'Example Project', code: 'EX' },
    downloadLink: 'https://example.com/download/report.pdf',
  },
  {
    id: 'er6d7h',
    name: 'Balance Sheet-20240418-1',
    createdTimestamp: 1713441961,
    period: { startTimestamp: 1715184000, endTimestamp: 1717776000 },
    blockchainExplorerLink: 'https://explorer.example.com/tx/123',
    project: { id: 'c3zio', name: 'Example Project', code: 'EX' },
    downloadLink: 'https://example.com/download/report.pdf',
  },
  {
    id: 'f0lb69',
    name: 'Balance Sheet-20240414-1',
    createdTimestamp: 1713056465,
    period: { startTimestamp: 1715097600, endTimestamp: 1717689600 },
    blockchainExplorerLink: 'https://explorer.example.com/tx/123',
    project: { id: 'pbklk9', name: 'Example Project', code: 'EX' },
    downloadLink: 'https://example.com/download/report.pdf',
  },
  {
    id: 'iun5h',
    name: 'Balance Sheet-20240424-1',
    createdTimestamp: 1713972076,
    period: { startTimestamp: 1715011200, endTimestamp: 1717603200 },
    blockchainExplorerLink: 'https://explorer.example.com/tx/123',
    project: { id: 'hd684n', name: 'Example Project', code: 'EX' },
    downloadLink: 'https://example.com/download/report.pdf',
  },
  {
    id: '3qay0p',
    name: 'Balance Sheet-20240416-1',
    createdTimestamp: 1713230545,
    period: { startTimestamp: 1714924800, endTimestamp: 1717516800 },
    blockchainExplorerLink: 'https://explorer.example.com/tx/123',
    project: { id: 'sx3g1c', name: 'Example Project', code: 'EX' },
    downloadLink: 'https://example.com/download/report.pdf',
  },
  {
    id: 'un244u',
    name: 'Balance Sheet-20240415-1',
    createdTimestamp: 1713123159,
    period: { startTimestamp: 1714838400, endTimestamp: 1717430400 },
    blockchainExplorerLink: 'https://explorer.example.com/tx/123',
    project: { id: 'vxwqk', name: 'Example Project', code: 'EX' },
    downloadLink: 'https://example.com/download/report.pdf',
  },
];
