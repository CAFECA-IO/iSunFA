import { AccountType, EquityType, ProgressStatus } from '@/constants/account';
import { Account } from '@prisma/client';
import { ReportSheetType } from '@/constants/report';
import { IPaginatedData } from '@/interfaces/pagination';
import { SortOrder } from '@/constants/sort';

/**
 * Info: (20241023 - Murky)
 * @description this account interface specifies for front usage
 */
export interface IAccount {
  id: number;
  accountBookId: number;
  /**
   * Info: (20241023 - Murky)
   * @enum {string} system - IFRS, GAAP
   */
  system: string;
  /**
   * Info: (20241023 - Murky)
   * @enum {string} type -  AccountType (check constants/account.ts)
   */
  type: string;

  /**
   * Info: (20241023 - Murky)
   * @description false will be credit
   */
  debit: boolean;
  liquidity: boolean;
  code: string;
  name: string;
  note: string | null;
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

export type IAccountNodeWithDebitAndCredit = Omit<
  Account,
  'children' | 'parent' | 'root' | 'leaf'
> & {
  children: IAccountNodeWithDebitAndCredit[];
  debitAmount: number;
  creditAmount: number;
};

export interface IAccountForSheetDisplay {
  accountId: number;
  code: string;
  name: string;
  amount: number | null;
  percentage: number | null;
  indent: number;
  children: IAccountForSheetDisplay[];
  debit?: boolean;
}

export interface IAccountReadyForFrontend {
  accountId: number;
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
  accountBookId: number;
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

/**
 * Info: (20241023 - Murky)
 * @description this account interface specifies for backend usage
 * @note use parsePrismaAccountToAccountEntity to convert Prisma.Account to IAccountEntity
 * @note use initAccountEntity to create a new IAccountEntity from scratch
 */
export interface IAccountEntity {
  /**
   * Info: (20241023 - Murky)
   * @description account id from database, 0 means not created in database yet
   */
  id: number;
  accountBookId: number;
  /**
   * Info: (20241023 - Murky)
   * @enum {string} system - IFRS, GAAP
   */
  system: string;
  /**
   * Info: (20241023 - Murky)
   * @enum {string} type -  AccountType (check constants/account.ts)
   */
  type: AccountType;

  /**
   * Info: (20241023 - Murky)
   * @description false will be credit
   */
  debit: boolean;

  /**
   * Info: (20241023 - Murky)
   * @description true means current, false means non-current
   */
  liquidity: boolean;

  /**
   * Info: (20241023 - Murky)
   * @description account code from XBRL
   */
  code: string;

  /**
   * Info: (20241023 - Murky)
   * @description account name from XBRL
   */
  name: string;

  /**
   * Info: (20241023 - Murky)
   * @description forUser only apply to account that is the leaf of accounting ranking tree or created by user
   */
  forUser: boolean;

  /**
   * Info: (20241023 - Murky)
   * @description parentCode is the code of account which this account is belong to
   */
  parentCode: string;

  /**
   * Info: (20241023 - Murky)
   * @description rootCode is the code of account which is for extract all the account that belong to the same root, but not in used in beta
   */
  rootCode?: string;

  parentId: number;
  rootId: number;

  /**
   * Info: (20241023 - Murky)
   * @description level is for the account hierarchy level in accounting tree
   */
  level: number;

  createdAt: number;
  updatedAt: number;

  /**
   * Info: (20241023 - Murky)
   * @description deletedAt will be null if the account is not deleted
   */
  deletedAt: number | null;

  /**
   * Info: (20241023 - Murky)
   * @description parent is the account that this account is belong to in accounting tree
   */
  parent?: IAccountEntity;

  /**
   * Info: (20241023 - Murky)
   * @description root is to extract all the account that belong to the same root, but not in used in beta
   */
  root?: IAccountEntity;
}
