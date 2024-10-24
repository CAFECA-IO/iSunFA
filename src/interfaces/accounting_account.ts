import { AccountType, EquityType, ProgressStatus } from '@/constants/account';
import { Account } from '@prisma/client';
import { ReportSheetType } from '@/constants/report';
import { IPaginatedData } from '@/interfaces/pagination';
import { SortOrder } from '@/constants/sort';

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

export interface IPaginatedAccount extends IPaginatedData<IAccount[]> {}

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
  children: IAccountForSheetDisplay[];
  debit?: boolean;
}

export interface IAccountReadyForFrontend {
  code: string;
  name: string;
  curPeriodAmount: number;
  curPeriodAmountString: string;
  curPeriodPercentage: number;
  curPeriodPercentageString: string;
  prePeriodAmount: number;
  prePeriodAmountString: string;
  prePeriodPercentage: number;
  prePeriodPercentageString: string;
  indent: number;
  children: IAccountReadyForFrontend[];
}

export type IAccountQueryArgs = {
  companyId: number;
  includeDefaultAccount?: boolean;
  liquidity?: boolean;
  type?: AccountType;
  reportType?: ReportSheetType;
  equityType?: EquityType;
  forUser?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'code' | 'createdAt';
  sortOrder?: SortOrder.ASC | SortOrder.DESC;
  searchKey?: string;
  isDeleted?: boolean;
};
