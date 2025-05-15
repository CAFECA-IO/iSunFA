import { LocaleKey } from '@/constants/normal_setting';
import { ITeam } from '@/interfaces/team';

export const PUBLIC_ACCOUNT_BOOK_ID = 1002;
export const NO_ACCOUNT_BOOK_ID = 555;
export const CANCEL_ACCOUNT_BOOK_ID: number = -1;

export enum ACCOUNT_BOOK_ROLE {
  ACCOUNTANT = 'ACCOUNTANT',
  BOOKKEEPER = 'BOOKKEEPER',
  EDUCATOR = 'EDUCATOR',
  COMPANY = 'COMPANY',
}

export enum WORK_TAG {
  ALL = 'ALL',
  FINANCIAL = 'FINANCIAL',
  TAX = 'TAX',
}

export enum ACCOUNT_BOOK_UPDATE_ACTION {
  UPDATE_TAG = 'updateTag',
}

// Info: (20250418 - Liz) 申報頻率
export enum FILING_FREQUENCY {
  BIMONTHLY_FILING = 'BIMONTHLY_FILING',
  MONTHLY_FILING = 'MONTHLY_FILING',
}

// Info: (20250418 - Liz) 申報方式(總繳種類)
export enum FILING_METHOD {
  SINGLE_ENTITY_FILING = 'SINGLE_ENTITY_FILING',
  CONSOLIDATED_FILING = 'CONSOLIDATED_FILING',
  INDIVIDUAL_FILING = 'INDIVIDUAL_FILING',
}

// Info: (20250418 - Liz) (申報人)申報方式
export enum DECLARANT_FILING_METHOD {
  SELF_FILING = 'SELF_FILING',
  AGENT_FILING = 'AGENT_FILING',
}

// Info: (20250507 - Liz) 申報代理人的角色有三種：會計師(稅務代理人)、記帳士、記帳及報稅代理人
export enum AGENT_FILING_ROLE {
  ACCOUNTANT = 'ACCOUNTANT',
  BOOKKEEPER = 'BOOKKEEPER',
  BOOKKEEPER_AND_FILING_AGENT = 'BOOKKEEPER_AND_FILING_AGENT',
}

// Info: (20250226 - Liz) 原為 ICompany (因為公司已經改名成帳本)
export interface IAccountBook {
  id: number;
  teamId: number;
  userId: number;
  imageId: string;
  name: string;
  taxId: string;
  tag: WORK_TAG;
  startDate: number;
  createdAt: number;
  updatedAt: number;
  isPrivate?: boolean; // Deprecated: (20250423 - Liz) 已棄用

  // ToDo: (20250515 - Liz) RC2 新增表單欄位
  // responsiblePerson: string; // Info: (20250423 - Liz) 負責人姓名
  // taxSerialNumber: string; // Info: (20250423 - Liz) 稅籍編號
  // contactPerson: string; // Info: (20250423 - Liz) 聯絡人姓名
  // phoneNumber: string; // Info: (20250423 - Liz) 電話號碼
  // city: string; // Info: (20250423 - Liz) 縣市
  // district: string; // Info: (20250423 - Liz) 行政區
  // enteredAddress: string; // Info: (20250423 - Liz) 使用者輸入的地址

  // ToDo: (20250515 - Liz) 以下欄位為選填
  // filingFrequency?: FILING_FREQUENCY; // Info: (20250423 - Liz) 申報頻率
  // filingMethod?: FILING_METHOD; // Info: (20250423 - Liz) 總繳種類
  // declarantFilingMethod?: DECLARANT_FILING_METHOD; // Info: (20250423 - Liz) 申報方式

  // declarantName?: string; // Info: (20250423 - Liz) 申報人姓名
  // declarantPersonalId?: string; // Info: (20250423 - Liz) 申報人身分證字號
  // declarantPhoneNumber?: string; // Info: (20250423 - Liz) 申報人電話號碼

  // agentFilingRole?: AGENT_FILING_ROLE; // Info: (20250423 - Liz) 申報代理人的角色，有三種：會計師(稅務代理人)、記帳士、記帳及報稅代理人
  // licenseId?: string; // Info: (20250506 - Liz) 申報代理人的證書字號、登錄字號
}

export interface IAccountBookWithTeam extends IAccountBook {
  team: ITeam;
  isTransferring: boolean;
}

// Info: (20250411 - Liz) getAccountBookInfoByBookId API payload
export interface ICountry {
  id: string;
  code: LocaleKey;
  name: string;
  localeKey: LocaleKey;
  currencyCode: string;
  phoneCode: string;
  phoneExample: string;
}

// Info: (20250411 - Liz) getAccountBookInfoByBookId API payload
export interface IAccountBookDetails {
  id: string;
  name: string;
  taxId: string;
  taxSerialNumber: string;
  representativeName: string;
  country: ICountry;
  phoneNumber: string;
  address: string;
  startDate: number;
  createdAt: number;
  updatedAt: number;
}

export interface ICompanyTaxIdAndName {
  taxId: string;
  name: string;
}

/**
 * Info: (20241023 - Murky)
 * @description Company entity interface specific for backend
 * @note use parsePrismaCompanyToCompanyEntity to convert Prisma.Company to ICompanyEntity
 * @note use initCompanyEntity to create a new ICompanyEntity from scratch
 */
export interface ICompanyEntity {
  /**
   * Info: (20241023 - Murky)
   * @description id in database, 0 if not yet saved in database
   */
  id: number;

  /**
   * Info: (20241023 - Murky)
   * @description the name of company
   */
  name: string;

  /**
   * Info: (20241023 - Murky)
   * @description 統一編號
   */
  taxId: string;

  // Deprecated: (20241023 - Murky) - tag will be removed after 20241030
  // tag: string;

  /**
   * Info: (20241023 - Murky)
   * @description when this company is formed in real life
   * @note need to be in seconds
   */
  startDate: number;

  /**
   * Info: (20241023 - Murky)
   * @note need to be in seconds
   */
  createdAt: number;

  /**
   * Info: (20241023 - Murky)
   * @note need to be in seconds
   */
  updatedAt: number;

  /**
   * Info: (20241023 - Murky)
   * @note need to be in seconds, null if not
   */
  deletedAt: number | null;
}
