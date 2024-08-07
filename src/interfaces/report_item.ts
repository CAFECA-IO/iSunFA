import { timestampToString } from '@/lib/utils/common';
import { FinancialReportTypesKey } from '@/interfaces/report_type';
import { IPaginatedReport, IReport } from '@/interfaces/report';
import { IPaginatedData } from '@/interfaces/pagination';
import { ReportSheetType, ReportType } from '@/constants/report';

export interface IBasicReportItem {
  id: string;
  name: string;
  createdTimestamp: number;
  period: {
    startTimestamp: number;
    endTimestamp: number;
  };
  type: ReportType;
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

export interface IPaginatedPendingReportItem extends IPaginatedData<IPendingReportItem[]> {}
export interface IPaginatedGeneratedReportItem extends IPaginatedData<IGeneratedReportItem[]> {}

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
    type: ReportType.FINANCIAL,
  };
};

export const generateRandomPendingReportItems = (count: number): IPendingReportItem[] => {
  return Array.from({ length: count }, (_, index) => generateRandomPendingReportItem(index));
};

export const DUMMY_PENDING_REPORT_ITEMS = generateRandomPendingReportItems(5);

export const MOCK_REPORTS: IReport[] = [
  {
    id: 1,
    companyId: 123,
    tokenContract: '0x123abc',
    tokenId: '456def',
    name: 'Mock Report',
    from: 1630444800,
    to: 1633046400,
    type: ReportType.FINANCIAL,
    reportType: ReportSheetType.BALANCE_SHEET,
    status: 'completed',
    remainingSeconds: 0,
    paused: false,
    projectId: null,
    project: null,
    reportLink: 'https://example.com/report',
    downloadLink: 'https://example.com/download',
    blockChainExplorerLink: 'https://example.com/explorer',
    evidenceId: 'abc123',
    content: [],
    otherInfo: null,
    createdAt: 1633046400,
    updatedAt: 1633046400,
  },
  {
    id: 2,
    companyId: 123,
    tokenContract: '0x123abc',
    tokenId: '456def',
    name: 'Mock Report',
    from: 1630444800,
    to: 1633046400,
    type: ReportType.FINANCIAL,
    reportType: ReportSheetType.BALANCE_SHEET,
    status: 'completed',
    remainingSeconds: 0,
    paused: false,
    projectId: null,
    project: null,
    reportLink: 'https://example.com/report',
    downloadLink: 'https://example.com/download',
    blockChainExplorerLink: 'https://example.com/explorer',
    evidenceId: 'abc123',
    content: [],
    otherInfo: null,
    createdAt: 1633046400,
    updatedAt: 1633046400,
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
    blockchainExplorerLink:
      'https://baifa.io/en/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007',
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
    type: ReportType.FINANCIAL,
  };
};

export const generateRandomGeneratedReportItems = (count: number): IGeneratedReportItem[] => {
  return Array.from({ length: count }, (_, index) => generateRandomGeneratedReportItem(index));
};

export const DUMMY_GENERATED_REPORT_ITEMS = generateRandomGeneratedReportItems(5);

export const FIXED_DUMMY_PAGINATED_PENDING_REPORT_ITEMS: IPaginatedReport = {
  data: MOCK_REPORTS,
  page: 1,
  totalPages: 2,
  totalCount: 5,
  pageSize: 5,
  hasNextPage: true,
  hasPreviousPage: false,
  sort: [
    {
      sortBy: 'createdAt',
      sortOrder: 'asc',
    },
  ],
};

export const FIXED_DUMMY_PAGINATED_GENERATED_REPORT_ITEMS: IPaginatedReport = {
  data: MOCK_REPORTS,
  page: 1,
  totalPages: 2,
  totalCount: 5,
  pageSize: 5,
  hasNextPage: true,
  hasPreviousPage: false,
  sort: [
    {
      sortBy: 'createdAt',
      sortOrder: 'asc',
    },
  ],
};
