import { ProgressStatus } from '@/constants/account';
import { Account } from '@prisma/client';

export interface IAccount {
  id: number;
  companyId: number;
  system: string;
  type: string;
  debit: boolean;
  liquidity: boolean;
  code: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

// Info Murky (20240416): Interface
export interface IAccountResultStatus {
  resultId: string;
  status: ProgressStatus;
}

// Info Murky (20240416): this one is for generating financial report, use in utils/account.ts
export type IAccountNode = Omit<Account, 'children' | 'parent' | 'root' | 'leaf'> & {
  children: IAccountNode[];
  amount: number;
};

export interface IAccountForSheetDisplay {
  code: string;
  name: string;
  amount: number | null;
  percentage: number | null;
  indent: number;
  debit?: boolean;
}

export interface IAccountReadyForFrontend {
  code: string;
  name: string;
  curPeriodAmount: number;
  curPeriodAmountString: string;
  curPeriodPercentage: number;
  prePeriodAmount: number;
  prePeriodAmountString: string;
  prePeriodPercentage: number;
  indent: number;
}

export interface IAccountingTitle {
  id: string;
  code: string;
  name: string;
  accountingType: string;
  assetType: string;
  currentAssetType: string;
  isFavorite: boolean;
}

// ToDo: (20240717 - Julian) to be removed
export const dummyAccountingTitleData: IAccountingTitle[] = [
  {
    id: '1',
    code: '1517',
    name: 'Consolidated financial assets',
    accountingType: 'Assets',
    assetType: 'Current assets',
    currentAssetType: 'Consolidated financial assets',
    isFavorite: false,
  },
  {
    id: '2',
    code: '1550',
    name: 'Equity-method investments',
    accountingType: 'Assets',
    assetType: 'Current assets',
    currentAssetType: 'Consolidated financial assets',
    isFavorite: false,
  },
  {
    id: '3',
    code: '1660',
    name: 'Real estate, property and equipment',
    accountingType: 'Assets',
    assetType: 'Current assets',
    currentAssetType: 'Consolidated financial assets',
    isFavorite: true,
  },
  {
    id: '4',
    code: '1755',
    name: 'Royalty assets',
    accountingType: 'Assets',
    assetType: 'Current assets',
    currentAssetType: 'Consolidated financial assets',
    isFavorite: false,
  },
  {
    id: '5',
    code: '1780',
    name: 'Intangible assets',
    accountingType: 'Assets',
    assetType: 'Current assets',
    currentAssetType: 'Consolidated financial assets',
    isFavorite: false,
  },
  {
    id: '6',
    code: '1840',
    name: 'Deferred tax assets',
    accountingType: 'Assets',
    assetType: 'Current assets',
    currentAssetType: 'Consolidated financial assets',
    isFavorite: true,
  },
];
