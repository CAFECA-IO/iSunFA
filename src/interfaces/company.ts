import { WORK_TAG } from '@/constants/company';
import { IRole } from '@/interfaces/role';
import { ITeam } from '@/interfaces/team';

// ToDo: (20250219 - Liz) 原為 IAccountBook (因為公司已經改名成帳本)
// Info: (20250219 - Liz) 新增一個屬性 isPrivate ，用來判斷是否為私人帳本，這只有 owner 可以設定。如果是公開帳本，帳本才可以被其他使用者看到
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

export interface ICompanyDetail extends IAccountBook {
  ownerId: number;
  kycStatusDetail: string;
}

export interface ICompanyAndRoleDetail {
  company: ICompanyDetail;
  role: IRole;
}

// ToDo: (20250224 - Liz) 原為 ICompanyAndRole
// tag, order, role 都是使用者的個人化設定 (個人專屬的工作標籤、排序、個人角色)
// 目前 order 跟 role 尚未用到
export interface IAccountBookForUser {
  company: IAccountBook;
  tag: WORK_TAG;
  order: number;
  role: IRole;
}

export interface IAccountBookForUserWithTeam extends IAccountBookForUser {
  team: ITeam;
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

  // ToDo: (20241023 - Murky) imageFile
  // ToDo: (20241023 - Murky) imageFileId
  // ToDo: (20241023 - Murky) admins
  // ToDo: (20241023 - Murky) accountingSettings
  // ToDo: (20241023 - Murky) assets
  // ToDo: (20241023 - Murky) counterpartys
  // ToDo: (20241023 - Murky) companySettings
  // ToDo: (20241023 - Murky) contracts
  // ToDo: (20241023 - Murky) companyKYCs
  // ToDo: (20241023 - Murky) certificates
  // ToDo: (20241023 - Murky) departments
  // ToDo: (20241023 - Murky) employees
  // ToDo: (20241023 - Murky) invitations
  // ToDo: (20241023 - Murky) journals
  // ToDo: (20241023 - Murky) orders
  // ToDo: (20241023 - Murky) ocrs
  // ToDo: (20241023 - Murky) projects
  // ToDo: (20241023 - Murky) subscriptions
  // ToDo: (20241023 - Murky) auditReports
  // ToDo: (20241023 - Murky) incomeExpenses
  // ToDo: (20241023 - Murky) accounts
  // ToDo: (20241023 - Murky) reports
  // ToDo: (20241023 - Murky) vouchers
  // ToDo: (20241023 - Murky) voucherSalaryRecordFolders
}
