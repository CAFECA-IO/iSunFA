import { IRole } from '@/interfaces/role';

export interface ICompany {
  id: number;
  imageId: string;
  name: string;
  taxId: string;
  tag: string;
  startDate: number;
  createdAt: number;
  updatedAt: number;
}

export interface ICompanyDetail extends ICompany {
  ownerId: number;
  kycStatusDetail: string;
}

export interface ICompanyAndRoleDetail {
  company: ICompanyDetail;
  role: IRole;
}

export interface ICompanyAndRole {
  company: ICompany;
  role: IRole;
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
