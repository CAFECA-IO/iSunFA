import { timestampToString } from '@/lib/utils/common';
import { FinancialReportTypesKey } from '@/interfaces/report_type';

export interface IBasicReportItem {
  id: string;
  name: string;
  createdTimestamp: number;
  period: {
    startTimestamp: number;
    endTimestamp: number;
  };
  type: 'analysis' | 'financial'; // ToDo: 需要調整成 enum (20240522 - Tzuhan)
  reportType: FinancialReportTypesKey;
}

export interface IPendingReportItem extends IBasicReportItem {
  paused: boolean;
  remainingSeconds: number;
}

export interface IGeneratedReportItem extends IBasicReportItem {
  project: {
    id: string;
    name: string;
    code: string;
  } | null;
  reportLinkId: string;
  downloadLink: string;
  blockchainExplorerLink: string;
  evidenceId: string;
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
    paused: false,
    reportType: FinancialReportTypesKey.balance_sheet,
    type: 'financial',
  };
};

export const generateRandomPendingReportItems = (count: number): IPendingReportItem[] => {
  return Array.from({ length: count }, (_, index) => generateRandomPendingReportItem(index));
};

export const DUMMY_PENDING_REPORT_ITEMS = generateRandomPendingReportItems(5);

export const FIXED_DUMMY_PENDING_REPORT_ITEMS: IPendingReportItem[] = [
  {
    id: '7034v4',
    name: 'Cash Flow Statement-20240420-1',
    createdTimestamp: 1713611226,
    period: { startTimestamp: 1683043200, endTimestamp: 1704067200 }, // 2023-05-02 to 2024-01-01
    remainingSeconds: 10,
    paused: false,
    reportType: FinancialReportTypesKey.cash_flow_statement,
    type: 'financial',
  },
  {
    id: 'sclika',
    name: 'Cash Flow Statement-20240505-1',
    createdTimestamp: 1714897574,
    period: { startTimestamp: 1695609600, endTimestamp: 1698106883 }, // 2023-09-25 to 2023-10-24
    remainingSeconds: 250,
    paused: true,
    reportType: FinancialReportTypesKey.cash_flow_statement,
    type: 'financial',
  },
  {
    id: 'qxh66j',
    name: 'Comprehensive Income Statement-20240412-1',
    createdTimestamp: 1712863312,
    period: { startTimestamp: 1685721600, endTimestamp: 1704076800 }, // 2023-06-03 to 2024-01-01
    remainingSeconds: 1615,
    paused: false,
    reportType: FinancialReportTypesKey.comprehensive_income_statement,
    type: 'financial',
  },
  {
    id: '4ruh5k',
    name: 'Balance Sheet-20240423-1',
    createdTimestamp: 1713846643,
    period: { startTimestamp: 1693113600, endTimestamp: 1704096000 }, // 2023-08-27 to 2024-01-01
    remainingSeconds: 3680,
    paused: false,
    reportType: FinancialReportTypesKey.balance_sheet,
    type: 'financial',
  },
  {
    id: 'wyt0mi',
    name: 'Balance Sheet-20240501-1',
    createdTimestamp: 1714508675,
    period: { startTimestamp: 1698374400, endTimestamp: 1714022400 }, // 2023-11-01 to 2024-01-01
    remainingSeconds: 30,
    paused: false,
    reportType: FinancialReportTypesKey.balance_sheet,
    type: 'financial',
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
    blockchainExplorerLink: `https://baifa.io/en/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007`,
    project: {
      id: Math.random().toString(36).substring(7),
      name: 'Example Project',
      code: 'EX',
    },
    downloadLink: 'https://example.com/download/report.pdf',
    reportType: FinancialReportTypesKey.balance_sheet,
    reportLinkId:
      '505c1ddbd5d6cb47fc769577d6afaa0410f5c10900000000000000000000000000000000000000007',
    evidenceId: '505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007',
    type: 'financial',
  };
};

export const generateRandomGeneratedReportItems = (count: number): IGeneratedReportItem[] => {
  return Array.from({ length: count }, (_, index) => generateRandomGeneratedReportItem(index));
};

export const DUMMY_GENERATED_REPORT_ITEMS = generateRandomGeneratedReportItems(5);

export const FIXED_DUMMY_GENERATED_REPORT_ITEMS: IGeneratedReportItem[] = [
  {
    id: 'olszjd',
    name: 'Balance Sheet-20240423-1',
    createdTimestamp: 1713815673,
    period: { startTimestamp: 1715616000, endTimestamp: 1718208000 },
    blockchainExplorerLink: `https://baifa.io/en/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007`,
    reportLinkId: '505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007',
    project: null,
    downloadLink: 'https://BFample.com/download/report.pdf',
    reportType: FinancialReportTypesKey.balance_sheet,
    evidenceId: '505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007',
    type: 'financial',
  },
  {
    id: 'y11ggs',
    name: 'Cash Flow Statement-20240420-1',
    createdTimestamp: 1713543101,
    period: { startTimestamp: 1715529600, endTimestamp: 1718121600 },
    blockchainExplorerLink: `https://baifa.io/en/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007`,
    project: { id: 'hnhirr', name: 'TideBit', code: 'TB' },
    downloadLink: 'https://BFample.com/download/report.pdf',
    reportLinkId: '505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007',
    reportType: FinancialReportTypesKey.cash_flow_statement,
    evidenceId: '505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007',
    type: 'financial',
  },
  {
    id: 'uiz7oa',
    name: 'Balance Sheet-20240427-1',
    createdTimestamp: 1714220640,
    period: { startTimestamp: 1715443200, endTimestamp: 1718035200 },
    blockchainExplorerLink: `https://baifa.io/en/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007`,
    project: { id: '25ptrg', name: 'iSunFA', code: 'IS' },
    downloadLink: 'https://BFample.com/download/report.pdf',
    reportLinkId: '505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007',
    reportType: FinancialReportTypesKey.balance_sheet,
    evidenceId: '505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007',
    type: 'financial',
  },
  {
    id: '6pa0sq',
    name: 'Comprehensive Income Statement-20240422-1',
    createdTimestamp: 1713755682,
    period: { startTimestamp: 1715356800, endTimestamp: 1717948800 },
    blockchainExplorerLink: `https://baifa.io/en/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007`,
    project: null,
    downloadLink: 'https://BFample.com/download/report.pdf',
    reportLinkId: '505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007',
    reportType: FinancialReportTypesKey.comprehensive_income_statement,
    evidenceId: '505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007',
    type: 'financial',
  },
  {
    id: 'c353qc',
    name: 'Balance Sheet-20240429-1',
    createdTimestamp: 1714331987,
    period: { startTimestamp: 1715270400, endTimestamp: 1717862400 },
    blockchainExplorerLink: `https://baifa.io/en/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007`,
    project: { id: '3xza6b', name: 'BAIFA', code: 'BF' },
    downloadLink: 'https://BFample.com/download/report.pdf',
    reportLinkId: '505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007',
    reportType: FinancialReportTypesKey.balance_sheet,
    evidenceId: '505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007',
    type: 'financial',
  },
];
