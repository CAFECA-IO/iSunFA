import { LocaleKey } from '@/constants/normal_setting';
import { ITeam } from '@/interfaces/team';
import { TPlanType } from '@/interfaces/subscription';
import { CurrencyType } from '@/constants/currency';

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
  UPDATE_INFO = 'updateInfo',
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

/**
 * Info: (20250521 - Shirley)
 * 為了解耦，區分前端跟後端使用的 interface，為新的 IAccountBook 除去 RC2 的欄位的樣子
 * 對應後端的 IAccountBookEntity
 * 適用於 connect, TODO, status_info 等不需要帳本詳細資訊的 API
 */
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
}

/**
 * Info: (20250521 - Shirley)
 * 適用於 call API `LIST_ACCOUNT_BOOK_BY_USER_ID,LIST_ACCOUNT_BOOK_BY_TEAM_ID,UPDATE_ACCOUNT_BOOK,CREATE_ACCOUNT_BOOK` 的畫面
 */
// Info: (20250226 - Liz) 原為 ICompany (因為公司已經改名成帳本)
export interface IAccountBookInfo {
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

  // Info: (20250604 - Liz) RC3 新增表單欄位
  businessLocation?: LocaleKey; // Info: (20250604 - Liz) 商業地址
  accountingCurrency?: CurrencyType; // Info: (20250604 - Liz) 會計幣別

  // Info: (20250523 - Liz) RC2 新增表單欄位
  representativeName: string; // Info: (20250423 - Liz) 負責人姓名
  taxSerialNumber: string; // Info: (20250423 - Liz) 稅籍編號
  contactPerson: string; // Info: (20250423 - Liz) 聯絡人姓名
  phoneNumber: string; // Info: (20250423 - Liz) 電話號碼
  city: string; // Info: (20250423 - Liz) 縣市
  district: string; // Info: (20250423 - Liz) 行政區
  enteredAddress: string; // Info: (20250423 - Liz) 使用者輸入的地址

  // Deprecated: (20250523 - Liz) 即將移除
  // filingFrequency?: FILING_FREQUENCY; // Info: (20250423 - Liz) 申報頻率
  // filingMethod?: FILING_METHOD; // Info: (20250423 - Liz) 總繳種類
  // declarantFilingMethod?: DECLARANT_FILING_METHOD; // Info: (20250423 - Liz) 申報方式

  // declarantName?: string; // Info: (20250423 - Liz) 申報人姓名
  // declarantPersonalId?: string; // Info: (20250423 - Liz) 申報人身分證字號
  // declarantPhoneNumber?: string; // Info: (20250423 - Liz) 申報人電話號碼

  // agentFilingRole?: AGENT_FILING_ROLE; // Info: (20250423 - Liz) 申報代理人的角色，有三種：會計師(稅務代理人)、記帳士、記帳及報稅代理人
  // licenseId?: string; // Info: (20250506 - Liz) 申報代理人的證書字號、登錄字號
}

/**
 * Info: (20250521 - Shirley)
 * 對應後端的 IAccountBookInfoWithTeamEntity
 */
export interface IAccountBookWithTeam extends IAccountBookInfo {
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

export interface ICreateAccountBookReqBody {
  name: string;
  taxId: string;
  tag: WORK_TAG;
  teamId: number;
  fileId?: number; // Info: (20250523 - Liz) 圖片 ID
  representativeName?: string; // Info: (20250523 - Liz) 負責人姓名
  taxSerialNumber?: string; // Info: (20250523 - Liz) 稅籍編號
  contactPerson?: string; // Info: (20250523 - Liz) 聯絡人姓名
  phoneNumber?: string; // Info: (20250523 - Liz) 電話號碼
  city?: string; // Info: (20250523 - Liz) 縣市
  district?: string; // Info: (20250523 - Liz) 行政區
  enteredAddress?: string; // Info: (20250523 - Liz) (使用者輸入的)地址
  businessLocation?: string;
  accountingCurrency?: string;
}

export interface IUpdateAccountBookReqBody {
  accountBookId: string;
  fromTeamId?: number; // Info: (20250523 - Liz) 轉移帳本的原團隊 ID (轉移帳本 API)
  toTeamId?: number; // Info: (20250523 - Liz) 接收帳本的目標團隊 ID (轉移帳本 API)
  action?: ACCOUNT_BOOK_UPDATE_ACTION;
  tag?: WORK_TAG;
  name?: string;
  taxId?: string;
  teamId?: number;
  fileId?: number; // Info: (20250523 - Liz) 圖片 ID
  representativeName?: string; // Info: (20250523 - Liz) 負責人姓名
  taxSerialNumber?: string; // Info: (20250523 - Liz) 稅籍編號
  contactPerson?: string; // Info: (20250523 - Liz) 聯絡人姓名
  phoneNumber?: string; // Info: (20250523 - Liz) 電話號碼
  city?: string; // Info: (20250523 - Liz) 縣市
  district?: string; // Info: (20250523 - Liz) 行政區
  enteredAddress?: string; // Info: (20250523 - Liz) (使用者輸入的)地址
  businessLocation?: string;
  accountingCurrency?: string;
}

export interface IAccountBookTaxIdAndName {
  taxId: string;
  name: string;
}

export interface ICompanyTaxIdAndName {
  taxId: string;
  name: string;
}

/**
 * Info: (20241023 - Murky)
 * @description AccountBook entity interface specific for backend
 * @note use parsePrismaAccountBookToAccountBookEntity to convert prisma.accountBook to IAccountBookEntity
 * @note use initAccountBookEntity to create a new IAccountBookEntity from scratch
 */
export interface IAccountBookWithoutTeamEntity {
  /**
   * Info: (20241023 - Murky)
   * @description id in database, 0 if not yet saved in database
   */
  id: number;

  /**
   * Info: (20241023 - Murky)
   * @description the name of account book
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
   * @description when this account book is formed in real life
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

export interface IBaifaAccountBook {
  id: number;
  teamId: number;
  ownerId: number;
  imageId: string;
  name: string;
  taxId: string;
  tag: WORK_TAG;
  startDate: number;
  createdAt: number;
  updatedAt: number;

  businessLocation?: string;
  accountingCurrency?: string;
  representativeName: string;
  taxSerialNumber: string;
  contactPerson: string;
  phoneNumber: string;
  city: string;
  district: string;
  enteredAddress: string;

  isTransferring: boolean;

  team: {
    id: number;
    name: string;
    imageId: string;
    about: string;
    profile: string;
    planType: TPlanType;
    expiredAt: number;
    inGracePeriod: boolean;
    gracePeriodEndAt: number;
    bankAccount: string;
  };
}
