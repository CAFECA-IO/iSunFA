import { IRole } from '@/interfaces/role';
import { ITeam } from '@/interfaces/team';

export const PUBLIC_ACCOUNT_BOOK_ID = 1002;
export const NO_ACCOUNT_BOOK_ID = 555;
export const CANCEL_ACCOUNT_BOOK_ID: number = -1;
export enum WORK_TAG {
  ALL = 'all',
  FINANCIAL = 'financial',
  TAX = 'tax',
}
export enum ACCOUNT_BOOK_UPDATE_ACTION {
  SET_TO_TOP = 'setToTop',
  UPDATE_TAG = 'updateTag',
  UPDATE_VISIBILITY = 'updateVisibility',
}

// Info: (20250226 - Liz) 原為 ICompany (因為公司已經改名成帳本)
// Info: (20250226 - Liz) 新增一個屬性 isPrivate ，用來判斷是否為私人帳本，這只有 owner 可以設定。如果是公開帳本，帳本才可以被其他使用者看到
export interface IAccountBook {
  id: number;
  imageId: string;
  name: string;
  taxId: string;
  startDate: number;
  createdAt: number;
  updatedAt: number;
  isPrivate?: boolean; // ToDo: (20250224 - Liz) 等後端 API 調整後就改為必填
}

// Info: (20250226 - Liz) 原為 ICompanyAndRole
// Info: (20250226 - Liz) tag, order, role 都是使用者的個人化設定 (個人專屬的工作標籤、排序、個人角色)，目前 order 和 role 還沒用過
export interface IAccountBookForUser {
  company: IAccountBook;
  tag: WORK_TAG;
  order: number;
  role: IRole;
}

export interface IAccountBookForUserWithTeam extends IAccountBookForUser {
  team: ITeam;
  isTransferring: boolean;
}

// Info: (20250321 - Liz) 更新帳本資訊的 payload 回傳格式
export interface IResponseUpdateAccountBook extends IAccountBookForUser {
  teamId: number;
}

// Deprecated: (20250226 - Liz) 前端已經不再使用 ICompanyDetail 等後端確認後看看是否需要刪除
export interface ICompanyDetail extends IAccountBook {
  ownerId: number;
  kycStatusDetail: string;
}

// Deprecated: (20250226 - Liz) 前端已經不再使用 ICompanyAndRoleDetail 等後端確認後看看是否需要刪除
export interface ICompanyAndRoleDetail {
  company: ICompanyDetail;
  role: IRole;
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
