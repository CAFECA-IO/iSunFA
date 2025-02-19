import { WORK_TAG } from '@/constants/company';
import { IRole } from '@/interfaces/role';

// ToDo: (20250219 - Liz) ICompany 將被改名成 IAccountBook (因為公司已經改名成帳本)
// Info: (20250219 - Liz) 新增一個屬性 isPrivate ，用來判斷是否為私人帳本，這只有 owner 可以設定。如果是公開帳本，帳本才可以被其他使用者看到
export interface ICompany {
  id: number;
  imageId: string;
  name: string;
  taxId: string;
  startDate: number;
  createdAt: number;
  updatedAt: number;
  isPrivate?: boolean;
}

export interface ICompanyDetail extends ICompany {
  ownerId: number;
  kycStatusDetail: string;
}

export interface ICompanyAndRoleDetail {
  company: ICompanyDetail;
  role: IRole;
}

// ToDo: (20250219 - Liz) ICompanyAndRole 將被改名成 IAccountBookAndRole
// 這個資料格式目前只有使用 company.id 和 tag
// order 跟 role 都沒有用到
// tag 是每個使用者都可以設定自己專屬的工作標籤，不是帳本本身的屬性
export interface ICompanyAndRole {
  company: ICompany;
  tag: WORK_TAG;
  order: number;
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
