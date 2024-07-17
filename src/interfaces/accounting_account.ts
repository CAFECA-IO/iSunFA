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
